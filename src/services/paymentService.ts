import { PaymentStatus, PrismaClient } from "@prisma/client";

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
        status: PaymentStatus.SUCCESS,
      },
    });
  }

  async getStudentPayments(tenantId: string, studentId: string) {
    return this.prisma.payment.findMany({
      where: { tenantId, studentId },
    });
  }
}
