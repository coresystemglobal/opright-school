import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { NotFoundError } from "../../utils/errors";

type ParentInput = {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  password: string;
  studentIds?: string[];
};

export class ParentService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get children for a logged-in parent via the new Parent model.
   * Falls back to legacy guardian.email JSON query if no Parent record exists yet.
   */
  async getChildren(tenantId: string, userId: string) {
    const parent = await this.prisma.parent.findFirst({
      where: { tenantId, userId },
      include: {
        students: {
          include: { student: true },
        },
      },
    });

    if (parent) {
      return parent.students.map((item) => item.student);
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: { email: true },
    });

    if (!user?.email) {
      return [];
    }

    return this.prisma.student.findMany({
      where: { tenantId, guardian: { path: ["email"], equals: user.email } },
    });
  }

  async getChildAttendance(tenantId: string, studentId: string) {
    return this.prisma.attendance.findMany({
      where: { tenantId, studentId },
      orderBy: { date: "desc" },
      take: 30,
    });
  }

  async getChildGrades(tenantId: string, studentId: string) {
    return this.prisma.grade.findMany({
      where: { tenantId, studentId },
      include: { subject: true, assignment: true },
    });
  }

  async getChildPayments(tenantId: string, studentId: string) {
    return this.prisma.payment.findMany({
      where: { tenantId, studentId },
      include: { fee: true },
    });
  }

  async createParent(tenantId: string, data: ParentInput) {
    const parentRole = await this.prisma.role.findFirst({
      where: { tenantId, name: "Parent" },
      select: { id: true },
    });

    const hashedPassword = await bcrypt.hash(data.password, 12);

    return this.prisma.$transaction(async (tx) => {
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

  async linkStudentToParent(tenantId: string, parentId: string, studentId: string) {
    const [parent, student] = await Promise.all([
      this.prisma.parent.findFirst({
        where: { id: parentId, tenantId },
        select: { id: true },
      }),
      this.prisma.student.findFirst({
        where: { id: studentId, tenantId },
        select: { id: true },
      }),
    ]);

    if (!parent) {
      throw new NotFoundError("Parent not found");
    }

    if (!student) {
      throw new NotFoundError("Student not found");
    }

    return this.prisma.studentParent.create({ data: { parentId, studentId } });
  }
}
