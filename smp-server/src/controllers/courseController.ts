import { Request, Response } from 'express';
import { CourseService } from '../services/courseService';

export class CourseController {
  static async createCourse(req: Request, res: Response) {
    try {
      const course = await CourseService.createCourse(req.tenantId!, req.body);
      res.status(201).json(course);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getCourses(req: Request, res: Response) {
    try {
      const { isPublished, teacherId } = req.query;
      const filters: any = {};
      if (isPublished !== undefined) filters.isPublished = isPublished === 'true';
      if (teacherId) filters.teacherId = teacherId;

      const courses = await CourseService.getCourses(req.tenantId!, filters);
      res.json(courses);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getCourse(req: Request, res: Response) {
    try {
      const course = await CourseService.getCourse(req.tenantId!, req.params.id);
      res.json(course);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async updateCourse(req: Request, res: Response) {
    try {
      const course = await CourseService.updateCourse(req.tenantId!, req.params.id, req.body);
      res.json(course);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async deleteCourse(req: Request, res: Response) {
    try {
      await CourseService.deleteCourse(req.tenantId!, req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async enrollStudent(req: Request, res: Response) {
    try {
      const enrollment = await CourseService.enrollStudent(req.tenantId!, req.params.id, req.body.studentId);
      res.status(201).json(enrollment);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getEnrollments(req: Request, res: Response) {
    try {
      const enrollments = await CourseService.getEnrollments(req.tenantId!, req.params.studentId);
      res.json(enrollments);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async updateProgress(req: Request, res: Response) {
    try {
      const { enrollmentId, lessonId, completed, timeSpent } = req.body;
      const progress = await CourseService.updateProgress(enrollmentId, lessonId, completed, timeSpent);
      res.json(progress);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
