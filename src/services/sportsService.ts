import { Prisma, PrismaClient } from "@prisma/client";
import { CacheService } from "../utils/cache";
import { NotificationService } from "./notificationService";

type CreateActivityData = {
  name: string;
  type: string;
  description?: string;
  instructor?: string;
  schedule?: Prisma.InputJsonValue;
  maxCapacity?: number;
};

type EnrollStudentData = {
  activityId: string;
  studentId: string;
  status?: string;
};

type CreateCompetitionData = {
  activityId: string;
  name: string;
  date: Date;
  venue?: string;
  participants?: Prisma.InputJsonValue;
  results?: Prisma.InputJsonValue;
};

export class SportsService {
  constructor(private prisma: PrismaClient) {}

  async createActivity(tenantId: string, data: CreateActivityData) {
    const activity = await this.prisma.activity.create({
      data: { ...data, tenantId },
    });

    await CacheService.invalidate(tenantId, "activities");
    return activity;
  }

  async getActivities(tenantId: string, type?: string) {
    const cacheKey = type ?? "all";
    const cached = await CacheService.get(tenantId, "activities", cacheKey);
    if (cached) return cached;

    const activities = await this.prisma.activity.findMany({
      where: { tenantId, ...(type ? { type } : {}) },
      include: { enrollments: true },
      orderBy: { createdAt: "desc" },
    });

    await CacheService.set(tenantId, "activities", activities, 600, cacheKey);
    return activities;
  }

  async enrollStudent(tenantId: string, data: EnrollStudentData) {
    const enrollment = await this.prisma.activityEnrollment.create({
      data: { ...data, tenantId },
      include: { activity: true },
    });

    await Promise.all([
      CacheService.invalidate(tenantId, "activities"),
      NotificationService.notify(
        tenantId,
        data.studentId,
        `Enrolled in ${enrollment.activity.name}`,
        "sports"
      ),
    ]);

    return enrollment;
  }

  async createCompetition(tenantId: string, data: CreateCompetitionData) {
    return this.prisma.competition.create({
      data: { ...data, tenantId },
    });
  }

  async getCompetitions(tenantId: string, activityId?: string) {
    return this.prisma.competition.findMany({
      where: { tenantId, ...(activityId ? { activityId } : {}) },
      include: { activity: true },
      orderBy: { date: "desc" },
    });
  }
}
