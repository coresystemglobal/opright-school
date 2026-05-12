import { PrismaClient } from "@prisma/client";
import { CacheService } from "../../utils/cache";

type TeacherCreateData = {
  firstName: string;
  lastName: string;
  subject?: string | null;
  email?: string | null;
  phone?: string | null;
  gender?: "MALE" | "FEMALE" | null;
  dob?: Date | null;
  address?: string | null;
  photoUrl?: string | null;
  employeeId?: string | null;
  qualification?: string | null;
  bio?: string | null;
  employmentDate?: Date | null;
  employmentStatus?: "FULL_TIME" | "PART_TIME" | "CONTRACT";
  userId?: string | null;
};

type TeacherUpdateData = Partial<TeacherCreateData>;

const selectFields = {
  id: true,
  tenantId: true,
  userId: true,
  firstName: true,
  lastName: true,
  subject: true,
  email: true,
  phone: true,
  gender: true,
  dob: true,
  address: true,
  photoUrl: true,
  employeeId: true,
  qualification: true,
  bio: true,
  employmentDate: true,
  employmentStatus: true,
  createdAt: true,
  updatedAt: true,
} as const;

export class TeacherService {
  constructor(private prisma: PrismaClient) {}

  async list(tenantId: string) {
    const cached = await CacheService.get(tenantId, "teachers");
    if (cached) return cached;

    const teachers = await this.prisma.teacher.findMany({
      where: { tenantId },
      select: selectFields,
      orderBy: { createdAt: "desc" },
    });

    await CacheService.set(tenantId, "teachers", teachers, 300);
    return teachers;
  }

  async create(tenantId: string, data: TeacherCreateData) {
    const teacher = await this.prisma.teacher.create({
      data: { tenantId, ...data },
    });

    await CacheService.invalidate(tenantId, "teachers");
    return teacher;
  }

  async getById(tenantId: string, id: string) {
    return this.prisma.teacher.findFirst({
      where: { id, tenantId },
      include: {
        classes: { select: { id: true, name: true, level: true, _count: { select: { enrollments: true } } }, orderBy: { name: "asc" } },
        subjects: { select: { id: true, name: true, code: true }, orderBy: { name: "asc" } },
        timetables: { select: { id: true, dayOfWeek: true, startTime: true, endTime: true, room: true, subject: { select: { name: true } }, class: { select: { name: true } } }, orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] },
      },
    });
  }

  async getByUserId(tenantId: string, userId: string) {
    return this.prisma.teacher.findFirst({
      where: { tenantId, userId },
      include: {
        classes: { select: { id: true, name: true, level: true, _count: { select: { enrollments: true } } }, orderBy: { name: "asc" } },
        subjects: { select: { id: true, name: true, code: true }, orderBy: { name: "asc" } },
        timetables: { select: { id: true, dayOfWeek: true, startTime: true, endTime: true, room: true, subject: { select: { name: true } }, class: { select: { name: true } } }, orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] },
      },
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
