import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventsGateway } from './events.gateway';
import { EventType } from '@app/common';
import { EventPayload } from '@app/common';

@Injectable()
export class EventListenerService implements OnModuleInit {
  private readonly logger = new Logger(EventListenerService.name);

  constructor(private readonly eventsGateway: EventsGateway) {}

  onModuleInit() {
    this.logger.log('Event listener service initialized');
  }

  @OnEvent('websocket:broadcast')
  handleWebSocketBroadcast(data: {
    channel: string;
    eventType: EventType;
    payload: EventPayload;
  }) {
    const { channel, eventType, payload } = data;

    // Broadcast based on channel type
    if (channel.startsWith('entity:')) {
      const entityId = channel.replace('entity:', '');
      this.eventsGateway.broadcastToEntity(entityId, eventType, payload);
    } else if (channel.startsWith('branch:')) {
      const branchId = channel.replace('branch:', '');
      this.eventsGateway.broadcastToBranch(branchId, eventType, payload);
    } else if (channel === 'global') {
      this.eventsGateway.broadcastGlobal(eventType, payload);
    }

    this.logger.debug(`Broadcasted event ${eventType} to channel ${channel}`);
  }

  // Listen to specific event types for additional processing if needed
  @OnEvent(EventType.ORDER_CREATED)
  handleOrderCreated(payload: EventPayload) {
    this.logger.log(`Order created: ${(payload as any).orderId}`);
  }

  @OnEvent(EventType.ORDER_STATUS_CHANGED)
  handleOrderStatusChanged(payload: EventPayload) {
    this.logger.log(`Order status changed: ${(payload as any).orderId}`);
  }

  @OnEvent(EventType.RECEIPT_CREATED)
  handleReceiptCreated(payload: EventPayload) {
    this.logger.log(`Receipt created: ${(payload as any).receiptId}`);
  }
}
