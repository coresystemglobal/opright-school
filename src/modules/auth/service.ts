import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { NotificationService } from "../../services/notificationService";
import { StudentIdService } from "../../services/studentIdService";
import { UnauthorizedError, ValidationError } from "../../utils/errors";

type LoginInput = {
  email: string;
  password: string;
};

type RegisterInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roleId: string;
};

type StudentLoginInput = {
  studentId: string;
  password: string;
};

function normalizeRoleName(roleName?: string | null) {
  return roleName?.toUpperCase() ?? "STUDENT";
}

export class AuthService {
  constructor(private prisma: PrismaClient) {}

  async login(tenantId: string, input: LoginInput) {
    const user = await this.prisma.user.findFirst({
      where: { tenantId, email: input.email },
      include: {
        role: true,
        tenant: {
          select: {
            subdomain: true,
          },
        },
      },
    });

    if (!user || !(await bcrypt.compare(input.password, user.password))) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const role = normalizeRoleName(user.role?.name);

    return {
      token: this.signToken({
        userId: user.id,
        tenantId,
        roleId: user.roleId,
        role,
      }),
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
    };
  }

  async register(tenantId: string, input: RegisterInput) {
    const hashedPassword = await bcrypt.hash(input.password, 12);

    const [user, tenant] = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          tenantId,
          email: input.email,
          password: hashedPassword,
          firstName: input.firstName,
          lastName: input.lastName,
          roleId: input.roleId,
        },
      });

      const tenantData = await tx.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true },
      });

      return [newUser, tenantData] as const;
    });

    if (user.email) {
      void NotificationService.sendEmail(
        user.email,
        `Welcome to ${tenant?.name || "School Software"}`,
        `Hi ${input.firstName || "there"},\nYour account has been created successfully at ${tenant?.name || "our school"}.`
      ).catch((error) => {
        console.error(`Failed to send welcome email to ${user.email}:`, error);
      });
    }

    return {
      id: user.id,
      email: user.email,
      roleId: user.roleId,
    };
  }

  async studentLogin(input: StudentLoginInput) {
    const upperStudentId = input.studentId.toUpperCase();
    const schoolCode = StudentIdService.extractSchoolCode(upperStudentId);

    if (!schoolCode) {
      throw new ValidationError("Invalid student ID format");
    }

    const tenant = await this.prisma.tenant.findFirst({
      where: { schoolCode: { equals: schoolCode, mode: "insensitive" } },
      select: { id: true, subdomain: true },
    });

    if (!tenant) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const user = await this.prisma.user.findFirst({
      where: { tenantId: tenant.id, studentCode: upperStudentId },
      include: { role: true },
    });

    if (!user || !(await bcrypt.compare(input.password, user.password))) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const role = normalizeRoleName(user.role?.name);

    return {
      token: this.signToken({
        userId: user.id,
        tenantId: tenant.id,
        roleId: user.roleId,
        role,
      }),
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
    };
  }

  private signToken(payload: {
    userId: string;
    tenantId: string;
    roleId?: string | null;
    role: string;
  }) {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new ValidationError("JWT secret is not configured");
    }

    return jwt.sign(payload, secret, { expiresIn: "7d" });
  }
}
