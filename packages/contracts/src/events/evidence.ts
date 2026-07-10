import { z } from 'zod';

export const EngineSource = z.enum([
  'METADATA',
  'CONVERSATION',
  'AUDIO',
  'VIDEO',
  'BEHAVIORAL',
]);

export type EngineSource = z.infer<typeof EngineSource>;

export const EvidenceEventSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string(),
  participantId: z.string(),
  engineId: EngineSource,
  timestamp: z.number(),
  score: z.number().min(-1.0).max(1.0),
  weight: z.number().min(0.0).max(1.0),
  reason: z.string(),
});

export type EvidenceEvent = z.infer<typeof EvidenceEventSchema>;
