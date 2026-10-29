/**
 * api.ts — Backend API & WebSocket service layer for SARTHI Student Dashboard.
 * Receives real-time broadcast from teacher speech recognition / Whisper backend.
 * Synchronizes natural English/Hindi text and ISL skeleton animations.
 */

import type {
  TranscriptSegment,
  ISLSegment,
  SessionInfo,
  ClassSummary,
  ConnectionStatus,
} from '../types';

const STORAGE_API_KEY = 'sarthi_student_api_base';
const STORAGE_WS_KEY = 'sarthi_student_ws_url';

const LIVE_FALLBACK_API = 'https://ksode-2401-4900-c4ed-9ffa-4d28-92d2-a7c3-4bd3.free.pinggy.net';
const LIVE_FALLBACK_WS = 'wss://ksode-2401-4900-c4ed-9ffa-4d28-92d2-a7c3-4bd3.free.pinggy.net/ws/viewer';

export function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_API_KEY);
    if (saved && saved.trim()) {
      if (saved.includes('localhost') || saved.includes('ngrok')) {
        localStorage.removeItem(STORAGE_API_KEY);
      } else {
        return saved.trim().replace(/\/+$/, '');
      }
    }
  }
  if (envUrl && envUrl.trim() && !envUrl.includes('ngrok') && !envUrl.includes('localhost')) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  return LIVE_FALLBACK_API;
}

export function getWsViewerUrl(): string {
  const envWs = import.meta.env.VITE_WS_VIEWER_URL;
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_WS_KEY);
    if (saved && saved.trim()) {
      if (saved.includes('localhost') || saved.includes('ngrok') || saved.includes('8765')) {
        localStorage.removeItem(STORAGE_WS_KEY);
      } else {
        return saved.trim();
      }
    }
  }
  if (envWs && envWs.trim() && !envWs.includes('ngrok') && !envWs.includes('localhost')) {
    return envWs.trim();
  }
  return LIVE_FALLBACK_WS;
}

export function setStudentConnectionUrls(apiUrl?: string, wsUrl?: string): void {
  if (typeof window !== 'undefined') {
    if (apiUrl && apiUrl.trim()) {
      localStorage.setItem(STORAGE_API_KEY, apiUrl.trim().replace(/\/+$/, ''));
    }
    if (wsUrl && wsUrl.trim()) {
      localStorage.setItem(STORAGE_WS_KEY, wsUrl.trim());
    }
  }
}

export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

// ── WebSocket event callbacks ─────────────────────────────────────────────

export interface StreamCallbacks {
  onTranscript:  (seg: TranscriptSegment) => void;
  onISL:         (seg: ISLSegment)        => void;
  onStatus:      (s: ConnectionStatus)    => void;
  onSession:     (s: SessionInfo)         => void;
  onError:       (err: Error)             => void;
}

export interface StreamHandle {
  disconnect: () => void;
}

/**
 * Open a WebSocket connection to the classroom stream (viewer mode).
 * Receives broadcast from teacher speech recognition in real-time.
 */
