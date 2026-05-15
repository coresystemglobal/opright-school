import { EventEmitter } from "events";
import { CacheService } from "./cache";

type DomainEvent = {
  tenantId: string;
  resource: string;
  action: "created" | "updated" | "deleted";
  id?: string;
};

class DomainEventBus extends EventEmitter {
  emit(event: "entity.changed", payload: DomainEvent): boolean;
  emit(event: string, ...args: unknown[]): boolean {
    return super.emit(event, ...args);
  }
}

export const domainEvents = new DomainEventBus();

domainEvents.on("entity.changed", async (event: DomainEvent) => {
  try {
    await CacheService.invalidate(event.tenantId, event.resource);
  } catch (err) {
    console.error("[domainEvents] cache invalidation failed:", (err as Error).message);
  }
});
