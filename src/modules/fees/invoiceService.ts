import { PrismaClient } from "@prisma/client";
import { paystackApi } from "../../utils/paystackApi";
import { NotFoundError, ConflictError } from "../../utils/errors";

type InitiatePaymentInput = {
  feeAssignmentId: string;
  amount: number;
  payerEmail: string;
  payerUserId: string;
  currency?: string;
};

type PaystackTransferResponse = {
  reference: string;
  display_text: string;
  bank: {
    name: string;
    account_number: string;
  };
  expiry_date: string;
};

export class InvoiceService {
  constructor(private prisma: PrismaClient) {}

  async initiate(tenantId: string, input: InitiatePaymentInput) {
    const assignment = await this.prisma.feeAssignment.findFirst({
      where: { id: input.feeAssignmentId, tenantId },
      include: { feeTemplate: true },
    });

    if (!assignment) throw new NotFoundError("Fee assignment not found");
    if (assignment.status === "PAID" || assignment.status === "WAIVED") {
      throw new ConflictError(`Assignment is already ${assignment.status.toLowerCase()}`);
    }

    const remaining = Number(assignment.totalAmount) - Number(assignment.paidAmount);
    if (input.amount > remaining) {
      throw new ConflictError(`Payment amount exceeds outstanding balance of ${remaining}`);
    }
    if (!assignment.feeTemplate.allowInstallments && input.amount < remaining) {
      throw new ConflictError("This fee must be paid in full");
    }
    const minPct = Number(assignment.feeTemplate.minimumInstallmentPercent ?? 0);
    if (minPct > 0 && input.amount < (Number(assignment.totalAmount) * minPct) / 100) {
      throw new ConflictError(
        `Minimum installment is ${minPct}% of total (${(Number(assignment.totalAmount) * minPct) / 100})`
      );
    }

    const pendingInvoice = await this.prisma.invoice.findFirst({
      where: { feeAssignmentId: input.feeAssignmentId, status: "PENDING" },
    });
    if (pendingInvoice) return pendingInvoice;

    const reference = `inv_${tenantId.slice(0, 8)}_${input.feeAssignmentId.slice(0, 8)}_${Date.now()}`;

    const result = await paystackApi.post<{
      authorization_url: string;
      access_code: string;
      reference: string;
      bank_transfer?: PaystackTransferResponse;
    }>("/transaction/initialize", {
      email: input.payerEmail,
      amount: Math.round(input.amount * 100),
      reference,
      currency: input.currency ?? "NGN",
      channels: ["bank_transfer"],
      metadata: {
        tenantId,
        feeAssignmentId: input.feeAssignmentId,
        payerUserId: input.payerUserId,
        invoiceAmount: input.amount,
      },
    });

    const transfer = result.data.bank_transfer;

    return this.prisma.invoice.create({
      data: {
        tenantId,
        feeAssignmentId: input.feeAssignmentId,
        amount: input.amount,
        currency: input.currency ?? "NGN",
        paystackRef: reference,
        virtualAccountBank: transfer?.bank?.name,
        virtualAccountNumber: transfer?.bank?.account_number,
        virtualAccountExpiry: transfer?.expiry_date ? new Date(transfer.expiry_date) : undefined,
        status: "PENDING",
        paidBy: input.payerUserId,
      },
    });
  }

  async getInvoice(tenantId: string, invoiceId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: {
        feeAssignment: {
          include: {
            feeTemplate: { select: { name: true, category: true } },
            student: { select: { firstName: true, lastName: true, studentId: true } },
          },
        },
      },
    });
    if (!invoice) throw new NotFoundError("Invoice not found");
    return invoice;
  }

  async listForAssignment(tenantId: string, feeAssignmentId: string) {
    return this.prisma.invoice.findMany({
      where: { tenantId, feeAssignmentId },
      orderBy: { createdAt: "desc" },
    });
  }

  async settleFromWebhook(
    reference: string,
    amountKobo: number,
    metadata: { tenantId?: string; feeAssignmentId?: string; payerUserId?: string }
  ) {
    const invoice = await this.prisma.invoice.findUnique({ where: { paystackRef: reference } });
    if (!invoice || invoice.status !== "PENDING") return null;

    const assignment = await this.prisma.feeAssignment.findUnique({
      where: { id: invoice.feeAssignmentId },
      include: { feeTemplate: { select: { name: true } } },
    });
    if (!assignment) return null;

    const paymentAccount = await this.prisma.schoolPaymentAccount.findUnique({
      where: { tenantId: invoice.tenantId },
      select: { commissionPercent: true },
    });

    const amountNaira = amountKobo / 100;
    const commissionPct = Number(paymentAccount?.commissionPercent ?? 0);
    const commissionAmount = parseFloat(((amountNaira * commissionPct) / 100).toFixed(2));
    const netAmount = parseFloat((amountNaira - commissionAmount).toFixed(2));

    const newPaidAmount = Number(assignment.paidAmount) + amountNaira;
    const fullyPaid = newPaidAmount >= Number(assignment.totalAmount);

    await this.prisma.$transaction([
      this.prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: "SUCCESS", paidAt: new Date(), paidBy: metadata.payerUserId },
      }),
      this.prisma.feeAssignment.update({
        where: { id: assignment.id },
        data: {
          paidAmount: newPaidAmount,
          status: fullyPaid ? "PAID" : "PARTIAL",
          serviceAccessRevoked: fullyPaid ? false : assignment.serviceAccessRevoked,
        },
      }),
      this.prisma.walletLedger.create({
        data: {
          tenantId: invoice.tenantId,
          type: "CREDIT",
          amount: amountNaira,
          commissionAmount,
          netAmount,
          invoiceId: invoice.id,
          reference,
          description: `Payment for fee assignment ${invoice.feeAssignmentId.slice(0, 8)}`,
          currency: invoice.currency,
        },
      }),
      this.prisma.walletLedger.create({
        data: {
          tenantId: invoice.tenantId,
          type: "COMMISSION",
          amount: commissionAmount,
          commissionAmount,
          netAmount: commissionAmount,
          invoiceId: invoice.id,
          reference: `${reference}_commission`,
          description: `Platform commission (${commissionPct}%)`,
          currency: invoice.currency,
        },
      }),
      this.prisma.walletLedger.create({
        data: {
          tenantId: invoice.tenantId,
          type: "REMITTANCE",
          amount: netAmount,
          commissionAmount: 0,
          netAmount,
          invoiceId: invoice.id,
          reference: `${reference}_remittance`,
          description: "Net remittance to school account",
          currency: invoice.currency,
        },
      }),
    ]);

    return { invoiceId: invoice.id, amountNaira, commissionAmount, netAmount, fullyPaid };
  }
}
