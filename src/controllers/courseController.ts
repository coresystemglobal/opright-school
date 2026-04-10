import { Request, Response } from 'express';
import { z } from 'zod';
import { CourseService } from '../services/courseService';
import {
  idParamSchema,
  optionalBooleanSchema,
  optionalUuidSchema,
  uuidSchema,
} from '../utils/validation';

const createCourseSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  thumbnail: z.string().optional(),
  teacherId: uuidSchema,
  subjectId: optionalUuidSchema,
  duration: z.coerce.number().int().positive().optional(),
  level: z.string().min(1).optional(),
  prerequisites: z.unknown().optional(),
  isPublished: z.boolean().optional(),
});

const updateCourseSchema = createCourseSchema.partial();

const getCoursesQuerySchema = z.object({
  isPublished: optionalBooleanSchema,
  teacherId: optionalUuidSchema,
});

const studentIdParamSchema = z.object({
  studentId: uuidSchema,
});

const enrollStudentSchema = z.object({
  studentId: uuidSchema,
});

const updateProgressSchema = z.object({
  enrollmentId: uuidSchema,
  lessonId: uuidSchema,
  completed: z.boolean(),
  timeSpent: z.coerce.number().int().nonnegative(),
});

export class CourseController {
  static async createCourse(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });
      const data = createCourseSchema.parse(req.body);
      const course = await CourseService.createCourse(req.tenantId, data);
      res.status(201).json(course);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getCourses(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });
      const filters = getCoursesQuerySchema.parse(req.query);
      const courses = await CourseService.getCourses(req.tenantId, filters);
      res.json(courses);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getCourse(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });
      const { id } = idParamSchema.parse(req.params);
      const course = await CourseService.getCourse(req.tenantId, id);
      res.json(course);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async updateCourse(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });
      const { id } = idParamSchema.parse(req.params);
      const data = updateCourseSchema.parse(req.body);
      const course = await CourseService.updateCourse(req.tenantId, id, data);
      res.json(course);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async deleteCourse(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });
      const { id } = idParamSchema.parse(req.params);
      await CourseService.deleteCourse(req.tenantId, id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async enrollStudent(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });
      const { id } = idParamSchema.parse(req.params);
      const { studentId } = enrollStudentSchema.parse(req.body);
      const enrollment = await CourseService.enrollStudent(req.tenantId, id, studentId);
      res.status(201).json(enrollment);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getEnrollments(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });
      const { studentId } = studentIdParamSchema.parse(req.params);
      const enrollments = await CourseService.getEnrollments(req.tenantId, studentId);
      res.json(enrollments);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async updateProgress(req: Request, res: Response) {
    try {
      const { enrollmentId, lessonId, completed, timeSpent } = updateProgressSchema.parse(req.body);
      const progress = await CourseService.updateProgress(enrollmentId, lessonId, completed, timeSpent);
      res.json(progress);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
