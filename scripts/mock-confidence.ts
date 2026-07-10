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
  
  for (const ev of sessionEvents[event.sessionId]) {
    totalWeight += ev.weight;
    weightedScoreSum += (ev.score * ev.weight);
  }
  
  let aggregateScore = totalWeight > 0 ? weightedScoreSum / totalWeight : 0;
  
  // Clamp aggregate score between 0 and 1 to satisfy strict Zod Schema
  aggregateScore = Math.max(0, Math.min(1, aggregateScore + 1)); 
  const currentState = sessionState[event.sessionId];
  let newState = currentState;
  let explanation = `Aggregate score is currently ${aggregateScore.toFixed(2)}.`;
  
  // Basic heuristic: 
  // If a negative event comes through (score < 0), let's flag suspicious or failed
  if (aggregateScore < -0.6) {
    newState = 'FAILED';
    explanation = `Candidate has failed multiple heuristics with a severe negative score (${aggregateScore.toFixed(2)}). Terminating session.`;
  } else if (aggregateScore < -0.2) {
    newState = 'SUSPICIOUS';
    explanation = `Candidate exhibits highly suspicious behavior (${aggregateScore.toFixed(2)}). Moderator review requested.`;
  } else if (aggregateScore > 0.5) {
    newState = 'VERIFIED';
    explanation = `Candidate verified successfully.`;
  }
  
  if (newState !== currentState || event.score < 0) {
    sessionState[event.sessionId] = newState;
    
    // Using the original architect's actual schema for StateUpdateEvent
    const stateEvent = {
      sessionId: event.sessionId,
      timestamp: Date.now(),
      participants: [
        {
          participantId: event.participantId,
          confidenceScore: aggregateScore
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
