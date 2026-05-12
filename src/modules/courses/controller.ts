import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import prisma from "../../prisma/client";
import { ValidationError } from "../../utils/errors";
import { checkServiceAccess } from "../../utils/checkServiceAccess";
import { parseCsv } from "../../utils/csv";
import {
  idParamSchema,
  optionalBooleanSchema,
  optionalUuidSchema,
  uuidSchema,
} from "../../utils/validation";
import { CourseService } from "./service";

const service = new CourseService(prisma);
const SUPPORTED_DIRECT_VIDEO_EXTENSIONS = [".mp4", ".m4v", ".mov", ".webm", ".ogv", ".m3u8"];

function isSupportedRecordedLessonUrl(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const pathname = url.pathname.toLowerCase();

    if (host === "youtu.be" || host.endsWith("youtube.com")) {
      return true;
    }

    if (host === "vimeo.com" || host.endsWith(".vimeo.com")) {
      return true;
    }

    return SUPPORTED_DIRECT_VIDEO_EXTENSIONS.some((extension) => pathname.endsWith(extension));
  } catch {
    return false;
  }
}

const supportedVideoUrlSchema = z
  .string()
  .url()
  .refine(
    isSupportedRecordedLessonUrl,
    "Only YouTube, Vimeo, or direct video file URLs are supported"
  );

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

const courseIdParamSchema = idParamSchema;

const moduleIdParamSchema = z.object({
  id: uuidSchema,
  moduleId: uuidSchema,
});

const lessonIdParamSchema = z.object({
  id: uuidSchema,
  moduleId: uuidSchema,
  lessonId: uuidSchema,
});

const createModuleSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
});

const updateModuleSchema = createModuleSchema.partial();

const reorderModulesSchema = z.object({
  moduleIds: z.array(uuidSchema).min(1),
});

const createLessonSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("VIDEO"),
    title: z.string().min(1),
    content: z.string().optional(),
    videoUrl: supportedVideoUrlSchema,
    duration: z.coerce.number().int().positive(),
  }),
  z.object({
    type: z.literal("QUIZ"),
    title: z.string().min(1),
    content: z.string().optional(),
  }),
]);

const updateLessonSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  videoUrl: supportedVideoUrlSchema.optional(),
  duration: z.coerce.number().int().positive().optional(),
});

const reorderLessonsSchema = z.object({
  lessonIds: z.array(uuidSchema).min(1),
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

      const access = await checkServiceAccess(prisma, tenantId, studentId, "TUITION");
      if (!access.allowed) {
        return res.status(403).json({ error: access.reason, revokedFees: access.revokedFees });
      }

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

  async createModule(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const { id } = courseIdParamSchema.parse(req.params);
      const data = createModuleSchema.parse(req.body);
      const module = await service.createModule(tenantId, id, data);
      res.status(201).json(module);
    } catch (error) {
      next(error);
    }
  },

  async updateModule(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const { id, moduleId } = moduleIdParamSchema.parse(req.params);
      const data = updateModuleSchema.parse(req.body);
      const module = await service.updateModule(tenantId, id, moduleId, data);
      res.json(module);
    } catch (error) {
      next(error);
    }
  },

  async reorderModules(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const { id } = courseIdParamSchema.parse(req.params);
      const { moduleIds } = reorderModulesSchema.parse(req.body);
      const course = await service.reorderModules(tenantId, id, moduleIds);
      res.json(course);
    } catch (error) {
      next(error);
    }
  },

  async deleteModule(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const { id, moduleId } = moduleIdParamSchema.parse(req.params);
      await service.deleteModule(tenantId, id, moduleId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  async createLesson(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const { id, moduleId } = moduleIdParamSchema.parse(req.params);
      const data = createLessonSchema.parse(req.body);
      const lesson = await service.createLesson(tenantId, id, moduleId, data);
      res.status(201).json(lesson);
    } catch (error) {
      next(error);
    }
  },

  async updateLesson(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const { id, moduleId, lessonId } = lessonIdParamSchema.parse(req.params);
      const data = updateLessonSchema.parse(req.body);
      const lesson = await service.updateLesson(tenantId, id, moduleId, lessonId, data);
      res.json(lesson);
    } catch (error) {
      next(error);
    }
  },

  async reorderRecordedLessons(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const { id, moduleId } = moduleIdParamSchema.parse(req.params);
      const { lessonIds } = reorderLessonsSchema.parse(req.body);
      const course = await service.reorderRecordedLessons(tenantId, id, moduleId, lessonIds);
      res.json(course);
    } catch (error) {
      next(error);
    }
  },

  async deleteRecordedLesson(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const { id, moduleId, lessonId } = lessonIdParamSchema.parse(req.params);
      await service.deleteRecordedLesson(tenantId, id, moduleId, lessonId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  async enrollCsv(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const { id } = idParamSchema.parse(req.params);
      if (!req.file) throw new ValidationError("No file uploaded");

      const rows = parseCsv(req.file.buffer);
      if (!rows.length) throw new ValidationError("CSV is empty");

      const students = await prisma.student.findMany({
        where: { tenantId },
        select: { id: true, firstName: true, lastName: true, studentCode: true },
      });
      const byName = new Map(students.map(s => [`${s.firstName} ${s.lastName}`.toLowerCase(), s.id]));
      const byCode = new Map(students.filter(s => s.studentCode).map(s => [s.studentCode!.toUpperCase(), s.id]));

      const errors: string[] = [];
      const enrolled: any[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const ln = i + 2;
        let studentId = row.student_id || '';
        if (!studentId) {
          const name = (row.student_name || row.name || '').toLowerCase();
          const code = (row.student_code || '').toUpperCase();
          if (code && byCode.has(code)) studentId = byCode.get(code)!;
          else if (name && byName.has(name)) studentId = byName.get(name)!;
        }
        if (!studentId) { errors.push(`Row ${ln}: cannot resolve student`); continue; }

        try {
          const enrollment = await service.enrollStudent(tenantId, id, studentId);
          enrolled.push(enrollment);
        } catch (e: any) {
          errors.push(`Row ${ln}: ${e.message}`);
        }
      }

      res.status(201).json({ imported: enrolled.length, errors });
    } catch (error) {
      next(error);
    }
  },
};
