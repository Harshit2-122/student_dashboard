import { useRef, useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Activity } from 'lucide-react';
import type { ISLSegment } from '../types';
import { drawStandbySkeleton, playGlossSequence } from '../utils/signAnimator';
import { resolveTokensToPlayableSigns } from '../data/signsDatabase';

interface ISLPanelProps {
  currentISL: ISLSegment | null;
}

export default function ISLPanel({ currentISL }: ISLPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cancelPlaybackRef = useRef<(() => void) | null>(null);

  const [playing, setPlaying] = useState<boolean>(true);
  const [speed, setSpeed] = useState<number>(1);
  const [activeWordIndex, setActiveWordIndex] = useState<number>(0);
  const [displayTokens, setDisplayTokens] = useState<string[]>([]);

  // Resolve raw gloss tokens into multi-word phrase tokens matching recorded signs
  useEffect(() => {
    let active = true;
    const raw = currentISL?.gloss || [];
    if (raw.length === 0) {
      setDisplayTokens([]);
      setActiveWordIndex(0);
      return;
    }

    resolveTokensToPlayableSigns(raw).then(items => {
      if (active) {
        const resolved = items.map(it => it.word.toUpperCase());
        setDisplayTokens(resolved.length > 0 ? resolved : raw);
        setActiveWordIndex(0);
      }
    });

    return () => {
      active = false;
    };
  }, [currentISL?.segmentId, currentISL?.gloss?.join(',')]);

  const activeWord =
    displayTokens.length > 0
      ? displayTokens[activeWordIndex % displayTokens.length]
      : currentISL?.gloss?.length
        ? currentISL.gloss[0]
        : 'READY';

  const handlePlayPause = () => {
    const v = videoRef.current;
    if (v) {
      if (v.paused) {
        v.play();
        setPlaying(true);
      } else {
        v.pause();
        setPlaying(false);
      }
    } else {
      setPlaying(p => !p);
    }
  };

  const handleReplay = () => {
    const v = videoRef.current;
    if (v) {
      v.currentTime = 0;
      v.play();
      setPlaying(true);
    } else {
      setActiveWordIndex(0);
      setPlaying(true);
    }
  };

  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setSpeed(val);
    if (videoRef.current) {
      videoRef.current.playbackRate = val;
    }
  };

  const hasVideo = currentISL?.status === 'available' && !!currentISL.videoUrl;
  const isProcessing = currentISL?.status === 'processing';
  const isUnavailable = currentISL?.status === 'unavailable' || currentISL?.status === 'error';

  // Auto-enable playback whenever a new speech segment arrives from the teacher
  useEffect(() => {
    if (currentISL?.segmentId && currentISL?.gloss && currentISL.gloss.length > 0) {
      setPlaying(true);
      setActiveWordIndex(0);
    }
  }, [currentISL?.segmentId]);

  // Run sign skeleton animation when tokens or playback states change
  useEffect(() => {
    if (hasVideo || isProcessing || isUnavailable) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Cancel any currently running sequence
    if (cancelPlaybackRef.current) {
      cancelPlaybackRef.current();
      cancelPlaybackRef.current = null;
    }

    const tokensToPlay = currentISL?.gloss || [];
    if (tokensToPlay.length === 0) {
      drawStandbySkeleton(canvas);
      return;
    }

    if (!playing) {
      return;
    }

    let isCancelled = false;
    cancelPlaybackRef.current = () => {
      isCancelled = true;
    };

    playGlossSequence(
      canvas,
      tokensToPlay,
      speed,
      (idx) => {
        if (!isCancelled) setActiveWordIndex(idx);
      },
      () => isCancelled
    ).catch(err => {
      console.warn('[ISLPanel] Playback notice:', err);
    });

    return () => {
      if (cancelPlaybackRef.current) {
        cancelPlaybackRef.current();
        cancelPlaybackRef.current = null;
      }
    };
  }, [
    currentISL?.segmentId,
    currentISL?.gloss?.join(','),
    playing,
    speed,
    hasVideo,
    isProcessing,
    isUnavailable
  ]);

  // Initial standby render on mount
  useEffect(() => {
    if (canvasRef.current && (!currentISL?.gloss || currentISL.gloss.length === 0)) {
      drawStandbySkeleton(canvasRef.current);
    }
  }, []);

  return (
    <section
      aria-labelledby="isl-heading"
      className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-[var(--card-glow)] flex flex-col h-full min-h-[500px] transition-colors overflow-hidden"
    >
      {/* Panel header */}
      <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between gap-3 bg-[var(--surface-2)]/40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h2 id="isl-heading" className="text-[var(--text)] font-bold text-sm sm:text-base">
              Indian Sign Language Display
            </h2>
            <p className="text-[var(--text-muted)] text-[11px]">
              Synchronized visual signs & gesture skeleton representation
            </p>
          </div>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/25">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {isProcessing
              ? 'Translating…'
              : hasVideo
                ? 'Streaming Video'
                : playing && (currentISL?.gloss?.length || 0) > 0
                  ? 'Active Sign Skeleton'
                  : 'Standby'}
          </span>
        </div>
      </div>

      {/* Main visual display area */}
      <div className="flex-1 flex flex-col p-5 gap-4">
        
        {/* Skeleton / Video Display Window (Sixth-Sense style dark stage) */}
        <div className="relative w-full aspect-video min-h-[260px] max-h-[360px] rounded-2xl overflow-hidden border border-[var(--border)] bg-[#070A12] grid-bg flex flex-col items-center justify-center shadow-inner group">
          
          {/* Top Stage Indicators */}
          <div className="absolute top-3 left-4 flex items-center gap-2 z-10 pointer-events-none">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-black/60 text-emerald-400 border border-emerald-500/30 backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {hasVideo ? 'Live Video' : 'ISL Skeleton Rig'}
            </span>
          </div>

          {/* Single Clean Active Word Display in Center-Top */}
          <div className="absolute top-3 inset-x-0 flex justify-center pointer-events-none z-10">
            <span className="px-3 py-1 rounded-xl bg-black/50 border border-indigo-500/30 backdrop-blur-md text-base sm:text-lg font-black tracking-widest text-white/95 drop-shadow-[0_2px_10px_rgba(255,255,255,0.3)] uppercase">
              {displayTokens.length > 0 ? activeWord : (currentISL ? 'TRANSLATING' : 'READY')}
            </span>
          </div>

          {/* Video or Skeleton Canvas */}
          {hasVideo ? (
            <video
              ref={videoRef}
              src={currentISL!.videoUrl}
              className="w-full h-full object-contain"
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => setPlaying(false)}
              aria-label="Indian Sign Language video"
              playsInline
            />
          ) : isProcessing ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-medium text-indigo-300">Generating sign gestures…</p>
            </div>
          ) : isUnavailable ? (
            <div className="px-6 py-4 text-center">
              <p className="text-rose-400 text-xs font-medium">
                {currentISL?.errorMessage ?? 'ISL translation is not available for this segment yet.'}
              </p>
            </div>
          ) : (
            /* Live High-Contrast Canvas Skeleton Display */
            <div className="w-full h-full flex flex-col items-center justify-center relative select-none">
              <canvas
                ref={canvasRef}
                width={640}
                height={400}
                className="w-full h-full object-contain"
              />
              {/* Clean bottom stage footer without text collision */}
              <div className="absolute bottom-2 text-center pointer-events-none">
                <span className="text-[11px] text-slate-400/80 font-mono px-2 py-0.5 rounded bg-black/40 backdrop-blur-sm border border-slate-700/40">
                  {currentISL?.segmentId ? `Segment #${currentISL.segmentId}` : 'Awaiting Teacher Speech Stream'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Detected Sign Tokens */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[var(--text)] flex items-center gap-1.5">
              <span>Detected Sign Tokens:</span>
              <span className="text-[11px] font-normal text-[var(--text-muted)]">ISL Grammar Sequence</span>
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--surface-2)] text-[var(--text-muted)] border border-[var(--border)]">
              Smart ISL Match
            </span>
          </div>

          <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-[var(--surface-2)]/60 border border-[var(--border)] min-h-[52px] items-center">
            {displayTokens.length > 0 ? (
              displayTokens.map((token, i) => {
                const isCurrent = i === activeWordIndex % displayTokens.length;
                return (
                  <span
                    key={i}
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold font-mono tracking-wide transition-all duration-200
                      ${isCurrent
                        ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/30 scale-105 ring-2 ring-indigo-400/50'
                        : 'bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] hover:border-indigo-400/50'
                      }`}
                  >
                    <span>✓ {token}</span>
                  </span>
                );
              })
            ) : (
              <span className="text-xs text-[var(--text-faint)] italic">
                No active sign tokens in this segment.
              </span>
            )}
          </div>
        </div>

        {/* Controls Section: Playback and Speed Slider */}
        <div className="mt-auto pt-3 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePlayPause}
              aria-label={playing ? 'Pause' : 'Play'}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-bold shadow-md shadow-indigo-600/25 hover:from-indigo-500 hover:to-violet-500 transition-all duration-150 active:scale-95"
            >
              {playing ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
              <span>{playing ? 'Pause' : 'Play Animation'}</span>
            </button>

            <button
              onClick={handleReplay}
              aria-label="Replay from start"
              className="p-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
              title="Replay sequence"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Speed slider */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-xs font-semibold text-[var(--text-muted)] whitespace-nowrap">
              Animation Speed:
            </span>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.25"
              value={speed}
              onChange={handleSpeedChange}
              className="w-28 sm:w-32 h-1.5 bg-[var(--surface-3)] rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <span className="text-xs font-mono font-bold text-[var(--text)] w-10 text-right">
              {speed.toFixed(2)}x
            </span>
          </div>
        </div>

      </div>
    </section>
  );
}
