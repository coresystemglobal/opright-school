import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import prisma from "../../prisma/client";
import { UnauthorizedError, ValidationError } from "../../utils/errors";
import {
  CertificateService,
  DiscussionService,
  LiveClassService,
  QuizService,
  RecordedLessonService,
  SubmissionService,
} from "./service";
import { StudentElearningService } from "./studentElearningService";
import {
  idParamSchema,
  optionalUuidSchema,
  uuidSchema,
} from "../../utils/validation";

const quizService = new QuizService(prisma);
const submissionService = new SubmissionService(prisma);
const liveClassService = new LiveClassService(prisma);
const discussionService = new DiscussionService(prisma);
const certificateService = new CertificateService(prisma);
const recordedLessonService = new RecordedLessonService(prisma);
const studentElearningService = new StudentElearningService(prisma);

const quizIdParamSchema = idParamSchema;
const lessonQuerySchema = z.object({
  lessonId: optionalUuidSchema,
  courseId: optionalUuidSchema.optional(),
  subjectId: optionalUuidSchema.optional(),
  placement: z.enum(["LESSON", "ACADEMIC"]).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "CLOSED", "ARCHIVED"]).optional(),
});

const quizQuestionSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string().min(1),
    prompt: z.string().min(1),
    type: z.literal("MULTIPLE_CHOICE"),
    options: z
      .array(
        z.object({
          id: z.string().min(1),
          label: z.string().min(1),
        })
      )
      .min(2),
    correctAnswer: z.string().min(1),
    points: z.coerce.number().positive(),
  }),
  z.object({
    id: z.string().min(1),
    prompt: z.string().min(1),
    type: z.literal("TRUE_FALSE"),
    correctAnswer: z.boolean(),
    points: z.coerce.number().positive(),
  }),
]);

const createQuizSchema = z.object({
  placement: z.enum(["LESSON", "ACADEMIC"]),
  lessonId: optionalUuidSchema,
  academicYearId: optionalUuidSchema,
  termId: optionalUuidSchema,
  subjectId: optionalUuidSchema,
  title: z.string().min(1),
  description: z.string().optional(),
  durationMinutes: z.coerce.number().int().positive().optional(),
  attemptLimit: z.coerce.number().int().positive().optional(),
  passMark: z.coerce.number().min(0).max(100).optional(),
  availableFrom: z.coerce.date().optional(),
  availableUntil: z.coerce.date().optional(),
  gradeSinkType: z.enum(["NONE", "ASSIGNMENT", "EXAMINATION"]).optional(),
  questions: z.array(quizQuestionSchema).min(1),
});

const updateQuizSchema = createQuizSchema.partial();

const quizAnswerSchema = z.object({
  questionId: z.string().min(1),
  answer: z.union([z.string(), z.boolean()]),
});

const submitQuizSchema = z.object({
  answers: z.array(quizAnswerSchema),
});

const attemptsQuerySchema = z.object({
  studentId: optionalUuidSchema,
});

const staffSubmitQuizSchema = z.object({
  studentId: uuidSchema,
  answers: z.array(quizAnswerSchema),
  reason: z.string().optional(),
});

const assignmentIdParamSchema = z.object({
  assignmentId: uuidSchema,
});

const submissionFiltersSchema = z.object({
  assignmentId: optionalUuidSchema,
  studentId: optionalUuidSchema,
});

const submissionBodySchema = z.object({
  content: z.string().optional(),
  files: z.unknown().optional(),
});

const gradeSubmissionSchema = z.object({
  grade: z.coerce.number().min(0),
  feedback: z.string().optional(),
  gradedBy: z.string().min(1).optional(),
});

const liveClassSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  teacherId: uuidSchema,
  subjectId: optionalUuidSchema,
  scheduledAt: z.coerce.date(),
  duration: z.coerce.number().int().positive(),
  meetingUrl: z.string().optional(),
  meetingId: optionalUuidSchema,
  platform: z.enum(["JITSI", "100MS", "GOOGLE_MEET"]),
  recordingUrl: z.string().optional(),
  status: z.enum(["SCHEDULED", "LIVE", "COMPLETED", "CANCELLED"]).optional(),
});

const liveClassQuerySchema = z.object({
  teacherId: optionalUuidSchema,
  status: z.enum(["SCHEDULED", "LIVE", "COMPLETED", "CANCELLED"]).optional(),
});

const liveClassAttendanceSchema = z.object({
  studentId: uuidSchema,
  joinedAt: z.coerce.date().optional(),
  leftAt: z.coerce.date().optional(),
});

const courseIdParamSchema = z.object({
  courseId: uuidSchema,
});

const createDiscussionSchema = z.object({
  courseId: uuidSchema,
  title: z.string().min(1),
  content: z.string().min(1),
});

const createReplySchema = z.object({
  content: z.string().min(1),
});

const pinDiscussionSchema = z.object({
  isPinned: z.boolean(),
});

const generateCertificateSchema = z.object({
  courseId: uuidSchema,
  studentId: uuidSchema,
});

