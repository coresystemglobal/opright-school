import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { OnboardingService } from "./service";
import { passwordSchema } from "../../utils/passwordPolicy";

const service = new OnboardingService();

const schoolOnboardingSchema = z.object({
  schoolName: z.string().min(2, "School name is required"),
  schoolCode: z
    .string()
    .min(3, "School code is required")
    .max(32)
    .regex(/^[a-z0-9-]+$/, "School code can only contain lowercase letters, numbers, and hyphens"),
  adminName: z.string().min(2, "Administrator name is required"),
  adminEmail: z.string().email("Valid admin email is required"),
  adminPassword: passwordSchema,
  schoolType: z.enum(["PRIMARY", "SECONDARY", "PRIMARY_SECONDARY"]).default("PRIMARY_SECONDARY"),
  studentCount: z.number().int().min(1, "Student count must be at least 1").max(100_000),
});

export const onboardingController = {
  async createSchool(req: Request, res: Response, next: NextFunction) {
    try {
      const data = schoolOnboardingSchema.parse(req.body);
      const result = await service.createSchool(data);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  },
};
