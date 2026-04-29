import { EnrollmentStatus, PrismaClient } from "@prisma/client";
import { NotFoundError } from "../../utils/errors";

type EnrollmentProgressSnapshot = {
  id: string;
  progress: number;
  status: EnrollmentStatus;
  completedAt: Date | null;
};

export async function recalculateCourseEnrollmentProgress(
  prisma: PrismaClient,
  tenantId: string,
  enrollmentId: string
): Promise<EnrollmentProgressSnapshot> {
  const enrollment = await prisma.courseEnrollment.findFirst({
    where: { tenantId, id: enrollmentId },
    include: {
      course: {
        include: {
          modules: {
            include: {
              lessons: {
                select: { id: true },
              },
            },
          },
        },
      },
      lessonProgress: {
        select: {
          lessonId: true,
          completed: true,
        },
      },
    },
  });

  if (!enrollment) {
    throw new NotFoundError("Enrollment not found");
  }

  if (enrollment.status === "DROPPED") {
    return {
      id: enrollment.id,
      progress: enrollment.progress,
      status: enrollment.status,
      completedAt: enrollment.completedAt,
    };
  }

  const lessonIds = new Set(
    enrollment.course.modules.flatMap((module) => module.lessons.map((lesson) => lesson.id))
  );
  const totalLessons = lessonIds.size;
  const completedLessons = enrollment.lessonProgress.filter(
    (item) => item.completed && lessonIds.has(item.lessonId)
  ).length;
  const progress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
  const isCompleted = totalLessons > 0 && completedLessons === totalLessons;

  return prisma.courseEnrollment.update({
    where: { id: enrollment.id },
    data: {
      progress,
      completedAt: isCompleted ? new Date() : null,
      status: isCompleted ? "COMPLETED" : "ACTIVE",
    },
    select: {
      id: true,
      progress: true,
      status: true,
      completedAt: true,
    },
  });
}
