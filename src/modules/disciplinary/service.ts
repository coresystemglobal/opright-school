import { PrismaClient } from "@prisma/client";
import { NotificationService } from "../../services/notificationService";

type CreateRecordData = {
  studentId: string;
  incidentDate: Date;
  description: string;
  severity: string;
  actionTaken?: string;
  reportedBy?: string;
  status?: string;
};

type UpdateRecordData = Partial<CreateRecordData>;

export class DisciplinaryService {
  constructor(private prisma: PrismaClient) {}

  async createRecord(tenantId: string, data: CreateRecordData) {
    const record = await this.prisma.disciplinaryRecord.create({
      data: { ...data, tenantId },
    });

    await NotificationService.notify(
      tenantId,
      data.studentId,
      `Disciplinary record created: ${data.severity}`,
      "disciplinary"
    );

    return record;
  }

  async getRecords(tenantId: string, studentId?: string, status?: string) {
    return this.prisma.disciplinaryRecord.findMany({
      where: {
        tenantId,
        ...(studentId ? { studentId } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: { incidentDate: "desc" },
    });
  }

  async updateRecord(tenantId: string, id: string, data: UpdateRecordData) {
    return this.prisma.disciplinaryRecord.update({
      where: { id, tenantId },
      data,
    });
  }

  async getStats(tenantId: string) {
    const [total, open, resolved] = await Promise.all([
      this.prisma.disciplinaryRecord.count({ where: { tenantId } }),
      this.prisma.disciplinaryRecord.count({
        where: { tenantId, status: "Open" },
      }),
      this.prisma.disciplinaryRecord.count({
        where: { tenantId, status: "Resolved" },
      }),
    ]);

    return { total, open, resolved };
  }
}
