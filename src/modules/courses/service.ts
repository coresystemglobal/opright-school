import { Prisma, PrismaClient } from "@prisma/client";
import { NotFoundError } from "../../utils/errors";

type CourseFilters = {
  isPublished?: boolean;
  teacherId?: string;
};

type CourseCreateInput = {
  title: string;
  description?: string;
  thumbnail?: string;
  teacherId: string;
  subjectId?: string;
  duration?: number;
  level?: string;
  prerequisites?: unknown;
  isPublished?: boolean;
};

type CourseUpdateInput = Partial<CourseCreateInput>;

type ProgressUpdateInput = {
  enrollmentId: string;
  lessonId: string;
  completed: boolean;
  timeSpent: number;
};

export class CourseService {
  constructor(private prisma: PrismaClient) {}

  async createCourse(tenantId: string, data: CourseCreateInput) {
    return this.prisma.course.create({
      data: {
        ...data,
        tenantId,
        prerequisites: data.prerequisites as Prisma.InputJsonValue | undefined,
      },
      include: { subject: true },
    });
  }

  async getCourses(tenantId: string, filters: CourseFilters = {}) {
    return this.prisma.course.findMany({
      where: { tenantId, ...filters },
      include: {
        subject: true,
        modules: { include: { lessons: true } },
        _count: { select: { enrollments: true } },
      },
    });
  }

  async getCourse(tenantId: string, id: string) {
    return this.prisma.course.findFirst({
      where: { tenantId, id },
      include: {
        subject: true,
        modules: {
          include: { lessons: { include: { quizzes: true } } },
          orderBy: { order: "asc" },
        },
        enrollments: true,
      },
    });
  }

  async updateCourse(tenantId: string, id: string, data: CourseUpdateInput) {
    await this.ensureCourse(tenantId, id);

    return this.prisma.course.update({
      where: { id },
      data: {
        ...data,
        prerequisites:
          data.prerequisites === undefined
            ? undefined
            : (data.prerequisites as Prisma.InputJsonValue),
      },
    });
  }

  async deleteCourse(tenantId: string, id: string) {
    await this.ensureCourse(tenantId, id);
    await this.prisma.course.delete({ where: { id } });
  }

  async enrollStudent(tenantId: string, courseId: string, studentId: string) {
    await Promise.all([
      this.ensureCourse(tenantId, courseId),
      this.ensureStudent(tenantId, studentId),
    ]);

    return this.prisma.courseEnrollment.create({
      data: { tenantId, courseId, studentId },
    });
  }

  async getEnrollments(tenantId: string, studentId: string) {
    await this.ensureStudent(tenantId, studentId);

    return this.prisma.courseEnrollment.findMany({
      where: { tenantId, studentId },
      include: { course: { include: { modules: true } } },
    });
  }

  async updateProgress(tenantId: string, data: ProgressUpdateInput) {
    const [enrollment, lesson] = await Promise.all([
      this.prisma.courseEnrollment.findFirst({
        where: { id: data.enrollmentId, tenantId },
        select: { id: true },
      }),
      this.prisma.lesson.findFirst({
        where: { id: data.lessonId, tenantId },
        select: { id: true },
      }),
    ]);

    if (!enrollment) {
      throw new NotFoundError("Enrollment not found");
    }

    if (!lesson) {
      throw new NotFoundError("Lesson not found");
    }

    const progress = await this.prisma.lessonProgress.upsert({
      where: {
        enrollmentId_lessonId: {
          enrollmentId: data.enrollmentId,
          lessonId: data.lessonId,
        },
      },
      create: {
        enrollmentId: data.enrollmentId,
        lessonId: data.lessonId,
        completed: data.completed,
        timeSpent: data.timeSpent,
      },
      update: {
        completed: data.completed,
        timeSpent: data.timeSpent,
        lastAccessed: new Date(),
      },
    });

    const enrollmentWithProgress = await this.prisma.courseEnrollment.findFirst({
      where: { id: data.enrollmentId, tenantId },
      include: {
        course: {
          include: {
            modules: { include: { lessons: true } },
          },
        },
        lessonProgress: true,
      },
    });

    if (!enrollmentWithProgress) {
      throw new NotFoundError("Enrollment not found");
    }

    const totalLessons = enrollmentWithProgress.course.modules.reduce(
      (sum, module) => sum + module.lessons.length,
      0
    );
    const completedLessons = enrollmentWithProgress.lessonProgress.filter(
      (item) => item.completed
    ).length;
    const progressPercent = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

    await this.prisma.courseEnrollment.update({
      where: { id: data.enrollmentId },
      data: {
        progress: progressPercent,
        completedAt: progressPercent === 100 ? new Date() : null,
        status: progressPercent === 100 ? "COMPLETED" : "ACTIVE",
      },
    });

    return progress;
  }

  private async ensureCourse(tenantId: string, id: string) {
    const course = await this.prisma.course.findFirst({
      where: { tenantId, id },
      select: { id: true },
    });

    if (!course) {
      throw new NotFoundError("Course not found");
    }

    return course;
  }

  private async ensureStudent(tenantId: string, id: string) {
    const student = await this.prisma.student.findFirst({
      where: { tenantId, id },
      select: { id: true },
    });

    if (!student) {
      throw new NotFoundError("Student not found");
    }

    return student;
  }
}
