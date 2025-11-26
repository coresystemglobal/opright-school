import { PrismaClient } from '@prisma/client';

export class AcademicYearService {
  constructor(private prisma: PrismaClient) {}

  async create(tenantId: string, data: { name: string; startDate: Date; endDate: Date; isCurrent?: boolean }) {
    if (data.isCurrent) {
      await this.prisma.academicYear.updateMany({
        where: { tenantId, isCurrent: true },
        data: { isCurrent: false }
      });
    }
    return this.prisma.academicYear.create({
      data: { ...data, tenantId }
    });
  }

  async list(tenantId: string) {
    return this.prisma.academicYear.findMany({
      where: { tenantId },
      include: { terms: true },
      orderBy: { startDate: 'desc' }
    });
  }

  async getCurrent(tenantId: string) {
    return this.prisma.academicYear.findFirst({
      where: { tenantId, isCurrent: true },
      include: { terms: true }
    });
  }

  async update(tenantId: string, id: string, data: Partial<{ name: string; startDate: Date; endDate: Date; isCurrent: boolean }>) {
    if (data.isCurrent) {
      await this.prisma.academicYear.updateMany({
        where: { tenantId, isCurrent: true, NOT: { id } },
        data: { isCurrent: false }
      });
    }
    return this.prisma.academicYear.update({
      where: { id, tenantId },
      data
    });
  }

  async delete(tenantId: string, id: string) {
    return this.prisma.academicYear.delete({
      where: { id, tenantId }
    });
  }
}
