import { MeetingEventSchema } from '@sherlock/contracts';
const GATEWAY_URL = 'http://localhost:3001/webhooks/meeting';
const SESSION_ID = 'session-123';
const PARTICIPANT_ID = 'user-007';
function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
async function sendEvent(event) {
    console.log(`\n--- Sending Event: ${event.type} ---`);
    // Validate against our strict Zod schema before sending
    const result = MeetingEventSchema.safeParse(event);
    if (!result.success) {
        console.error('Validation Error!', result.error);
        return;
    }
    try {
        const response = await fetch(GATEWAY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(result.data),
        });
        console.log(`Response: ${response.status} ${response.statusText}`);
    }
    catch (err) {
        console.error(`Failed to send event. Is the Gateway running on port 3000?`, err);
    }
}
async function runMockSimulation() {
    console.log('🚀 Starting Sherlock CIE End-to-End Mock Simulation');
    console.log('Assuming local services (Gateway, Redis, AI Engine, Confidence Engine) are running...');
    console.log('⏳ Waiting 15 seconds to allow browser subagent to connect...');
    await new Promise(resolve => setTimeout(resolve, 15000));
    // 1. Participant Joins
    await sendEvent({
        id: generateId(),
        type: 'JOIN',
        sessionId: SESSION_ID,
        participantId: PARTICIPANT_ID,
        timestamp: Date.now(),
        payload: {
            displayName: 'Candidate (Using VPN)',
            joinTime: Date.now()
        }
    });
    await new Promise(resolve => setTimeout(resolve, 2000));
    // 2. Video Feed turns off mysteriously
    await sendEvent({
        id: generateId(),
        type: 'VIDEO_STATE_CHANGE',
        sessionId: SESSION_ID,
        participantId: PARTICIPANT_ID,
        timestamp: Date.now(),
        payload: {
            isVideoOn: false,
            reason: 'bandwidth_issues'
        }
    });
    await new Promise(resolve => setTimeout(resolve, 2000));
    // 3. Transcript indicating proxy usage
    await sendEvent({
        id: generateId(),
        type: 'TRANSCRIPT',
        sessionId: SESSION_ID,
        participantId: PARTICIPANT_ID,
        timestamp: Date.now(),
        payload: {
            text: "Um, let me just check my notes. Actually, the other guy, I mean I, wrote this code differently.",
            isInterim: false
        }
    });
    console.log('\n✅ Mock Simulation Complete.');
    console.log('Check the React Dashboard to see the final Confidence State!');
}
runMockSimulation();