const studentIdParamSchema = z.object({
  studentId: uuidSchema,
});

const certificateNumberParamSchema = z.object({
  certificateNumber: z.string().min(1),
});

const recordedLessonParamSchema = z.object({
  lessonId: uuidSchema,
});

const syncRecordedLessonProgressSchema = z.object({
  watchedSeconds: z.coerce.number().nonnegative(),
});

function requireTenantId(req: Request) {
  if (!req.tenantId) {
    throw new ValidationError("Tenant ID required");
  }

  return req.tenantId;
}

function requireActor(req: Request) {
  if (!req.user?.userId || !req.user.role) {
    throw new UnauthorizedError();
  }

  return {
    userId: req.user.userId,
    role: req.user.role,
  };
}

export const quizController = {
  async createQuiz(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const data = createQuizSchema.parse(req.body);
      const quiz = await quizService.createQuiz(tenantId, data);
      res.status(201).json(quiz);
    } catch (error) {
      next(error);
    }
  },

  async getQuizzes(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const actor = requireActor(req);
      const filters = lessonQuerySchema.parse(req.query);
      const quizzes = await quizService.getQuizzes(tenantId, actor, filters);
      res.json(quizzes);
    } catch (error) {
      next(error);
    }
  },

  async getQuiz(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const actor = requireActor(req);
      const { id } = quizIdParamSchema.parse(req.params);
      const quiz = await quizService.getQuiz(tenantId, id, actor);
      res.json(quiz);
    } catch (error) {
      next(error);
    }
  },

  async updateQuiz(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const { id } = quizIdParamSchema.parse(req.params);
      const data = updateQuizSchema.parse(req.body);
      const quiz = await quizService.updateQuiz(tenantId, id, data);
      res.json(quiz);
    } catch (error) {
      next(error);
    }
  },

  async publishQuiz(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const { id } = quizIdParamSchema.parse(req.params);
      const quiz = await quizService.publishQuiz(tenantId, id);
      res.json(quiz);
    } catch (error) {
      next(error);
    }
  },

  async closeQuiz(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const { id } = quizIdParamSchema.parse(req.params);
      const quiz = await quizService.closeQuiz(tenantId, id);
      res.json(quiz);
    } catch (error) {
      next(error);
    }
  },

  async startQuiz(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const { userId } = requireActor(req);
      const { id } = quizIdParamSchema.parse(req.params);
      const attempt = await quizService.startQuiz(tenantId, id, userId);
      res.status(201).json(attempt);
    } catch (error) {
      next(error);
    }
  },

  async submitQuiz(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const { userId } = requireActor(req);
      const { id } = quizIdParamSchema.parse(req.params);
      const { answers } = submitQuizSchema.parse(req.body);
      const attempt = await quizService.submitQuiz(tenantId, id, userId, answers);
      res.status(201).json(attempt);
    } catch (error) {
      next(error);
    }
  },

  async staffSubmitQuiz(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const { userId } = requireActor(req);
      const { id } = quizIdParamSchema.parse(req.params);
      const { studentId, answers } = staffSubmitQuizSchema.parse(req.body);
      const attempt = await quizService.staffSubmitQuiz(tenantId, id, userId, studentId, answers);
      res.status(201).json(attempt);
    } catch (error) {
      next(error);
    }
  },

  async getAttempts(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const actor = requireActor(req);
      const { id } = quizIdParamSchema.parse(req.params);
      const { studentId } = attemptsQuerySchema.parse(req.query);
      const attempts = await quizService.getAttempts(tenantId, id, actor, studentId);
      res.json(attempts);
    } catch (error) {
      next(error);
    }
  },
};

export const submissionController = {
  async submitAssignment(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const { userId } = requireActor(req);
      const { assignmentId } = assignmentIdParamSchema.parse(req.params);
      const data = submissionBodySchema.parse(req.body);
      const submission = await submissionService.submitAssignment(tenantId, assignmentId, userId, data);
      res.status(201).json(submission);
    } catch (error) {
      next(error);
    }
  },

  async getSubmissions(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const filters = submissionFiltersSchema.parse(req.query);
      const submissions = await submissionService.getSubmissions(tenantId, filters);
      res.json(submissions);
    } catch (error) {
      next(error);
    }
  },

  async gradeSubmission(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const { id } = idParamSchema.parse(req.params);
      const { grade, feedback = "", gradedBy = "" } = gradeSubmissionSchema.parse(req.body);
      const submission = await submissionService.gradeSubmission(
        tenantId,
        id,
        grade,
        feedback,
        gradedBy
      );
      res.json(submission);
    } catch (error) {
      next(error);
    }
  },
};

