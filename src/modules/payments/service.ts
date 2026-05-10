import crypto from 'crypto';
import { PaymentStatus, PrismaClient } from "@prisma/client";
import { config } from '../../config';

type FeeCreateData = {
  name: string;
  amount: number;
  dueDate: Date;
};

type PaymentCreateData = {
  feeId: string;
  studentId: string;
  amount: number;
  method: string;
};

type OnlinePaymentInitData = {
  feeId: string;
  studentId: string;
  amount: number;
  email: string;
};

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

function verifyPaystackSignature(rawBody: Buffer, signature: string): boolean {
  const secret = config.payments.paystack.secretKey;
  if (!secret) return false;
  const expected = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
}

export class PaymentService {
  constructor(private prisma: PrismaClient) {}

  async createFee(tenantId: string, data: FeeCreateData) {
    return this.prisma.fee.create({
      data: {
        tenantId,
        name: data.name,
        amount: data.amount,
        dueDate: data.dueDate,
      },
    });
  }

  async createPayment(tenantId: string, data: PaymentCreateData) {
    return this.prisma.payment.create({
      data: {
        tenantId,
        feeId: data.feeId,
        studentId: data.studentId,
        amount: data.amount,
        method: data.method,
        status: PaymentStatus.PENDING,
      },
    });
  }

  async initializeOnlinePayment(tenantId: string, data: OnlinePaymentInitData) {
    const reference = `fee_${tenantId}_${data.feeId}_${Date.now()}`;

    const result = await paystackPost('/transaction/initialize', {
      email: data.email,
      amount: Math.round(data.amount * 100), // kobo
      reference,
      metadata: { tenantId, feeId: data.feeId, studentId: data.studentId },
    });

    if (!result.status) {
      throw new Error('Failed to initialize Paystack transaction');
    }

    const payment = await this.prisma.payment.create({
      data: {
        tenantId,
        feeId: data.feeId,
        studentId: data.studentId,
        amount: data.amount,
        method: 'paystack',
        status: PaymentStatus.PENDING,
        paystackRef: reference,
      },
    });

    return {
      paymentId: payment.id,
      authorizationUrl: result.data.authorization_url as string,
      reference,
    };
  }

  async confirmPayment(tenantId: string, paymentId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, tenantId },
    });
    if (!payment) throw new Error('Payment not found');
    if (payment.status === PaymentStatus.SUCCESS) throw new Error('Payment already confirmed');

    return this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.SUCCESS },
    });
  }

  async handlePaystackWebhook(rawBody: Buffer, signature: string) {
    if (!verifyPaystackSignature(rawBody, signature)) {
      throw new Error('Invalid Paystack signature');
    }

    const event = JSON.parse(rawBody.toString('utf-8')) as {
      event: string;
      data: {
        reference: string;
        status: string;
        metadata?: { tenantId?: string };
      };
    };

    if (event.event !== 'charge.success' || event.data.status !== 'success') {
      return { ignored: true };
    }

    const payment = await this.prisma.payment.findUnique({
      where: { paystackRef: event.data.reference },
    });

    if (!payment || payment.status === PaymentStatus.SUCCESS) {
      return { ignored: true };
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.SUCCESS },
    });

    return { confirmed: true, paymentId: payment.id };
  }

  async getStudentPayments(tenantId: string, studentId: string) {
    return this.prisma.payment.findMany({
      where: { tenantId, studentId },
    });
  }
}
