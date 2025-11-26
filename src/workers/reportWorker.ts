import Queue from "bull";
import { withTenant } from "../utils/withTenant";

const queue = new Queue("reports", process.env.REDIS_URL!);

queue.process(async (job) => {
  const { tenantId, payload } = job.data;
  await withTenant(tenantId, async (tx) => {
    switch (payload.type) {
      case "attendance_report":
        const attendance = await tx.attendance.findMany({
          where: { studentId: payload.studentId }
        });
        // Store report in S3 under tenantId/reports/
        break;
      case "grade_report":
        const grades = await tx.grade.findMany({
          where: { studentId: payload.studentId }
        });
        // Generate PDF report
        break;
    }
  });
});

export { queue };