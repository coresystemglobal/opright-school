import { PrismaClient } from "@prisma/client";
import { NotificationModuleService } from "../notifications/service";

const PUBLISHER_ROLES = new Set(["ADMIN", "PRINCIPAL", "TEACHER"]);

type NoticePayload = {
  title: string;
  content: string;
  targetRoles?: string[];
};

export class NoticesService {
  constructor(private prisma: PrismaClient) {}

  private readonly include = {
    author: {
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: {
          select: {
            name: true,
          },
        },
      },
    },
  } as const;

  async create(tenantId: string, authorId: string, data: NoticePayload) {
    const notice = await this.prisma.notice.create({
      data: {
        tenantId,
        authorId,
        title: data.title,
        content: data.content,
        targetRoles: data.targetRoles ?? [],
      },
      include: this.include,
    });

    // Notify targeted users (fire-and-forget)
    this.notifyUsers(tenantId, data.targetRoles ?? [], notice.title).catch(() => {});

    return notice;
  }

  private async notifyUsers(tenantId: string, targetRoles: string[], title: string) {
    const where: any = { tenantId };
    if (targetRoles.length) {
      where.role = { name: { in: targetRoles } };
    }
    const users = await this.prisma.user.findMany({ where, select: { id: true } });
    if (!users.length) return;

    const notifService = new NotificationModuleService(this.prisma);
    await notifService.sendBulk(
      tenantId,
      users.map((u) => u.id),
      { title: "New Notice", body: title, type: "notice", link: "/notices" },
    );
  }

  async list(tenantId: string, role: string) {
    const where = PUBLISHER_ROLES.has(role)
      ? { tenantId }
      : {
          tenantId,
          OR: [
            { targetRoles: { isEmpty: true } },
            { targetRoles: { has: role } },
          ],
        };

    return this.prisma.notice.findMany({
      where,
      include: this.include,
      orderBy: { createdAt: "desc" },
    });
  }

  async update(tenantId: string, id: string, data: NoticePayload) {
    const existing = await this.prisma.notice.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });

    if (!existing) {
      throw new Error("Notice not found");
    }

    return this.prisma.notice.update({
      where: { id },
      data: {
        title: data.title,
        content: data.content,
        targetRoles: data.targetRoles ?? [],
      },
      include: this.include,
    });
  }

  async remove(tenantId: string, id: string) {
    const existing = await this.prisma.notice.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });

    if (!existing) {
      throw new Error("Notice not found");
    }

    await this.prisma.notice.delete({ where: { id } });
  }
}
