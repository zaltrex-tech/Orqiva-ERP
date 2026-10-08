export type DomainEventType =
  | "POS_ORDER_CREATED"
  | "STOCK_REPLENISHMENT_NEEDED"
  | "LEDGER_ENTRY_POSTED"
  | "PAYROLL_EXECUTED";

export interface DomainEvent<T = any> {
  id: string;
  type: DomainEventType;
  tenantId: string;
  timestamp: Date;
  payload: T;
}

type EventHandler<T = any> = (event: DomainEvent<T>) => Promise<void> | void;

class DomainEventBus {
  private handlers = new Map<DomainEventType, EventHandler[]>();

  subscribe<T>(type: DomainEventType, handler: EventHandler<T>): void {
    const current = this.handlers.get(type) || [];
    this.handlers.set(type, [...current, handler]);
  }

  async publish<T>(event: DomainEvent<T>): Promise<void> {
    const current = this.handlers.get(event.type) || [];
    for (const handler of current) {
      try {
        await handler(event);
      } catch (error) {
        console.error(`[EventBus Error on ${event.type}]:`, error);
      }
    }
  }
}

export const eventBus = new DomainEventBus();
