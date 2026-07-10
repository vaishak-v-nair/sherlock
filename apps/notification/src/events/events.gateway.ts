import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { getRedisClient } from '@sherlock/redis-client';
import { StateUpdateEventSchema } from '@sherlock/contracts';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private readonly redisClient = getRedisClient();

  afterInit() {
    this.logger.log('Notification Gateway Initialized');
    this.subscribeToStateEvents();
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  private subscribeToStateEvents() {
    this.redisClient.psubscribe('state.events.*', (err, count) => {
      if (err) {
        this.logger.error('Failed to subscribe to state.events.*', err);
        return;
      }
      this.logger.log(`Subscribed to ${count} channels`);
    });

    this.redisClient.on('pmessage', (pattern, channel, message) => {
      try {
        const payload = JSON.parse(message);
        
        // Zod Runtime Validation
        const result = StateUpdateEventSchema.safeParse(payload);
        
        if (result.success) {
          const event = result.data;
          this.logger.log(`Broadcasting State Change for session ${event.sessionId}: candidateId -> ${event.identifiedCandidateId}`);
          
          // Broadcast to connected clients. We could use rooms for specific sessions.
          this.server.emit(`state.events.${event.sessionId}`, event);
        } else {
          this.logger.error('Invalid state event payload received from Redis', result.error);
        }
      } catch (e) {
        this.logger.error('Failed to process message from Redis', e);
      }
    });
  }
}
