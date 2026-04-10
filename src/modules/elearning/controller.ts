import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import prisma from "../../prisma/client";
import { ValidationError } from "../../utils/errors";
import {
  CertificateService,
  DiscussionService,
  LiveClassService,
  QuizService,
  SubmissionService,
} from "./service";
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

const quizIdParamSchema = idParamSchema;
const lessonQuerySchema = z.object({
  lessonId: optionalUuidSchema,
});

const createQuizSchema = z.object({
  lessonId: optionalUuidSchema,
  title: z.string().min(1),
  description: z.string().optional(),
  duration: z.coerce.number().int().positive().optional(),
  passingScore: z.coerce.number().nonnegative().optional(),
  questions: z.array(z.record(z.unknown())),
});

const submitQuizSchema = z.object({
  studentId: uuidSchema,
  answers: z.array(z.record(z.unknown())),
});

const attemptsQuerySchema = z.object({
  studentId: uuidSchema,
});

const assignmentIdParamSchema = z.object({
  assignmentId: uuidSchema,
});

const submissionFiltersSchema = z.object({
  assignmentId: optionalUuidSchema,
  studentId: optionalUuidSchema,
});

const submissionBodySchema = z.object({
  studentId: uuidSchema,
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
  platform: z.string().min(1),
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
  authorId: uuidSchema,
  authorType: z.enum(["STUDENT", "TEACHER"]),
});

const createReplySchema = z.object({
  content: z.string().min(1),
  authorId: uuidSchema,
  authorType: z.enum(["STUDENT", "TEACHER"]),
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

function requireTenantId(req: Request) {
  if (!req.tenantId) {
    throw new ValidationError("Tenant ID required");
  }

  return req.tenantId;
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
      const { lessonId } = lessonQuerySchema.parse(req.query);
      const quizzes = await quizService.getQuizzes(tenantId, lessonId);
      res.json(quizzes);
    } catch (error) {
      next(error);
    }
  },

  async submitQuiz(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const { id } = quizIdParamSchema.parse(req.params);
      const { studentId, answers } = submitQuizSchema.parse(req.body);
      const attempt = await quizService.submitQuiz(tenantId, id, studentId, answers);
      res.status(201).json(attempt);
    } catch (error) {
      next(error);
    }
  },

  async getAttempts(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const { id } = quizIdParamSchema.parse(req.params);
      const { studentId } = attemptsQuerySchema.parse(req.query);
      const attempts = await quizService.getAttempts(tenantId, id, studentId);
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
      const { assignmentId } = assignmentIdParamSchema.parse(req.params);
      const data = submissionBodySchema.parse(req.body);
      const submission = await submissionService.submitAssignment(
        tenantId,
        assignmentId,
        data.studentId,
        data
      );
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
      const data = createDiscussionSchema.parse(req.body);
      const discussion = await discussionService.createDiscussion(tenantId, data);
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
      const { id } = idParamSchema.parse(req.params);
      const data = createReplySchema.parse(req.body);
      const reply = await discussionService.addReply(tenantId, id, data);
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
