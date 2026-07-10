'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { StateUpdateEvent } from '@sherlock/contracts';

export default function Dashboard() {
  const [sessionState, setSessionState] = useState<StateUpdateEvent | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const sessionId = 'session-123'; // Mock session ID for this prototype

  useEffect(() => {
    // Connect to the Notification Engine (NestJS Socket.io server)
    const socket: Socket = io('http://localhost:3002');

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Listen for state changes specific to this session
    socket.on(`state.events.${sessionId}`, (event: StateUpdateEvent) => {
      setSessionState(event);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const getStatusColor = (state: string) => {
    switch (state) {
      case 'VERIFIED': return 'bg-green-500';
      case 'SUSPICIOUS': return 'bg-yellow-500';
      case 'FAILED': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // The actual state from the Go struct is mapped into explanation for now,
  // but let's assume if it is FAILED or SUSPICIOUS it has an identified candidate.
  // We'll just display the raw explanation as the state transition.
  
  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 flex justify-between items-center border-b border-slate-700 pb-4">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
              Sherlock CIE Dashboard
            </h1>
            <p className="text-slate-400 mt-2">Real-time candidate identity monitoring</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-slate-400">
              {isConnected ? 'Connected to Engine' : 'Disconnected'}
            </span>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Main Status Card */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl">
            <h2 className="text-xl font-semibold mb-4 text-slate-200">Session Status</h2>
            <div className="flex items-center space-x-4 mb-6">
              <div className={`w-4 h-4 rounded-full animate-pulse ${sessionState ? getStatusColor(sessionState.explanation.includes('SUSPICIOUS') ? 'SUSPICIOUS' : sessionState.explanation.includes('VERIFIED') ? 'VERIFIED' : sessionState.explanation.includes('FAILED') ? 'FAILED' : 'PENDING') : 'bg-gray-500'}`} />
              <span className="text-2xl font-bold tracking-wider text-slate-100">
                {sessionState ? 'ACTIVE' : 'WAITING FOR DATA'}
              </span>
            </div>
            
            <div className="space-y-4">
              <div className="bg-slate-900 rounded p-4 border border-slate-700/50">
                <span className="text-sm text-slate-400 block mb-1">Session ID</span>
                <span className="font-mono text-blue-300">{sessionId}</span>
              </div>
              
              {sessionState && (
                <div className="bg-slate-900 rounded p-4 border border-slate-700/50">
                  <span className="text-sm text-slate-400 block mb-1">Latest Intelligence Reason</span>
                  <span className="text-slate-200">{sessionState.explanation}</span>
                </div>
              )}
            </div>
          </div>

          {/* Evidence Log Card */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl flex flex-col">
            <h2 className="text-xl font-semibold mb-4 text-slate-200">Confidence Scores</h2>
            <div className="flex-grow overflow-y-auto bg-slate-900 rounded p-4 border border-slate-700/50">
              {!sessionState || sessionState.participants.length === 0 ? (
                <p className="text-slate-500 text-sm text-center italic mt-10">No evidence received yet...</p>
              ) : (
                <div className="space-y-3">
                  {sessionState.participants.map((p, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 rounded bg-slate-800 border border-slate-700">
                      <span className="text-xs font-mono text-slate-400">Participant: {p.participantId.substring(0,8)}...</span>
                      <span className={`text-sm font-bold ${p.confidenceScore < 0 ? 'text-red-400' : 'text-green-400'}`}>
                        Score: {p.confidenceScore.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
