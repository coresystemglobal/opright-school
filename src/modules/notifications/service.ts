import { PrismaClient } from "@prisma/client";
import webpush from "web-push";

const vapidPublic = process.env.VAPID_PUBLIC_KEY || "";
const vapidPrivate = process.env.VAPID_PRIVATE_KEY || "";
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@schoolos.ng";

if (vapidPublic && vapidPrivate) {
  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
}

export class NotificationModuleService {
  constructor(private prisma: PrismaClient) {}

  // ── In-app notifications ──────────────────────────────────────────

  async list(tenantId: string, userId: string, opts?: { unreadOnly?: boolean; limit?: number }) {
    return this.prisma.notification.findMany({
      where: {
        tenantId,
        userId,
        ...(opts?.unreadOnly ? { read: false } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: opts?.limit ?? 50,
    });
  }

  async unreadCount(tenantId: string, userId: string) {
    return this.prisma.notification.count({
      where: { tenantId, userId, read: false },
    });
  }

  async markRead(tenantId: string, userId: string, ids: string[]) {
    return this.prisma.notification.updateMany({
      where: { tenantId, userId, id: { in: ids } },
      data: { read: true },
    });
  }

  async markAllRead(tenantId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { tenantId, userId, read: false },
      data: { read: true },
    });
  }

  /** Create in-app notification + fire web push to all user subscriptions */
  async send(tenantId: string, userId: string, payload: { title: string; body: string; type?: string; link?: string }) {
    const notification = await this.prisma.notification.create({
      data: {
        tenantId,
        userId,
        title: payload.title,
        body: payload.body,
        type: payload.type ?? "general",
        link: payload.link,
      },
    });

    // Fire-and-forget push
    this.pushToUser(tenantId, userId, { title: payload.title, body: payload.body, link: payload.link }).catch(() => {});

    return notification;
  }

  /** Send to multiple users at once */
  async sendBulk(tenantId: string, userIds: string[], payload: { title: string; body: string; type?: string; link?: string }) {
    await this.prisma.notification.createMany({
      data: userIds.map((userId) => ({
        tenantId,
        userId,
        title: payload.title,
        body: payload.body,
        type: payload.type ?? "general",
        link: payload.link,
      })),
    });

    // Fire-and-forget push for each user
    for (const userId of userIds) {
      this.pushToUser(tenantId, userId, { title: payload.title, body: payload.body, link: payload.link }).catch(() => {});
    }
  }

  // ── Push subscriptions ────────────────────────────────────────────

  async subscribe(tenantId: string, userId: string, sub: { endpoint: string; keys: { p256dh: string; auth: string } }) {
    return this.prisma.pushSubscription.upsert({
      where: { userId_endpoint: { userId, endpoint: sub.endpoint } },
      create: { tenantId, userId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
      update: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    });
  }

  async unsubscribe(tenantId: string, userId: string, endpoint: string) {
    return this.prisma.pushSubscription.deleteMany({
      where: { tenantId, userId, endpoint },
    });
  }

  private async pushToUser(tenantId: string, userId: string, payload: { title: string; body: string; link?: string }) {
    if (!vapidPublic || !vapidPrivate) return;

    const subs = await this.prisma.pushSubscription.findMany({
      where: { tenantId, userId },
    });

    const pushPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.link ?? "/",
    });

    const stale: string[] = [];

    await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            pushPayload,
          );
        } catch (err: any) {
          if (err.statusCode === 404 || err.statusCode === 410) {
            stale.push(sub.id);
          }
        }
      }),
    );

    if (stale.length) {
      await this.prisma.pushSubscription.deleteMany({ where: { id: { in: stale } } });
    }
  }
}
