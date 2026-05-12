import { PrismaClient } from "@prisma/client";
import { NotFoundError } from "../../utils/errors";

export class FeeAssignmentService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Generate FeeAssignment rows for all students targeted by the template.
   * OPT_IN templates are skipped — parents opt in individually (Phase 5).
   * Idempotent: existing assignments are not duplicated (skipDuplicates).
   */
  async generateAssignments(tenantId: string, templateId: string) {
    const template = await this.prisma.feeTemplate.findFirst({
      where: { id: templateId, tenantId, isActive: true },
    });
    if (!template) throw new NotFoundError("Fee template not found or inactive");

    if (template.targetType === "OPT_IN") {
      return { assigned: 0, message: "OPT_IN templates are assigned when parents opt in" };
    }

    const studentIds = await this.resolveStudentIds(tenantId, template.targetType, template.targetIds);
    if (studentIds.length === 0) {
      return { assigned: 0, message: "No students matched the target criteria" };
    }

    const result = await this.prisma.feeAssignment.createMany({
      data: studentIds.map((studentId) => ({
        tenantId,
        feeTemplateId: templateId,
        studentId,
        totalAmount: template.amount,
        paidAmount: 0,
        currency: template.currency,
        status: "UNPAID" as const,
        serviceAccessRevoked: false,
        dueDate: template.dueDate,
        gracePeriodDays: template.gracePeriodDays,
      })),
      skipDuplicates: true,
    });

    return { assigned: result.count };
  }

  async listAssignments(tenantId: string, filters: {
    studentId?: string;
    feeTemplateId?: string;
    status?: string;
    classId?: string;
  }) {
    const where: any = { tenantId };
    if (filters.studentId) where.studentId = filters.studentId;
    if (filters.feeTemplateId) where.feeTemplateId = filters.feeTemplateId;
    if (filters.status) where.status = filters.status;

    if (filters.classId) {
      const enrolled = await this.prisma.enrollment.findMany({
        where: { tenantId, classId: filters.classId },
        select: { studentId: true },
      });
      where.studentId = { in: enrolled.map((e) => e.studentId) };
    }

    return this.prisma.feeAssignment.findMany({
      where,
      include: {
        feeTemplate: { select: { name: true, category: true, currency: true } },
        student: { select: { firstName: true, lastName: true, studentId: true } },
        invoices: { select: { id: true, amount: true, status: true, paidAt: true } },
      },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }],
    });
  }

  async waiveAssignment(tenantId: string, id: string, waivedById: string, reason: string) {
    const assignment = await this.prisma.feeAssignment.findFirst({
      where: { id, tenantId },
    });
    if (!assignment) throw new NotFoundError("Fee assignment not found");

    return this.prisma.feeAssignment.update({
      where: { id },
      data: {
        status: "WAIVED",
        waivedById,
        waivedReason: reason,
        serviceAccessRevoked: false,
      },
    });
  }

  async getStudentSummary(tenantId: string, studentId: string) {
    const assignments = await this.prisma.feeAssignment.findMany({
      where: { tenantId, studentId },
      include: {
        feeTemplate: { select: { name: true, category: true, currency: true, isMandatory: true } },
        invoices: { select: { amount: true, status: true, paidAt: true } },
      },
      orderBy: { dueDate: "asc" },
    });

    const total = assignments.reduce((sum, a) => sum + Number(a.totalAmount), 0);
    const paid = assignments.reduce((sum, a) => sum + Number(a.paidAmount), 0);
    const outstanding = total - paid;

    return { assignments, summary: { total, paid, outstanding } };
  }

  private async resolveStudentIds(
    tenantId: string,
    targetType: string,
    targetIds: unknown
  ): Promise<string[]> {
    const ids = Array.isArray(targetIds) ? (targetIds as string[]) : [];

    switch (targetType) {
      case "ALL": {
        const students = await this.prisma.student.findMany({
          where: { tenantId, status: "ACTIVE" },
          select: { id: true },
        });
        return students.map((s) => s.id);
      }

      case "CLASS": {
        if (ids.length === 0) return [];
        const enrollments = await this.prisma.enrollment.findMany({
          where: { tenantId, classId: { in: ids } },
          select: { studentId: true },
          distinct: ["studentId"],
        });
        return enrollments.map((e) => e.studentId);
      }

      case "TERM":
      case "ACADEMIC_YEAR": {
        const students = await this.prisma.student.findMany({
          where: { tenantId, status: "ACTIVE" },
          select: { id: true },
        });
        return students.map((s) => s.id);
      }

      default:
        return [];
    }
  }
}
