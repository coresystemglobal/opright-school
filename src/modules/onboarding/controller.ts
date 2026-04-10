import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { OnboardingService } from "./service";

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
  adminPassword: z.string().min(8, "Password must be at least 8 characters"),
  schoolType: z.enum(["PRIMARY", "SECONDARY", "PRIMARY_SECONDARY"]).default("PRIMARY_SECONDARY"),
  studentTier: z.enum(["STARTER", "GROWING", "STANDARD", "LARGE", "MEGA"]).default("STARTER"),
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
