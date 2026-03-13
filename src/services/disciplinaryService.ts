import prisma from '../prisma/client';
import { NotificationService } from './notificationService';

export const DisciplinaryService = {
  async createRecord(tenantId: string, data: any) {
    const record = await prisma.disciplinaryRecord.create({ data: { ...data, tenantId } });
    await NotificationService.notify(tenantId, data.studentId, `Disciplinary record created: ${data.severity}`, 'disciplinary');
    return record;
  },

  async getRecords(tenantId: string, studentId?: string, status?: string) {
    return prisma.disciplinaryRecord.findMany({
      where: { tenantId, ...(studentId && { studentId }), ...(status && { status }) },
      orderBy: { incidentDate: 'desc' }
    });
  },

  async updateRecord(tenantId: string, id: string, data: any) {
    return prisma.disciplinaryRecord.update({ where: { id }, data });
  },

  async getStats(tenantId: string) {
    const [total, open, resolved] = await Promise.all([
      prisma.disciplinaryRecord.count({ where: { tenantId } }),
      prisma.disciplinaryRecord.count({ where: { tenantId, status: 'Open' } }),
      prisma.disciplinaryRecord.count({ where: { tenantId, status: 'Resolved' } })
    ]);
    return { total, open, resolved };
  }
};