export function connectClassroomStream(
  sessionId: string,
  callbacks: StreamCallbacks,
): StreamHandle {
  if (DEMO_MODE) {
    callbacks.onStatus('demo');
    return { disconnect: () => {} };
  }

  const primaryWs = getWsViewerUrl();
  const apiBase = getApiBaseUrl();
  const wsBase = apiBase.replace(/^http/, 'ws');

  const candidateUrls = [
    primaryWs,
    `${wsBase}/ws/viewer`,
    LIVE_FALLBACK_WS,
  ].filter((u, i, arr) => Boolean(u) && arr.indexOf(u) === i);

  let candidateIdx = 0;
  let ws: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let closed = false;
  let segmentCounter = 1;

  function connect() {
    callbacks.onStatus('connecting');
    const targetUrl = candidateUrls[candidateIdx % candidateUrls.length];
    console.log('[StudentStream] Connecting to live broadcast at:', targetUrl);

    try {
      ws = new WebSocket(targetUrl);

      ws.onopen = () => {
        console.log('[StudentStream] Connected successfully to:', targetUrl);
        callbacks.onStatus('connected');
        callbacks.onSession({
          sessionId: sessionId || 'sarthi-classroom',
          subject: 'Live Classroom Broadcast',
          teacherName: 'Teacher (Live)',
          startedAt: new Date().toISOString(),
        });
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string);

          const text = (
            data.original_text ||
            data.text ||
            (typeof data.payload?.text === 'string' ? data.payload.text : '') ||
            ''
          ).trim();

          const currentSegId = data.segmentId || segmentCounter++;

          if (text) {
            callbacks.onTranscript({
              segmentId: currentSegId,
              text: text,
              timestamp: new Date().toISOString(),
              isFinal: true,
            });
          }

          const rawTokens =
            data.gloss_tokens ||
            data.tokens ||
            data.gloss ||
            data.isl_tokens ||
            data.payload?.gloss ||
            (data.type === 'isl' ? data.payload?.gloss : null);

          let glossArray: string[] = [];
          if (Array.isArray(rawTokens)) {
            glossArray = rawTokens.map((t: unknown) => String(t).toUpperCase().trim()).filter(Boolean);
          } else if (typeof rawTokens === 'string' && rawTokens.trim()) {
            glossArray = rawTokens.trim().split(/\s+/).map((t: string) => t.toUpperCase().trim()).filter(Boolean);
          }

          if (glossArray.length > 0) {
            callbacks.onISL({
              segmentId: currentSegId,
              gloss: glossArray,
              status: 'available',
            });
          } else if (data.type === 'isl' && data.payload) {
            callbacks.onISL(data.payload as ISLSegment);
          }

          if (data.type === 'status' && data.payload?.status) {
            callbacks.onStatus((data.payload as { status: ConnectionStatus }).status);
          } else if (data.type === 'session' && data.payload) {
            callbacks.onSession(data.payload as SessionInfo);
          }
        } catch {
          if (typeof event.data === 'string' && event.data.trim()) {
            callbacks.onTranscript({
              segmentId: segmentCounter++,
              text: event.data.trim(),
              timestamp: new Date().toISOString(),
              isFinal: true,
            });
          }
        }
      };

      ws.onerror = (e) => {
        console.warn('[StudentStream] Connection notice/error:', e);
        callbacks.onStatus('lost');
      };

      ws.onclose = (event) => {
        if (closed) return;
        console.log('[StudentStream] Socket closed (code:', event.code, '), rotating candidate...');
        callbacks.onStatus('reconnecting');
        candidateIdx++;
        const delay = candidateIdx <= candidateUrls.length ? 1500 : 3000;
        reconnectTimer = setTimeout(connect, delay);
      };
    } catch (err) {
      console.error('[StudentStream] Launch error:', err);
      callbacks.onStatus('reconnecting');
      if (!closed) {
        candidateIdx++;
        reconnectTimer = setTimeout(connect, 2000);
      }
    }
  }

  connect();

  return {
    disconnect: () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) {
        try {
          ws.close();
        } catch {}
      }
    },
  };
}

export async function fetchClassSummary(sessionId: string): Promise<ClassSummary> {
  if (DEMO_MODE) {
    return { status: 'waiting' };
  }

  const base = getApiBaseUrl();
  try {
    const res = await fetch(`${base}/api/sessions/${sessionId}/summary`, { headers: { 'X-Pinggy-No-Screen': 'true' } });
    if (res.ok) {
      return (await res.json()) as ClassSummary;
    }
  } catch {}

  return { status: 'waiting' };
}

export async function fetchClassroomStatus(
  _sessionId?: string,
): Promise<{ status: string; connectedStudentsCount?: number; isBackendConnected: boolean }> {
  const base = getApiBaseUrl();
  try {
    const res = await fetch(`${base}/health`, { headers: { 'X-Pinggy-No-Screen': 'true' } });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        status: 'active',
        connectedStudentsCount: data.connected_students ?? 0,
        isBackendConnected: true,
      };
    }
  } catch {}

  return {
    status: 'active',
    connectedStudentsCount: undefined,
    isBackendConnected: false,
  };
}

export const API_BASE = getApiBaseUrl();
