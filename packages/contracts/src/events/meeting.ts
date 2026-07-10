import { z } from 'zod';

export const MeetingEventType = z.enum([
  'JOIN',
  'LEAVE',
  'TRANSCRIPT',
  'VIDEO_STATE_CHANGE',
  'SCREEN_SHARE',
]);

export type MeetingEventType = z.infer<typeof MeetingEventType>;

export const MeetingEventSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string(),
  participantId: z.string(),
  timestamp: z.number(),
  type: MeetingEventType,
  payload: z.record(z.any()),
});

export type MeetingEvent = z.infer<typeof MeetingEventSchema>;
