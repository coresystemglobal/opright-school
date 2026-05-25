import { PrismaClient } from '@prisma/client';
import { NotificationService } from '../services/notificationService';

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
    const schoolName = tenant?.name ?? 'School';
    const attendanceDate = date.toLocaleDateString('en-NG', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    for (const link of student.parents) {
      const parent = link.parent;

      if (parent.userId) {
        void NotificationService.notify(
          tenantId,
          parent.userId,
          `${studentName} was marked ${statusLabel} on ${attendanceDate}.`,
          'attendance-alert'
        );
      }

      if (parent.email) {
        void NotificationService.sendEmail(
          parent.email,
          `Attendance Alert — ${studentName}`,
          `Hi ${parent.firstName},\n\n${studentName} was marked ${statusLabel} on ${attendanceDate}.\n\n${remarks ? `Remark: ${remarks}\n\n` : ''}— ${schoolName}`
        ).catch(() => {});
      }
    }
  });
}

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
