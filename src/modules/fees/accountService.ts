import { PrismaClient } from "@prisma/client";
import { PaystackSubaccountService } from "./paystackSubaccountService";
import { NotFoundError, ConflictError } from "../../utils/errors";

type SetupAccountInput = {
  bankCode: string;
  bankName: string;
  accountNumber: string;
  commissionPercent: number;
  currency?: string;
  adminEmail?: string;
};

type ChangeRequestInput = {
  bankCode: string;
  bankName: string;
  accountNumber: string;
};

export class FeeAccountService {
  private subaccountSvc = new PaystackSubaccountService();

  constructor(private prisma: PrismaClient) {}

  async setupAccount(tenantId: string, input: SetupAccountInput) {
    const existing = await this.prisma.schoolPaymentAccount.findUnique({
      where: { tenantId },
    });
    if (existing) {
      throw new ConflictError(
        "Payment account already set up. Submit a change request to update bank details."
      );
    }

    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { name: true },
    });

    const resolved = await this.subaccountSvc.resolveAccount(input.accountNumber, input.bankCode);

    const subaccount = await this.subaccountSvc.createSubaccount({
      businessName: tenant.name,
      settlementBank: input.bankCode,
      accountNumber: input.accountNumber,
      percentageCharge: input.commissionPercent,
      primaryContactEmail: input.adminEmail,
    });

    const account = await this.prisma.schoolPaymentAccount.create({
      data: {
        tenantId,
        paystackSubaccountCode: subaccount.subaccount_code,
        bankName: input.bankName,
        accountNumber: input.accountNumber,
        accountName: resolved.account_name,
        commissionPercent: input.commissionPercent,
        currency: input.currency ?? "NGN",
        verifiedAt: new Date(),
      },
    });

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { collectionEnabled: true },
    });

    return account;
  }

  async getAccount(tenantId: string) {
    const account = await this.prisma.schoolPaymentAccount.findUnique({
      where: { tenantId },
      select: {
        id: true,
        bankName: true,
        accountNumber: true,
        accountName: true,
        commissionPercent: true,
        currency: true,
        verifiedAt: true,
        createdAt: true,
      },
    });

    if (!account) throw new NotFoundError("Payment account not set up yet");
    return account;
  }

  async requestAccountChange(tenantId: string, requestedById: string, input: ChangeRequestInput) {
    await this.getAccount(tenantId);

    const resolved = await this.subaccountSvc.resolveAccount(input.accountNumber, input.bankCode);

    const pending = await this.prisma.bankAccountChangeRequest.findFirst({
      where: { tenantId, status: "PENDING" },
    });
    if (pending) {
      throw new ConflictError("A change request is already pending MASTER approval");
    }

    const request = await this.prisma.bankAccountChangeRequest.create({
      data: {
        tenantId,
        requestedById,
        newBankName: input.bankName,
        newAccountNumber: input.accountNumber,
        newAccountName: resolved.account_name,
        notifiedAt: new Date(),
      },
    });

    await this.notifyAdmins(tenantId, request.id);

    return request;
  }

  async getChangeRequests(tenantId: string) {
    return this.prisma.bankAccountChangeRequest.findMany({
      where: { tenantId },
      select: {
        id: true,
        newBankName: true,
        newAccountNumber: true,
        newAccountName: true,
        status: true,
        reviewNote: true,
        createdAt: true,
        updatedAt: true,
        requestedBy: { select: { firstName: true, lastName: true, email: true } },
        reviewedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  private async notifyAdmins(tenantId: string, requestId: string) {
    const admins = await this.prisma.user.findMany({
      where: {
        tenantId,
        role: { name: { in: ["Admin", "ADMIN", "admin"] } },
      },
      select: { id: true },
    });

    if (admins.length === 0) return;

    await this.prisma.notification.createMany({
      data: admins.map((admin) => ({
        tenantId,
        userId: admin.id,
        title: "Bank account change requested",
        body: "A bank account change request has been submitted and is awaiting MASTER approval.",
        type: "bank_account_change",
        link: `/settings/payment-account`,
      })),
      skipDuplicates: true,
    });
  }
}
