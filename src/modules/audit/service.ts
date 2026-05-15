import { PrismaClient } from "@prisma/client";
import prisma from "../../prisma/client";

export type AuditEntry = {
  tenantId: string;
  userId: string;
  action: string;
  entity?: string;
  entityId?: string;
  meta?: Record<string, unknown>;
  ipAddress?: string;
};

export class AuditService {
  constructor(private db: PrismaClient = prisma) {}

  log(entry: AuditEntry) {
    this.db.auditLog
      .create({
        data: {
          tenantId: entry.tenantId,
          userId: entry.userId,
          action: entry.action,
          entity: entry.entity,
          entityId: entry.entityId,
          meta: entry.meta as any,
          ipAddress: entry.ipAddress,
        },
      })
      .catch((err) => console.error("[AUDIT] Failed to write log:", err.message));
  }

  async list(
    tenantId: string,
    filters?: {
      userId?: string;
      action?: string;
      entity?: string;
      from?: Date;
      to?: Date;
      page?: number;
      limit?: number;
    },
  ) {
    const page = filters?.page ?? 1;
    const limit = Math.min(filters?.limit ?? 50, 100);
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.action) where.action = { contains: filters.action, mode: "insensitive" };
    if (filters?.entity) where.entity = { contains: filters.entity, mode: "insensitive" };
    if (filters?.from || filters?.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = filters.from;
      if (filters.to) where.createdAt.lte = filters.to;
    }

    const [data, total] = await Promise.all([
      this.db.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true, role: { select: { name: true } } } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.db.auditLog.count({ where }),
    ]);

    return { data, total, page, limit };
  }
}

export const auditService = new AuditService();
