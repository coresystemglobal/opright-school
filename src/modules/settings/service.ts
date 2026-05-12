import { PrismaClient } from "@prisma/client";

export class SettingsService {
  constructor(private prisma: PrismaClient) {}

  async get(tenantId: string) {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { name: true, schoolCode: true, config: true },
    });
    return {
      schoolName: tenant.name,
      schoolCode: tenant.schoolCode,
      ...(typeof tenant.config === "object" && tenant.config !== null ? tenant.config as Record<string, unknown> : {}),
    };
  }

  async update(tenantId: string, data: { schoolName?: string; schoolCode?: string; [key: string]: unknown }) {
    const { schoolName, schoolCode, ...configFields } = data;

    const existing = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { config: true },
    });

    const currentConfig = typeof existing.config === "object" && existing.config !== null
      ? (existing.config as Record<string, unknown>)
      : {};

    const merged = { ...currentConfig, ...configFields };

    const tenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(schoolName !== undefined ? { name: schoolName } : {}),
        ...(schoolCode !== undefined ? { schoolCode } : {}),
        config: merged as any,
      },
      select: { name: true, schoolCode: true, config: true },
    });

    return {
      schoolName: tenant.name,
      schoolCode: tenant.schoolCode,
      ...(typeof tenant.config === "object" && tenant.config !== null ? tenant.config as Record<string, unknown> : {}),
    };
  }
}
