export type DomainEventType =
  | "POS_ORDER_CREATED"
  | "STOCK_REPLENISHMENT_NEEDED"
  | "LEDGER_ENTRY_POSTED"
  | "PAYROLL_EXECUTED";

export interface DomainEvent<T = unknown> {
  id: string;
  type: DomainEventType;
  tenantId: string;
  timestamp: Date;
  payload: T;
}

type EventHandler<T = unknown> = (event: DomainEvent<T>) => Promise<void> | void;

class DomainEventBus {
  private handlers = new Map<DomainEventType, EventHandler<unknown>[]>();

  subscribe<T>(type: DomainEventType, handler: EventHandler<T>): void {
    const current = this.handlers.get(type) || [];
    const wrapped: EventHandler<unknown> = (event) => handler(event as unknown as DomainEvent<T>);
    this.handlers.set(type, [...current, wrapped]);
  }

  async publish<T>(event: DomainEvent<T>): Promise<void> {
    const current = this.handlers.get(event.type) || [];
    for (const handler of current) {
      try {
        await handler(event as unknown as DomainEvent<unknown>);
      } catch (error) {
        console.error(`[EventBus Error on ${event.type}]:`, error);
      }
    }
  }
}

export const eventBus = new DomainEventBus();
