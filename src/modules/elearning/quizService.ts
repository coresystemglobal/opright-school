import { Prisma, PrismaClient } from "@prisma/client";
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "../../utils/errors";

type QuizPlacement = "LESSON" | "ACADEMIC";
type QuizStatus = "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED";
type QuizGradeSinkType = "NONE" | "ASSIGNMENT" | "EXAMINATION";
type QuizResultsVisibility = "AFTER_CLOSE";
type QuizQuestionType = "MULTIPLE_CHOICE" | "TRUE_FALSE";

type QuizQuestionOption = {
  id: string;
  label: string;
};

export type QuizQuestionInput = {
  id: string;
  prompt: string;
  type: QuizQuestionType;
  options?: QuizQuestionOption[];
  correctAnswer: string | boolean;
  points: number;
};

export type QuizAnswerInput = {
  questionId: string;
  answer: string | boolean;
};

type QuizCreateInput = {
  placement: QuizPlacement;
  lessonId?: string;
  academicYearId?: string;
  termId?: string;
  subjectId?: string;
  title: string;
  description?: string;
  durationMinutes?: number;
  attemptLimit?: number;
  passMark?: number;
  availableFrom?: Date;
  availableUntil?: Date;
  gradeSinkType?: QuizGradeSinkType;
  questions: QuizQuestionInput[];
};

type QuizUpdateInput = Partial<QuizCreateInput>;

type QuizFilters = {
  lessonId?: string;
  courseId?: string;
  subjectId?: string;
  placement?: QuizPlacement;
  status?: QuizStatus;
};

type Actor = {
  role: string;
  userId: string;
};

type StudentQuizAccess = {
  studentId: string;
  courseIds: string[];
  subjectIds: string[];
};

type QuizRecord = Awaited<ReturnType<QuizService["getQuizRecord"]>>;
type QuizRecordResolved = NonNullable<QuizRecord>;

const STAFF_ROLES = new Set(["ADMIN", "TEACHER"]);

export class QuizService {
  constructor(private prisma: PrismaClient) {}

  async createQuiz(tenantId: string, data: QuizCreateInput) {
    const normalized = await this.normalizeQuizInput(tenantId, data);

    return this.prisma.$transaction(async (tx) => {
      const ownedSink = await this.ensureOwnedGradeSink(tx, tenantId, normalized);

      return tx.quiz.create({
        data: {
          tenantId,
          lessonId: normalized.lessonId,
          placement: normalized.placement,
          status: "DRAFT",
          courseId: normalized.courseId,
          academicYearId: normalized.academicYearId,
          termId: normalized.termId,
          subjectId: normalized.subjectId,
          title: normalized.title,
          description: normalized.description,
          durationMinutes: normalized.durationMinutes,
          attemptLimit: normalized.attemptLimit,
          passMark: normalized.passMark,
          availableFrom: normalized.availableFrom,
          availableUntil: normalized.availableUntil,
          gradeSinkType: normalized.gradeSinkType,
          assignmentId: ownedSink.assignmentId,
          examinationId: ownedSink.examinationId,
          resultsVisibility: "AFTER_CLOSE",
          questions: normalized.questions as Prisma.InputJsonValue,
        },
        include: {
          lesson: {
            include: {
              module: {
                include: {
                  course: {
                    select: { id: true, title: true, subjectId: true, isPublished: true },
                  },
                },
              },
            },
          },
          attempts: {
            orderBy: [{ submittedForStudentId: "asc" }, { attemptNumber: "desc" }],
          },
        },
      });
    }).then((quiz) => this.serializeQuizForStaff(quiz));
  }

  async updateQuiz(tenantId: string, quizId: string, data: QuizUpdateInput) {
    const existing = await this.getQuizRecord(tenantId, quizId);
    if (!existing) {
      throw new NotFoundError("Quiz not found");
    }

    const hasAttempts = existing.attempts.length > 0;
    if (hasAttempts) {
      throw new ValidationError("Quiz cannot be edited after attempts have started");
    }

    const normalized = await this.normalizeQuizInput(tenantId, {
      placement: existing.placement as QuizPlacement,
      lessonId: existing.lessonId ?? undefined,
      academicYearId: data.academicYearId ?? existing.academicYearId ?? undefined,
      termId: data.termId ?? existing.termId ?? undefined,
      subjectId: data.subjectId ?? existing.subjectId ?? undefined,
      title: data.title ?? existing.title,
      description: data.description ?? existing.description ?? undefined,
      durationMinutes: data.durationMinutes ?? existing.durationMinutes ?? undefined,
      attemptLimit: data.attemptLimit ?? existing.attemptLimit ?? undefined,
      passMark: data.passMark ?? existing.passMark,
      availableFrom: data.availableFrom ?? existing.availableFrom ?? undefined,
      availableUntil: data.availableUntil ?? existing.availableUntil ?? undefined,
      gradeSinkType: data.gradeSinkType ?? (existing.gradeSinkType as QuizGradeSinkType),
      questions: data.questions ?? ((existing.questions as unknown) as QuizQuestionInput[]),
    });

    return this.prisma.$transaction(async (tx) => {
      const sink = await this.ensureOwnedGradeSink(tx, tenantId, normalized, {
        assignmentId: existing.assignmentId ?? undefined,
        examinationId: existing.examinationId ?? undefined,
        gradeSinkType: existing.gradeSinkType as QuizGradeSinkType,
      });

      return tx.quiz.update({
        where: { id: quizId },
        data: {
          lessonId: normalized.lessonId,
          placement: normalized.placement,
          courseId: normalized.courseId,
          academicYearId: normalized.academicYearId,
          termId: normalized.termId,
          subjectId: normalized.subjectId,
          title: normalized.title,
          description: normalized.description,
          durationMinutes: normalized.durationMinutes,
          attemptLimit: normalized.attemptLimit,
          passMark: normalized.passMark,
          availableFrom: normalized.availableFrom,
          availableUntil: normalized.availableUntil,
          gradeSinkType: normalized.gradeSinkType,
          assignmentId: sink.assignmentId,
          examinationId: sink.examinationId,
          questions: normalized.questions as Prisma.InputJsonValue,
        },
        include: {
          lesson: {
            include: {
              module: {
                include: {
                  course: {
                    select: { id: true, title: true, subjectId: true, isPublished: true },
                  },
                },
              },
            },
          },
          attempts: {
            orderBy: [{ submittedForStudentId: "asc" }, { attemptNumber: "desc" }],
          },
        },
      });
    }).then((quiz) => this.serializeQuizForStaff(quiz));
  }

