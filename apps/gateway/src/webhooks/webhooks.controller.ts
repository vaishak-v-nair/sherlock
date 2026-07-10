import { Controller, Post, Body, HttpCode, HttpStatus, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { MeetingEventSchema, MeetingEvent } from '@sherlock/contracts';
import { getRedisClient } from '@sherlock/redis-client';

@Controller('webhooks')
export class WebhooksController {
  private readonly redisClient = getRedisClient();

  @Post('meeting')
  @HttpCode(HttpStatus.ACCEPTED)
  async handleMeetingEvent(@Body() payload: any) {
    // 1. Validate payload against Zod schema
    const validationResult = MeetingEventSchema.safeParse(payload);
    
    if (!validationResult.success) {
      throw new BadRequestException({
        message: 'Invalid MeetingEvent payload',
        errors: validationResult.error.errors,
      });
    }

    const event: MeetingEvent = validationResult.data;

    // 2. Publish to Redis Pub/Sub
    const channel = `meeting.events.${event.sessionId}`;
    
    try {
      await this.redisClient.publish(channel, JSON.stringify(event));
      return { status: 'Accepted', eventId: event.id };
    } catch (error) {
      throw new InternalServerErrorException('Failed to publish event to message broker');
    }
  }
}
