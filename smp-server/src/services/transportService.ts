import prisma from '../prisma/client';
import { NotificationService } from './notificationService';
import { CacheService } from '../utils/cache';

export const TransportService = {
  async createBus(tenantId: string, data: any) {
    return prisma.bus.create({ data: { ...data, tenantId } });
  },

  async getBuses(tenantId: string) {
    const cached = await CacheService.get(tenantId, 'buses');
    if (cached) return cached;
    
    const buses = await prisma.bus.findMany({ where: { tenantId }, include: { routes: true } });
    await CacheService.set(tenantId, 'buses', buses, 600);
    return buses;
  },

  async createRoute(tenantId: string, data: any) {
    return prisma.busRoute.create({ data: { ...data, tenantId } });
  },

  async getRoutes(tenantId: string, busId?: string) {
    const cached = await CacheService.get(tenantId, 'routes', busId || 'all');
    if (cached) return cached;
    
    const routes = await prisma.busRoute.findMany({
      where: { tenantId, ...(busId && { busId }) },
      include: { bus: true, assignments: true }
    });
    await CacheService.set(tenantId, 'routes', routes, 600, busId || 'all');
    return routes;
  },

  async assignStudent(tenantId: string, data: any) {
    const assignment = await prisma.busAssignment.create({ data: { ...data, tenantId }, include: { route: { include: { bus: true } } } });
    await NotificationService.notify(tenantId, data.studentId, `Assigned to ${assignment.route.bus.busNumber} - ${assignment.route.routeName}`, 'transport');
    return assignment;
  },

  async getAssignments(tenantId: string, studentId?: string) {
    return prisma.busAssignment.findMany({
      where: { tenantId, ...(studentId && { studentId }) },
      include: { route: { include: { bus: true } } }
    });
  }
};
