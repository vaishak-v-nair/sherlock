package state

import (
	"fmt"
	"sherlock/confidence-engine/schemas"
	"sync"
	"time"
)

type Aggregator struct {
	mu            sync.RWMutex
	sessionEvents map[string][]schemas.EvidenceEvent
	sessionStates map[string]schemas.AuthenticationState
}

func NewAggregator() *Aggregator {
	return &Aggregator{
		sessionEvents: make(map[string][]schemas.EvidenceEvent),
		sessionStates: make(map[string]schemas.AuthenticationState),
	}
}

func (a *Aggregator) ProcessEvidence(event schemas.EvidenceEvent) *schemas.StateChangeEvent {
	a.mu.Lock()
	defer a.mu.Unlock()

	// 1. Append evidence
	a.sessionEvents[event.SessionID] = append(a.sessionEvents[event.SessionID], event)
	
	// 2. Compute aggregate score
	totalWeight := 0.0
	weightedScoreSum := 0.0
	
	for _, ev := range a.sessionEvents[event.SessionID] {
		totalWeight += ev.Weight
		weightedScoreSum += (ev.Score * ev.Weight)
	}
	
	aggregateScore := 0.0
	if totalWeight > 0 {
		aggregateScore = weightedScoreSum / totalWeight
	}

	// 3. Determine current state and check for transitions
	currentState, exists := a.sessionStates[event.SessionID]
	if !exists {
		currentState = schemas.PENDING
		a.sessionStates[event.SessionID] = currentState
	}
	
	newState := currentState
	reason := ""
	
	// Example state transition logic based on total evidence accumulated and aggregate score
	if totalWeight > 2.0 {
		if aggregateScore > 0.5 && currentState != schemas.VERIFIED {
			newState = schemas.VERIFIED
			reason = fmt.Sprintf("Aggregate score reached %.2f", aggregateScore)
		} else if aggregateScore < -0.3 && currentState != schemas.SUSPICIOUS {
			newState = schemas.SUSPICIOUS
			reason = fmt.Sprintf("Aggregate score dropped to %.2f", aggregateScore)
		} else if aggregateScore < -0.7 && currentState != schemas.FAILED {
			newState = schemas.FAILED
			reason = fmt.Sprintf("Aggregate score critically low at %.2f", aggregateScore)
		}
	}
	
	// 4. Return event if transition occurred
	if newState != currentState {
		a.sessionStates[event.SessionID] = newState
		return &schemas.StateChangeEvent{
			ID:            fmt.Sprintf("st-%d", time.Now().UnixNano()),
			SessionID:     event.SessionID,
			ParticipantID: event.ParticipantID,
			PreviousState: currentState,
			NewState:      newState,
			Timestamp:     time.Now().UnixMilli(),
			Reason:        reason,
		}
	}

	return nil
}
