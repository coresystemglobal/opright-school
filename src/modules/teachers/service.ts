import { PrismaClient } from "@prisma/client";
import { CacheService } from "../../utils/cache";

type TeacherCreateData = {
  firstName: string;
  lastName: string;
  subject?: string | null;
  employeeId?: string | null;
  email?: string | null;
  phone?: string | null;
  gender?: string | null;
  dob?: Date | null;
  address?: string | null;
  qualification?: string | null;
  bio?: string | null;
  photoUrl?: string | null;
  employmentDate?: Date | null;
  employmentStatus?: string | null;
  userId?: string | null;
};

type TeacherUpdateData = Partial<TeacherCreateData>;

export class TeacherService {
  constructor(private prisma: PrismaClient) {}

  async list(tenantId: string) {
    const cached = await CacheService.get(tenantId, "teachers");
    if (cached) return cached;

    const teachers = await this.prisma.teacher.findMany({
      where: { tenantId },
      select: {
        id: true,
        tenantId: true,
        userId: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        subject: true,
        email: true,
        phone: true,
        gender: true,
        dob: true,
        qualification: true,
        employmentStatus: true,
        photoUrl: true,
        createdAt: true,
        updatedAt: true,
      },
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
        employeeId: data.employeeId,
        email: data.email,
        phone: data.phone,
        gender: data.gender,
        dob: data.dob,
        address: data.address,
        qualification: data.qualification,
        bio: data.bio,
        photoUrl: data.photoUrl,
        employmentDate: data.employmentDate,
        employmentStatus: data.employmentStatus,
        ...(data.userId ? { userId: data.userId } : {}),
      },
    });

    await CacheService.invalidate(tenantId, "teachers");
    return teacher;
  }

  async getById(tenantId: string, id: string) {
    return this.prisma.teacher.findFirst({
      where: { id, tenantId },
      include: {
        classes: { select: { id: true, name: true, level: true } },
        subjects: { select: { id: true, name: true, code: true } },
        timetables: {
          select: {
            id: true,
            dayOfWeek: true,
            startTime: true,
            endTime: true,
            room: true,
            subject: { select: { id: true, name: true, code: true } },
            class: { select: { id: true, name: true } },
          },
          orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
        },
      },
    });
  }

  async getByUserId(tenantId: string, userId: string) {
    return this.prisma.teacher.findFirst({
      where: { tenantId, userId },
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
