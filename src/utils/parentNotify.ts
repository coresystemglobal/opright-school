import { PrismaClient } from '@prisma/client';
import { NotificationService } from '../services/notificationService';

/**
 * Fire-and-forget: find a student's linked parent(s) and send them an
 * attendance alert (email + in-app notification).
 *
 * Silently swallows errors so the caller's main operation is never blocked.
 */
export function notifyParentsOfAbsence(
  prisma: PrismaClient,
  tenantId: string,
  studentId: string,
  status: 'ABSENT' | 'LATE',
  date: Date,
  remarks?: string
): void {
  runAsync(async () => {
    const [student, tenant] = await Promise.all([
      prisma.student.findFirst({
        where: { id: studentId, tenantId },
        select: {
          firstName: true,
          lastName: true,
          studentCode: true,
          parents: {
            include: {
              parent: {
                select: { firstName: true, lastName: true, email: true, userId: true },
              },
            },
          },
          enrollments: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { class: { select: { name: true } } },
          },
        },
      }),
      prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true },
      }),
    ]);

    if (!student) return;

    const className = student.enrollments[0]?.class?.name ?? 'Unknown Class';
    const studentName = `${student.firstName} ${student.lastName}`;
    const statusLabel = status === 'LATE' ? 'Late' : 'Absent';
    const isLate = status === 'LATE';
    const schoolName = tenant?.name ?? 'School';
    const portalUrl = process.env.APP_URL ?? '';
    const attendanceDate = date.toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // Get attendance stats for the current month
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const stats = await prisma.attendance.groupBy({
      by: ['status'],
      where: { tenantId, studentId, date: { gte: monthStart, lte: date } },
      _count: { status: true },
    });

    const totalDays = stats.reduce((sum, s) => sum + s._count.status, 0);
    const presentDays = stats.find((s) => s.status === 'PRESENT')?._count.status ?? 0;
    const absentDays = stats.find((s) => s.status === 'ABSENT')?._count.status ?? 0;

    for (const link of student.parents) {
      const parent = link.parent;

      // In-app notification to parent user
      if (parent.userId) {
        void NotificationService.notify(
          tenantId,
          parent.userId,
          `${studentName} was marked ${statusLabel} on ${attendanceDate}.`,
          'attendance-alert'
        );
      }

      // Email
      if (parent.email) {
        void NotificationService.sendTemplatedEmail(parent.email, {
          type: 'attendance-alert',
          parentName: `${parent.firstName} ${parent.lastName}`,
          studentName,
          studentCode: student.studentCode ?? '',
          className,
          attendanceDate,
          statusLabel,
          alertTitle: `${studentName} was ${statusLabel} Today`,
          alertMessage: remarks
            ? `Remark from school: ${remarks}`
            : `${studentName} was marked ${statusLabel} for ${attendanceDate}.`,
          isLate,
          remarks,
          totalDays,
          presentDays,
          absentDays,
          portalUrl,
          schoolName,
          schoolEmail: process.env.BREVO_FROM_EMAIL ?? '',
          year: new Date().getFullYear(),
        });
      }
    }
  });
}

/**
 * Fire-and-forget: notify parent(s) that a grade has been posted.
 * Uses in-app notification only (no grade-alert email template exists yet).
 */
export function notifyParentsOfGrade(
  prisma: PrismaClient,
  tenantId: string,
  studentId: string,
  subjectName: string,
  score: number,
  maxScore: number
): void {
  runAsync(async () => {
    const student = await prisma.student.findFirst({
      where: { id: studentId, tenantId },
      select: {
        firstName: true,
        lastName: true,
        parents: {
          include: { parent: { select: { userId: true } } },
        },
      },
    });

    if (!student) return;

    const studentName = `${student.firstName} ${student.lastName}`;
    const message = `${studentName} received ${score}/${maxScore} in ${subjectName}.`;

    for (const link of student.parents) {
      if (link.parent.userId) {
        void NotificationService.notify(tenantId, link.parent.userId, message, 'grade-posted');
      }
    }
  });
}

function runAsync(fn: () => Promise<void>): void {
  fn().catch((err) => console.error('[parentNotify]', err));
}
