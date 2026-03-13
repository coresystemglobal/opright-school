import { PrismaClient, AttendanceStatus } from '@prisma/client';

export class AttendanceService {
  constructor(private prisma: PrismaClient) {}

  async markAttendance(tenantId: string, data: { studentId: string; date: Date; status: AttendanceStatus; remarks?: string }) {
    return this.prisma.attendance.upsert({
      where: { studentId_date: { studentId: data.studentId, date: data.date } },
      update: { status: data.status, remarks: data.remarks },
      create: { ...data, tenantId }
    });
  }

  async bulkMarkAttendance(tenantId: string, records: Array<{ studentId: string; date: Date; status: AttendanceStatus; remarks?: string }>) {
    return Promise.all(records.map(record => this.markAttendance(tenantId, record)));
  }

  async getAttendance(tenantId: string, filters: { studentId?: string; classId?: string; date?: Date; startDate?: Date; endDate?: Date }) {
    const where: any = { tenantId };

    if (filters.studentId) {
      where.studentId = filters.studentId;
    }

    if (filters.classId) {
      where.student = {
        enrollments: {
          some: { classId: filters.classId }
        }
      };
    }

    if (filters.date) {
      where.date = filters.date;
    } else if (filters.startDate && filters.endDate) {
      where.date = {
        gte: filters.startDate,
        lte: filters.endDate
      };
    }

    return this.prisma.attendance.findMany({
      where,
      include: { student: true },
      orderBy: { date: 'desc' }
    });
  }

  async getAttendanceStats(tenantId: string, studentId: string, startDate: Date, endDate: Date) {
    const records = await this.prisma.attendance.findMany({
      where: {
        tenantId,
        studentId,
        date: { gte: startDate, lte: endDate }
      }
    });

    const total = records.length;
    const present = records.filter(r => r.status === 'PRESENT').length;
    const absent = records.filter(r => r.status === 'ABSENT').length;
    const late = records.filter(r => r.status === 'LATE').length;
    const excused = records.filter(r => r.status === 'EXCUSED').length;

    return {
      total,
      present,
      absent,
      late,
      excused,
      attendanceRate: total > 0 ? (present / total) * 100 : 0
    };
  }

  async getClassAttendanceReport(tenantId: string, classId: string, date: Date) {
    const students = await this.prisma.student.findMany({
      where: {
        tenantId,
        enrollments: {
          some: { classId }
        }
      },
      include: {
        attendances: {
          where: { date }
        }
      }
    });

    return students.map(student => ({
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      status: student.attendances[0]?.status || null,
      remarks: student.attendances[0]?.remarks || null
    }));
  }
}
