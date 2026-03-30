import { Router } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { apiLimiter } from "../middleware/rateLimiter";
import { TenantService } from "../services/tenantService";

const router = Router();

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

router.post("/school", apiLimiter, async (req, res, next) => {
  try {
    const data = schoolOnboardingSchema.parse(req.body);
    const { tenant, adminUser, setup } = await TenantService.createSchool(data);

    const role = adminUser.role?.name?.toUpperCase() ?? "ADMIN";
    const token = jwt.sign(
      { userId: adminUser.id, tenantId: tenant.id, roleId: adminUser.roleId, role },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      token,
      user: {
        id: adminUser.id,
        email: adminUser.email,
        firstName: adminUser.firstName,
        lastName: adminUser.lastName,
        roleId: adminUser.roleId,
        role: adminUser.role,
        tenantId: tenant.id,
        tenantSubdomain: tenant.subdomain ?? undefined,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        subdomain: tenant.subdomain,
      },
      setup: {
        academicYear: setup.academicYear.name,
        currentTerm: setup.currentTerm.name,
        classesCreated: setup.classesCreated,
        subjectsCreated: setup.subjectsCreated,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0]?.message ?? "Invalid onboarding request" });
    }
    next(error);
  }
});

export default router;