  async publishQuiz(tenantId: string, quizId: string) {
    const quiz = await this.getQuizRecord(tenantId, quizId);
    if (!quiz) {
      throw new NotFoundError("Quiz not found");
    }

    if ((quiz.questions as QuizQuestionInput[]).length === 0) {
      throw new ValidationError("Quiz must have at least one question");
    }

    if (quiz.availableFrom && quiz.availableUntil && quiz.availableUntil <= quiz.availableFrom) {
      throw new ValidationError("Quiz close time must be after the open time");
    }

    const updated = await this.prisma.quiz.update({
      where: { id: quizId },
      data: { status: "PUBLISHED" },
      include: {
        lesson: {
          include: {
            module: {
              include: {
                course: {
                  select: { id: true, title: true, subjectId: true, isPublished: true },
                },
              },
            },
          },
        },
        attempts: {
          orderBy: [{ submittedForStudentId: "asc" }, { attemptNumber: "desc" }],
        },
      },
    });

    return this.serializeQuizForStaff(updated);
  }

  async closeQuiz(tenantId: string, quizId: string) {
    const quiz = await this.getQuizRecord(tenantId, quizId);
    if (!quiz) {
      throw new NotFoundError("Quiz not found");
    }

    await this.finalizeExpiredAttempts(tenantId, quizId);

    const updated = await this.prisma.quiz.update({
      where: { id: quizId },
      data: { status: "CLOSED" },
      include: {
        lesson: {
          include: {
            module: {
              include: {
                course: {
                  select: { id: true, title: true, subjectId: true, isPublished: true },
                },
              },
            },
          },
        },
        attempts: {
          orderBy: [{ submittedForStudentId: "asc" }, { attemptNumber: "desc" }],
        },
      },
    });

    return this.serializeQuizForStaff(updated);
  }

  async getQuizzes(tenantId: string, actor: Actor, filters: QuizFilters = {}) {
    if (actor.role === "STUDENT") {
      const access = await this.getStudentQuizAccess(tenantId, actor.userId);
      const quizzes = await this.prisma.quiz.findMany({
        where: {
          tenantId,
          ...this.buildQuizFilter(filters),
          status: { in: ["PUBLISHED", "CLOSED"] },
          OR: [
            {
              placement: "LESSON",
              courseId: { in: access.courseIds.length ? access.courseIds : ["00000000-0000-0000-0000-000000000000"] },
            },
            {
              placement: "ACADEMIC",
              subjectId: { in: access.subjectIds.length ? access.subjectIds : ["00000000-0000-0000-0000-000000000000"] },
            },
          ],
        },
        include: {
          lesson: {
            include: {
              module: {
                include: {
                  course: {
                    select: { id: true, title: true, subjectId: true, isPublished: true },
                  },
                },
              },
            },
          },
          attempts: {
            where: { submittedForStudentId: access.studentId },
            orderBy: { attemptNumber: "desc" },
          },
        },
        orderBy: [{ availableFrom: "asc" }, { createdAt: "desc" }],
      });

      await Promise.all(quizzes.map((quiz) => this.finalizeExpiredAttempts(tenantId, quiz.id, access.studentId)));

      const refreshed = await this.prisma.quiz.findMany({
        where: { id: { in: quizzes.map((quiz) => quiz.id) } },
        include: {
          lesson: {
            include: {
              module: {
                include: {
                  course: {
                    select: { id: true, title: true, subjectId: true, isPublished: true },
                  },
                },
              },
            },
          },
          attempts: {
            where: { submittedForStudentId: access.studentId },
            orderBy: { attemptNumber: "desc" },
          },
        },
        orderBy: [{ availableFrom: "asc" }, { createdAt: "desc" }],
      });

      return Promise.all(
        refreshed.map((quiz) => this.serializeQuizForStudent(tenantId, quiz, access.studentId))
      );
    }

    const quizzes = await this.prisma.quiz.findMany({
      where: {
        tenantId,
        ...this.buildQuizFilter(filters),
      },
      include: {
        lesson: {
          include: {
            module: {
              include: {
                course: {
                  select: { id: true, title: true, subjectId: true, isPublished: true },
                },
              },
            },
          },
        },
        attempts: {
          orderBy: [{ submittedForStudentId: "asc" }, { attemptNumber: "desc" }],
        },
      },
      orderBy: [{ createdAt: "desc" }],
    });

    return Promise.all(quizzes.map((quiz) => this.serializeQuizForStaff(quiz)));
  }

