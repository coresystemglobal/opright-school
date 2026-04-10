import { PrismaClient } from "@prisma/client";
import { NotificationService } from "../../services/notificationService";

type CreateRoomData = {
  roomNumber: string;
  building: string;
  floor: number;
  capacity: number;
  occupied?: number;
  type: string;
};

type AssignStudentData = {
  roomId: string;
  studentId: string;
  startDate: Date;
  endDate?: Date;
  bedNumber?: string;
  status?: string;
};

type CreateMealPlanData = {
  studentId: string;
  planType: string;
  startDate: Date;
  endDate: Date;
  specialDiet?: string;
};

type LogVisitorData = {
  studentId: string;
  visitorName: string;
  relation: string;
  phone?: string;
  checkIn?: Date;
  purpose?: string;
};

export class HostelService {
  constructor(private prisma: PrismaClient) {}

  async createRoom(tenantId: string, data: CreateRoomData) {
    return this.prisma.hostelRoom.create({
      data: { ...data, tenantId },
    });
  }

  async getRooms(tenantId: string) {
    return this.prisma.hostelRoom.findMany({
      where: { tenantId },
      include: { assignments: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async assignStudent(tenantId: string, data: AssignStudentData) {
    const room = await this.prisma.hostelRoom.findFirst({
      where: { id: data.roomId, tenantId },
    });

    if (!room || room.occupied >= room.capacity) {
      throw new Error("Room full");
    }

    const [assignment] = await this.prisma.$transaction([
      this.prisma.hostelAssignment.create({
        data: { ...data, tenantId },
      }),
      this.prisma.hostelRoom.update({
        where: { id: data.roomId, tenantId },
        data: { occupied: { increment: 1 } },
      }),
    ]);

    await NotificationService.notify(
      tenantId,
      data.studentId,
      `Assigned to ${room.building} Room ${room.roomNumber}`,
      "hostel"
    );

    return assignment;
  }

  async createMealPlan(tenantId: string, data: CreateMealPlanData) {
    return this.prisma.mealPlan.create({
      data: { ...data, tenantId },
    });
  }

  async logVisitor(tenantId: string, data: LogVisitorData) {
    return this.prisma.visitorLog.create({
      data: { ...data, tenantId },
    });
  }

  async checkoutVisitor(tenantId: string, id: string) {
    return this.prisma.visitorLog.update({
      where: { id, tenantId },
      data: { checkOut: new Date() },
    });
  }

  async getVisitors(tenantId: string, studentId?: string) {
    return this.prisma.visitorLog.findMany({
      where: { tenantId, ...(studentId ? { studentId } : {}) },
      orderBy: { checkIn: "desc" },
    });
  }

  async getAssignments(tenantId: string, studentId?: string) {
    return this.prisma.hostelAssignment.findMany({
      where: { tenantId, ...(studentId ? { studentId } : {}) },
      include: { room: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async getMealPlans(tenantId: string, studentId?: string) {
    return this.prisma.mealPlan.findMany({
      where: { tenantId, ...(studentId ? { studentId } : {}) },
      orderBy: { createdAt: "desc" },
    });
  }
}
