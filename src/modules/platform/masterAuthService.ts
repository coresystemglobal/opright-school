import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export class MasterAuthService {
  constructor(private prisma: PrismaClient) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: { email, isMaster: true },
      select: { id: true, email: true, password: true, firstName: true, lastName: true, isMaster: true },
    });

    if (!user) throw new Error("Invalid credentials");

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new Error("Invalid credentials");

    const token = jwt.sign(
      {
        userId: user.id,
        tenantId: null,
        role: "MASTER",
        isMaster: true,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "8h" }
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: "MASTER",
      },
    };
  }

  async listTenants() {
    return this.prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        subdomain: true,
        schoolCode: true,
        collectionEnabled: true,
        createdAt: true,
        _count: { select: { users: true, students: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateTenant(tenantId: string, data: { collectionEnabled?: boolean; name?: string }) {
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data,
    });
  }

  async listBankAccountRequests(status?: string) {
    return this.prisma.bankAccountChangeRequest.findMany({
      where: status ? { status: status as any } : undefined,
      include: {
        tenant: { select: { id: true, name: true, subdomain: true } },
        requestedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        reviewedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async reviewBankAccountRequest(
    requestId: string,
    reviewerId: string,
    decision: "APPROVED" | "REJECTED",
    reviewNote?: string
  ) {
    const request = await this.prisma.bankAccountChangeRequest.findFirst({
      where: { id: requestId, status: "PENDING" },
    });
    if (!request) throw new Error("Request not found or already reviewed");

    const updated = await this.prisma.bankAccountChangeRequest.update({
      where: { id: requestId },
      data: {
        status: decision,
        reviewedById: reviewerId,
        reviewNote,
        updatedAt: new Date(),
      },
    });

    if (decision === "APPROVED") {
      // Update the school's payment account details
      await this.prisma.schoolPaymentAccount.updateMany({
        where: { tenantId: request.tenantId },
        data: {
          bankName: request.newBankName,
          accountNumber: request.newAccountNumber,
          accountName: request.newAccountName,
        },
      });
    }

    return updated;
  }
}
