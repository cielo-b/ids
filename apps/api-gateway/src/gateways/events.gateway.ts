import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload, JwtPayloadWithRole } from '@app/common';

// Extend Socket interface to include user property
declare module 'socket.io' {
  interface Socket {
    user?: JwtPayloadWithRole;
  }
}

type AuthenticatedSocket = Socket;

@WebSocketGateway({
  cors: {
    origin: '*', // Configure based on your frontend URL
    credentials: true,
  },
  namespace: '/events',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private readonly connectedClients = new Map<string, Socket>();

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      // Extract token from handshake auth or query
      const handshake = client.handshake as any;
      const token = handshake?.auth?.token || handshake?.query?.token;

      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = this.jwtService.verify(token as string) as JwtPayload;
      // Role will be fetched by JWT strategy, so cast to JwtPayloadWithRole
      client.user = payload as JwtPayloadWithRole;

      // Store connected client
      this.connectedClients.set(client.id, client);

      // Join entity room
      if (payload.entityId) {
        client.join(`entity:${payload.entityId}`);
        this.logger.log(
          `Client ${client.id} (${payload.email}) joined entity:${payload.entityId}`,
        );
      }

      // Join branch room if applicable
      if (payload.branchId) {
        client.join(`branch:${payload.branchId}`);
        this.logger.log(
          `Client ${client.id} (${payload.email}) joined branch:${payload.branchId}`,
        );
      }

      // Join user-specific room
      client.join(`user:${payload.sub}`);

      // Send connection confirmation
      client.emit('connected', {
        message: 'Connected to real-time events',
        userId: payload.sub,
        entityId: payload.entityId,
        branchId: payload.branchId,
      });
    } catch (error) {
      this.logger.error(`Error authenticating client ${client.id}:`, error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    this.logger.log(`Client ${client.id} disconnected`);
  }

  /**
   * Subscribe to entity events
   */
  @SubscribeMessage('subscribe:entity')
  handleSubscribeEntity(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { entityId: string },
  ) {
    if (!client.user) {
      return { error: 'Not authenticated' };
    }

    // Verify user has access to this entity
    if (
      client.user.role !== 'SUPER_ADMIN' &&
      client.user.entityId !== data.entityId
    ) {
      return { error: 'Access denied' };
    }

    client.join(`entity:${data.entityId}`);
    this.logger.log(
      `Client ${client.id} subscribed to entity:${data.entityId}`,
    );

    return { success: true, entityId: data.entityId };
  }

  /**
   * Subscribe to branch events
   */
  @SubscribeMessage('subscribe:branch')
  handleSubscribeBranch(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { branchId: string },
  ) {
    if (!client.user) {
      return { error: 'Not authenticated' };
    }

    // Verify user has access to this branch
    if (
      client.user.role !== 'SUPER_ADMIN' &&
      client.user.role !== 'ENTITY_OWNER' &&
      client.user.branchId !== data.branchId
    ) {
      return { error: 'Access denied' };
    }

    client.join(`branch:${data.branchId}`);
    this.logger.log(
      `Client ${client.id} subscribed to branch:${data.branchId}`,
    );

    return { success: true, branchId: data.branchId };
  }

  /**
   * Unsubscribe from entity events
   */
  @SubscribeMessage('unsubscribe:entity')
  handleUnsubscribeEntity(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { entityId: string },
  ) {
    client.leave(`entity:${data.entityId}`);
    return { success: true, entityId: data.entityId };
  }

  /**
   * Unsubscribe from branch events
   */
  @SubscribeMessage('unsubscribe:branch')
  handleUnsubscribeBranch(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { branchId: string },
  ) {
    client.leave(`branch:${data.branchId}`);
    return { success: true, branchId: data.branchId };
  }

  /**
   * Broadcast event to entity room
   */
  broadcastToEntity(entityId: string, event: string, data: any) {
    this.server.to(`entity:${entityId}`).emit(event, data);
  }

  /**
   * Broadcast event to branch room
   */
  broadcastToBranch(branchId: string, event: string, data: any) {
    this.server.to(`branch:${branchId}`).emit(event, data);
  }

  /**
   * Broadcast event to user
   */
  broadcastToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Broadcast event globally
   */
  broadcastGlobal(event: string, data: any) {
    this.server.emit(event, data);
  }
}
