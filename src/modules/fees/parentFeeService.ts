import { PrismaClient } from "@prisma/client";
import { ForbiddenError, NotFoundError, ConflictError } from "../../utils/errors";
import { InvoiceService } from "./invoiceService";

export class ParentFeeService {
  private invoiceService: InvoiceService;

  constructor(private prisma: PrismaClient) {
    this.invoiceService = new InvoiceService(prisma);
  }

  private async resolveStudentIds(tenantId: string, userId: string): Promise<string[]> {
    const parent = await this.prisma.parent.findFirst({
      where: { userId, tenantId },
      include: { students: { select: { studentId: true } } },
    });
    if (!parent) throw new ForbiddenError("Parent profile not found");
    return parent.students.map((s) => s.studentId);
  }

  private async guardStudentAccess(tenantId: string, userId: string, studentId: string) {
    const ids = await this.resolveStudentIds(tenantId, userId);
    if (!ids.includes(studentId)) throw new ForbiddenError("Access denied to this student");
  }

  async getChildrenFeeSummaries(tenantId: string, userId: string) {
    const studentIds = await this.resolveStudentIds(tenantId, userId);

    return Promise.all(
      studentIds.map(async (studentId) => {
        const [assignments, student] = await Promise.all([
          this.prisma.feeAssignment.findMany({
            where: { tenantId, studentId },
            include: {
              feeTemplate: { select: { name: true, category: true, currency: true, isMandatory: true } },
              invoices: { select: { id: true, amount: true, status: true, paidAt: true } },
            },
            orderBy: { dueDate: "asc" },
          }),
          this.prisma.student.findUnique({
            where: { id: studentId },
            select: { firstName: true, lastName: true, studentId: true },
          }),
        ]);

        const total = assignments.reduce((s, a) => s + Number(a.totalAmount), 0);
        const paid = assignments.reduce((s, a) => s + Number(a.paidAmount), 0);

        return { student, assignments, summary: { total, paid, outstanding: total - paid } };
      })
    );
  }

  async getChildFeeDetails(tenantId: string, userId: string, studentId: string) {
    await this.guardStudentAccess(tenantId, userId, studentId);

    const assignments = await this.prisma.feeAssignment.findMany({
      where: { tenantId, studentId },
      include: {
        feeTemplate: {
          select: {
            name: true, category: true, currency: true, isMandatory: true,
            allowInstallments: true, minimumInstallmentPercent: true,
            dueDate: true, gracePeriodDays: true,
          },
        },
        invoices: {
          select: {
            id: true, amount: true, status: true, paidAt: true,
            virtualAccountBank: true, virtualAccountNumber: true, virtualAccountExpiry: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }],
    });

    const total = assignments.reduce((s, a) => s + Number(a.totalAmount), 0);
    const paid = assignments.reduce((s, a) => s + Number(a.paidAmount), 0);

    return { assignments, summary: { total, paid, outstanding: total - paid } };
  }

  async initiatePayment(
    tenantId: string,
    userId: string,
    feeAssignmentId: string,
    amount: number,
    payerEmail: string
  ) {
    const assignment = await this.prisma.feeAssignment.findFirst({
      where: { id: feeAssignmentId, tenantId },
      select: { studentId: true },
    });
    if (!assignment) throw new NotFoundError("Fee assignment not found");
    await this.guardStudentAccess(tenantId, userId, assignment.studentId);

    return this.invoiceService.initiate(tenantId, {
      feeAssignmentId,
      amount,
      payerEmail,
      payerUserId: userId,
      currency: "NGN",
    });
  }

  async optIn(tenantId: string, userId: string, studentId: string, feeTemplateId: string) {
    await this.guardStudentAccess(tenantId, userId, studentId);

    const template = await this.prisma.feeTemplate.findFirst({
      where: { id: feeTemplateId, tenantId, isActive: true, isOptIn: true },
    });
    if (!template) throw new NotFoundError("Opt-in fee template not found");

    const [existingOptIn, existingAssignment] = await Promise.all([
      this.prisma.feeOptIn.findUnique({
        where: { feeTemplateId_studentId: { feeTemplateId, studentId } },
      }),
      this.prisma.feeAssignment.findUnique({
        where: { feeTemplateId_studentId: { feeTemplateId, studentId } },
      }),
    ]);
    if (existingOptIn || existingAssignment) throw new ConflictError("Already opted in to this fee");

    await this.prisma.$transaction([
      this.prisma.feeOptIn.create({
        data: { tenantId, feeTemplateId, studentId, optedInBy: userId },
      }),
      this.prisma.feeAssignment.create({
        data: {
          tenantId, feeTemplateId, studentId,
          totalAmount: template.amount,
          paidAmount: 0,
          currency: template.currency,
          status: "UNPAID",
          serviceAccessRevoked: false,
          dueDate: template.dueDate,
          gracePeriodDays: template.gracePeriodDays,
        },
      }),
    ]);

    return { optedIn: true, feeTemplateId, studentId };
  }

  async listOptInTemplates(tenantId: string, userId: string, studentId: string) {
    await this.guardStudentAccess(tenantId, userId, studentId);

    const templates = await this.prisma.feeTemplate.findMany({
      where: { tenantId, isActive: true, isOptIn: true },
      include: { optIns: { where: { studentId }, select: { optedInAt: true } } },
      orderBy: { name: "asc" },
    });

    return templates.map((t) => ({ ...t, alreadyOptedIn: t.optIns.length > 0 }));
  }
}
