import { PrismaClient } from "@prisma/client";
import { Client } from "@upstash/qstash";

const qstash = new Client({ token: process.env.QSTASH_TOKEN! });
const WORKER_URL = `${process.env.APP_URL}/queue/service-denial`;

export const ServiceDenialQueue = {
  /** Publish a one-off job (MASTER or platform scheduler triggers this). */
  async publish() {
    return qstash.publishJSON({
      url: WORKER_URL,
      body: { triggeredAt: new Date().toISOString() },
      retries: 2,
    });
  },

  /** Register a daily cron at midnight UTC. Idempotent — skips if already scheduled. */
  async scheduleCron() {
    const existing = await qstash.schedules.list();
    const alreadyScheduled = existing.some((s) => s.destination === WORKER_URL);
    if (alreadyScheduled) return { skipped: true };
    return qstash.schedules.create({
      destination: WORKER_URL,
      cron: "0 0 * * *",
      body: JSON.stringify({ triggeredAt: "cron" }),
    });
  },
};

/**
 * Core sweep: for every active tenant, find assignments where:
 *   - status is UNPAID or PARTIAL
 *   - isMandatory is true on the template
 *   - dueDate + gracePeriodDays < now
 * Mark them OVERDUE + serviceAccessRevoked=true, then notify parents.
 */
export async function runServiceDenialSweep(prisma: PrismaClient): Promise<{
  tenantsProcessed: number;
  assignmentsRevoked: number;
  assignmentsRestored: number;
}> {
  const now = new Date();

  // ── 1. Mark overdue and revoke access ─────────────────────────────────────

  // Find all active overdue mandatory assignments across all tenants
  const overdueAssignments = await prisma.feeAssignment.findMany({
    where: {
      status: { in: ["UNPAID", "PARTIAL"] },
      serviceAccessRevoked: false,
      feeTemplate: { isMandatory: true },
      dueDate: { not: null },
    },
    include: {
      feeTemplate: { select: { name: true, category: true, isMandatory: true } },
      student: { select: { firstName: true, lastName: true, userId: true } },
    },
  });

  const toRevoke = overdueAssignments.filter((a) => {
    if (!a.dueDate) return false;
    const deadline = new Date(a.dueDate);
    deadline.setDate(deadline.getDate() + (a.gracePeriodDays ?? 0));
    return now > deadline;
  });

  let assignmentsRevoked = 0;
  if (toRevoke.length > 0) {
    const revokeResult = await prisma.feeAssignment.updateMany({
      where: { id: { in: toRevoke.map((a) => a.id) } },
      data: { status: "OVERDUE", serviceAccessRevoked: true },
    });
    assignmentsRevoked = revokeResult.count;

    // Notify parents of affected students
    await notifyParentsOfRevocation(prisma, toRevoke);
  }

  // ── 2. Restore access for previously revoked but now-paid assignments ──────
  // (Belt-and-suspenders: webhook should handle this, but sweep catches edge cases)
  const paidButRevoked = await prisma.feeAssignment.findMany({
    where: { status: "PAID", serviceAccessRevoked: true },
    select: { id: true },
  });

  let assignmentsRestored = 0;
  if (paidButRevoked.length > 0) {
    const restoreResult = await prisma.feeAssignment.updateMany({
      where: { id: { in: paidButRevoked.map((a) => a.id) } },
      data: { serviceAccessRevoked: false },
    });
    assignmentsRestored = restoreResult.count;
  }

  // Count distinct tenants touched
  const tenantIds = new Set([
    ...toRevoke.map((a) => a.tenantId),
    ...paidButRevoked.map((a) => a.tenantId),
  ]);

  return {
    tenantsProcessed: tenantIds.size,
    assignmentsRevoked,
    assignmentsRestored,
  };
}

async function notifyParentsOfRevocation(
  prisma: PrismaClient,
  assignments: Array<{
    id: string;
    tenantId: string;
    studentId: string;
    feeTemplate: { name: string; category: string };
    student: { firstName: string; lastName: string; userId: string | null };
  }>
) {
  // Group by tenant + student to batch notifications
  const grouped = new Map<string, typeof assignments>();
  for (const a of assignments) {
    const key = `${a.tenantId}:${a.studentId}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(a);
  }

  const notifications: Array<{
    tenantId: string;
    userId: string;
    title: string;
    body: string;
    type: string;
    link: string;
  }> = [];

  for (const [, group] of grouped) {
    const { tenantId, studentId, student } = group[0];

    // Find parent users linked to this student
    const parentLinks = await prisma.studentParent.findMany({
      where: { studentId },
      include: { parent: { select: { userId: true } } },
    });

    const feeNames = group.map((a) => a.feeTemplate.name).join(", ");
    const msg = `Access to services has been restricted for ${student.firstName} ${student.lastName} due to overdue fees: ${feeNames}. Please make payment to restore access.`;

    for (const link of parentLinks) {
      notifications.push({
        tenantId,
        userId: link.parent.userId,
        title: "Service access restricted",
        body: msg,
        type: "service_denial",
        link: "/fees",
      });
    }

    // Also notify the student's own user account if they have one
    if (student.userId) {
      notifications.push({
        tenantId,
        userId: student.userId,
        title: "Service access restricted",
        body: msg,
        type: "service_denial",
        link: "/fees",
      });
    }
  }

  if (notifications.length > 0) {
    await prisma.notification.createMany({ data: notifications, skipDuplicates: true });
  }
}
