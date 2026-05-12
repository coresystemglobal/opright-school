import { Client } from '@upstash/qstash';
import { withTenant } from '../utils/withTenant';
import { StorageService } from '../utils/storage';
import { NotificationModuleService } from '../modules/notifications/service';
import prisma from '../prisma/client';

const qstash = new Client({ token: process.env.QSTASH_TOKEN! });
const notifService = new NotificationModuleService(prisma);

const WORKER_URL = `${process.env.APP_URL}/queue/reports`;

export const ReportQueue = {
  async publish(tenantId: string, payload: { type: string; studentId?: string; termId?: string; userId?: string }) {
    return qstash.publishJSON({
      url: WORKER_URL,
      body: { tenantId, payload },
      retries: 3,
    });
  },
};

export async function handleReportJob(
  tenantId: string,
  payload: { type: 'attendance_report' | 'grade_report' | 'report_card'; studentId?: string; termId?: string; userId?: string }
): Promise<{ url: string }> {
  let result: { url: string };
  switch (payload.type) {
    case 'attendance_report':
      result = await generateAttendanceReport(tenantId, payload.studentId!);
      break;
    case 'grade_report':
      result = await generateGradeReport(tenantId, payload.studentId!);
      break;
    case 'report_card':
      result = await generateReportCard(tenantId, payload.studentId!, payload.termId);
      break;
    default:
      throw new Error(`Unknown report type: ${(payload as any).type}`);
  }

  // Notify the requesting user that the report is ready
  if (payload.userId) {
    notifService.send(tenantId, payload.userId, {
      title: 'Report Ready',
      body: `Your ${payload.type.replace(/_/g, ' ')} is ready for download.`,
      type: 'report',
      link: result.url,
    }).catch(() => {});
  }

  return result;
}

async function generateAttendanceReport(tenantId: string, studentId: string) {
  const records = await withTenant(tenantId, (tx) =>
    tx.attendance.findMany({
      where: { student: { tenantId }, studentId },
      include: { student: { select: { firstName: true, lastName: true, studentCode: true } } },
      orderBy: { date: 'asc' },
    })
  );

  if (!records.length) throw new Error('No attendance records found for this student');

  const student = records[0].student;
  const present = records.filter((r) => r.status === 'PRESENT').length;
  const absent = records.filter((r) => r.status === 'ABSENT').length;
  const late = records.filter((r) => r.status === 'LATE').length;
  const excused = records.filter((r) => r.status === 'EXCUSED').length;
  const rate = ((present + late) / records.length * 100).toFixed(1);

  const rows = records
    .map(
      (r) => `
    <tr>
      <td>${r.date.toISOString().slice(0, 10)}</td>
      <td class="status ${r.status.toLowerCase()}">${r.status}</td>
      <td>${r.remarks ?? '—'}</td>
    </tr>`
    )
    .join('');

  const html = reportHtml(
    `Attendance Report — ${student.firstName} ${student.lastName}`,
    `
    <div class="summary">
      <div class="stat"><span>${records.length}</span>Total Days</div>
      <div class="stat present"><span>${present}</span>Present</div>
      <div class="stat absent"><span>${absent}</span>Absent</div>
      <div class="stat late"><span>${late}</span>Late</div>
      <div class="stat excused"><span>${excused}</span>Excused</div>
      <div class="stat"><span>${rate}%</span>Attendance Rate</div>
    </div>
    <table>
      <thead><tr><th>Date</th><th>Status</th><th>Remarks</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`
  );

  const key = `${tenantId}/reports/attendance_${studentId}_${Date.now()}.html`;
  await StorageService.upload(key, Buffer.from(html, 'utf-8'), 'text/html');
  const url = await StorageService.getSignedUrl(key, 3600 * 24);
  return { url };
}

