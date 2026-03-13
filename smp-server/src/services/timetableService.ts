import { PrismaClient } from '@prisma/client';

export class TimetableService {
  constructor(private prisma: PrismaClient) {}

  async create(tenantId: string, data: {
    academicYearId: string;
    subjectId: string;
    classId: string;
    teacherId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    room?: string;
  }) {
    const conflict = await this.checkConflict(tenantId, data);
    if (conflict) throw new Error('Schedule conflict detected');

    return (this.prisma as any).timetable.create({
      data: { ...data, tenantId },
      include: { subject: true, class: true, teacher: true }
    });
  }

  async checkConflict(tenantId: string, data: { classId?: string; teacherId?: string; dayOfWeek: number; startTime: string; endTime: string; room?: string }, excludeId?: string) {
    const where: any = {
      tenantId,
      dayOfWeek: data.dayOfWeek,
      OR: [
        { AND: [{ startTime: { lte: data.startTime } }, { endTime: { gt: data.startTime } }] },
        { AND: [{ startTime: { lt: data.endTime } }, { endTime: { gte: data.endTime } }] },
        { AND: [{ startTime: { gte: data.startTime } }, { endTime: { lte: data.endTime } }] }
      ]
    };

    if (excludeId) where.NOT = { id: excludeId };

    const conflicts = [];
    if (data.classId) {
      conflicts.push((this.prisma as any).timetable.findFirst({ where: { ...where, classId: data.classId } }));
    }
    if (data.teacherId) {
      conflicts.push((this.prisma as any).timetable.findFirst({ where: { ...where, teacherId: data.teacherId } }));
    }
    if (data.room) {
      conflicts.push((this.prisma as any).timetable.findFirst({ where: { ...where, room: data.room } }));
    }

    const results = await Promise.all(conflicts);
    return results.some((r: any) => r !== null);
  }

  async listByClass(tenantId: string, classId: string, academicYearId?: string) {
    return (this.prisma as any).timetable.findMany({
      where: { tenantId, classId, ...(academicYearId && { academicYearId }) },
      include: { subject: true, teacher: true },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
    });
  }

  async listByTeacher(tenantId: string, teacherId: string, academicYearId?: string) {
    return (this.prisma as any).timetable.findMany({
      where: { tenantId, teacherId, ...(academicYearId && { academicYearId }) },
      include: { subject: true, class: true },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
    });
  }

  async update(tenantId: string, id: string, data: Partial<{ dayOfWeek: number; startTime: string; endTime: string; room?: string }>) {
    const existing = await (this.prisma as any).timetable.findUnique({ where: { id, tenantId } });
    if (!existing) throw new Error('Timetable entry not found');

    const conflict = await this.checkConflict(tenantId, { ...existing, ...data }, id);
    if (conflict) throw new Error('Schedule conflict detected');

    return (this.prisma as any).timetable.update({
      where: { id, tenantId },
      data
    });
  }

  async delete(tenantId: string, id: string) {
    return (this.prisma as any).timetable.delete({
      where: { id, tenantId }
    });
  }
}
