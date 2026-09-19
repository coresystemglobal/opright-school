import { PrismaClient } from "@prisma/client";
import { CacheService } from "../../utils/cache";

type TeacherCreateData = {
  firstName: string;
  lastName: string;
  subject?: string | null;
  userId?: string | null;
  phone?: string | null;
  email?: string | null;
  bio?: string | null;
  qualification?: string | null;
  employmentDate?: Date | null;
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
      include: {
        _count: { select: { subjects: true, courses: true, timetables: true } },
      },
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
        userId: data.userId,
        phone: data.phone,
        email: data.email,
        bio: data.bio,
        qualification: data.qualification,
        employmentDate: data.employmentDate,
      },
      include: { user: { include: { role: true } } }
    });

    await CacheService.invalidate(tenantId, "teachers");
    return teacher;
  }

  async getById(tenantId: string, id: string) {
    return this.prisma.teacher.findFirst({
      where: { id, tenantId },
      include: {
        user: { select: { id: true, email: true } },
        _count: { select: { subjects: true, courses: true, timetables: true, classes: true } },
      },
    });
  }

  async getByUserId(tenantId: string, userId: string) {
    return this.prisma.teacher.findFirst({
      where: { userId, tenantId },
      include: {
        user: { select: { id: true, email: true } },
        _count: { select: { subjects: true, courses: true, timetables: true, classes: true } },
      },
    });
  }

  async getProfile(tenantId: string, id: string) {
    return this.prisma.teacher.findFirst({
      where: { id, tenantId },
      include: {
        user: { select: { id: true, email: true } },
        classes: { select: { id: true, name: true, level: true } },
        subjects: {
          select: {
            id: true,
            name: true,
            code: true,
            class: { select: { id: true, name: true } },
            academicYear: { select: { id: true, name: true } },
          },
        },
        timetables: {
          select: {
            id: true,
            dayOfWeek: true,
            startTime: true,
            endTime: true,
            room: true,
            subject: { select: { id: true, name: true } },
            class: { select: { id: true, name: true } },
            academicYear: { select: { id: true, name: true } },
          },
          orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
        },
        courses: {
          select: { id: true, title: true, isPublished: true, level: true },
          orderBy: { createdAt: "desc" },
        },
        _count: { select: { subjects: true, courses: true, timetables: true, classes: true } },
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

  async getSubjects(tenantId: string, teacherId: string, academicYearId?: string) {
    return this.prisma.subject.findMany({
      where: {
        tenantId,
        teacherId,
        ...(academicYearId ? { academicYearId } : {}),
      },
      include: {
        class: { select: { id: true, name: true, level: true } },
        academicYear: { select: { id: true, name: true } },
        _count: { select: { assignments: true, examinations: true } },
      },
      orderBy: [{ academicYear: { startDate: "desc" } }, { name: "asc" }],
    });
  }

  async getTimetable(tenantId: string, teacherId: string, academicYearId?: string) {
    return this.prisma.timetable.findMany({
      where: {
        tenantId,
        teacherId,
        ...(academicYearId ? { academicYearId } : {}),
      },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        class: { select: { id: true, name: true, level: true } },
        academicYear: { select: { id: true, name: true } },
      },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });
  }

  async getStudents(tenantId: string, teacherId: string) {
    // Collect classIds from: homeroom classes + classes where teacher has subjects
    const [homeroomClasses, subjectClasses] = await Promise.all([
      this.prisma.class.findMany({
        where: { tenantId, teacherId },
        select: { id: true },
      }),
      this.prisma.subject.findMany({
        where: { tenantId, teacherId },
        select: { classId: true },
        distinct: ["classId"],
      }),
    ]);

    const classIds = [
      ...new Set([
        ...homeroomClasses.map((c) => c.id),
        ...subjectClasses.map((s) => s.classId),
      ]),
    ];

    if (!classIds.length) return [];

    const enrollments = await this.prisma.enrollment.findMany({
      where: { tenantId, classId: { in: classIds } },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            studentCode: true,
            status: true,
          },
        },
        class: { select: { id: true, name: true } },
      },
      orderBy: [{ class: { name: "asc" } }, { student: { lastName: "asc" } }],
    });

    // Deduplicate students (same student may be in multiple matching classes)
    const seen = new Set<string>();
    return enrollments.filter((e) => {
      if (seen.has(e.student.id)) return false;
      seen.add(e.student.id);
      return true;
    });
  }

  async getCourses(tenantId: string, teacherId: string) {
    return this.prisma.course.findMany({
      where: { tenantId, teacherId },
      include: {
        subject: { select: { id: true, name: true } },
        _count: { select: { modules: true, enrollments: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
