import { Prisma, PrismaClient } from "@prisma/client";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { recalculateCourseEnrollmentProgress } from "./enrollmentProgress";

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

type ModuleCreateInput = {
  title: string;
  description?: string;
};

type ModuleUpdateInput = Partial<ModuleCreateInput>;

type LessonCreateInput =
  | {
      type: "VIDEO";
      title: string;
      content?: string;
      videoUrl: string;
      duration: number;
    }
  | {
      type: "QUIZ";
      title: string;
      content?: string;
    };

type LessonUpdateInput = {
  title?: string;
  content?: string;
  videoUrl?: string;
  duration?: number;
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
        modules: {
          orderBy: { order: "asc" },
          include: {
            lessons: {
              orderBy: { order: "asc" },
            },
          },
        },
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
          include: {
            lessons: {
              include: { quizzes: true },
              orderBy: { order: "asc" },
            },
          },
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

  async createModule(tenantId: string, courseId: string, data: ModuleCreateInput) {
    await this.ensureCourse(tenantId, courseId);

    const maxOrder = await this.prisma.courseModule.aggregate({
      where: { courseId },
      _max: { order: true },
    });

    return this.prisma.courseModule.create({
      data: {
        courseId,
        title: data.title,
        description: data.description,
        order: (maxOrder._max.order ?? 0) + 1,
      },
      include: {
        lessons: {
          orderBy: { order: "asc" },
        },
      },
    });
  }

  async updateModule(
    tenantId: string,
    courseId: string,
    moduleId: string,
    data: ModuleUpdateInput
  ) {
    await this.ensureModule(tenantId, courseId, moduleId);

    return this.prisma.courseModule.update({
      where: { id: moduleId },
      data,
      include: {
        lessons: {
          orderBy: { order: "asc" },
        },
      },
    });
  }

  async reorderModules(tenantId: string, courseId: string, moduleIds: string[]) {
    const modules = await this.prisma.courseModule.findMany({
      where: {
        course: {
          id: courseId,
          tenantId,
        },
      },
      select: { id: true },
      orderBy: { order: "asc" },
    });

    this.assertExactOrdering(
      modules.map((module) => module.id),
      moduleIds,
      "module"
    );

    await this.prisma.$transaction(
      moduleIds.map((id, index) =>
        this.prisma.courseModule.update({
          where: { id },
          data: { order: index + 1 },
        })
      )
    );

    return this.getCourse(tenantId, courseId);
  }

  async deleteModule(tenantId: string, courseId: string, moduleId: string) {
    await this.ensureModule(tenantId, courseId, moduleId);

    await this.prisma.courseModule.delete({
      where: { id: moduleId },
    });

    await this.resequenceModules(courseId);
  }

  async createLesson(
    tenantId: string,
    courseId: string,
    moduleId: string,
    data: LessonCreateInput
  ) {
    await this.ensureModule(tenantId, courseId, moduleId);

    const maxOrder = await this.prisma.lesson.aggregate({
      where: { tenantId, moduleId },
      _max: { order: true },
    });

    return this.prisma.lesson.create({
      data: {
        tenantId,
        moduleId,
        title: data.title,
        content: data.content,
        type: data.type,
        videoUrl: data.type === "VIDEO" ? data.videoUrl : null,
        duration: data.type === "VIDEO" ? data.duration : null,
        order: (maxOrder._max.order ?? 0) + 1,
      },
    });
  }

  async updateLesson(
    tenantId: string,
    courseId: string,
    moduleId: string,
    lessonId: string,
    data: LessonUpdateInput
  ) {
    await this.ensureLesson(tenantId, courseId, moduleId, lessonId);

    const lesson = await this.prisma.lesson.findFirst({
      where: { id: lessonId, tenantId, moduleId },
      select: { type: true },
    });

    if (!lesson) {
      throw new NotFoundError("Lesson not found");
    }

    if (lesson.type === "VIDEO" && (!data.videoUrl || data.duration === undefined) && (data.videoUrl !== undefined || data.duration !== undefined)) {
      if (data.videoUrl === undefined || data.duration === undefined) {
        throw new ValidationError("Video lessons require both videoUrl and duration");
      }
    }

    return this.prisma.lesson.update({
      where: { id: lessonId },
      data: {
        title: data.title,
        content: data.content,
        videoUrl: lesson.type === "VIDEO" ? data.videoUrl : undefined,
        duration: lesson.type === "VIDEO" ? data.duration : undefined,
      },
    });
  }

  async reorderRecordedLessons(
    tenantId: string,
    courseId: string,
    moduleId: string,
    lessonIds: string[]
  ) {
    await this.ensureModule(tenantId, courseId, moduleId);

    const lessons = await this.prisma.lesson.findMany({
      where: { tenantId, moduleId },
      select: { id: true },
      orderBy: { order: "asc" },
    });

    this.assertExactOrdering(
      lessons.map((lesson) => lesson.id),
      lessonIds,
      "lesson"
    );

    await this.prisma.$transaction(
      lessonIds.map((id, index) =>
        this.prisma.lesson.update({
          where: { id },
          data: { order: index + 1 },
        })
      )
    );

    return this.getCourse(tenantId, courseId);
  }

  async deleteRecordedLesson(
    tenantId: string,
    courseId: string,
    moduleId: string,
    lessonId: string
  ) {
    await this.ensureLesson(tenantId, courseId, moduleId, lessonId);

    await this.prisma.lesson.delete({
      where: { id: lessonId },
    });

    await this.resequenceLessons(tenantId, moduleId);
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
        select: { id: true, courseId: true, status: true },
      }),
      this.prisma.lesson.findFirst({
        where: { id: data.lessonId, tenantId },
        select: {
          id: true,
          type: true,
          duration: true,
          module: {
            select: {
              courseId: true,
            },
          },
        },
      }),
    ]);

    if (!enrollment) {
      throw new NotFoundError("Enrollment not found");
    }

    if (!lesson) {
      throw new NotFoundError("Lesson not found");
    }

    if (enrollment.status === "DROPPED") {
      throw new ValidationError("Cannot update progress for a dropped enrollment");
    }

    if (lesson.module.courseId !== enrollment.courseId) {
      throw new ValidationError("Lesson does not belong to the enrollment course");
    }

    const existing = await this.prisma.lessonProgress.findUnique({
      where: {
        enrollmentId_lessonId: {
          enrollmentId: data.enrollmentId,
          lessonId: data.lessonId,
        },
      },
    });

    const timeSpent = Math.max(existing?.timeSpent ?? 0, data.timeSpent);
    const completed =
      existing?.completed === true ||
      (lesson.type === "VIDEO" && lesson.duration
        ? timeSpent >= lesson.duration
        : data.completed);

    const lessonProgress = await this.prisma.lessonProgress.upsert({
      where: {
        enrollmentId_lessonId: {
          enrollmentId: data.enrollmentId,
          lessonId: data.lessonId,
        },
      },
      create: {
        enrollmentId: data.enrollmentId,
        lessonId: data.lessonId,
        completed,
        timeSpent,
      },
      update: {
        completed,
        timeSpent,
        lastAccessed: new Date(),
      },
    });

    const enrollmentProgress = await recalculateCourseEnrollmentProgress(
      this.prisma,
      tenantId,
      data.enrollmentId
    );

    return {
      lessonId: data.lessonId,
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

  private async ensureModule(tenantId: string, courseId: string, moduleId: string) {
    const module = await this.prisma.courseModule.findFirst({
      where: {
        id: moduleId,
        courseId,
        course: {
          tenantId,
        },
      },
      select: { id: true },
    });

    if (!module) {
      throw new NotFoundError("Course module not found");
    }

    return module;
  }

  private async ensureLesson(
    tenantId: string,
    courseId: string,
    moduleId: string,
    lessonId: string
  ) {
    const lesson = await this.prisma.lesson.findFirst({
      where: {
        id: lessonId,
        tenantId,
        moduleId,
        module: {
          courseId,
          course: {
            tenantId,
          },
        },
      },
      select: { id: true },
    });

    if (!lesson) {
      throw new NotFoundError("Lesson not found");
    }

    return lesson;
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

  private assertExactOrdering(existingIds: string[], reorderedIds: string[], label: string) {
    if (existingIds.length !== reorderedIds.length) {
      throw new ValidationError(`Invalid ${label} ordering payload`);
    }

    const existing = new Set(existingIds);
    const reordered = new Set(reorderedIds);

    if (
      existing.size !== reordered.size ||
      existingIds.some((id) => !reordered.has(id)) ||
      reorderedIds.some((id) => !existing.has(id))
    ) {
      throw new ValidationError(`Invalid ${label} ordering payload`);
    }
  }

  private async resequenceModules(courseId: string) {
    const modules = await this.prisma.courseModule.findMany({
      where: { courseId },
      select: { id: true },
      orderBy: { order: "asc" },
    });

    await this.prisma.$transaction(
      modules.map((module, index) =>
        this.prisma.courseModule.update({
          where: { id: module.id },
          data: { order: index + 1 },
        })
      )
    );
  }

  private async resequenceLessons(tenantId: string, moduleId: string) {
    const lessons = await this.prisma.lesson.findMany({
      where: { tenantId, moduleId },
      select: { id: true },
      orderBy: { order: "asc" },
    });

    await this.prisma.$transaction(
      lessons.map((lesson, index) =>
        this.prisma.lesson.update({
          where: { id: lesson.id },
          data: { order: index + 1 },
        })
      )
    );
  }
}
