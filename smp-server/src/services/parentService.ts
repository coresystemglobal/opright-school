import prisma from '../prisma/client';

export class ParentService {
  static async getChildren(tenantId: string, parentEmail: string) {
    return prisma.student.findMany({
      where: { 
        tenantId,
        guardian: { path: ['email'], equals: parentEmail }
      }
    });
  }

  static async getChildAttendance(tenantId: string, studentId: string) {
    return prisma.attendance.findMany({
      where: { tenantId, studentId },
      orderBy: { date: 'desc' },
      take: 30
    });
  }

  static async getChildGrades(tenantId: string, studentId: string) {
    return prisma.grade.findMany({
      where: { tenantId, studentId },
      include: { subject: true, assignment: true }
    });
  }

  static async getChildPayments(tenantId: string, studentId: string) {
    return prisma.payment.findMany({
      where: { tenantId, studentId },
      include: { fee: true }
    });
  }
}
