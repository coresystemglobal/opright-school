import { PrismaClient } from '@prisma/client';
import { UnauthorizedError } from '../../utils/errors';

type TeacherProfileUpdateData = {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  gender?: string | null;
  dob?: Date | null;
  address?: string | null;
  qualification?: string | null;
  bio?: string | null;
  photoUrl?: string | null;
};

export class TeacherSelfService {
  constructor(private prisma: PrismaClient) {}

  private async resolveTeacher(tenantId: string, userId: string) {
    const teacher = await this.prisma.teacher.findFirst({
      where: { tenantId, userId },
    });
    if (!teacher) throw new UnauthorizedError('No teacher record linked to this account');
    return teacher;
  }

  async getProfile(tenantId: string, userId: string) {
    const teacher = await this.prisma.teacher.findFirst({
      where: { tenantId, userId },
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
          orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        },
      },
    });
    if (!teacher) throw new UnauthorizedError('No teacher record linked to this account');
    return teacher;
  }

  async updateProfile(tenantId: string, userId: string, data: TeacherProfileUpdateData) {
    const teacher = await this.resolveTeacher(tenantId, userId);
    return this.prisma.teacher.update({
      where: { id: teacher.id },
      data,
    });
  }

  async getTimetable(tenantId: string, userId: string, academicYearId?: string) {
    const teacher = await this.resolveTeacher(tenantId, userId);

    const timetable = await this.prisma.timetable.findMany({
      where: {
        tenantId,
        teacherId: teacher.id,
        ...(academicYearId ? { academicYearId } : {}),
      },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        class: { select: { id: true, name: true, level: true } },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    return { teacher: { id: teacher.id, firstName: teacher.firstName, lastName: teacher.lastName }, timetable };
  }

  async getClasses(tenantId: string, userId: string) {
    const teacher = await this.resolveTeacher(tenantId, userId);

    const classes = await this.prisma.class.findMany({
      where: { tenantId, teacherId: teacher.id },
      select: {
        id: true,
        name: true,
        level: true,
        enrollments: { select: { id: true }, where: { tenantId } },
      },
      orderBy: { name: 'asc' },
    });

    return {
      teacher: { id: teacher.id, firstName: teacher.firstName, lastName: teacher.lastName },
      classes: classes.map((c) => ({ ...c, studentCount: c.enrollments.length, enrollments: undefined })),
    };
  }

  async getSubjects(tenantId: string, userId: string, academicYearId?: string) {
    const teacher = await this.resolveTeacher(tenantId, userId);

    const subjects = await this.prisma.subject.findMany({
      where: {
        tenantId,
        teacherId: teacher.id,
        ...(academicYearId ? { academicYearId } : {}),
      },
      include: {
        class: { select: { id: true, name: true, level: true } },
        academicYear: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });

    return {
      teacher: { id: teacher.id, firstName: teacher.firstName, lastName: teacher.lastName },
      subjects,
    };
  }
}
