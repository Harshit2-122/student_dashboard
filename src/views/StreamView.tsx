import { useClassroomStream } from '../hooks/useClassroomStream';
import TranscriptPanel from '../components/TranscriptPanel';
import ISLPanel from '../components/ISLPanel';
import ConnectionBadge from '../components/ConnectionBadge';
import { Calendar, User, AlertCircle, ExternalLink } from 'lucide-react';
import { getApiBaseUrl, getWsViewerUrl } from '../services/api';

export default function StreamView() {
  const {
    connectionStatus, session, segments, currentISL,
    isPaused, togglePause, clearTranscript,
  } = useClassroomStream();

  const isConnectingOrLost = connectionStatus === 'reconnecting' || connectionStatus === 'lost' || connectionStatus === 'connecting';

  return (
    <div className="flex-1 flex flex-col">
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5 flex-1">
        {/* Session header bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--card-glow)] transition-colors">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-[var(--text)] font-bold text-base sm:text-lg">
                  {session?.subject || 'Classroom Live Stream'}
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                  Real-time
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] mt-1">
                {session?.teacherName && (
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-indigo-400" />
                    {session.teacherName}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  {session?.startedAt
                    ? `Started ${new Date(session.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : 'Active Session'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <ConnectionBadge status={connectionStatus} />
          </div>
        </div>

        {/* Pinggy Free Tunnel Notice if reconnecting or lost */}
        {isConnectingOrLost && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
              <div>
                <p className="font-semibold text-amber-800 dark:text-amber-200">
                  Connecting to Live Broadcast: <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-amber-500/15">{getWsViewerUrl()}</span>
                </p>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  If using a free Pinggy tunnel, your browser requires a one-time click on <strong>&quot;Enter site&quot;</strong> to authorize WebSockets.
                </p>
              </div>
            </div>
            <a
              href={getApiBaseUrl()}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 text-white font-medium hover:bg-amber-500 transition-colors shadow-sm text-xs"
            >
              <span>Authorize Pinggy Tunnel</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* Two-column layout matching Sixth-Sense Studio reference */}
        <div className="grid lg:grid-cols-2 gap-6 flex-1 min-h-[580px]">
          <TranscriptPanel
            segments={segments}
            connectionStatus={connectionStatus}
            session={session}
            isPaused={isPaused}
            onTogglePause={togglePause}
            onClear={clearTranscript}
          />
          <ISLPanel currentISL={currentISL} />
        </div>
      </div>
    </div>
  );
}
