import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import prisma from "../../prisma/client";
import { ValidationError } from "../../utils/errors";
import {
  idParamSchema,
  optionalBooleanSchema,
  optionalUuidSchema,
  uuidSchema,
} from "../../utils/validation";
import { CourseService } from "./service";

const service = new CourseService(prisma);

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

function requireTenantId(req: Request) {
  if (!req.tenantId) {
    throw new ValidationError("Tenant ID required");
  }

  return req.tenantId;
}

export const courseController = {
  async createCourse(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const data = createCourseSchema.parse(req.body);
      const course = await service.createCourse(tenantId, data);
      res.status(201).json(course);
    } catch (error) {
      next(error);
    }
  },

  async getCourses(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const filters = getCoursesQuerySchema.parse(req.query);
      const courses = await service.getCourses(tenantId, filters);
      res.json(courses);
    } catch (error) {
      next(error);
    }
  },

  async getCourse(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const { id } = idParamSchema.parse(req.params);
      const course = await service.getCourse(tenantId, id);
      res.json(course);
    } catch (error) {
      next(error);
    }
  },

  async updateCourse(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const { id } = idParamSchema.parse(req.params);
      const data = updateCourseSchema.parse(req.body);
      const course = await service.updateCourse(tenantId, id, data);
      res.json(course);
    } catch (error) {
      next(error);
    }
  },

  async deleteCourse(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const { id } = idParamSchema.parse(req.params);
      await service.deleteCourse(tenantId, id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  async enrollStudent(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const { id } = idParamSchema.parse(req.params);
      const { studentId } = enrollStudentSchema.parse(req.body);
      const enrollment = await service.enrollStudent(tenantId, id, studentId);
      res.status(201).json(enrollment);
    } catch (error) {
      next(error);
    }
  },

  async getEnrollments(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const { studentId } = studentIdParamSchema.parse(req.params);
      const enrollments = await service.getEnrollments(tenantId, studentId);
      res.json(enrollments);
    } catch (error) {
      next(error);
    }
  },

  async updateProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const { enrollmentId, lessonId, completed, timeSpent } = updateProgressSchema.parse(req.body);
      const progress = await service.updateProgress(tenantId, {
        enrollmentId,
        lessonId,
        completed,
        timeSpent,
      });
      res.json(progress);
    } catch (error) {
      next(error);
    }
  },
};
