import { PrismaClient } from '@prisma/client';

export class TermService {
  constructor(private prisma: PrismaClient) {}

  async create(tenantId: string, data: { name: string; academicYearId: string; startDate: Date; endDate: Date; isCurrent?: boolean }) {
    if (data.isCurrent) {
      await this.prisma.term.updateMany({
        where: { tenantId, academicYearId: data.academicYearId, isCurrent: true },
        data: { isCurrent: false }
      });
    }
    return this.prisma.term.create({
      data: { ...data, tenantId }
    });
  }

  async list(tenantId: string, academicYearId?: string) {
    return this.prisma.term.findMany({
      where: { tenantId, ...(academicYearId && { academicYearId }) },
      include: { academicYear: true },
      orderBy: { startDate: 'asc' }
    });
  }

  async getCurrent(tenantId: string) {
    return this.prisma.term.findFirst({
      where: { tenantId, isCurrent: true },
      include: { academicYear: true }
    });
  }

  async update(tenantId: string, id: string, data: Partial<{ name: string; startDate: Date; endDate: Date; isCurrent: boolean }>) {
    if (data.isCurrent) {
      const term = await this.prisma.term.findUnique({ where: { id } });
      if (term) {
        await this.prisma.term.updateMany({
          where: { tenantId, academicYearId: term.academicYearId, isCurrent: true, NOT: { id } },
          data: { isCurrent: false }
        });
      }
    }
    return this.prisma.term.update({
      where: { id, tenantId },
      data
    });
  }

  async delete(tenantId: string, id: string) {
    return this.prisma.term.delete({
      where: { id, tenantId }
    });
  }
}
