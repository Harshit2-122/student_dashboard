import { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play, Minus, Plus, Trash2, ArrowDown, Mic, Volume2 } from 'lucide-react';
import type { TranscriptSegment, ConnectionStatus, SessionInfo } from '../types';

interface TranscriptPanelProps {
  segments:          TranscriptSegment[];
  connectionStatus:  ConnectionStatus;
  session:           SessionInfo | null;
  isPaused:          boolean;
  onTogglePause:     () => void;
  onClear:           () => void;
}

const FONT_SIZES = ['text-sm', 'text-base', 'text-lg', 'text-xl'] as const;
type FontSize = typeof FONT_SIZES[number];
const FONT_LABELS = ['S', 'M', 'L', 'XL'];

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch { return ''; }
}

export default function TranscriptPanel({
  segments, isPaused, onTogglePause, onClear,
}: TranscriptPanelProps) {
  const [fontIdx, setFontIdx] = useState<number>(1);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const scrollRef  = useRef<HTMLDivElement>(null);
  const [userScrolled, setUserScrolled] = useState(false);

  const fontSize = FONT_SIZES[fontIdx] as FontSize;

  // Auto-scroll to bottom unless the user has manually scrolled up
  useEffect(() => {
    if (!isPaused && !userScrolled && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [segments, isPaused, userScrolled]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    setUserScrolled(!atBottom);
  }, []);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    setUserScrolled(false);
  }, []);

  const hasSegments = segments.length > 0;
  const finalSegments = segments.filter(s => s.isFinal);
  const interimSeg    = segments.find(s => !s.isFinal);

  return (
    <section
      aria-labelledby="transcript-heading"
      className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-[var(--card-glow)] flex flex-col h-full min-h-[500px] transition-colors overflow-hidden"
    >
      {/* Panel header */}
      <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between gap-3 bg-[var(--surface-2)]/40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
            <Mic className="w-4 h-4" />
          </div>
          <div>
            <h2 id="transcript-heading" className="text-[var(--text)] font-bold text-sm sm:text-base">
              Live Classroom Transcript
            </h2>
            <p className="text-[var(--text-muted)] text-[11px]">
              Audio transcribed from teacher's speech in real-time
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasSegments && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
              {segments.length} segment{segments.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Controls bar */}
      <div className="px-5 py-3 border-b border-[var(--border)] flex items-center justify-between gap-3 flex-wrap bg-[var(--surface)]">
        <div className="flex items-center gap-2">
          {/* Pause / Resume */}
          <button
            onClick={onTogglePause}
            aria-label={isPaused ? 'Resume transcript display' : 'Pause transcript display'}
            title={isPaused ? 'Resume display' : 'Pause view (updates buffer silently)'}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
              ${isPaused
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
                : 'bg-[var(--surface-2)] border-[var(--border)] text-[var(--text)] hover:border-indigo-500/40'
              }`}
          >
            {isPaused ? (
              <>
                <Play className="w-3.5 h-3.5 text-amber-500 fill-amber-500" aria-hidden />
                <span>Resume Stream</span>
              </>
            ) : (
              <>
                <Pause className="w-3.5 h-3.5 text-[var(--text-muted)]" aria-hidden />
                <span>Pause View</span>
              </>
            )}
          </button>

          {/* Font size stepper */}
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]" role="group" aria-label="Adjust text size">
            <button
              onClick={() => setFontIdx(i => Math.max(0, i - 1))}
              disabled={fontIdx === 0}
              aria-label="Decrease text size"
              className="w-6 h-6 rounded-md flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="text-[11px] font-bold text-[var(--text)] w-5 text-center">
              {FONT_LABELS[fontIdx]}
            </span>
            <button
              onClick={() => setFontIdx(i => Math.min(FONT_SIZES.length - 1, i + 1))}
              disabled={fontIdx === FONT_SIZES.length - 1}
              aria-label="Increase text size"
              className="w-6 h-6 rounded-md flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Scroll to bottom pill */}
          {userScrolled && hasSegments && (
            <button
              onClick={scrollToBottom}
              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 transition-colors animate-bounce"
            >
              <ArrowDown className="w-3 h-3" />
              <span>Latest</span>
            </button>
          )}

          {/* Clear button */}
          <button
            onClick={onClear}
            disabled={!hasSegments}
            aria-label="Clear transcript"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Paused banner notice */}
      {isPaused && (
        <div role="status" className="mx-5 mt-3 px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-300 text-xs font-medium flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span>Display paused — incoming teacher speech is safely buffered and will display when you resume.</span>
        </div>
      )}

      {/* Transcript body */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-5 space-y-4"
        aria-live="polite"
        aria-atomic="false"
        aria-label="Classroom transcript"
      >
        {!hasSegments ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="w-14 h-14 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center mb-3 text-[var(--text-faint)]">
              <Volume2 className="w-6 h-6 animate-pulse text-indigo-400" />
            </div>
            <h3 className="text-[var(--text)] font-semibold text-sm">
              Waiting for teacher to speak...
            </h3>
            <p className="text-[var(--text-muted)] text-xs max-w-xs mt-1 leading-relaxed">
              Real-time transcript segments will stream in automatically as the lecture progresses.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {finalSegments.map((seg, idx) => (
              <div
                key={seg.segmentId}
                className="group p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/30 hover:border-indigo-500/30 transition-all duration-150"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-indigo-500 dark:text-indigo-400">
                    Segment #{idx + 1}
                  </span>
                  <time dateTime={seg.timestamp} className="text-[10px] text-[var(--text-faint)] font-mono">
                    {formatTime(seg.timestamp)}
                  </time>
                </div>
                <p className={`${fontSize} text-[var(--text)] leading-relaxed font-normal`}>
                  {seg.text}
                </p>
              </div>
            ))}

            {/* Interim (in-progress) segment */}
            {interimSeg && (
              <div className="p-3.5 rounded-xl border border-dashed border-indigo-400/40 bg-indigo-500/5">
                <div className="flex items-center gap-1.5 mb-1 text-[10px] font-semibold text-indigo-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
                  <span>Transcribing speech…</span>
                </div>
                <p className={`${fontSize} text-[var(--text-muted)] italic leading-relaxed`}>
                  {interimSeg.text}
                </p>
              </div>
            )}
          </div>
        )}
        <div ref={bottomRef} aria-hidden />
      </div>
    </section>
  );
}
