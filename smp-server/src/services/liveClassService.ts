import prisma from '../prisma/client';

export class LiveClassService {
  static async createClass(tenantId: string, data: any) {
    return prisma.liveClass.create({
      data: { ...data, tenantId }
    });
  }

  static async getClasses(tenantId: string, filters?: any) {
    return prisma.liveClass.findMany({
      where: { tenantId, ...filters },
      orderBy: { scheduledAt: 'asc' },
      include: { _count: { select: { attendance: true } } }
    });
  }

  static async updateClass(id: string, data: any) {
    return prisma.liveClass.update({
      where: { id },
      data
    });
  }

  static async recordAttendance(classId: string, studentId: string, joinedAt?: Date, leftAt?: Date) {
    const duration = joinedAt && leftAt ? Math.floor((leftAt.getTime() - joinedAt.getTime()) / 60000) : null;

    return prisma.liveClassAttendance.upsert({
      where: { classId_studentId: { classId, studentId } },
      create: { classId, studentId, joinedAt, leftAt, duration },
      update: { leftAt, duration }
    });
  }

  static async getAttendance(classId: string) {
    return prisma.liveClassAttendance.findMany({
      where: { classId }
    });
  }
}
