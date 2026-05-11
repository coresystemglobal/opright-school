import { PrismaClient } from '@prisma/client';
import { ForbiddenError, NotFoundError } from '../../utils/errors';

export class StudentElearningService {
  constructor(private prisma: PrismaClient) {}

  private async resolveStudent(tenantId: string, userId: string) {
    const student = await this.prisma.student.findFirst({
      where: { tenantId, userId },
      select: { id: true, firstName: true, lastName: true, studentCode: true },
    });
    if (!student) throw new ForbiddenError('Student access required');
    return student;
  }

  async getMyCourses(tenantId: string, userId: string) {
    const student = await this.resolveStudent(tenantId, userId);

    const enrollments = await this.prisma.courseEnrollment.findMany({
      where: { tenantId, studentId: student.id, status: { not: 'DROPPED' } },
      orderBy: { enrollDate: 'desc' },
      include: {
        lessonProgress: true,
        course: {
          include: {
            teacher: { select: { id: true, firstName: true, lastName: true } },
            subject: { select: { id: true, name: true, code: true } },
            modules: {
              orderBy: { order: 'asc' },
              include: {
                lessons: { orderBy: { order: 'asc' }, select: { id: true, title: true, type: true, duration: true, order: true } },
              },
            },
            _count: { select: { enrollments: true } },
          },
        },
      },
    });

    return enrollments.map((enrollment) => {
      const progressByLessonId = new Map(enrollment.lessonProgress.map((p) => [p.lessonId, p]));
      return {
        enrollmentId: enrollment.id,
        enrollmentStatus: enrollment.status,
        enrollmentProgress: enrollment.progress,
        completedAt: enrollment.completedAt,
        course: {
          ...enrollment.course,
          modules: enrollment.course.modules.map((mod) => ({
            ...mod,
            lessons: mod.lessons.map((lesson) => {
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
          })),
        },
      };
    });
  }

  async getCourse(tenantId: string, userId: string, courseId: string) {
    const student = await this.resolveStudent(tenantId, userId);

    const enrollment = await this.prisma.courseEnrollment.findFirst({
      where: { tenantId, studentId: student.id, courseId, status: { not: 'DROPPED' } },
      include: { lessonProgress: true },
    });

    if (!enrollment) throw new ForbiddenError('You are not enrolled in this course');

    const course = await this.prisma.course.findFirst({
      where: { tenantId, id: courseId, isPublished: true },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
        subject: { select: { id: true, name: true, code: true } },
        modules: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              include: { quizzes: { select: { id: true, title: true, status: true, durationMinutes: true, passMark: true, attemptLimit: true } } },
            },
          },
        },
      },
    });

    if (!course) throw new NotFoundError('Course not found');

    const progressByLessonId = new Map(enrollment.lessonProgress.map((p) => [p.lessonId, p]));

    return {
      enrollmentId: enrollment.id,
      enrollmentStatus: enrollment.status,
      enrollmentProgress: enrollment.progress,
      completedAt: enrollment.completedAt,
      course: {
        ...course,
        modules: course.modules.map((mod) => ({
          ...mod,
          lessons: mod.lessons.map((lesson) => {
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
        })),
      },
    };
  }

  async getUpcomingLiveClasses(tenantId: string, userId: string) {
    const student = await this.resolveStudent(tenantId, userId);

    // Get subjects the student is enrolled in (via class enrollments)
    const classEnrollments = await this.prisma.enrollment.findMany({
      where: { tenantId, studentId: student.id },
      select: { classId: true },
    });
    const classIds = classEnrollments.map((e) => e.classId);

    const subjectIds = classIds.length
      ? (await this.prisma.subject.findMany({
          where: { tenantId, classId: { in: classIds } },
          select: { id: true },
        })).map((s) => s.id)
      : [];

    // Live classes tied to those subjects, or unfiltered ones (no subjectId)
    const liveClasses = await this.prisma.liveClass.findMany({
      where: {
        tenantId,
        status: { in: ['SCHEDULED', 'LIVE'] },
        OR: [
          ...(subjectIds.length ? [{ subjectId: { in: subjectIds } }] : []),
          { subjectId: null },
        ],
      },
      orderBy: { scheduledAt: 'asc' },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
        subject: { select: { id: true, name: true, code: true } },
        _count: { select: { attendance: true } },
      },
    });

    // Tag each class with whether the student has already joined
    const attendedClassIds = new Set(
      (await this.prisma.liveClassAttendance.findMany({
        where: { classId: { in: liveClasses.map((c) => c.id) }, studentId: student.id },
        select: { classId: true },
      })).map((a) => a.classId)
    );

    return liveClasses.map((c) => ({ ...c, attended: attendedClassIds.has(c.id) }));
  }

  async getMyQuizzes(tenantId: string, userId: string) {
    const student = await this.resolveStudent(tenantId, userId);

    // Collect courseIds from active enrollments
    const courseEnrollments = await this.prisma.courseEnrollment.findMany({
      where: { tenantId, studentId: student.id, status: { not: 'DROPPED' } },
      select: { courseId: true, id: true },
    });
    const courseIds = courseEnrollments.map((e) => e.courseId);

    // Collect subjectIds from class enrollments
    const classEnrollments = await this.prisma.enrollment.findMany({
      where: { tenantId, studentId: student.id },
      select: { classId: true },
    });
    const classIds = classEnrollments.map((e) => e.classId);
    const subjectIds = classIds.length
      ? (await this.prisma.subject.findMany({
          where: { tenantId, classId: { in: classIds } },
          select: { id: true },
        })).map((s) => s.id)
      : [];

    const now = new Date();

    const quizzes = await this.prisma.quiz.findMany({
      where: {
        tenantId,
        status: 'PUBLISHED',
        OR: [
          // Lesson quizzes in enrolled courses
          ...(courseIds.length ? [{ placement: 'LESSON' as const, courseId: { in: courseIds } }] : []),
          // Academic quizzes in enrolled subjects
          ...(subjectIds.length ? [{ placement: 'ACADEMIC' as const, subjectId: { in: subjectIds } }] : []),
        ],
        AND: [
          { OR: [{ availableFrom: null }, { availableFrom: { lte: now } }] },
          { OR: [{ availableUntil: null }, { availableUntil: { gte: now } }] },
        ],
      },
      select: {
        id: true, title: true, description: true, placement: true,
        durationMinutes: true, attemptLimit: true, passMark: true,
        availableFrom: true, availableUntil: true, courseId: true, subjectId: true,
      },
      orderBy: { availableFrom: 'asc' },
    });

    // Attach attempt counts per quiz for this student
    const quizIds = quizzes.map((q) => q.id);
    const attempts = quizIds.length
      ? await this.prisma.quizAttempt.groupBy({
          by: ['quizId'],
          where: { quizId: { in: quizIds }, submittedForStudentId: student.id },
          _count: { quizId: true },
          _max: { score: true, passed: true },
        })
      : [];

    const attemptsByQuizId = new Map(attempts.map((a) => [a.quizId, a]));

    return quizzes.map((q) => {
      const attempt = attemptsByQuizId.get(q.id);
      return {
        ...q,
        attempts: attempt?._count.quizId ?? 0,
        bestScore: attempt?._max.score ?? null,
        passed: attempt?._max.passed ?? false,
      };
    });
  }
}
