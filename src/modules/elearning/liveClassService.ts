import { PrismaClient } from "@prisma/client";
import { ForbiddenError, NotFoundError } from "../../utils/errors";
import { JitsiService } from "./jitsiService";
import { HundredMsService } from "./hundredMsService";

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
  private jitsi = new JitsiService();
  private hundredMs = new HundredMsService();

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
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
        subject: { select: { id: true, name: true, code: true } },
        _count: { select: { attendance: true } },
      },
    });
  }

  async updateClass(tenantId: string, id: string, data: LiveClassUpdateInput) {
    await this.ensureClass(tenantId, id);
    return this.prisma.liveClass.update({ where: { id }, data });
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
    return this.prisma.liveClassAttendance.findMany({ where: { classId } });
  }

  async joinClass(
    tenantId: string,
    classId: string,
    userId: string,
    role: 'TEACHER' | 'STUDENT'
  ) {
    const liveClass = await this.prisma.liveClass.findFirst({
      where: { id: classId, tenantId },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true, userId: true } },
        subject: { select: { name: true } },
      },
    });

    if (!liveClass) throw new NotFoundError('Live class not found');
    if (liveClass.status === 'CANCELLED') throw new ForbiddenError('This class has been cancelled');
    if (liveClass.status === 'COMPLETED') throw new ForbiddenError('This class has already ended');

    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      select: {
        firstName: true,
        lastName: true,
        email: true,
        student: { select: { firstName: true, lastName: true } },
      },
    });

    const userName = user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.student
      ? `${user.student.firstName} ${user.student.lastName}`
      : 'Participant';

    // Generate room name as {subject-slug}-{YYYY-MM-DD}-{HHmm}
    const roomName = liveClass.roomName ?? this.buildRoomName(
      liveClass.subject?.name ?? null,
      liveClass.scheduledAt
    );

    const scheduledEndEpoch = Math.floor(
      (liveClass.scheduledAt.getTime() + liveClass.duration * 60 * 1000 + 30 * 60 * 1000) / 1000
    );

    const platform = liveClass.platform.toUpperCase();

    if (platform === 'JITSI') {
      return this.joinViaJitsi({
        liveClass,
        roomName,
        userName,
        userEmail: user?.email ?? undefined,
        isTeacher: role === 'TEACHER' && liveClass.teacher?.userId === userId,
        expiryEpoch: scheduledEndEpoch,
        tenantId,
        userId,
        role,
      });
    }

    if (platform === '100MS') {
      return this.joinVia100ms({
        liveClass,
        roomName,
        userId,
        role,
        expiryEpoch: scheduledEndEpoch,
        tenantId,
      });
    }

    if (platform === 'GOOGLE_MEET') {
      if (!liveClass.meetingUrl) {
        throw new ForbiddenError('No Google Meet link has been set for this class');
      }
      // Record attendance and return the teacher-provided Meet URL
      await this.recordStudentJoin(tenantId, classId, userId, role);
      return { meetingUrl: liveClass.meetingUrl, platform: 'GOOGLE_MEET', token: null, roomName: null };
    }

    return { meetingUrl: liveClass.meetingUrl, platform: liveClass.platform, token: null, roomName };
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private buildRoomName(subjectName: string | null, scheduledAt: Date): string {
    const slug = subjectName
      ? subjectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      : 'live-class';
    const date = scheduledAt.toISOString().slice(0, 10);               // YYYY-MM-DD
    const time = scheduledAt.toISOString().slice(11, 16).replace(':', ''); // HHmm
    return `${slug}-${date}-${time}`;
  }

  private async joinViaJitsi(opts: {
    liveClass: any;
    roomName: string;
    userName: string;
    userEmail?: string;
    isTeacher: boolean;
    expiryEpoch: number;
    tenantId: string;
    userId: string;
    role: 'TEACHER' | 'STUDENT';
  }) {
    const token = this.jitsi.generateToken({
      roomName: opts.roomName,
      userName: opts.userName,
      userEmail: opts.userEmail,
      isModerator: opts.isTeacher,
      expiryEpoch: opts.expiryEpoch,
    });

    const meetingUrl = this.jitsi.buildRoomUrl(opts.roomName, token);

    if (!opts.liveClass.roomName) {
      await this.prisma.liveClass.update({
        where: { id: opts.liveClass.id },
        data: { roomName: opts.roomName, meetingUrl },
      });
    }

    await this.recordStudentJoin(opts.tenantId, opts.liveClass.id, opts.userId, opts.role);

    return { meetingUrl, platform: 'JITSI', token, roomName: opts.roomName };
  }

  private async joinVia100ms(opts: {
    liveClass: any;
    roomName: string;
    userId: string;
    role: 'TEACHER' | 'STUDENT';
    expiryEpoch: number;
    tenantId: string;
  }) {
    const room = await this.hundredMs.getOrCreateRoom(opts.roomName);

    if (!opts.liveClass.roomName) {
      await this.prisma.liveClass.update({
        where: { id: opts.liveClass.id },
        data: { roomName: opts.roomName },
      });
    }

    const hmsRole = opts.role === 'TEACHER' ? 'host' : 'guest';
    const token = this.hundredMs.buildAppToken({
      roomId: room.id,
      role: hmsRole,
      userId: opts.userId,
      expiryEpoch: opts.expiryEpoch,
    });

    await this.recordStudentJoin(opts.tenantId, opts.liveClass.id, opts.userId, opts.role);

    return { roomId: room.id, platform: '100MS', token, roomName: opts.roomName };
  }

  private async recordStudentJoin(
    tenantId: string,
    classId: string,
    userId: string,
    role: 'TEACHER' | 'STUDENT'
  ) {
    if (role !== 'STUDENT') return;
    const student = await this.prisma.student.findFirst({
      where: { tenantId, userId },
      select: { id: true },
    });
    if (!student) return;
    await this.prisma.liveClassAttendance.upsert({
      where: { classId_studentId: { classId, studentId: student.id } },
      create: { classId, studentId: student.id, joinedAt: new Date() },
      update: { joinedAt: new Date() },
    });
  }

  private async ensureClass(tenantId: string, id: string) {
    const liveClass = await this.prisma.liveClass.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!liveClass) throw new NotFoundError('Live class not found');
    return liveClass;
  }
}
