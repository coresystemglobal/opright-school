import crypto from 'crypto';
import { PrismaClient } from "@prisma/client";
import { config } from '../../config';
import { InvoiceService } from '../fees/invoiceService';

type InitiatePaymentData = {
  feeAssignmentId: string;
  amount: number;
  payerEmail: string;
  payerUserId: string;
  currency?: string;
};

function verifyPaystackSignature(rawBody: Buffer, signature: string): boolean {
  const secret = config.payments.paystack.secretKey;
  if (!secret) return false;
  const expected = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
}

export class PaymentService {
  private invoiceService: InvoiceService;

  constructor(private prisma: PrismaClient) {
    this.invoiceService = new InvoiceService(prisma);
  }

  async initiatePayment(tenantId: string, data: InitiatePaymentData) {
    return this.invoiceService.initiate(tenantId, data);
  }

  async getInvoice(tenantId: string, invoiceId: string) {
    return this.invoiceService.getInvoice(tenantId, invoiceId);
  }

  async getInvoicesForAssignment(tenantId: string, feeAssignmentId: string) {
    return this.invoiceService.listForAssignment(tenantId, feeAssignmentId);
  }

  async handlePaystackWebhook(rawBody: Buffer, signature: string) {
    if (!verifyPaystackSignature(rawBody, signature)) throw new Error('Invalid Paystack signature');

    const event = JSON.parse(rawBody.toString('utf-8')) as {
      event: string;
      data: {
        reference: string;
        status: string;
        amount: number;
        metadata?: { tenantId?: string; feeAssignmentId?: string; payerUserId?: string };
      };
    };

    if (event.event !== 'charge.success' || event.data.status !== 'success') return { ignored: true };

    const { reference, amount, metadata } = event.data;

    const settled = await this.invoiceService.settleFromWebhook(reference, amount, metadata ?? {});
    if (settled) return { confirmed: true, type: 'invoice', ...settled };
    
    return { ignored: true };
  }

  async getStudentInvoices(tenantId: string, studentId: string) {
    return this.prisma.invoice.findMany({
      where: {
        tenantId,
        feeAssignment: { studentId }
      },
      include: {
        feeAssignment: {
          include: {
            feeTemplate: { select: { name: true, category: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}
