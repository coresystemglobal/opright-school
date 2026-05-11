import { Receiver } from "@upstash/qstash";
import { handleReportJob } from "../../workers/reportWorker";

type ReportPayload = {
  type: "attendance_report" | "grade_report";
  studentId?: string;
};

export class QueueService {
  constructor(private receiver: Receiver) {}

  async processReport(signature: string, body: string, tenantId: string, payload: ReportPayload) {
    await this.receiver.verify({ signature, body });
    const result = await handleReportJob(tenantId, payload);
    return { ok: true, ...result };
  }
}
