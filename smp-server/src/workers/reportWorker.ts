import { Client } from '@upstash/qstash';
import { withTenant } from '../utils/withTenant';

const qstash = new Client({ token: process.env.QSTASH_TOKEN! });

const WORKER_URL = `${process.env.APP_URL}/queue/reports`;

export const ReportQueue = {
  async publish(tenantId: string, payload: { type: string; studentId?: string }) {
    return qstash.publishJSON({
      url: WORKER_URL,
      body: { tenantId, payload },
      retries: 3,
    });
  },
};

// Handler called by QStash webhook → POST /queue/reports
export async function handleReportJob(tenantId: string, payload: any) {
  await withTenant(tenantId, async (tx) => {
    switch (payload.type) {
      case 'attendance_report':
        await tx.attendance.findMany({ where: { studentId: payload.studentId } });
        // Store report in S3 under tenantId/reports/
        break;
      case 'grade_report':
        await tx.grade.findMany({ where: { studentId: payload.studentId } });
        // Generate PDF report
        break;
    }
  });
}

export { qstash };
