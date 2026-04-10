import { Request, Response } from 'express';
import { z } from 'zod';
import { QuizService } from '../services/quizService';
import { SubmissionService } from '../services/submissionService';
import { LiveClassService } from '../services/liveClassService';
import { DiscussionService } from '../services/discussionService';
import { CertificateService } from '../services/certificateService';
import {
  idParamSchema,
  optionalUuidSchema,
  uuidSchema,
} from '../utils/validation';

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
  status: z.enum(['SCHEDULED', 'LIVE', 'COMPLETED', 'CANCELLED']).optional(),
});

const liveClassQuerySchema = z.object({
  teacherId: optionalUuidSchema,
  status: z.enum(['SCHEDULED', 'LIVE', 'COMPLETED', 'CANCELLED']).optional(),
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
  authorType: z.enum(['STUDENT', 'TEACHER']),
});

const createReplySchema = z.object({
  content: z.string().min(1),
  authorId: uuidSchema,
  authorType: z.enum(['STUDENT', 'TEACHER']),
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

export class QuizController {
  static async createQuiz(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });
      const data = createQuizSchema.parse(req.body);
      const quiz = await QuizService.createQuiz(req.tenantId, data);
      res.status(201).json(quiz);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getQuizzes(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });
      const { lessonId } = lessonQuerySchema.parse(req.query);
      const quizzes = await QuizService.getQuizzes(req.tenantId, lessonId);
      res.json(quizzes);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async submitQuiz(req: Request, res: Response) {
    try {
      const { id } = quizIdParamSchema.parse(req.params);
      const { studentId, answers } = submitQuizSchema.parse(req.body);
      const attempt = await QuizService.submitQuiz(id, studentId, answers);
      res.status(201).json(attempt);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getAttempts(req: Request, res: Response) {
    try {
      const { id } = quizIdParamSchema.parse(req.params);
      const { studentId } = attemptsQuerySchema.parse(req.query);
      const attempts = await QuizService.getAttempts(id, studentId);
      res.json(attempts);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}

export class SubmissionController {
  static async submitAssignment(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });
      const { assignmentId } = assignmentIdParamSchema.parse(req.params);
      const data = submissionBodySchema.parse(req.body);
      const submission = await SubmissionService.submitAssignment(req.tenantId, assignmentId, data.studentId, data);
      res.status(201).json(submission);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getSubmissions(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });
      const filters = submissionFiltersSchema.parse(req.query);
      const submissions = await SubmissionService.getSubmissions(req.tenantId, filters);
      res.json(submissions);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async gradeSubmission(req: Request, res: Response) {
    try {
      const { id } = idParamSchema.parse(req.params);
      const { grade, feedback = '', gradedBy = '' } = gradeSubmissionSchema.parse(req.body);
      const submission = await SubmissionService.gradeSubmission(id, grade, feedback, gradedBy);
      res.json(submission);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}

export class LiveClassController {
  static async createClass(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });
      const data = liveClassSchema.parse(req.body);
      const liveClass = await LiveClassService.createClass(req.tenantId, data);
      res.status(201).json(liveClass);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getClasses(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });
      const filters = liveClassQuerySchema.parse(req.query);
      const classes = await LiveClassService.getClasses(req.tenantId, filters);
      res.json(classes);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async updateClass(req: Request, res: Response) {
    try {
      const { id } = idParamSchema.parse(req.params);
      const data = liveClassSchema.partial().parse(req.body);
      const liveClass = await LiveClassService.updateClass(id, data);
      res.json(liveClass);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async recordAttendance(req: Request, res: Response) {
    try {
      const { id } = idParamSchema.parse(req.params);
      const { studentId, joinedAt, leftAt } = liveClassAttendanceSchema.parse(req.body);
      const attendance = await LiveClassService.recordAttendance(id, studentId, joinedAt, leftAt);
      res.json(attendance);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getAttendance(req: Request, res: Response) {
    try {
      const { id } = idParamSchema.parse(req.params);
      const attendance = await LiveClassService.getAttendance(id);
      res.json(attendance);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}

export class DiscussionController {
  static async createDiscussion(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });
      const data = createDiscussionSchema.parse(req.body);
      const discussion = await DiscussionService.createDiscussion(req.tenantId, data);
      res.status(201).json(discussion);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getDiscussions(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });
      const { courseId } = courseIdParamSchema.parse(req.params);
      const discussions = await DiscussionService.getDiscussions(req.tenantId, courseId);
      res.json(discussions);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async addReply(req: Request, res: Response) {
    try {
      const { id } = idParamSchema.parse(req.params);
      const data = createReplySchema.parse(req.body);
      const reply = await DiscussionService.addReply(id, data);
      res.status(201).json(reply);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async pinDiscussion(req: Request, res: Response) {
    try {
      const { id } = idParamSchema.parse(req.params);
      const { isPinned } = pinDiscussionSchema.parse(req.body);
      const discussion = await DiscussionService.pinDiscussion(id, isPinned);
      res.json(discussion);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}

export class CertificateController {
  static async generateCertificate(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });
      const { courseId, studentId } = generateCertificateSchema.parse(req.body);
      const certificate = await CertificateService.generateCertificate(req.tenantId, courseId, studentId);
      res.status(201).json(certificate);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getCertificates(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });
      const { studentId } = studentIdParamSchema.parse(req.params);
      const certificates = await CertificateService.getCertificates(req.tenantId, studentId);
      res.json(certificates);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async verifyCertificate(req: Request, res: Response) {
    try {
      const { certificateNumber } = certificateNumberParamSchema.parse(req.params);
      const certificate = await CertificateService.verifyCertificate(certificateNumber);
      res.json(certificate);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
