import { Request, Response } from 'express';
import { QuizService } from '../services/quizService';
import { SubmissionService } from '../services/submissionService';
import { LiveClassService } from '../services/liveClassService';
import { DiscussionService } from '../services/discussionService';
import { CertificateService } from '../services/certificateService';

export class QuizController {
  static async createQuiz(req: Request, res: Response) {
    try {
      const quiz = await QuizService.createQuiz(req.tenantId!, req.body);
      res.status(201).json(quiz);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getQuizzes(req: Request, res: Response) {
    try {
      const quizzes = await QuizService.getQuizzes(req.tenantId!, req.query.lessonId as string);
      res.json(quizzes);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async submitQuiz(req: Request, res: Response) {
    try {
      const attempt = await QuizService.submitQuiz(req.params.id, req.body.studentId, req.body.answers);
      res.status(201).json(attempt);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getAttempts(req: Request, res: Response) {
    try {
      const attempts = await QuizService.getAttempts(req.params.id, req.query.studentId as string);
      res.json(attempts);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}

export class SubmissionController {
  static async submitAssignment(req: Request, res: Response) {
    try {
      const submission = await SubmissionService.submitAssignment(req.tenantId!, req.params.assignmentId, req.body.studentId, req.body);
      res.status(201).json(submission);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getSubmissions(req: Request, res: Response) {
    try {
      const { assignmentId, studentId } = req.query;
      const filters: any = {};
      if (assignmentId) filters.assignmentId = assignmentId;
      if (studentId) filters.studentId = studentId;

      const submissions = await SubmissionService.getSubmissions(req.tenantId!, filters);
      res.json(submissions);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async gradeSubmission(req: Request, res: Response) {
    try {
      const { grade, feedback, gradedBy } = req.body;
      const submission = await SubmissionService.gradeSubmission(req.params.id, grade, feedback, gradedBy);
      res.json(submission);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}

export class LiveClassController {
  static async createClass(req: Request, res: Response) {
    try {
      const liveClass = await LiveClassService.createClass(req.tenantId!, req.body);
      res.status(201).json(liveClass);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getClasses(req: Request, res: Response) {
    try {
      const { teacherId, status } = req.query;
      const filters: any = {};
      if (teacherId) filters.teacherId = teacherId;
      if (status) filters.status = status;

      const classes = await LiveClassService.getClasses(req.tenantId!, filters);
      res.json(classes);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async updateClass(req: Request, res: Response) {
    try {
      const liveClass = await LiveClassService.updateClass(req.params.id, req.body);
      res.json(liveClass);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async recordAttendance(req: Request, res: Response) {
    try {
      const { studentId, joinedAt, leftAt } = req.body;
      const attendance = await LiveClassService.recordAttendance(req.params.id, studentId, joinedAt ? new Date(joinedAt) : undefined, leftAt ? new Date(leftAt) : undefined);
      res.json(attendance);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getAttendance(req: Request, res: Response) {
    try {
      const attendance = await LiveClassService.getAttendance(req.params.id);
      res.json(attendance);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}

export class DiscussionController {
  static async createDiscussion(req: Request, res: Response) {
    try {
      const discussion = await DiscussionService.createDiscussion(req.tenantId!, req.body);
      res.status(201).json(discussion);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getDiscussions(req: Request, res: Response) {
    try {
      const discussions = await DiscussionService.getDiscussions(req.tenantId!, req.params.courseId);
      res.json(discussions);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async addReply(req: Request, res: Response) {
    try {
      const reply = await DiscussionService.addReply(req.params.id, req.body);
      res.status(201).json(reply);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async pinDiscussion(req: Request, res: Response) {
    try {
      const discussion = await DiscussionService.pinDiscussion(req.params.id, req.body.isPinned);
      res.json(discussion);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}

export class CertificateController {
  static async generateCertificate(req: Request, res: Response) {
    try {
      const { courseId, studentId } = req.body;
      const certificate = await CertificateService.generateCertificate(req.tenantId!, courseId, studentId);
      res.status(201).json(certificate);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getCertificates(req: Request, res: Response) {
    try {
      const certificates = await CertificateService.getCertificates(req.tenantId!, req.params.studentId);
      res.json(certificates);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async verifyCertificate(req: Request, res: Response) {
    try {
      const certificate = await CertificateService.verifyCertificate(req.params.certificateNumber);
      res.json(certificate);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
