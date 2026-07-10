const { getRedisClient } = require('@sherlock/redis-client');
const { StateUpdateEventSchema } = require('@sherlock/contracts');
const redisClient = getRedisClient();
const sessionEvents = {};
let sessionState = {};

console.log('🛡️ Starting Confidence Engine (TypeScript Shim for Go)');
console.log('Listening to evidence.events.*');

redisClient.psubscribe('evidence.events.*', (err, count) => {
  if (err) console.error(err);
});

redisClient.on('pmessage', (pattern, channel, message) => {
  const event = JSON.parse(message);
  console.log(`[Confidence Engine] Received Evidence from ${event.engineId} - Score: ${event.score}`);
  
  if (!sessionEvents[event.sessionId]) {
    sessionEvents[event.sessionId] = [];
    sessionState[event.sessionId] = 'PENDING';
  }
  
  sessionEvents[event.sessionId].push(event);
  
  let totalWeight = 0;
  let weightedScoreSum = 0;
  const DECAY_RATE = 0.05; // 5% decay per second
  const now = Date.now();
  
  for (const ev of sessionEvents[event.sessionId]) {
    const timeDiffSeconds = Math.max(0, (now - new Date(ev.timestamp).getTime()) / 1000);
    const decayFactor = Math.exp(-DECAY_RATE * timeDiffSeconds);
    const decayedWeight = ev.weight * decayFactor;
    
    totalWeight += decayedWeight;
    weightedScoreSum += (ev.score * decayedWeight);
  }
  
  const rawAggregateScore = totalWeight > 0 ? weightedScoreSum / totalWeight : 0;
  
  const currentState = sessionState[event.sessionId];
  let newState = currentState;
  let explanation = `Aggregate score is currently ${rawAggregateScore.toFixed(2)}.`;
  
  if (rawAggregateScore < -0.6) {
    newState = 'FAILED';
    explanation = `Candidate has failed multiple heuristics with a severe negative score (${rawAggregateScore.toFixed(2)}). Terminating session.`;
  } else if (rawAggregateScore < -0.2) {
    newState = 'SUSPICIOUS';
    explanation = `Candidate exhibits highly suspicious behavior (${rawAggregateScore.toFixed(2)}). Moderator review requested.`;
  } else if (rawAggregateScore > 0.5) {
    newState = 'VERIFIED';
    explanation = `Candidate verified successfully.`;
  }
  
  // Clamp score between 0 and 1 to satisfy strict Zod Schema for UI broadcasting
  const clampedScore = Math.max(0, Math.min(1, rawAggregateScore + 1));
  
  if (newState !== currentState || event.score < 0) {
    sessionState[event.sessionId] = newState;
    
    // Using the original architect's actual schema for StateUpdateEvent
    const stateEvent = {
      sessionId: event.sessionId,
      timestamp: Date.now(),
      participants: [
        {
          participantId: event.participantId,
          confidenceScore: clampedScore
        }
      ],
      identifiedCandidateId: newState === 'VERIFIED' ? event.participantId : null,
      explanation: explanation
    };
    
    console.log(`[Confidence Engine] Transitioning ${currentState} -> ${newState}`);
    
    const Redis = require('ioredis');
    const publishClient = new Redis('redis://localhost:6379');
    publishClient.publish(`state.events.${event.sessionId}`, JSON.stringify(stateEvent));
  }
});