  async getQuiz(tenantId: string, quizId: string, actor: Actor) {
    if (actor.role === "STUDENT") {
      const access = await this.getStudentQuizAccess(tenantId, actor.userId);
      await this.finalizeExpiredAttempts(tenantId, quizId, access.studentId);
      const quiz = await this.getQuizRecord(tenantId, quizId, access.studentId);
      if (!quiz) {
        throw new NotFoundError("Quiz not found");
      }
      await this.assertStudentCanAccessQuiz(quiz, access);
      return this.serializeQuizForStudent(tenantId, quiz, access.studentId, true);
    }

    const quiz = await this.getQuizRecord(tenantId, quizId);
    if (!quiz) {
      throw new NotFoundError("Quiz not found");
    }

    return this.serializeQuizForStaff(quiz, true);
  }

  async startQuiz(tenantId: string, quizId: string, userId: string) {
    const access = await this.getStudentQuizAccess(tenantId, userId);
    await this.finalizeExpiredAttempts(tenantId, quizId, access.studentId);

    const quiz = await this.getQuizRecord(tenantId, quizId, access.studentId);
    if (!quiz) {
      throw new NotFoundError("Quiz not found");
    }

    await this.assertStudentCanAccessQuiz(quiz, access);
    this.assertQuizStartable(quiz);

    const activeAttempt = quiz.attempts.find((attempt) => !attempt.completedAt);
    if (activeAttempt) {
      return this.serializeAttemptForStudent(quiz, activeAttempt);
    }

    const nextAttemptNumber = (quiz.attempts[0]?.attemptNumber ?? 0) + 1;
    if (quiz.attemptLimit && nextAttemptNumber > quiz.attemptLimit) {
      throw new ValidationError("Attempt limit reached");
    }

    const startedAt = new Date();
    const deadlineAt = this.calculateAttemptDeadline(
      startedAt,
      quiz.durationMinutes ?? undefined,
      quiz.availableUntil ?? undefined
    );

    const attempt = await this.prisma.quizAttempt.create({
      data: {
        quizId: quiz.id,
        submittedForStudentId: access.studentId,
        submittedByUserId: quiz.lessonId ? userId : userId,
        answers: [] as Prisma.InputJsonValue,
        score: 0,
        passed: false,
        attemptNumber: nextAttemptNumber,
        deadlineAt,
      },
    });

    return this.serializeAttemptForStudent(quiz, attempt);
  }

  async submitQuiz(
    tenantId: string,
    quizId: string,
    userId: string,
    answers: QuizAnswerInput[]
  ) {
    const access = await this.getStudentQuizAccess(tenantId, userId);
    return this.completeQuizAttempt(tenantId, quizId, {
      userId,
      studentId: access.studentId,
      answers,
      isStaffOverride: false,
    });
  }

  async staffSubmitQuiz(
    tenantId: string,
    quizId: string,
    userId: string,
    studentId: string,
    answers: QuizAnswerInput[]
  ) {
    return this.completeQuizAttempt(tenantId, quizId, {
      userId,
      studentId,
      answers,
      isStaffOverride: true,
    });
  }

  async getAttempts(
    tenantId: string,
    quizId: string,
    actor: Actor,
    studentId?: string
  ) {
    if (actor.role === "STUDENT") {
      const access = await this.getStudentQuizAccess(tenantId, actor.userId);
      await this.finalizeExpiredAttempts(tenantId, quizId, access.studentId);
      const quiz = await this.getQuizRecord(tenantId, quizId, access.studentId);
      if (!quiz) {
        throw new NotFoundError("Quiz not found");
      }
      await this.assertStudentCanAccessQuiz(quiz, access);
      return quiz.attempts
        .slice()
        .sort((a, b) => b.attemptNumber - a.attemptNumber)
        .map((attempt) => this.serializeAttemptForStudent(quiz, attempt));
    }

    if (!studentId) {
      throw new ValidationError("studentId query parameter is required");
    }

    await this.finalizeExpiredAttempts(tenantId, quizId, studentId);
    const quiz = await this.getQuizRecord(tenantId, quizId, studentId);
    if (!quiz) {
      throw new NotFoundError("Quiz not found");
    }

    return quiz.attempts
      .slice()
      .sort((a, b) => b.attemptNumber - a.attemptNumber)
      .map((attempt) => this.serializeAttemptForStaff(attempt));
  }

