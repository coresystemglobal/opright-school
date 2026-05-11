import { PrismaClient } from "@prisma/client";
import { ForbiddenError, NotFoundError } from "../../utils/errors";
import { DailyService } from "./dailyService";

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
  private daily = new DailyService();
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

  async joinClass(
    tenantId: string,
    classId: string,
    userId: string,
    role: 'TEACHER' | 'STUDENT'
  ) {
    const liveClass = await this.prisma.liveClass.findFirst({
      where: { id: classId, tenantId },
      include: { teacher: { select: { id: true, firstName: true, lastName: true, userId: true } } },
    });

    if (!liveClass) throw new NotFoundError('Live class not found');
    if (liveClass.status === 'CANCELLED') throw new ForbiddenError('This class has been cancelled');
    if (liveClass.status === 'COMPLETED') throw new ForbiddenError('This class has already ended');

    // Resolve participant name
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      select: { firstName: true, lastName: true, student: { select: { firstName: true, lastName: true } } },
    });
    const userName = user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.student
      ? `${user.student.firstName} ${user.student.lastName}`
      : 'Participant';

    // Build a deterministic room name from the class id
    const roomName = `smp-${classId}`;
    const scheduledEndEpoch = Math.floor(
      (liveClass.scheduledAt.getTime() + liveClass.duration * 60 * 1000 + 30 * 60 * 1000) / 1000
    ); // class end + 30 min buffer

    // Create or fetch the Daily.co room
    let meetingUrl = liveClass.meetingUrl;
    let dailyRoomName = liveClass.dailyRoomName;

    if (liveClass.platform === 'DAILY') {
      const room = await this.daily.getOrCreateRoom(roomName, scheduledEndEpoch);
      meetingUrl = room.url;
      dailyRoomName = room.name;

      // Persist room details if not already stored
      if (!liveClass.dailyRoomName) {
        await this.prisma.liveClass.update({
          where: { id: classId },
          data: { meetingUrl: room.url, dailyRoomName: room.name },
        });
      }
    }

    if (!dailyRoomName || liveClass.platform !== 'DAILY') {
      // Non-Daily platforms: just return the stored meetingUrl
      return { meetingUrl, platform: liveClass.platform, token: null };
    }

    const isOwner = role === 'TEACHER' && liveClass.teacher?.userId === userId;
    const token = await this.daily.createToken({
      roomName: dailyRoomName,
      userName,
      isOwner,
      expiryEpoch: scheduledEndEpoch,
    });

    // Record that student joined (upsert so re-joins don't duplicate)
    if (role === 'STUDENT') {
      const student = await this.prisma.student.findFirst({
        where: { tenantId, userId },
        select: { id: true },
      });
      if (student) {
        await this.prisma.liveClassAttendance.upsert({
          where: { classId_studentId: { classId, studentId: student.id } },
          create: { classId, studentId: student.id, joinedAt: new Date() },
          update: { joinedAt: new Date() },
        });
      }
    }

    return { meetingUrl, platform: 'DAILY', token, roomName: dailyRoomName };
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
