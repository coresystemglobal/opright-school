import { PrismaClient } from "@prisma/client";
import { CacheService } from "../../utils/cache";
import { NotificationService } from "../../services/notificationService";

/** Normalize a datetime string from HTML datetime-local inputs (e.g. "2026-04-17T13:00")
 *  to a full ISO-8601 string that Prisma/PostgreSQL accepts. */
function toISODate(value: Date | string | undefined): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  // Append seconds if the string ends at HH:MM (16 chars) without seconds
  const normalized = value.length === 16 ? `${value}:00` : value;
  const date = new Date(normalized);
  if (isNaN(date.getTime())) throw new Error(`Invalid date: ${value}`);
  return date;
}

type CreateEventData = {
  title: string;
  description?: string;
  type: string;
  venue?: string;
  startDate: Date | string;
  endDate?: Date | string;
};

type EventFilters = {
  type?: string;
  venue?: string;
};

type CreateParticipantData = {
  eventId: string;
  participantId: string;
  participantType: string;
  role?: string;
};

export class EventService {
  constructor(private prisma: PrismaClient) {}

  async createEvent(tenantId: string, data: CreateEventData) {
    const startDate = toISODate(data.startDate);
    if (!startDate) {
      throw new Error("Start date is required");
    }

    const payload = {
      ...data,
      tenantId,
      startDate,
      ...(data.endDate ? { endDate: toISODate(data.endDate) } : {}),
    };
    const event = await this.prisma.event.create({ data: payload });

    await CacheService.invalidate(tenantId, "events:upcoming");
    return event;
  }

  async getEvents(tenantId: string, filters: EventFilters = {}) {
    return this.prisma.event.findMany({
      where: { tenantId, ...filters },
      include: { participants: true },
      orderBy: { startDate: 'asc' }
    });
  }

  async addParticipant(tenantId: string, data: CreateParticipantData) {
    const participant = await this.prisma.eventParticipant.create({
      data: { ...data, tenantId },
      include: { event: true },
    });

    await NotificationService.notify(
      tenantId,
      data.participantId,
      `Added to event: ${participant.event.title}`,
      "event"
    );

    return participant;
  }

  async getParticipants(tenantId: string, eventId: string) {
    return this.prisma.eventParticipant.findMany({
      where: { tenantId, eventId },
      orderBy: { createdAt: "desc" },
    });
  }

  async getUpcoming(tenantId: string) {
    const cached = await CacheService.get(tenantId, "events:upcoming");
    if (cached) return cached;
    
    const events = await this.prisma.event.findMany({
      where: { tenantId, startDate: { gte: new Date() } },
      orderBy: { startDate: 'asc' },
      take: 10
    });
    await CacheService.set(tenantId, "events:upcoming", events, 300);
    return events;
  }
}
