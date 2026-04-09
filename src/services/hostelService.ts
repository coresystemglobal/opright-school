import prisma from '../prisma/client';
import { NotificationService } from './notificationService';

export const HostelService = {
  async createRoom(tenantId: string, data: any) {
    return prisma.hostelRoom.create({ data: { ...data, tenantId } });
  },

  async getRooms(tenantId: string) {
    return prisma.hostelRoom.findMany({ where: { tenantId }, include: { assignments: true } });
  },

  async assignStudent(tenantId: string, data: any) {
    const room = await prisma.hostelRoom.findUnique({ where: { id: data.roomId } });
    if (!room || room.occupied >= room.capacity) throw new Error('Room full');

    const [assignment] = await prisma.$transaction([
      prisma.hostelAssignment.create({ data: { ...data, tenantId } }),
      prisma.hostelRoom.update({ where: { id: data.roomId }, data: { occupied: { increment: 1 } } })
    ]);
    await NotificationService.notify(tenantId, data.studentId, `Assigned to ${room.building} Room ${room.roomNumber}`, 'hostel');
    return assignment;
  },

  async createMealPlan(tenantId: string, data: any) {
    return prisma.mealPlan.create({ data: { ...data, tenantId } });
  },

  async logVisitor(tenantId: string, data: any) {
    return prisma.visitorLog.create({ data: { ...data, tenantId } });
  },

  async checkoutVisitor(tenantId: string, id: string) {
    return prisma.visitorLog.update({ where: { id }, data: { checkOut: new Date() } });
  },

  async getVisitors(tenantId: string, studentId?: string) {
    return prisma.visitorLog.findMany({
      where: { tenantId, ...(studentId ? { studentId } : {}) },
      orderBy: { checkIn: 'desc' },
    });
  },

  async getAssignments(tenantId: string, studentId?: string) {
    return prisma.hostelAssignment.findMany({
      where: { tenantId, ...(studentId ? { studentId } : {}) },
      include: { room: true },
    });
  },

  async getMealPlans(tenantId: string, studentId?: string) {
    return prisma.mealPlan.findMany({
      where: { tenantId, ...(studentId ? { studentId } : {}) },
    });
  },
};
