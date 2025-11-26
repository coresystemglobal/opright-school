import { PrismaClient } from '@prisma/client';

export class SubjectService {
  constructor(private prisma: PrismaClient) {}

  async create(tenantId: string, data: { name: string; code?: string; description?: string; classId: string; teacherId?: string; academicYearId: string }) {
    return (this.prisma as any).subject.create({
      data: { ...data, tenantId },
      include: { class: true, teacher: true }
    });
  }

  async list(tenantId: string, filters?: { classId?: string; academicYearId?: string; teacherId?: string }) {
    return (this.prisma as any).subject.findMany({
      where: { tenantId, ...filters },
      include: { class: true, teacher: true, academicYear: true },
      orderBy: { name: 'asc' }
    });
  }

  async getById(tenantId: string, id: string) {
    return (this.prisma as any).subject.findUnique({
      where: { id, tenantId },
      include: { class: true, teacher: true, academicYear: true }
    });
  }

  async update(tenantId: string, id: string, data: Partial<{ name: string; code?: string; description?: string; teacherId?: string }>) {
    return (this.prisma as any).subject.update({
      where: { id, tenantId },
      data,
      include: { class: true, teacher: true }
    });
  }

  async delete(tenantId: string, id: string) {
    return (this.prisma as any).subject.delete({
      where: { id, tenantId }
    });
  }

  async assignTeacher(tenantId: string, subjectId: string, teacherId: string) {
    return (this.prisma as any).subject.update({
      where: { id: subjectId, tenantId },
      data: { teacherId }
    });
  }
}
