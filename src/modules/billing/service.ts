import { PrismaClient, SubscriptionStatus } from '@prisma/client';
import { calculateTermCharge, getPricingComparison } from './pricing';
import { config } from '../../config';

type BillingCycle = 'per_term' | 'per_session';

async function paystackPost(path: string, body: Record<string, unknown>) {
  const res = await fetch(`https://api.paystack.co${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.payments.paystack.secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<{ status: boolean; data: Record<string, unknown> }>;
}

async function paystackGet(path: string) {
  const res = await fetch(`https://api.paystack.co${path}`, {
    headers: { Authorization: `Bearer ${config.payments.paystack.secretKey}` },
  });
  return res.json() as Promise<{ status: boolean; data: Record<string, unknown> }>;
}

export class BillingService {
  constructor(private prisma: PrismaClient) {}

  async initializePayment(
    tenantId: string,
    studentCount: number,
    billingCycle: BillingCycle,
    email: string,
  ) {
    const charge = calculateTermCharge(studentCount, billingCycle);
    const reference = `sub_${tenantId}_${Date.now()}`;

    const result = await paystackPost('/transaction/initialize', {
      email,
      amount: charge.discountedAmount * 100, // kobo
      reference,
      metadata: { tenantId, studentCount, billingCycle },
    });

    await this.prisma.subscription.upsert({
      where: { tenantId },
      create: {
        tenantId,
        studentCount,
        billingCycle,
        status: SubscriptionStatus.TRIAL,
        amount: charge.discountedAmount,
        paystackRef: reference,
        trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      update: {
        studentCount,
        billingCycle,
        amount: charge.discountedAmount,
        paystackRef: reference,
      },
    });

    return {
      authorizationUrl: result.data.authorization_url as string,
      reference,
      charge,
    };
  }

  async verifyAndActivate(reference: string, tenantId: string) {
    const result = await paystackGet(`/transaction/verify/${reference}`);

    if (!result.status || result.data.status !== 'success') {
      throw new Error(`Payment not successful: ${result.data.status}`);
    }

    const meta = result.data.metadata as { tenantId?: string };
    const resolvedTenantId = meta?.tenantId ?? tenantId;

    return this.prisma.subscription.update({
      where: { tenantId: resolvedTenantId },
      data: {
        status: SubscriptionStatus.ACTIVE,
        activatedAt: new Date(),
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // ~1 term
      },
    });
  }

  async getSubscription(tenantId: string) {
    return this.prisma.subscription.findUnique({ where: { tenantId } });
  }

  getPricingOptions() {
    return getPricingComparison();
  }
}
