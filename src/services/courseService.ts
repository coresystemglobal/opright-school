import prisma from '../prisma/client';

export class CourseService {
  static async createCourse(tenantId: string, data: any) {
    return prisma.course.create({
      data: { ...data, tenantId },
      include: { subject: true }
    });
  }

  static async getCourses(tenantId: string, filters?: any) {
    return prisma.course.findMany({
      where: { tenantId, ...filters },
      include: { subject: true, modules: { include: { lessons: true } }, _count: { select: { enrollments: true } } }
    });
  }

  static async getCourse(tenantId: string, id: string) {
    return prisma.course.findFirst({
      where: { tenantId, id },
      include: { subject: true, modules: { include: { lessons: { include: { quizzes: true } } }, orderBy: { order: 'asc' } }, enrollments: true }
    });
  }

  static async updateCourse(tenantId: string, id: string, data: any) {
    return prisma.course.update({
      where: { id },
      data
    });
  }

  static async deleteCourse(tenantId: string, id: string) {
    return prisma.course.delete({ where: { id } });
  }

  static async enrollStudent(tenantId: string, courseId: string, studentId: string) {
    return prisma.courseEnrollment.create({
      data: { tenantId, courseId, studentId }
    });
  }

  static async getEnrollments(tenantId: string, studentId: string) {
    return prisma.courseEnrollment.findMany({
      where: { tenantId, studentId },
      include: { course: { include: { modules: true } } }
    });
  }

  static async updateProgress(enrollmentId: string, lessonId: string, completed: boolean, timeSpent: number) {
    const progress = await prisma.lessonProgress.upsert({
      where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
      create: { enrollmentId, lessonId, completed, timeSpent },
      update: { completed, timeSpent, lastAccessed: new Date() }
    });

    const enrollment = await prisma.courseEnrollment.findUnique({
      where: { id: enrollmentId },
      include: { course: { include: { modules: { include: { lessons: true } } } }, lessonProgress: true }
    });

    const totalLessons = enrollment!.course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
    const completedLessons = enrollment!.lessonProgress.filter(p => p.completed).length;
    const progressPercent = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

    await prisma.courseEnrollment.update({
      where: { id: enrollmentId },
      data: { progress: progressPercent, completedAt: progressPercent === 100 ? new Date() : null, status: progressPercent === 100 ? 'COMPLETED' : 'ACTIVE' }
    });

    return progress;
  }
}
