import prisma from '../prisma/client';
import { NotificationService } from './notificationService';
import { CacheService } from '../utils/cache';

export const EventService = {
  async createEvent(tenantId: string, data: any) {
    return prisma.event.create({ data: { ...data, tenantId } });
  },

  async getEvents(tenantId: string, filters?: any) {
    return prisma.event.findMany({
      where: { tenantId, ...filters },
      include: { participants: true },
      orderBy: { startDate: 'asc' }
    });
  },

  async addParticipant(tenantId: string, data: any) {
    const participant = await prisma.eventParticipant.create({ data: { ...data, tenantId }, include: { event: true } });
    await NotificationService.notify(tenantId, data.participantId, `Added to event: ${participant.event.title}`, 'event');
    return participant;
  },

  async getParticipants(tenantId: string, eventId: string) {
    return prisma.eventParticipant.findMany({
      where: { tenantId, eventId }
    });
  },

  async getUpcoming(tenantId: string) {
    const cached = await CacheService.get(tenantId, 'events:upcoming');
    if (cached) return cached;
    
    const events = await prisma.event.findMany({
      where: { tenantId, startDate: { gte: new Date() } },
      orderBy: { startDate: 'asc' },
      take: 10
    });
    await CacheService.set(tenantId, 'events:upcoming', events, 300);
    return events;
  }
};
