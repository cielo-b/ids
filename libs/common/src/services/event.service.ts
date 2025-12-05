import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventType } from '../enums/event-type.enum';
import { EventPayload } from '../interfaces/event-payload.interface';

@Injectable()
export class EventService {
  private readonly logger = new Logger(EventService.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Emit an event with payload
   */
  emit(eventType: EventType, payload: EventPayload): void {
    try {
      // Add timestamp if not present
      if (!payload.timestamp) {
        payload.timestamp = new Date();
      }

      // Emit to all listeners
      this.eventEmitter.emit(eventType, payload);

      // Emit to entity-specific channel
      if (payload.entityId) {
        this.eventEmitter.emit(
          `entity:${payload.entityId}:${eventType}`,
          payload,
        );
      }

      // Emit to branch-specific channel
      if (payload.branchId) {
        this.eventEmitter.emit(
          `branch:${payload.branchId}:${eventType}`,
          payload,
        );
      }

      // Emit to global channel for WebSocket broadcasting
      this.eventEmitter.emit('websocket:broadcast', {
        channel: this.getChannel(eventType, payload),
        eventType,
        payload,
      });

      this.logger.debug(`Event emitted: ${eventType}`, { payload });
    } catch (error) {
      this.logger.error(`Error emitting event ${eventType}:`, error);
    }
  }

  /**
   * Get channel name for WebSocket broadcasting
   */
  private getChannel(eventType: EventType, payload: EventPayload): string {
    // Entity-level channel
    if (payload.entityId && !payload.branchId) {
      return `entity:${payload.entityId}`;
    }

    // Branch-level channel
    if (payload.branchId) {
      return `branch:${payload.branchId}`;
    }

    // Global channel (for superadmin)
    return 'global';
  }

  /**
   * Emit order created event
   */
  emitOrderCreated(
    payload: Omit<EventPayload, 'eventType' | 'timestamp'>,
  ): void {
    this.emit(EventType.ORDER_CREATED, {
      ...payload,
      eventType: EventType.ORDER_CREATED,
    } as EventPayload);
  }

  /**
   * Emit order updated event
   */
  emitOrderUpdated(
    payload: Omit<EventPayload, 'eventType' | 'timestamp'>,
  ): void {
    this.emit(EventType.ORDER_UPDATED, {
      ...payload,
      eventType: EventType.ORDER_UPDATED,
    } as EventPayload);
  }

  /**
   * Emit order status changed event
   */
  emitOrderStatusChanged(
    payload: Omit<EventPayload, 'eventType' | 'timestamp'>,
  ): void {
    this.emit(EventType.ORDER_STATUS_CHANGED, {
      ...payload,
      eventType: EventType.ORDER_STATUS_CHANGED,
    } as EventPayload);
  }

  /**
   * Emit receipt created event
   */
  emitReceiptCreated(
    payload: Omit<EventPayload, 'eventType' | 'timestamp'>,
  ): void {
    this.emit(EventType.RECEIPT_CREATED, {
      ...payload,
      eventType: EventType.RECEIPT_CREATED,
    } as EventPayload);
  }

  /**
   * Emit table status changed event
   */
  emitTableStatusChanged(
    payload: Omit<EventPayload, 'eventType' | 'timestamp'>,
  ): void {
    this.emit(EventType.TABLE_STATUS_CHANGED, {
      ...payload,
      eventType: EventType.TABLE_STATUS_CHANGED,
    } as EventPayload);
  }

  /**
   * Emit pump status changed event
   */
  emitPumpStatusChanged(
    payload: Omit<EventPayload, 'eventType' | 'timestamp'>,
  ): void {
    this.emit(EventType.PUMP_STATUS_CHANGED, {
      ...payload,
      eventType: EventType.PUMP_STATUS_CHANGED,
    } as EventPayload);
  }
}
