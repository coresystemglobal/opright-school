import prisma from '../prisma/client';
import { NotificationService } from './notificationService';
import { CacheService } from '../utils/cache';

export const SportsService = {
  async createActivity(tenantId: string, data: any) {
    return prisma.activity.create({ data: { ...data, tenantId } });
  },

  async getActivities(tenantId: string, type?: string) {
    const cached = await CacheService.get(tenantId, 'activities', type || 'all');
    if (cached) return cached;

    const activities = await prisma.activity.findMany({
      where: { tenantId, ...(type && { type }) },
      include: { enrollments: true }
    });
    await CacheService.set(tenantId, 'activities', activities, 600, type || 'all');
    return activities;
  },

  async enrollStudent(tenantId: string, data: any) {
    const enrollment = await prisma.activityEnrollment.create({ data: { ...data, tenantId }, include: { activity: true } });
    await NotificationService.notify(tenantId, data.studentId, `Enrolled in ${enrollment.activity.name}`, 'sports');
    return enrollment;
  },

  async createCompetition(tenantId: string, data: any) {
    return prisma.competition.create({ data: { ...data, tenantId } });
  },

  async getCompetitions(tenantId: string, activityId?: string) {
    return prisma.competition.findMany({
      where: { tenantId, ...(activityId && { activityId }) },
      include: { activity: true },
      orderBy: { date: 'desc' }
    });
  }
};
