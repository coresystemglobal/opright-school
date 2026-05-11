import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import { UnauthorizedError, ValidationError } from "../../utils/errors";

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL_DAYS = 30;

type AccessTokenPayload = {
  userId: string;
  tenantId: string;
  roleId?: string | null;
  role: string;
};

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function createRefreshTokenValue() {
  return crypto.randomBytes(48).toString("base64url");
}

function buildRefreshExpiryDate() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);
  return expiresAt;
}

export class AuthTokenService {
  constructor(private prisma: PrismaClient) {}

  async issueTokens(payload: AccessTokenPayload) {
    const refreshToken = createRefreshTokenValue();

    await this.prisma.refreshToken.create({
      data: {
        userId: payload.userId,
        tenantId: payload.tenantId,
        tokenHash: hashToken(refreshToken),
        expiresAt: buildRefreshExpiryDate(),
      },
    });

    return {
      token: this.signAccessToken(payload),
      refreshToken,
    };
  }

  async refreshTokens(tenantId: string, refreshToken: string) {
    const tokenHash = hashToken(refreshToken);
    const now = new Date();

    const rotated = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.refreshToken.findUnique({
        where: { tokenHash },
        include: {
          user: {
            include: {
              role: true,
            },
          },
        },
      });

      if (!existing || existing.tenantId !== tenantId || existing.revokedAt || existing.expiresAt <= now) {
        throw new UnauthorizedError("Invalid refresh token");
      }

      const revoked = await tx.refreshToken.updateMany({
        where: {
          id: existing.id,
          revokedAt: null,
        },
        data: {
          revokedAt: now,
        },
      });

      if (revoked.count !== 1) {
        throw new UnauthorizedError("Invalid refresh token");
      }

      const nextRefreshToken = createRefreshTokenValue();
      await tx.refreshToken.create({
        data: {
          userId: existing.userId,
          tenantId: existing.tenantId,
          tokenHash: hashToken(nextRefreshToken),
          expiresAt: buildRefreshExpiryDate(),
        },
      });

      return {
        token: this.signAccessToken({
          userId: existing.user.id,
          tenantId: existing.user.tenantId,
          roleId: existing.user.roleId,
          role: existing.user.role?.name?.toUpperCase() ?? "STUDENT",
        }),
        refreshToken: nextRefreshToken,
      };
    });

    return rotated;
  }

  async revokeRefreshToken(tenantId: string, refreshToken: string) {
    const tokenHash = hashToken(refreshToken);

    await this.prisma.refreshToken.updateMany({
      where: {
        tenantId,
        tokenHash,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  private signAccessToken(payload: AccessTokenPayload) {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new ValidationError("JWT secret is not configured");
    }

    return jwt.sign(payload, secret, { expiresIn: ACCESS_TOKEN_TTL });
  }
}
