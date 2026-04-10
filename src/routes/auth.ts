import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { withTenant } from "../utils/withTenant";
import { validate } from "../middleware/validate";
import { loginSchema, registerSchema, studentLoginSchema } from "../utils/schemas";
import { authLimiter } from "../middleware/rateLimiter";
import { NotificationService } from "../services/notificationService";
import { StudentIdService } from "../services/studentIdService";
import prisma from "../prisma/client";

const router = Router();

function normalizeRoleName(roleName?: string | null) {
  return roleName?.toUpperCase() ?? "STUDENT";
}

router.post("/login", authLimiter, validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const tenantId = req.tenantId!;

    const user = await withTenant(tenantId, (tx) =>
      tx.user.findFirst({ 
        where: { email },
        include: {
          role: true,
          tenant: {
            select: {
              subdomain: true,
            },
          },
        }
      })
    );

    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const role = normalizeRoleName(user.role?.name);

    const token = jwt.sign(
      { userId: user.id, tenantId, roleId: user.roleId, role },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName ?? undefined,
        lastName: user.lastName ?? undefined,
        roleId: user.roleId,
        role: user.role,
        tenantId: user.tenantId,
        tenantSubdomain: user.tenant?.subdomain ?? undefined,
      },
    });
  } catch (e) { next(e); }
});

router.post("/register", authLimiter, validate(registerSchema), async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, roleId } = req.body;
    const tenantId = req.tenantId!;
    const hashedPassword = await bcrypt.hash(password, 12);

    const [user, tenant] = await withTenant(tenantId, async (tx) => {
      const newUser = await tx.user.create({
        data: { tenantId, email, password: hashedPassword, firstName, lastName, roleId }
      });
      const tenantData = await tx.tenant.findUnique({ where: { id: tenantId } });
      return [newUser, tenantData];
    });

    if (user.email) {
      void NotificationService.sendEmail(
        user.email,
        `Welcome to ${tenant?.name || "School Software"}`,
        `Hi ${firstName || "there"},\nYour account has been created successfully at ${tenant?.name || "our school"}.`
      ).catch((err) => {
        console.error(`Failed to send welcome email to ${user.email}:`, err);
      });
    }

    res.status(201).json({ id: user.id, email: user.email, roleId: user.roleId });
  } catch (e) { next(e); }
});

// Student login — resolves tenant from the school code prefix in the student ID
router.post("/student-login", authLimiter, validate(studentLoginSchema), async (req, res, next) => {
  try {
    const { studentId, password } = req.body;
    const upperStudentId = studentId.toUpperCase();

    // Extract school code prefix (e.g. "GWD250042" → "GWD")
    const schoolCode = StudentIdService.extractSchoolCode(upperStudentId);
    if (!schoolCode) {
      return res.status(400).json({ error: "Invalid student ID format" });
    }

    // Resolve tenant from school code (no tenant middleware header needed)
    const tenant = await prisma.tenant.findFirst({
      where: { schoolCode: { equals: schoolCode, mode: "insensitive" } },
    });
    if (!tenant) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Find the User account for this student
    const user = await withTenant(tenant.id, (tx) =>
      tx.user.findFirst({
        where: { tenantId: tenant.id, studentCode: upperStudentId },
        include: { role: true },
      })
    );

    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const role = normalizeRoleName(user.role?.name);
    const token = jwt.sign(
      { userId: user.id, tenantId: tenant.id, roleId: user.roleId, role },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        studentCode: user.studentCode,
        firstName: user.firstName ?? undefined,
        lastName: user.lastName ?? undefined,
        roleId: user.roleId,
        role: user.role,
        tenantId: tenant.id,
        tenantSubdomain: tenant.subdomain ?? undefined,
      },
    });
  } catch (e) { next(e); }
});

export default router;
