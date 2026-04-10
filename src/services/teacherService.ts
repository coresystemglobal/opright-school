import { PrismaClient } from "@prisma/client";
import { CacheService } from "../utils/cache";

type TeacherCreateData = {
  firstName: string;
  lastName: string;
  subject?: string | null;
};

type TeacherUpdateData = Partial<TeacherCreateData>;

export class TeacherService {
  constructor(private prisma: PrismaClient) {}

  async list(tenantId: string) {
    const cached = await CacheService.get(tenantId, "teachers");
    if (cached) return cached;

    const teachers = await this.prisma.teacher.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });

    await CacheService.set(tenantId, "teachers", teachers, 300);
    return teachers;
  }

  async create(tenantId: string, data: TeacherCreateData) {
    const teacher = await this.prisma.teacher.create({
      data: {
        tenantId,
        firstName: data.firstName,
        lastName: data.lastName,
        subject: data.subject,
      },
    });

    await CacheService.invalidate(tenantId, "teachers");
    return teacher;
  }

  async getById(tenantId: string, id: string) {
    return this.prisma.teacher.findFirst({
      where: { id, tenantId },
    });
  }

  async update(tenantId: string, id: string, data: TeacherUpdateData) {
    const teacher = await this.prisma.teacher.update({
      where: { id, tenantId },
      data,
    });

    await CacheService.invalidate(tenantId, "teachers");
    return teacher;
  }

  async delete(tenantId: string, id: string) {
    await this.prisma.teacher.delete({
      where: { id, tenantId },
    });

    await CacheService.invalidate(tenantId, "teachers");
  }
}
