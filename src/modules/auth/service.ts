import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { NotificationService } from "../../services/notificationService";
import { StudentIdService } from "../../services/studentIdService";
import { UnauthorizedError, ValidationError } from "../../utils/errors";
import { AuthTokenService } from "./tokenService";

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;

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
  constructor(
    private prisma: PrismaClient,
    private tokenService = new AuthTokenService(prisma)
  ) {}

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

    if (!user.emailVerified && user.emailVerifyToken) {
      throw new ValidationError("Please verify your email before logging in");
    }

    const role = normalizeRoleName(user.role?.name);
    const tokens = await this.tokenService.issueTokens({
      userId: user.id,
      tenantId,
      roleId: user.roleId,
      role,
    });

    return {
      ...tokens,
      mustChangePassword: user.mustChangePassword,
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
    const emailVerifyToken = crypto.randomBytes(32).toString("hex");

    const [user, tenant] = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          tenantId,
          email: input.email,
          password: hashedPassword,
          firstName: input.firstName,
          lastName: input.lastName,
          roleId: input.roleId,
          emailVerified: false,
          emailVerifyToken,
        },
      });

      const tenantData = await tx.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true },
      });

      return [newUser, tenantData] as const;
    });

    if (user.email) {
      const verifyUrl = `${process.env.APP_URL}/auth/verify-email?token=${emailVerifyToken}`;
      void NotificationService.sendEmail(
        user.email,
        `Verify your email — ${tenant?.name || "School Software"}`,
        `Hi ${input.firstName || "there"},\nPlease verify your email by visiting: ${verifyUrl}`
      ).catch((error) => {
        console.error(`Failed to send verification email to ${user.email}:`, error);
      });
    }

    return {
      id: user.id,
      email: user.email,
      roleId: user.roleId,
    };
  }

  async studentLogin(tenantId: string, input: StudentLoginInput) {
    const upperStudentId = input.studentId.toUpperCase();
    const schoolCode = StudentIdService.extractSchoolCode(upperStudentId);

    if (!schoolCode) {
      throw new ValidationError("Invalid student ID format");
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, schoolCode: true, subdomain: true },
    });

    if (!tenant) {
      throw new UnauthorizedError("Invalid credentials");
    }

    if (tenant.schoolCode && tenant.schoolCode.toUpperCase() !== schoolCode) {
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
    const tokens = await this.tokenService.issueTokens({
      userId: user.id,
      tenantId: tenant.id,
      roleId: user.roleId,
      role,
    });

    return {
      ...tokens,
      mustChangePassword: user.mustChangePassword,
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

  async verifyEmail(token: string) {
    const user = await this.prisma.user.findFirst({
      where: { emailVerifyToken: token },
    });
    if (!user) throw new ValidationError("Invalid or expired verification token");

    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, emailVerifyToken: null },
    });

    return { verified: true };
  }

  async refresh(tenantId: string, refreshToken: string) {
    return this.tokenService.refreshTokens(tenantId, refreshToken);
  }

  async logout(tenantId: string, refreshToken: string) {
    await this.tokenService.revokeRefreshToken(tenantId, refreshToken);
  }

  async changePassword(tenantId: string, userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: { id: true, password: true },
    });
    if (!user) throw new UnauthorizedError('User not found');

    const matches = await bcrypt.compare(currentPassword, user.password);
    if (!matches) throw new UnauthorizedError('Current password is incorrect');

    const hashed = await bcrypt.hash(newPassword, 12);

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { password: hashed, mustChangePassword: false } }),
      this.prisma.refreshToken.deleteMany({ where: { userId, tenantId } }),
    ]);
  }

  async requestPasswordReset(tenantId: string, email: string) {
    const user = await this.prisma.user.findFirst({
      where: { tenantId, email },
      select: { id: true, email: true },
    });

    // Always return success to prevent email enumeration
    if (!user || !user.email) return { sent: true };

    // Invalidate any existing OTPs for this email
    await this.prisma.passwordResetOtp.updateMany({
      where: { tenantId, email: user.email, usedAt: null },
      data: { usedAt: new Date() },
    });

    const otp = this.generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60_000);

    await this.prisma.passwordResetOtp.create({
      data: { tenantId, email: user.email, otpHash, expiresAt },
    });

    // Log OTP to console for development/testing
    console.log(`\n========================================`);
    console.log(`  PASSWORD RESET OTP`);
    console.log(`  Email:   ${user.email}`);
    console.log(`  OTP:     ${otp}`);
    console.log(`  Expires: ${expiresAt.toISOString()}`);
    console.log(`========================================\n`);

    // Also attempt email delivery (fire-and-forget)
    void NotificationService.sendEmail(
      user.email,
      "Password Reset Code",
      `Your password reset code is: ${otp}\n\nThis code expires in ${OTP_EXPIRY_MINUTES} minutes.`
    ).catch((err) => {
      console.error("Failed to send password reset email:", err);
    });

    return { sent: true };
  }

  async verifyOtpAndResetPassword(
    tenantId: string,
    email: string,
    otp: string,
    newPassword: string
  ) {
    const record = await this.prisma.passwordResetOtp.findFirst({
      where: {
        tenantId,
        email,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!record) {
      throw new ValidationError("Invalid or expired reset code");
    }

    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      await this.prisma.passwordResetOtp.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      });
      throw new ValidationError("Too many attempts. Request a new code.");
    }

    const valid = await bcrypt.compare(otp, record.otpHash);
    if (!valid) {
      await this.prisma.passwordResetOtp.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      throw new ValidationError("Invalid reset code");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await this.prisma.$transaction([
      this.prisma.user.updateMany({
        where: { tenantId, email },
        data: { password: hashedPassword },
      }),
      this.prisma.passwordResetOtp.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      // Revoke all refresh tokens for this user
      this.prisma.refreshToken.deleteMany({
        where: { tenantId, user: { email } },
      }),
    ]);

    return { reset: true };
  }

  private generateOtp(): string {
    return String(crypto.randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");
  }
}
