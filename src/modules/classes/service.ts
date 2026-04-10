import { PrismaClient } from "@prisma/client";

type ClassCreateData = {
  name: string;
  level?: string | null;
  teacherId?: string | null;
};

type ClassUpdateData = Partial<ClassCreateData>;

export class ClassService {
  constructor(private prisma: PrismaClient) {}

  async list(tenantId: string) {
    return this.prisma.class.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(tenantId: string, data: ClassCreateData) {
    return this.prisma.class.create({
      data: {
        tenantId,
        name: data.name,
        level: data.level,
        teacherId: data.teacherId,
      },
    });
  }

  async enrollStudent(tenantId: string, classId: string, studentId: string) {
    return this.prisma.enrollment.create({
      data: {
        tenantId,
        classId,
        studentId,
      },
    });
  }

  async update(tenantId: string, id: string, data: ClassUpdateData) {
    return this.prisma.class.update({
      where: { id, tenantId },
      data,
    });
  }

  async delete(tenantId: string, id: string) {
    await this.prisma.class.delete({
      where: { id, tenantId },
    });
  }
}
