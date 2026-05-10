import { PrismaClient } from '@prisma/client';
import { UnauthorizedError } from '../../utils/errors';

export class StudentSelfService {
  constructor(private prisma: PrismaClient) {}

  private async resolveStudent(tenantId: string, userId: string) {
    const student = await this.prisma.student.findFirst({
      where: { tenantId, userId },
      select: { id: true, firstName: true, lastName: true, studentCode: true },
    });
    if (!student) throw new UnauthorizedError('No student record linked to this account');
    return student;
  }

  async getProfile(tenantId: string, userId: string) {
    return this.resolveStudent(tenantId, userId);
  }

  async getTimetable(tenantId: string, userId: string, academicYearId?: string) {
    const student = await this.resolveStudent(tenantId, userId);

    const enrollment = await this.prisma.enrollment.findFirst({
      where: { tenantId, studentId: student.id },
      select: { classId: true, class: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    if (!enrollment) return { student, class: null, timetable: [] };

    const timetable = await (this.prisma as any).timetable.findMany({
      where: {
        tenantId,
        classId: enrollment.classId,
        ...(academicYearId ? { academicYearId } : {}),
      },
      include: {
        subject: { select: { name: true, code: true } },
        teacher: { select: { firstName: true, lastName: true } },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    return { student, class: enrollment.class, timetable };
  }

  async getGrades(tenantId: string, userId: string, filters?: { subjectId?: string }) {
    const student = await this.resolveStudent(tenantId, userId);

    const [grades, examResults] = await Promise.all([
      this.prisma.grade.findMany({
        where: { tenantId, studentId: student.id, ...(filters?.subjectId ? { subjectId: filters.subjectId } : {}) },
        include: {
          subject: { select: { name: true, code: true } },
          assignment: { select: { title: true, maxScore: true, dueDate: true } },
        },
        orderBy: { gradedAt: 'desc' },
      }),
      this.prisma.examResult.findMany({
        where: { tenantId, studentId: student.id },
        include: {
          examination: {
            select: {
              name: true,
              maxScore: true,
              examDate: true,
              subject: { select: { name: true, code: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { student, grades, examResults };
  }

  async getAttendance(tenantId: string, userId: string, filters?: { startDate?: Date; endDate?: Date }) {
    const student = await this.resolveStudent(tenantId, userId);

    const where: any = { tenantId, studentId: student.id };
    if (filters?.startDate && filters?.endDate) {
      where.date = { gte: filters.startDate, lte: filters.endDate };
    }

    const records = await this.prisma.attendance.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    const total = records.length;
    const present = records.filter((r) => r.status === 'PRESENT').length;
    const absent = records.filter((r) => r.status === 'ABSENT').length;
    const late = records.filter((r) => r.status === 'LATE').length;
    const excused = records.filter((r) => r.status === 'EXCUSED').length;

    return {
      student,
      records,
      summary: {
        total,
        present,
        absent,
        late,
        excused,
        attendanceRate: total > 0 ? Math.round(((present + late) / total) * 100) : 0,
      },
    };
  }

  async getFees(tenantId: string, userId: string) {
    const student = await this.resolveStudent(tenantId, userId);

    const payments = await this.prisma.payment.findMany({
      where: { tenantId, studentId: student.id },
      include: { fee: { select: { name: true, amount: true, dueDate: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const fees = await this.prisma.fee.findMany({
      where: { tenantId },
      orderBy: { dueDate: 'asc' },
    });

    const paidFeeIds = new Set(
      payments.filter((p) => p.status === 'SUCCESS').map((p) => p.feeId)
    );

    return {
      student,
      fees: fees.map((f) => ({ ...f, paid: paidFeeIds.has(f.id) })),
      payments,
    };
  }

  async getReportCard(tenantId: string, userId: string, termId: string) {
    const student = await this.resolveStudent(tenantId, userId);

    const grades = await this.prisma.grade.findMany({
      where: { tenantId, studentId: student.id },
      include: {
        subject: { select: { name: true, code: true } },
        assignment: { select: { title: true, maxScore: true } },
      },
    });

    const examResults = await this.prisma.examResult.findMany({
      where: {
        tenantId,
        studentId: student.id,
        examination: { termId },
      },
      include: {
        examination: {
          select: { name: true, maxScore: true, passingScore: true, subject: { select: { name: true, code: true } } },
        },
      },
    });

    return { student, grades, examResults };
  }
}
