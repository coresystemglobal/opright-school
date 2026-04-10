import prisma from '../prisma/client';
import { NotificationService } from './notificationService';
import { CacheService } from '../utils/cache';

/** Normalize a datetime string from HTML datetime-local inputs (e.g. "2026-04-17T13:00")
 *  to a full ISO-8601 string that Prisma/PostgreSQL accepts. */
function toISODate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  // Append seconds if the string ends at HH:MM (16 chars) without seconds
  const normalized = value.length === 16 ? `${value}:00` : value;
  const date = new Date(normalized);
  if (isNaN(date.getTime())) throw new Error(`Invalid date: ${value}`);
  return date;
}

export const EventService = {
  async createEvent(tenantId: string, data: any) {
    const payload = {
      ...data,
      tenantId,
      startDate: toISODate(data.startDate),
      ...(data.endDate ? { endDate: toISODate(data.endDate) } : {}),
    };
    return prisma.event.create({ data: payload });
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
