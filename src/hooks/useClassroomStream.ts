/**
 * useClassroomStream.ts
 *
 * React hook that manages the WebSocket connection to the classroom backend,
 * accumulates transcript segments, tracks the current ISL segment, and
 * exposes session/connection state to the UI.
 *
 * The UI components consume this hook — they never touch the WebSocket directly.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { connectClassroomStream } from '../services/api';
import type {
  TranscriptSegment,
  ISLSegment,
  SessionInfo,
  ConnectionStatus,
} from '../types';

const SESSION_ID = import.meta.env.VITE_SESSION_ID ?? 'demo-session-1';

export interface ClassroomStreamState {
  connectionStatus: ConnectionStatus;
  session:          SessionInfo | null;
  segments:         TranscriptSegment[];
  currentISL:       ISLSegment | null;
  /** Pause/resume display updates without disconnecting */
  isPaused:         boolean;
  togglePause:      () => void;
  /** Clear accumulated transcript */
  clearTranscript:  () => void;
}

export function useClassroomStream(): ClassroomStreamState {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [session,   setSession]   = useState<SessionInfo | null>(null);
  const [segments,  setSegments]  = useState<TranscriptSegment[]>([]);
  const [currentISL, setCurrentISL] = useState<ISLSegment | null>(null);
  const [isPaused,  setIsPaused]  = useState(false);

  // Buffer incoming segments while paused so we don't lose them
  const pendingSegments = useRef<TranscriptSegment[]>([]);
  const pendingISL      = useRef<ISLSegment | null>(null);
  const pausedRef       = useRef(false);

  const flushPending = useCallback(() => {
    if (pendingSegments.current.length > 0) {
      setSegments(prev => [...prev, ...pendingSegments.current]);
      pendingSegments.current = [];
    }
    if (pendingISL.current) {
      setCurrentISL(pendingISL.current);
      pendingISL.current = null;
    }
  }, []);

  const togglePause = useCallback(() => {
    setIsPaused(prev => {
      const next = !prev;
      pausedRef.current = next;
      if (!next) flushPending();
      return next;
    });
  }, [flushPending]);

  const clearTranscript = useCallback(() => {
    setSegments([]);
    pendingSegments.current = [];
  }, []);

  useEffect(() => {
    const handle = connectClassroomStream(SESSION_ID, {
      onTranscript: (seg) => {
        if (pausedRef.current) {
          // Replace last pending interim or append
          pendingSegments.current = [
            ...pendingSegments.current.filter(s => s.segmentId !== seg.segmentId),
            seg,
          ];
        } else {
          setSegments(prev => {
            const without = prev.filter(s => s.segmentId !== seg.segmentId);
            return [...without, seg];
          });
        }
      },
      onISL: (seg) => {
        if (pausedRef.current) {
          pendingISL.current = seg;
        } else {
          setCurrentISL(seg);
        }
      },
      onStatus: setConnectionStatus,
      onSession: setSession,
      onError:  (err) => {
        console.error('[ClassroomStream]', err);
        setConnectionStatus('lost');
      },
    });

    return () => handle.disconnect();
  }, []);

  return {
    connectionStatus,
    session,
    segments,
    currentISL,
    isPaused,
    togglePause,
    clearTranscript,
  };
}