async function generateGradeReport(tenantId: string, studentId: string) {
  const [grades, examResults, student] = await withTenant(tenantId, async (tx) => {
    return Promise.all([
      tx.grade.findMany({
        where: { tenantId, studentId },
        include: {
          subject: { select: { name: true } },
          assignment: { select: { title: true, maxScore: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      tx.examResult.findMany({
        where: { tenantId, studentId },
        include: {
          examination: { select: { name: true, maxScore: true, subject: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      tx.student.findFirst({
        where: { id: studentId, tenantId },
        select: { firstName: true, lastName: true, studentCode: true },
      }),
    ]);
  });

  if (!student) throw new Error('Student not found');

  const gradeRows = grades
    .map(
      (g) => `
    <tr>
      <td>${g.subject?.name ?? '—'}</td>
      <td>${g.assignment?.title ?? 'Manual'}</td>
      <td>${g.score} / ${g.maxScore}</td>
      <td>${((g.score / g.maxScore) * 100).toFixed(1)}%</td>
      <td>${g.remarks ?? '—'}</td>
    </tr>`
    )
    .join('');

  const examRows = examResults
    .map(
      (e) => `
    <tr>
      <td>${e.examination?.subject?.name ?? '—'}</td>
      <td>${e.examination?.name ?? '—'}</td>
      <td>${e.score} / ${e.examination?.maxScore ?? '?'}</td>
      <td>${e.grade ?? '—'}</td>
      <td>${e.remarks ?? '—'}</td>
    </tr>`
    )
    .join('');

  const html = reportHtml(
    `Grade Report — ${student.firstName} ${student.lastName}`,
    `
    <h2>Assignments & Grades</h2>
    <table>
      <thead><tr><th>Subject</th><th>Assignment</th><th>Score</th><th>%</th><th>Remarks</th></tr></thead>
      <tbody>${gradeRows || '<tr><td colspan="5">No grades recorded</td></tr>'}</tbody>
    </table>
    <h2>Examinations</h2>
    <table>
      <thead><tr><th>Subject</th><th>Exam</th><th>Score</th><th>Grade</th><th>Remarks</th></tr></thead>
      <tbody>${examRows || '<tr><td colspan="5">No exam results recorded</td></tr>'}</tbody>
    </table>`
  );

  const key = `${tenantId}/reports/grades_${studentId}_${Date.now()}.html`;
  await StorageService.upload(key, Buffer.from(html, 'utf-8'), 'text/html');
  const url = await StorageService.getSignedUrl(key, 3600 * 24);
  return { url };
}

async function generateReportCard(tenantId: string, studentId: string, termId?: string) {
  const [student, grades, examResults, attendance] = await withTenant(tenantId, async (tx) => {
    const s = await tx.student.findFirst({
      where: { id: studentId, tenantId },
      select: { firstName: true, lastName: true, studentCode: true },
    });
    const g = await tx.grade.findMany({
      where: { tenantId, studentId },
      include: { subject: { select: { name: true } }, assignment: { select: { title: true, maxScore: true, termId: true } } },
    });
    const e = await tx.examResult.findMany({
      where: { tenantId, studentId, ...(termId ? { examination: { termId } } : {}) },
      include: { examination: { select: { name: true, maxScore: true, subject: { select: { name: true } } } } },
    });
    const a = await tx.attendance.findMany({
      where: { tenantId, studentId },
    });
    return [s, g, e, a] as const;
  });

  if (!student) throw new Error('Student not found');

  // Group grades by subject
  const subjectMap = new Map<string, { scores: number[]; maxScores: number[] }>();
  for (const g of grades) {
    const name = g.subject?.name ?? 'Unknown';
    if (!subjectMap.has(name)) subjectMap.set(name, { scores: [], maxScores: [] });
    subjectMap.get(name)!.scores.push(g.score);
    subjectMap.get(name)!.maxScores.push(g.maxScore);
  }

  const subjectRows = Array.from(subjectMap.entries())
    .map(([name, { scores, maxScores }]) => {
      const total = scores.reduce((a, b) => a + b, 0);
      const max = maxScores.reduce((a, b) => a + b, 0);
      const pct = max > 0 ? ((total / max) * 100).toFixed(1) : '0';
      return `<tr><td>${name}</td><td>${total}/${max}</td><td>${pct}%</td></tr>`;
    })
    .join('');

  const present = attendance.filter((r) => r.status === 'PRESENT').length;
  const total = attendance.length;
  const rate = total > 0 ? ((present / total) * 100).toFixed(1) : '0';

  const html = reportHtml(
    `Report Card — ${student.firstName} ${student.lastName}`,
    `
    <p><strong>Student ID:</strong> ${student.studentCode ?? '—'}</p>
    <div class="summary">
      <div class="stat present"><span>${rate}%</span>Attendance</div>
      <div class="stat"><span>${grades.length}</span>Assessments</div>
      <div class="stat"><span>${examResults.length}</span>Exams</div>
    </div>
    <h2>Subject Performance</h2>
    <table>
      <thead><tr><th>Subject</th><th>Score</th><th>Percentage</th></tr></thead>
      <tbody>${subjectRows || '<tr><td colspan="3">No grades recorded</td></tr>'}</tbody>
    </table>
    <h2>Examination Results</h2>
    <table>
      <thead><tr><th>Subject</th><th>Exam</th><th>Score</th></tr></thead>
      <tbody>${examResults.map((e) => `<tr><td>${e.examination?.subject?.name ?? '—'}</td><td>${e.examination?.name ?? '—'}</td><td>${e.score}/${e.examination?.maxScore ?? '?'}</td></tr>`).join('') || '<tr><td colspan="3">No exam results</td></tr>'}</tbody>
    </table>`
  );

  const key = `${tenantId}/reports/report_card_${studentId}_${Date.now()}.html`;
  await StorageService.upload(key, Buffer.from(html, 'utf-8'), 'text/html');
  const url = await StorageService.getSignedUrl(key, 3600 * 24 * 7); // 7 day link
  return { url };
}

function reportHtml(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  body { font-family: Arial, sans-serif; margin: 40px; color: #222; }
  h1 { border-bottom: 2px solid #333; padding-bottom: 8px; }
  h2 { margin-top: 32px; color: #444; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th, td { border: 1px solid #ccc; padding: 8px 12px; text-align: left; }
  th { background: #f0f0f0; font-weight: bold; }
  tr:nth-child(even) { background: #fafafa; }
  .summary { display: flex; gap: 16px; flex-wrap: wrap; margin: 20px 0; }
  .stat { border: 1px solid #ddd; border-radius: 8px; padding: 12px 20px; text-align: center; min-width: 100px; }
  .stat span { display: block; font-size: 28px; font-weight: bold; }
  .stat.present { border-color: #4caf50; color: #4caf50; }
  .stat.absent { border-color: #f44336; color: #f44336; }
  .stat.late { border-color: #ff9800; color: #ff9800; }
  .stat.excused { border-color: #2196f3; color: #2196f3; }
  .status.present { color: #4caf50; font-weight: bold; }
  .status.absent { color: #f44336; font-weight: bold; }
  .status.late { color: #ff9800; font-weight: bold; }
  .status.excused { color: #2196f3; font-weight: bold; }
  @media print { body { margin: 20px; } }
</style>
</head>
<body>
<h1>${title}</h1>
<p>Generated: ${new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })}</p>
${body}
</body>
</html>`;
}

export { qstash };
