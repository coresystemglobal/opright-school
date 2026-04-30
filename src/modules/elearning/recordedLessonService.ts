import { PrismaClient } from "@prisma/client";
import { recalculateCourseEnrollmentProgress } from "../courses/enrollmentProgress";
import { ForbiddenError, NotFoundError } from "../../utils/errors";

const LESSON_COMPLETION_RATIO = 1;

export class RecordedLessonService {
  constructor(private prisma: PrismaClient) {}

  async getRecordedCourses(tenantId: string, userId: string) {
    const student = await this.getStudentForUser(tenantId, userId);

    const enrollments = await this.prisma.courseEnrollment.findMany({
      where: {
        tenantId,
        studentId: student.id,
        status: { not: "DROPPED" },
        course: {
          isPublished: true,
          modules: {
            some: {
              lessons: {
                some: {
                  type: "VIDEO",
                  videoUrl: { not: null },
                },
              },
            },
          },
        },
      },
      orderBy: { enrollDate: "desc" },
      include: {
        lessonProgress: true,
        course: {
          include: {
            subject: true,
            modules: {
              orderBy: { order: "asc" },
              include: {
                lessons: {
                  where: {
                    type: "VIDEO",
                    videoUrl: { not: null },
                  },
                  orderBy: { order: "asc" },
                },
              },
            },
          },
        },
      },
    });

    return enrollments
      .map((enrollment) => {
        const progressByLessonId = new Map(
          enrollment.lessonProgress.map((item) => [item.lessonId, item])
        );

        const modules = enrollment.course.modules
          .map((module) => ({
            ...module,
            lessons: module.lessons.map((lesson) => {
              const progress = progressByLessonId.get(lesson.id);
              return {
                ...lesson,
                progress: {
                  completed: progress?.completed ?? false,
                  timeSpent: progress?.timeSpent ?? 0,
                  lastAccessed: progress?.lastAccessed ?? null,
                },
              };
            }),
          }))
          .filter((module) => module.lessons.length > 0);

        return {
          id: enrollment.course.id,
          title: enrollment.course.title,
          description: enrollment.course.description,
          thumbnail: enrollment.course.thumbnail,
          teacherId: enrollment.course.teacherId,
          subjectId: enrollment.course.subjectId,
          subject: enrollment.course.subject,
          duration: enrollment.course.duration,
          level: enrollment.course.level,
          isPublished: enrollment.course.isPublished,
          enrollmentId: enrollment.id,
          enrollmentProgress: enrollment.progress,
          enrollmentStatus: enrollment.status,
          modules,
        };
      })
      .filter((course) => course.modules.length > 0);
  }

  async syncLessonProgress(
    tenantId: string,
    userId: string,
    lessonId: string,
    watchedSeconds: number
  ) {
    const student = await this.getStudentForUser(tenantId, userId);

    const lesson = await this.prisma.lesson.findFirst({
      where: {
        id: lessonId,
        tenantId,
        type: "VIDEO",
        videoUrl: { not: null },
        module: {
          course: {
            tenantId,
            isPublished: true,
          },
        },
      },
      include: {
        module: {
          include: {
            course: {
              select: { id: true },
            },
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundError("Recorded lesson not found");
    }

    const enrollment = await this.prisma.courseEnrollment.findFirst({
      where: {
        tenantId,
        courseId: lesson.module.course.id,
        studentId: student.id,
        status: { not: "DROPPED" },
      },
      select: { id: true },
    });

    if (!enrollment) {
      throw new ForbiddenError("You are not enrolled in this course");
    }

    const existing = await this.prisma.lessonProgress.findUnique({
      where: {
        enrollmentId_lessonId: {
          enrollmentId: enrollment.id,
          lessonId,
        },
      },
    });

    const safeWatchedSeconds = Math.max(0, Math.floor(watchedSeconds));
    const watchedMinutes = Math.max(existing?.timeSpent ?? 0, Math.floor(safeWatchedSeconds / 60));
    const thresholdSeconds = Math.ceil((lesson.duration ?? 0) * 60 * LESSON_COMPLETION_RATIO);
    const completed =
      existing?.completed === true ||
      (lesson.duration ? safeWatchedSeconds >= thresholdSeconds : false);

    const lessonProgress = await this.prisma.lessonProgress.upsert({
      where: {
        enrollmentId_lessonId: {
          enrollmentId: enrollment.id,
          lessonId,
        },
      },
      create: {
        enrollmentId: enrollment.id,
        lessonId,
        completed,
        timeSpent: watchedMinutes,
      },
      update: {
        completed,
        timeSpent: watchedMinutes,
        lastAccessed: new Date(),
      },
    });

    const enrollmentProgress = await recalculateCourseEnrollmentProgress(
      this.prisma,
      tenantId,
      enrollment.id
    );

    return {
      lessonId,
      lessonProgress: {
        completed: lessonProgress.completed,
        timeSpent: lessonProgress.timeSpent,
        lastAccessed: lessonProgress.lastAccessed,
      },
      enrollment: {
        id: enrollmentProgress.id,
        progress: enrollmentProgress.progress,
        status: enrollmentProgress.status,
        completedAt: enrollmentProgress.completedAt,
      },
    };
  }

  private async getStudentForUser(tenantId: string, userId: string) {
    const student = await this.prisma.student.findFirst({
      where: { tenantId, userId },
      select: { id: true },
    });

    if (!student) {
      throw new ForbiddenError("Student access required");
    }

    return student;
  }
}
