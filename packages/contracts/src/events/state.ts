import { z } from 'zod';

export const ParticipantConfidenceSchema = z.object({
  participantId: z.string(),
  confidenceScore: z.number().min(0.0).max(1.0),
});

export type ParticipantConfidence = z.infer<typeof ParticipantConfidenceSchema>;

export const StateUpdateEventSchema = z.object({
  sessionId: z.string(),
  timestamp: z.number(),
  participants: z.array(ParticipantConfidenceSchema),
  identifiedCandidateId: z.string().nullable(), // Null means AMBIGUOUS state
  explanation: z.string(),
});

export type StateUpdateEvent = z.infer<typeof StateUpdateEventSchema>;
