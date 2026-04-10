import { Prisma, PrismaClient } from "@prisma/client";
import { CacheService } from "../../utils/cache";
import { NotificationService } from "../../services/notificationService";

type CreateBusData = {
  busNumber: string;
  capacity: number;
  driverName: string;
  driverPhone?: string;
};

type CreateRouteData = {
  busId: string;
  routeName: string;
  stops: Prisma.InputJsonValue;
};

type CreateAssignmentData = {
  routeId: string;
  studentId: string;
  pickupStop: string;
  dropStop: string;
};

export class TransportService {
  constructor(private prisma: PrismaClient) {}

  async createBus(tenantId: string, data: CreateBusData) {
    const bus = await this.prisma.bus.create({
      data: { ...data, tenantId },
    });

    await CacheService.invalidate(tenantId, "buses");
    return bus;
  }

  async getBuses(tenantId: string) {
    const cached = await CacheService.get(tenantId, "buses");
    if (cached) return cached;

    const buses = await this.prisma.bus.findMany({
      where: { tenantId },
      include: { routes: true },
      orderBy: { createdAt: "desc" },
    });

    await CacheService.set(tenantId, "buses", buses, 600);
    return buses;
  }

  async createRoute(tenantId: string, data: CreateRouteData) {
    const route = await this.prisma.busRoute.create({
      data: { ...data, tenantId },
    });

    await Promise.all([
      CacheService.invalidate(tenantId, "routes"),
      CacheService.invalidate(tenantId, "buses"),
    ]);

    return route;
  }

  async getRoutes(tenantId: string, busId?: string) {
    const cacheKey = busId ?? "all";
    const cached = await CacheService.get(tenantId, "routes", cacheKey);
    if (cached) return cached;

    const routes = await this.prisma.busRoute.findMany({
      where: { tenantId, ...(busId ? { busId } : {}) },
      include: { bus: true, assignments: true },
      orderBy: { createdAt: "desc" },
    });

    await CacheService.set(tenantId, "routes", routes, 600, cacheKey);
    return routes;
  }

  async assignStudent(tenantId: string, data: CreateAssignmentData) {
    const assignment = await this.prisma.busAssignment.create({
      data: { ...data, tenantId },
      include: {
        route: {
          include: { bus: true },
        },
      },
    });

    await NotificationService.notify(
      tenantId,
      data.studentId,
      `Assigned to ${assignment.route.bus.busNumber} - ${assignment.route.routeName}`,
      "transport"
    );

    return assignment;
  }

  async getAssignments(tenantId: string, studentId?: string) {
    return this.prisma.busAssignment.findMany({
      where: { tenantId, ...(studentId ? { studentId } : {}) },
      include: {
        route: {
          include: { bus: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
