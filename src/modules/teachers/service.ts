import { PrismaClient } from "@prisma/client";
import { CacheService } from "../../utils/cache";

type TeacherCreateData = {
  firstName: string;
  lastName: string;
  subject?: string | null;
  email?: string | null;
  roleId?: string | null;
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
      include: { user: { include: { role: true } } }
    });

    await CacheService.set(tenantId, "teachers", teachers, 300);
    return teachers;
  }

  async create(tenantId: string, data: TeacherCreateData) {
    let user = null;

    if (data.email && data.roleId) {
      const bcrypt = require('bcryptjs');
      const password = await bcrypt.hash('welcome123', 10);
      user = await this.prisma.user.create({
        data: {
          tenantId,
          email: data.email,
          password,
          roleId: data.roleId,
          firstName: data.firstName,
          lastName: data.lastName,
          mustChangePassword: true,
          emailVerified: true
        }
      });
    }

    const teacher = await this.prisma.teacher.create({
      data: {
        tenantId,
        firstName: data.firstName,
        lastName: data.lastName,
        subject: data.subject,
        email: data.email,
        userId: user ? user.id : undefined,
      },
      include: { user: { include: { role: true } } }
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
