import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import prisma from "../prisma/client";

export class ParentService {
  /**
   * Get children for a logged-in parent via the new Parent model.
   * Falls back to legacy guardian.email JSON query if no Parent record exists yet.
   */
  static async getChildren(tenantId: string, userId: string) {
    const parent = await prisma.parent.findFirst({
      where: { userId },
      include: {
        students: {
          include: { student: true },
        },
      },
    });

    if (parent) {
      return parent.students.map((sp) => sp.student);
    }

    // Legacy fallback: look up via guardian.email on the User record
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.email) return [];
    return prisma.student.findMany({
      where: { tenantId, guardian: { path: ["email"], equals: user.email } },
    });
  }

  static async getChildAttendance(tenantId: string, studentId: string) {
    return prisma.attendance.findMany({
      where: { tenantId, studentId },
      orderBy: { date: "desc" },
      take: 30,
    });
  }

  static async getChildGrades(tenantId: string, studentId: string) {
    return prisma.grade.findMany({
      where: { tenantId, studentId },
      include: { subject: true, assignment: true },
    });
  }

  static async getChildPayments(tenantId: string, studentId: string) {
    return prisma.payment.findMany({
      where: { tenantId, studentId },
      include: { fee: true },
    });
  }

  /** Create a Parent with a linked User account (admin action) */
  static async createParent(
    tenantId: string,
    data: {
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
      password: string;
      studentIds?: string[];
    },
    prismaClient: PrismaClient = prisma
  ) {
    const parentRole = await prismaClient.role.findFirst({
      where: { tenantId, name: "Parent" },
      select: { id: true },
    });

    const hashedPassword = await bcrypt.hash(data.password, 12);

    return prismaClient.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          tenantId,
          email: data.email,
          password: hashedPassword,
          firstName: data.firstName,
          lastName: data.lastName,
          roleId: parentRole?.id ?? undefined,
        },
      });

      const parent = await tx.parent.create({
        data: {
          tenantId,
          userId: user.id,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          ...(data.studentIds?.length
            ? {
                students: {
                  create: data.studentIds.map((studentId) => ({ studentId })),
                },
              }
            : {}),
        },
        include: { students: true },
      });

      return parent;
    });
  }

  static async linkStudentToParent(parentId: string, studentId: string) {
    return prisma.studentParent.create({ data: { parentId, studentId } });
  }
}
