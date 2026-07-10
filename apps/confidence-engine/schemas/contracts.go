package schemas

type AuthenticationState string

const (
	PENDING    AuthenticationState = "PENDING"
	VERIFIED   AuthenticationState = "VERIFIED"
	SUSPICIOUS AuthenticationState = "SUSPICIOUS"
	FAILED     AuthenticationState = "FAILED"
)

type EngineSource string

const (
	METADATA     EngineSource = "METADATA"
	CONVERSATION EngineSource = "CONVERSATION"
	AUDIO        EngineSource = "AUDIO"
	VIDEO        EngineSource = "VIDEO"
	BEHAVIORAL   EngineSource = "BEHAVIORAL"
)

type EvidenceEvent struct {
	ID            string       `json:"id"`
	SessionID     string       `json:"sessionId"`
	ParticipantID string       `json:"participantId"`
	EngineID      EngineSource `json:"engineId"`
	Timestamp     int64        `json:"timestamp"`
	Score         float64      `json:"score"`
	Weight        float64      `json:"weight"`
	Reason        string       `json:"reason"`
}

type StateChangeEvent struct {
	ID            string              `json:"id"`
	SessionID     string              `json:"sessionId"`
	ParticipantID string              `json:"participantId"`
	PreviousState AuthenticationState `json:"previousState"`
	NewState      AuthenticationState `json:"newState"`
	Timestamp     int64               `json:"timestamp"`
	Reason        string              `json:"reason"`
}
