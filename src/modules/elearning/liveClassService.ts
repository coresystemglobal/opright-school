import { PrismaClient } from "@prisma/client";
import { NotFoundError } from "../../utils/errors";

type LiveClassFilters = {
  teacherId?: string;
  status?: "SCHEDULED" | "LIVE" | "COMPLETED" | "CANCELLED";
};

type LiveClassInput = {
  title: string;
  description?: string;
  teacherId: string;
  subjectId?: string;
  scheduledAt: Date;
  duration: number;
  meetingUrl?: string;
  meetingId?: string;
  platform: string;
  recordingUrl?: string;
  status?: "SCHEDULED" | "LIVE" | "COMPLETED" | "CANCELLED";
};

type LiveClassUpdateInput = Partial<LiveClassInput>;

export class LiveClassService {
  constructor(private prisma: PrismaClient) {}

  async createClass(tenantId: string, data: LiveClassInput) {
    return this.prisma.liveClass.create({
      data: { ...data, tenantId },
    });
  }

  async getClasses(tenantId: string, filters: LiveClassFilters = {}) {
    return this.prisma.liveClass.findMany({
      where: { tenantId, ...filters },
      orderBy: { scheduledAt: "asc" },
      include: { _count: { select: { attendance: true } } },
    });
  }

  async updateClass(tenantId: string, id: string, data: LiveClassUpdateInput) {
    await this.ensureClass(tenantId, id);

    return this.prisma.liveClass.update({
      where: { id },
      data,
    });
  }

  async recordAttendance(
    tenantId: string,
    classId: string,
    studentId: string,
    joinedAt?: Date,
    leftAt?: Date
  ) {
    await this.ensureClass(tenantId, classId);

    const duration =
      joinedAt && leftAt ? Math.floor((leftAt.getTime() - joinedAt.getTime()) / 60000) : null;

    return this.prisma.liveClassAttendance.upsert({
      where: { classId_studentId: { classId, studentId } },
      create: { classId, studentId, joinedAt, leftAt, duration },
      update: { leftAt, duration },
    });
  }

  async getAttendance(tenantId: string, classId: string) {
    await this.ensureClass(tenantId, classId);

    return this.prisma.liveClassAttendance.findMany({
      where: { classId },
    });
  }

  private async ensureClass(tenantId: string, id: string) {
    const liveClass = await this.prisma.liveClass.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });

    if (!liveClass) {
      throw new NotFoundError("Live class not found");
    }

    return liveClass;
  }
}