  private async completeQuizAttempt(
    tenantId: string,
    quizId: string,
    params: {
      userId: string;
      studentId: string;
      answers: QuizAnswerInput[];
      isStaffOverride: boolean;
    }
  ) {
    await this.finalizeExpiredAttempts(tenantId, quizId, params.studentId);

    const quiz = await this.getQuizRecord(tenantId, quizId, params.studentId);
    if (!quiz) {
      throw new NotFoundError("Quiz not found");
    }

    if (params.isStaffOverride) {
      await this.assertStudentMatchesQuizAudience(quiz, params.studentId);
    } else {
      this.assertQuizStartable(quiz);
    }

    let attempt = quiz.attempts.find((item) => !item.completedAt);
    if (!attempt) {
      if (!params.isStaffOverride) {
        throw new ValidationError("Start the quiz before submitting");
      }

      const nextAttemptNumber = (quiz.attempts[0]?.attemptNumber ?? 0) + 1;
      attempt = await this.prisma.quizAttempt.create({
        data: {
          quizId: quiz.id,
          submittedForStudentId: params.studentId,
          submittedByUserId: params.userId,
          answers: [] as Prisma.InputJsonValue,
          score: 0,
          passed: false,
          attemptNumber: nextAttemptNumber,
          deadlineAt: this.calculateAttemptDeadline(
            new Date(),
            quiz.durationMinutes ?? undefined,
            quiz.availableUntil ?? undefined
          ),
        },
      });
    }

    if (!params.isStaffOverride) {
      const now = new Date();
      if (attempt.deadlineAt && now > attempt.deadlineAt) {
        throw new ValidationError("The attempt deadline has passed");
      }
      if (quiz.availableUntil && now > quiz.availableUntil) {
        throw new ValidationError("The quiz is no longer accepting submissions");
      }
    }

    const grading = this.gradeQuiz(quiz, params.answers);
    const completedAt = new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedAttempt = await tx.quizAttempt.update({
        where: { id: attempt!.id },
        data: {
          answers: params.answers as Prisma.InputJsonValue,
          score: grading.score,
          passed: grading.passed,
          completedAt,
          submittedByUserId: params.userId,
        },
      });

      if (quiz.gradeSinkType !== "NONE") {
        await tx.quizAttempt.updateMany({
          where: {
            quizId: quiz.id,
            submittedForStudentId: params.studentId,
            NOT: { id: updatedAttempt.id },
          },
          data: { officialScoreApplied: false },
        });

        await tx.quizAttempt.update({
          where: { id: updatedAttempt.id },
          data: { officialScoreApplied: true },
        });

        await this.applyOfficialScore(tx, tenantId, quiz, updatedAttempt);
        return { ...updatedAttempt, officialScoreApplied: true };
      }

      return updatedAttempt;
    });

    if (params.isStaffOverride) {
      return this.serializeAttemptForStaff(updated);
    }

    const refreshedQuiz = await this.getQuizRecord(tenantId, quiz.id, params.studentId);
    if (!refreshedQuiz) {
      throw new NotFoundError("Quiz not found");
    }

    const refreshedAttempt =
      refreshedQuiz.attempts.find((item) => item.id === updated.id) ?? updated;

    return this.serializeAttemptForStudent(refreshedQuiz, refreshedAttempt);
  }

  private async getQuizRecord(tenantId: string, quizId: string, studentId?: string) {
    return this.prisma.quiz.findFirst({
      where: { id: quizId, tenantId },
      include: {
        lesson: {
          include: {
            module: {
              include: {
                course: {
                  select: {
                    id: true,
                    title: true,
                    subjectId: true,
                    isPublished: true,
                  },
                },
              },
            },
          },
        },
        attempts: {
          where: studentId ? { submittedForStudentId: studentId } : undefined,
          orderBy: [{ attemptNumber: "desc" }],
        },
      },
    });
  }

  private buildQuizFilter(filters: QuizFilters) {
    return {
      lessonId: filters.lessonId,
      courseId: filters.courseId,
      subjectId: filters.subjectId,
      placement: filters.placement,
      status: filters.status,
    };
  }

  private async normalizeQuizInput(tenantId: string, data: QuizCreateInput) {
    const cleanedQuestions = this.normalizeQuestions(data.questions);
    if (data.availableFrom && data.availableUntil && data.availableUntil <= data.availableFrom) {
      throw new ValidationError("Quiz close time must be after the open time");
    }

    if (data.placement === "LESSON") {
      if (!data.lessonId) {
        throw new ValidationError("lessonId is required for lesson quizzes");
      }

      const lesson = await this.prisma.lesson.findFirst({
        where: { tenantId, id: data.lessonId },
        include: {
          module: {
            include: {
              course: {
                select: {
                  id: true,
                  title: true,
                  subjectId: true,
                  isPublished: true,
                },
              },
            },
          },
        },
      });

      if (!lesson) {
        throw new NotFoundError("Lesson not found");
      }

      if (lesson.type !== "QUIZ") {
        throw new ValidationError("Lesson-linked quizzes require a QUIZ lesson");
      }

      let subjectRecord: { id: string; academicYearId: string } | null = null;
      if (lesson.module.course.subjectId) {
        subjectRecord = await this.prisma.subject.findFirst({
          where: { tenantId, id: lesson.module.course.subjectId },
          select: { id: true, academicYearId: true },
        });
      }

      let termId: string | undefined;
      let academicYearId: string | undefined;
      if ((data.gradeSinkType ?? "NONE") !== "NONE") {
        if (!lesson.module.course.subjectId || !subjectRecord) {
          throw new ValidationError("Graded course quizzes require the course to have a subject");
        }
        if (!data.termId) {
          throw new ValidationError("termId is required for graded course quizzes");
        }

        const term = await this.prisma.term.findFirst({
          where: { tenantId, id: data.termId },
          select: { id: true, academicYearId: true },
        });

        if (!term) {
          throw new NotFoundError("Term not found");
        }

        if (term.academicYearId !== subjectRecord.academicYearId) {
          throw new ValidationError("The selected term does not belong to the course subject academic year");
        }

        termId = term.id;
        academicYearId = term.academicYearId;
      } else {
        termId = undefined;
        academicYearId = subjectRecord?.academicYearId;
      }

      return {
        placement: "LESSON" as const,
        lessonId: lesson.id,
        courseId: lesson.module.course.id,
        academicYearId,
        termId,
        subjectId: lesson.module.course.subjectId ?? undefined,
        title: data.title.trim(),
        description: data.description?.trim() || undefined,
        durationMinutes: data.durationMinutes,
        attemptLimit: data.attemptLimit,
        passMark: data.passMark ?? 70,
        availableFrom: data.availableFrom,
        availableUntil: data.availableUntil,
        gradeSinkType: data.gradeSinkType ?? "NONE",
        questions: cleanedQuestions,
      };
    }

    if (!data.subjectId || !data.academicYearId || !data.termId) {
      throw new ValidationError("Academic quizzes require academicYearId, termId, and subjectId");
    }

    const [subject, academicYear, term] = await Promise.all([
      this.prisma.subject.findFirst({
        where: { tenantId, id: data.subjectId },
        select: { id: true, academicYearId: true, classId: true },
      }),
      this.prisma.academicYear.findFirst({
        where: { tenantId, id: data.academicYearId },
        select: { id: true },
      }),
      this.prisma.term.findFirst({
        where: { tenantId, id: data.termId },
        select: { id: true, academicYearId: true },
      }),
    ]);

    if (!subject) {
      throw new NotFoundError("Subject not found");
    }

    if (!academicYear) {
      throw new NotFoundError("Academic year not found");
    }

    if (!term) {
      throw new NotFoundError("Term not found");
    }

    if (subject.academicYearId !== academicYear.id || term.academicYearId !== academicYear.id) {
      throw new ValidationError("Subject and term must belong to the selected academic year");
    }

    return {
      placement: "ACADEMIC" as const,
      lessonId: undefined,
      courseId: undefined,
      academicYearId: academicYear.id,
      termId: term.id,
      subjectId: subject.id,
      title: data.title.trim(),
      description: data.description?.trim() || undefined,
      durationMinutes: data.durationMinutes,
      attemptLimit: data.attemptLimit,
      passMark: data.passMark ?? 70,
      availableFrom: data.availableFrom,
      availableUntil: data.availableUntil,
      gradeSinkType: data.gradeSinkType ?? "NONE",
      questions: cleanedQuestions,
    };
  }

  private normalizeQuestions(questions: QuizQuestionInput[]) {
    if (!questions.length) {
      throw new ValidationError("Quiz must have at least one question");
    }

    return questions.map((question, index) => {
      const trimmedPrompt = question.prompt.trim();
      if (!trimmedPrompt) {
        throw new ValidationError(`Question ${index + 1} must include a prompt`);
      }

      if (!question.id.trim()) {
        throw new ValidationError(`Question ${index + 1} must include an id`);
      }

      if (question.points <= 0) {
        throw new ValidationError(`Question ${index + 1} must have a positive points value`);
      }

      if (question.type === "MULTIPLE_CHOICE") {
        if (!question.options?.length || question.options.length < 2) {
          throw new ValidationError(`Question ${index + 1} must include at least two options`);
        }

        const optionIds = new Set(question.options.map((option) => option.id));
        if (!optionIds.has(String(question.correctAnswer))) {
          throw new ValidationError(`Question ${index + 1} correctAnswer must match an option id`);
        }
      }

      if (question.type === "TRUE_FALSE") {
        if (typeof question.correctAnswer !== "boolean") {
          throw new ValidationError(`Question ${index + 1} true/false answers must be boolean`);
        }
      }

      return {
        id: question.id.trim(),
        prompt: trimmedPrompt,
        type: question.type,
        options:
          question.type === "TRUE_FALSE"
            ? [
                { id: "true", label: "True" },
                { id: "false", label: "False" },
              ]
            : question.options?.map((option) => ({
                id: option.id.trim(),
                label: option.label.trim(),
              })),
        correctAnswer: question.correctAnswer,
        points: question.points,
      };
    });
  }

  private async ensureOwnedGradeSink(
    tx: Prisma.TransactionClient,
    tenantId: string,
    normalized: Awaited<ReturnType<QuizService["normalizeQuizInput"]>>,
    existing?: {
      assignmentId?: string;
      examinationId?: string;
      gradeSinkType?: QuizGradeSinkType;
    }
  ) {
    const totalPoints = this.getTotalPoints(normalized.questions);

    if (existing?.gradeSinkType === "ASSIGNMENT" && existing.assignmentId && normalized.gradeSinkType !== "ASSIGNMENT") {
      await tx.assignment.delete({ where: { id: existing.assignmentId } });
    }

    if (existing?.gradeSinkType === "EXAMINATION" && existing.examinationId && normalized.gradeSinkType !== "EXAMINATION") {
      await tx.examination.delete({ where: { id: existing.examinationId } });
    }

    if (normalized.gradeSinkType === "NONE") {
      return {
        assignmentId: undefined,
        examinationId: undefined,
      };
    }

    if (!normalized.subjectId || !normalized.termId || !normalized.academicYearId) {
      throw new ValidationError("Graded quizzes require subject, term, and academic year metadata");
    }

    if (normalized.gradeSinkType === "ASSIGNMENT") {
      const assignment =
        existing?.gradeSinkType === "ASSIGNMENT" && existing.assignmentId
          ? await tx.assignment.update({
              where: { id: existing.assignmentId },
              data: {
                title: normalized.title,
                description: normalized.description,
                maxScore: totalPoints,
                dueDate: normalized.availableUntil,
                academicYearId: normalized.academicYearId,
                termId: normalized.termId,
                subjectId: normalized.subjectId,
              },
            })
          : await tx.assignment.create({
              data: {
                tenantId,
                academicYearId: normalized.academicYearId,
                termId: normalized.termId,
                subjectId: normalized.subjectId,
                title: normalized.title,
                description: normalized.description,
                maxScore: totalPoints,
                dueDate: normalized.availableUntil,
              },
            });

      return {
        assignmentId: assignment.id,
        examinationId: undefined,
      };
    }

    const examDate = normalized.availableUntil ?? normalized.availableFrom ?? new Date();
    const examination =
      existing?.gradeSinkType === "EXAMINATION" && existing.examinationId
        ? await tx.examination.update({
            where: { id: existing.examinationId },
            data: {
              name: normalized.title,
              examDate,
              duration: normalized.durationMinutes,
              maxScore: totalPoints,
              passingScore: normalized.passMark,
              academicYearId: normalized.academicYearId,
              termId: normalized.termId,
              subjectId: normalized.subjectId,
            },
          })
        : await tx.examination.create({
            data: {
              tenantId,
              academicYearId: normalized.academicYearId,
              termId: normalized.termId,
              subjectId: normalized.subjectId,
              name: normalized.title,
              examDate,
              duration: normalized.durationMinutes,
              maxScore: totalPoints,
              passingScore: normalized.passMark,
            },
          });

    return {
      assignmentId: undefined,
      examinationId: examination.id,
    };
  }

  private getTotalPoints(questions: QuizQuestionInput[]) {
    return questions.reduce((sum, question) => sum + question.points, 0);
  }

  private calculateAttemptDeadline(
    startedAt: Date,
    durationMinutes?: number,
    availableUntil?: Date
  ) {
    const candidates: number[] = [];

    if (durationMinutes) {
      candidates.push(startedAt.getTime() + durationMinutes * 60_000);
    }

    if (availableUntil) {
      candidates.push(availableUntil.getTime());
    }

    if (!candidates.length) {
      return null;
    }

    return new Date(Math.min(...candidates));
  }

  private gradeQuiz(quiz: QuizRecordResolved, answers: QuizAnswerInput[]) {
    const questions = quiz.questions as QuizQuestionInput[];
    const answerMap = new Map(answers.map((answer) => [answer.questionId, answer.answer]));
    const totalPoints = this.getTotalPoints(questions);

    let earnedPoints = 0;
    for (const question of questions) {
      const submitted = answerMap.get(question.id);
      if (submitted === undefined) {
        continue;
      }

      if (question.type === "MULTIPLE_CHOICE") {
        if (String(submitted) === String(question.correctAnswer)) {
          earnedPoints += question.points;
        }
        continue;
      }

      if (question.type === "TRUE_FALSE") {
        const normalizedSubmitted =
          typeof submitted === "boolean" ? submitted : String(submitted).toLowerCase() === "true";
        if (normalizedSubmitted === Boolean(question.correctAnswer)) {
          earnedPoints += question.points;
        }
      }
    }

    const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
    return {
      score,
      passed: score >= quiz.passMark,
    };
  }

  private assertQuizStartable(quiz: QuizRecordResolved) {
    const now = new Date();

    if (quiz.status !== "PUBLISHED") {
      throw new ValidationError("This quiz is not currently open");
    }

    if (quiz.availableFrom && now < quiz.availableFrom) {
      throw new ValidationError("This quiz is not open yet");
    }

    if (quiz.availableUntil && now > quiz.availableUntil) {
      throw new ValidationError("This quiz window has closed");
    }
  }

  private async getStudentQuizAccess(tenantId: string, userId: string): Promise<StudentQuizAccess> {
    const student = await this.prisma.student.findFirst({
      where: { tenantId, userId },
      select: { id: true },
    });

    if (!student) {
      throw new ForbiddenError("Student access required");
    }

    const [courseEnrollments, classEnrollments] = await Promise.all([
      this.prisma.courseEnrollment.findMany({
        where: {
          tenantId,
          studentId: student.id,
          status: { not: "DROPPED" },
        },
        select: { courseId: true },
      }),
      this.prisma.enrollment.findMany({
        where: {
          tenantId,
          studentId: student.id,
        },
        select: { classId: true },
      }),
    ]);

    const subjects = classEnrollments.length
      ? await this.prisma.subject.findMany({
          where: {
            tenantId,
            classId: { in: classEnrollments.map((item) => item.classId) },
          },
          select: { id: true },
        })
      : [];

    return {
      studentId: student.id,
      courseIds: courseEnrollments.map((item) => item.courseId),
      subjectIds: subjects.map((item) => item.id),
    };
  }

  private async assertStudentCanAccessQuiz(quiz: QuizRecordResolved, access: StudentQuizAccess) {
    if (quiz.placement === "LESSON") {
      if (!quiz.courseId || !access.courseIds.includes(quiz.courseId)) {
        throw new ForbiddenError("You are not enrolled in this course");
      }
      if (quiz.lesson?.module.course.isPublished === false) {
        throw new ForbiddenError("This course is not published");
      }
      return;
    }

    if (!quiz.subjectId || !access.subjectIds.includes(quiz.subjectId)) {
      throw new ForbiddenError("You are not assigned to this academic quiz");
    }
  }

  private async assertStudentMatchesQuizAudience(quiz: QuizRecordResolved, studentId: string) {
    if (quiz.placement === "LESSON") {
      if (!quiz.courseId) {
        throw new ValidationError("Course-linked quiz is missing its course reference");
      }

      const enrollment = await this.prisma.courseEnrollment.findFirst({
        where: {
          tenantId: quiz.tenantId,
          courseId: quiz.courseId,
          studentId,
          status: { not: "DROPPED" },
        },
        select: { id: true },
      });

      if (!enrollment) {
        throw new ValidationError("Student is not enrolled in the course for this quiz");
      }

      return;
    }

    if (!quiz.subjectId) {
      throw new ValidationError("Academic quiz is missing its subject");
    }

    const subject = await this.prisma.subject.findFirst({
      where: { tenantId: quiz.tenantId, id: quiz.subjectId },
      select: { classId: true },
    });

    if (!subject) {
      throw new NotFoundError("Subject not found");
    }

    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        tenantId: quiz.tenantId,
        studentId,
        classId: subject.classId,
      },
      select: { id: true },
    });

    if (!enrollment) {
      throw new ValidationError("Student is not assigned to the subject class for this quiz");
    }
  }

  private async finalizeExpiredAttempts(tenantId: string, quizId: string, studentId?: string) {
    const now = new Date();
    const expiredAttempts = await this.prisma.quizAttempt.findMany({
      where: {
        quizId,
        submittedForStudentId: studentId,
        completedAt: null,
        OR: [
          { deadlineAt: { lt: now } },
          { quiz: { availableUntil: { lt: now } } },
        ],
      },
      include: {
        quiz: {
          include: {
            lesson: {
              include: {
                module: {
                  include: {
                    course: {
                      select: { id: true, title: true, subjectId: true, isPublished: true },
                    },
                  },
                },
              },
            },
            attempts: {
              where: studentId ? { submittedForStudentId: studentId } : undefined,
              orderBy: { attemptNumber: "desc" },
            },
          },
        },
      },
    });

    for (const attempt of expiredAttempts) {
      const quiz = attempt.quiz as QuizRecordResolved;
      const grading = this.gradeQuiz(quiz, (attempt.answers as unknown) as QuizAnswerInput[]);
      await this.prisma.$transaction(async (tx) => {
        const updatedAttempt = await tx.quizAttempt.update({
          where: { id: attempt.id },
          data: {
            score: grading.score,
            passed: grading.passed,
            completedAt: attempt.deadlineAt ?? quiz.availableUntil ?? now,
          },
        });

        if (quiz.gradeSinkType !== "NONE") {
          await tx.quizAttempt.updateMany({
            where: {
              quizId: quiz.id,
              submittedForStudentId: attempt.submittedForStudentId,
              NOT: { id: updatedAttempt.id },
            },
            data: { officialScoreApplied: false },
          });
          await tx.quizAttempt.update({
            where: { id: updatedAttempt.id },
            data: { officialScoreApplied: true },
          });
          await this.applyOfficialScore(tx, tenantId, quiz, {
            ...updatedAttempt,
            officialScoreApplied: true,
          });
        }
      });
    }
  }

  private async applyOfficialScore(
    tx: Prisma.TransactionClient,
    tenantId: string,
    quiz: QuizRecordResolved,
    attempt: {
      submittedForStudentId: string;
      submittedByUserId: string | null;
      score: number;
      attemptNumber: number;
      officialScoreApplied?: boolean;
    }
  ) {
    const totalPoints = this.getTotalPoints((quiz.questions as unknown) as QuizQuestionInput[]);

    if (quiz.gradeSinkType === "ASSIGNMENT") {
      if (!quiz.assignmentId || !quiz.subjectId) {
        throw new ValidationError("Assignment-backed quiz is missing its sink metadata");
      }

      await tx.grade.upsert({
        where: {
          studentId_assignmentId: {
            studentId: attempt.submittedForStudentId,
            assignmentId: quiz.assignmentId,
          },
        },
        update: {
          score: attempt.score,
          maxScore: totalPoints,
          remarks: `Latest quiz attempt #${attempt.attemptNumber}`,
          gradedBy: attempt.submittedByUserId ?? undefined,
        },
        create: {
          tenantId,
          studentId: attempt.submittedForStudentId,
          subjectId: quiz.subjectId,
          assignmentId: quiz.assignmentId,
          score: attempt.score,
          maxScore: totalPoints,
          remarks: `Latest quiz attempt #${attempt.attemptNumber}`,
          gradedBy: attempt.submittedByUserId ?? undefined,
        },
      });
      return;
    }

    if (quiz.gradeSinkType === "EXAMINATION") {
      if (!quiz.examinationId) {
        throw new ValidationError("Examination-backed quiz is missing its sink metadata");
      }

      await tx.examResult.upsert({
        where: {
          examinationId_studentId: {
            examinationId: quiz.examinationId,
            studentId: attempt.submittedForStudentId,
          },
        },
        update: {
          score: attempt.score,
          remarks: `Latest quiz attempt #${attempt.attemptNumber}`,
        },
        create: {
          tenantId,
          examinationId: quiz.examinationId,
          studentId: attempt.submittedForStudentId,
          score: attempt.score,
          remarks: `Latest quiz attempt #${attempt.attemptNumber}`,
        },
      });
    }
  }

  private async serializeQuizForStaff(quiz: QuizRecordResolved, includeQuestions = false) {
    const subject = quiz.subjectId
      ? await this.prisma.subject.findFirst({
          where: { tenantId: quiz.tenantId, id: quiz.subjectId },
          select: { id: true, name: true, code: true },
        })
      : null;

    const latestAttemptsByStudent = new Map<string, { score: number; passed: boolean }>();
    for (const attempt of quiz.attempts.filter((item) => item.completedAt)) {
      if (!latestAttemptsByStudent.has(attempt.submittedForStudentId)) {
        latestAttemptsByStudent.set(attempt.submittedForStudentId, {
          score: attempt.score,
          passed: attempt.passed,
        });
      }
    }

    const latestAttemptEntries = Array.from(latestAttemptsByStudent.values());
    const averageScore =
      latestAttemptEntries.length > 0
        ? latestAttemptEntries.reduce((sum, attempt) => sum + attempt.score, 0) /
          latestAttemptEntries.length
        : null;

    return {
      id: quiz.id,
      placement: quiz.placement,
      status: quiz.status,
      lessonId: quiz.lessonId,
      courseId: quiz.courseId,
      academicYearId: quiz.academicYearId,
      termId: quiz.termId,
      subjectId: quiz.subjectId,
      title: quiz.title,
      description: quiz.description,
      durationMinutes: quiz.durationMinutes,
      attemptLimit: quiz.attemptLimit,
      passMark: quiz.passMark,
      availableFrom: quiz.availableFrom,
      availableUntil: quiz.availableUntil,
      gradeSinkType: quiz.gradeSinkType,
      assignmentId: quiz.assignmentId,
      examinationId: quiz.examinationId,
      resultsVisibility: quiz.resultsVisibility,
      questionCount: (quiz.questions as QuizQuestionInput[]).length,
      questions: includeQuestions ? quiz.questions : undefined,
      lesson: quiz.lesson
        ? {
            id: quiz.lesson.id,
            title: quiz.lesson.title,
            moduleId: quiz.lesson.moduleId,
          }
        : null,
      course: quiz.lesson?.module.course
        ? {
            id: quiz.lesson.module.course.id,
            title: quiz.lesson.module.course.title,
            isPublished: quiz.lesson.module.course.isPublished,
          }
        : null,
      subject,
      latestOfficialScoreSummary: {
        latestAttempts: latestAttemptEntries.length,
        averageScore,
        passed: latestAttemptEntries.filter((attempt) => attempt.passed).length,
      },
      attemptsCount: quiz.attempts.filter((attempt) => attempt.completedAt).length,
      createdAt: quiz.createdAt,
      updatedAt: quiz.updatedAt,
    };
  }

  private async serializeQuizForStudent(
    tenantId: string,
    quiz: QuizRecordResolved,
    studentId: string,
    includeQuestions = false
  ) {
    const subject = quiz.subjectId
      ? await this.prisma.subject.findFirst({
          where: { tenantId, id: quiz.subjectId },
          select: { id: true, name: true, code: true },
        })
      : null;
    const resultsReleased = this.areResultsReleased(quiz);
    const latestAttempt = quiz.attempts[0] ?? null;

    return {
      id: quiz.id,
      placement: quiz.placement,
      status: quiz.status,
      lessonId: quiz.lessonId,
      courseId: quiz.courseId,
      subjectId: quiz.subjectId,
      title: quiz.title,
      description: quiz.description,
      durationMinutes: quiz.durationMinutes,
      attemptLimit: quiz.attemptLimit,
      passMark: quiz.passMark,
      availableFrom: quiz.availableFrom,
      availableUntil: quiz.availableUntil,
      gradeSinkType: quiz.gradeSinkType,
      resultsVisibility: quiz.resultsVisibility,
      resultsReleased,
      questionCount: (quiz.questions as QuizQuestionInput[]).length,
      questions: includeQuestions
        ? (quiz.questions as QuizQuestionInput[]).map((question) => ({
            id: question.id,
            prompt: question.prompt,
            type: question.type,
            options: question.options,
            points: question.points,
          }))
        : undefined,
      lesson: quiz.lesson
        ? {
            id: quiz.lesson.id,
            title: quiz.lesson.title,
            moduleId: quiz.lesson.moduleId,
          }
        : null,
      course: quiz.lesson?.module.course
        ? {
            id: quiz.lesson.module.course.id,
            title: quiz.lesson.module.course.title,
            isPublished: quiz.lesson.module.course.isPublished,
          }
        : null,
      subject,
      attemptsCount: quiz.attempts.filter((attempt) => attempt.completedAt).length,
      activeAttempt: quiz.attempts.find((attempt) => !attempt.completedAt)
        ? this.serializeAttemptForStudent(
            quiz,
            quiz.attempts.find((attempt) => !attempt.completedAt)!,
            resultsReleased
          )
        : null,
      latestAttempt: latestAttempt
        ? this.serializeAttemptForStudent(quiz, latestAttempt, resultsReleased)
        : null,
      isAvailable: this.isQuizAvailableNow(quiz),
      isAssignedToStudent: quiz.placement === "LESSON" ? Boolean(quiz.courseId) : Boolean(quiz.subjectId),
      createdAt: quiz.createdAt,
      updatedAt: quiz.updatedAt,
      studentId,
    };
  }

  private serializeAttemptForStudent(
    quiz: QuizRecordResolved,
    attempt: {
      id: string;
      attemptNumber: number;
      score: number;
      passed: boolean;
      answers: Prisma.JsonValue;
      startedAt: Date;
      deadlineAt: Date | null;
      completedAt: Date | null;
      officialScoreApplied?: boolean;
    },
    resultsReleased = this.areResultsReleased(quiz)
  ) {
    return {
      id: attempt.id,
      attemptNumber: attempt.attemptNumber,
      startedAt: attempt.startedAt,
      deadlineAt: attempt.deadlineAt,
      completedAt: attempt.completedAt,
      officialScoreApplied: Boolean(attempt.officialScoreApplied),
      score: resultsReleased && attempt.completedAt ? attempt.score : null,
      passed: resultsReleased && attempt.completedAt ? attempt.passed : null,
      answers: attempt.answers,
    };
  }

  private serializeAttemptForStaff(attempt: {
    id: string;
    submittedForStudentId: string;
    submittedByUserId: string | null;
    attemptNumber: number;
    score: number;
    passed: boolean;
    officialScoreApplied: boolean;
    answers: Prisma.JsonValue;
    startedAt: Date;
    deadlineAt: Date | null;
    completedAt: Date | null;
  }) {
    return {
      id: attempt.id,
      submittedForStudentId: attempt.submittedForStudentId,
      submittedByUserId: attempt.submittedByUserId,
      attemptNumber: attempt.attemptNumber,
      score: attempt.score,
      passed: attempt.passed,
      officialScoreApplied: attempt.officialScoreApplied,
      answers: attempt.answers,
      startedAt: attempt.startedAt,
      deadlineAt: attempt.deadlineAt,
      completedAt: attempt.completedAt,
    };
  }

  private areResultsReleased(quiz: QuizRecordResolved) {
    if ((quiz.resultsVisibility as QuizResultsVisibility) !== "AFTER_CLOSE") {
      return true;
    }

    const now = new Date();
    return quiz.status === "CLOSED" || Boolean(quiz.availableUntil && now >= quiz.availableUntil);
  }

  private isQuizAvailableNow(quiz: QuizRecordResolved) {
    const now = new Date();
    return (
      quiz.status === "PUBLISHED" &&
      (!quiz.availableFrom || quiz.availableFrom <= now) &&
      (!quiz.availableUntil || quiz.availableUntil >= now)
    );
  }
}
