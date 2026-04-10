import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { withTenant } from "../utils/withTenant";
import { validate } from "../middleware/validate";
import { loginSchema, registerSchema } from "../utils/schemas";
import { authLimiter } from "../middleware/rateLimiter";
import { NotificationService } from "../services/notificationService";

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

    void NotificationService.sendEmail(
      user.email,
      `Welcome to ${tenant?.name || "School Software"}`,
      `Hi ${firstName || "there"},\nYour account has been created successfully at ${tenant?.name || "our school"}.`
    ).catch((err) => {
      console.error(`Failed to send welcome email to ${user.email}:`, err);
    });

    res.status(201).json({ id: user.id, email: user.email, roleId: user.roleId });
  } catch (e) { next(e); }
});

export default router;