export const liveClassController = {
  async createClass(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const data = liveClassSchema.parse(req.body);
      const liveClass = await liveClassService.createClass(tenantId, data);
      res.status(201).json(liveClass);
    } catch (error) {
      next(error);
    }
  },

  async getClasses(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const filters = liveClassQuerySchema.parse(req.query);
      const classes = await liveClassService.getClasses(tenantId, filters);
      res.json(classes);
    } catch (error) {
      next(error);
    }
  },

  async updateClass(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const { id } = idParamSchema.parse(req.params);
      const data = liveClassSchema.partial().parse(req.body);
      const liveClass = await liveClassService.updateClass(tenantId, id, data);
      res.json(liveClass);
    } catch (error) {
      next(error);
    }
  },

  async recordAttendance(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const { id } = idParamSchema.parse(req.params);
      const { studentId, joinedAt, leftAt } = liveClassAttendanceSchema.parse(req.body);
      const attendance = await liveClassService.recordAttendance(
        tenantId,
        id,
        studentId,
        joinedAt,
        leftAt
      );
      res.json(attendance);
    } catch (error) {
      next(error);
    }
  },

  async getAttendance(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const { id } = idParamSchema.parse(req.params);
      const attendance = await liveClassService.getAttendance(tenantId, id);
      res.json(attendance);
    } catch (error) {
      next(error);
    }
  },
};

export const discussionController = {
  async createDiscussion(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const actor = requireActor(req);
      const data = createDiscussionSchema.parse(req.body);
      const discussion = await discussionService.createDiscussion(tenantId, actor, data);
      res.status(201).json(discussion);
    } catch (error) {
      next(error);
    }
  },

  async getDiscussions(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const { courseId } = courseIdParamSchema.parse(req.params);
      const discussions = await discussionService.getDiscussions(tenantId, courseId);
      res.json(discussions);
    } catch (error) {
      next(error);
    }
  },

  async addReply(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const actor = requireActor(req);
      const { id } = idParamSchema.parse(req.params);
      const data = createReplySchema.parse(req.body);
      const reply = await discussionService.addReply(tenantId, id, actor, data);
      res.status(201).json(reply);
    } catch (error) {
      next(error);
    }
  },

  async pinDiscussion(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const { id } = idParamSchema.parse(req.params);
      const { isPinned } = pinDiscussionSchema.parse(req.body);
      const discussion = await discussionService.pinDiscussion(tenantId, id, isPinned);
      res.json(discussion);
    } catch (error) {
      next(error);
    }
  },
};

export const certificateController = {
  async generateCertificate(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const { courseId, studentId } = generateCertificateSchema.parse(req.body);
      const certificate = await certificateService.generateCertificate(tenantId, courseId, studentId);
      res.status(201).json(certificate);
    } catch (error) {
      next(error);
    }
  },

  async getCertificates(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const { studentId } = studentIdParamSchema.parse(req.params);
      const certificates = await certificateService.getCertificates(tenantId, studentId);
      res.json(certificates);
    } catch (error) {
      next(error);
    }
  },

  async verifyCertificate(req: Request, res: Response, next: NextFunction) {
    try {
      const { certificateNumber } = certificateNumberParamSchema.parse(req.params);
      const certificate = await certificateService.verifyCertificate(certificateNumber);
      res.json(certificate);
    } catch (error) {
      next(error);
    }
  },
};

export const recordedLessonController = {
  async getRecordedCourses(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      if (!req.user?.userId) {
        throw new ValidationError("Authenticated user required");
      }

      const courses = await recordedLessonService.getRecordedCourses(tenantId, req.user.userId);
      res.json(courses);
    } catch (error) {
      next(error);
    }
  },

  async syncProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      if (!req.user?.userId) {
        throw new ValidationError("Authenticated user required");
      }

      const { lessonId } = recordedLessonParamSchema.parse(req.params);
      const { watchedSeconds } = syncRecordedLessonProgressSchema.parse(req.body);
      const result = await recordedLessonService.syncLessonProgress(
        tenantId,
        req.user.userId,
        lessonId,
        watchedSeconds
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
};

const courseIdParamSchema2 = z.object({ courseId: uuidSchema });

export const studentElearningController = {
  async getMyCourses(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const { userId } = requireActor(req);
      const courses = await studentElearningService.getMyCourses(tenantId, userId);
      res.json(courses);
    } catch (error) {
      next(error);
    }
  },

  async getCourse(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const { userId } = requireActor(req);
      const { id } = idParamSchema.parse(req.params);
      const result = await studentElearningService.getCourse(tenantId, userId, id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async getUpcomingLiveClasses(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const { userId } = requireActor(req);
      const classes = await studentElearningService.getUpcomingLiveClasses(tenantId, userId);
      res.json(classes);
    } catch (error) {
      next(error);
    }
  },

  async getMyQuizzes(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const { userId } = requireActor(req);
      const quizzes = await studentElearningService.getMyQuizzes(tenantId, userId);
      res.json(quizzes);
    } catch (error) {
      next(error);
    }
  },
};

export const joinLiveClassController = {
  async join(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const actor = requireActor(req);
      const { id } = idParamSchema.parse(req.params);
      const role = actor.role === 'TEACHER' ? 'TEACHER' : 'STUDENT';
      const result = await liveClassService.joinClass(tenantId, id, actor.userId, role);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
};
