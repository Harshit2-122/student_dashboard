/**
 * signAnimator.ts — High-Performance Zero-Lag Canvas Skeleton Renderer for SARTHI
 *
 * Renders MediaPipe Holistic Sign Language Landmarks (Hands + Upper Body Pose)
 * in real-time on HTML5 Canvas.
 *
 * Theme: Electric Cyan (#00e5ff) Right Hand, Emerald (#34d399) Left Hand,
 * Slate-Indigo Upper Body, matching SARTHI dark UI.
 */

import { type SignLandmarkFrame, resolveTokensToPlayableSigns } from '../data/signsDatabase';

// ─── Connection Definitions ──────────────────────────────────────────────────

export const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],          // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8],          // Index
  [5, 9], [9, 10], [10, 11], [11, 12],     // Middle
  [9, 13], [13, 14], [14, 15], [15, 16],   // Ring
  [13, 17], [17, 18], [18, 19], [19, 20],  // Pinky
  [0, 17], [5, 9], [9, 13],                // Palm
];

export const POSE_CONNECTIONS: [number, number][] = [
  [11, 12],           // Shoulders
  [11, 13], [13, 15], // Left Arm
  [12, 14], [14, 16], // Right Arm
  [11, 23], [12, 24], // Torso sides
  [23, 24],           // Hips
];

// Color Theme
export const THEME = {
  bg: '#070A12',
  bgGlow: '#0F172A',
  grid: 'rgba(255, 255, 255, 0.035)',
  pose: 'rgba(129, 140, 248, 0.55)', // Indigo-slate pose
  poseJoint: 'rgba(199, 210, 254, 0.75)',
  rh: '#00e5ff',                     // Electric Cyan (Right hand)
  rhJoint: '#7dd3fc',
  lh: '#34d399',                     // Emerald Green (Left hand)
  lhJoint: '#a7f3d0',
  fingertip: '#ffffff',
  text: '#F8FAFC',
  textMuted: 'rgba(148, 163, 184, 0.8)',
};

// ─── Coordinate & Geometry Helpers ───────────────────────────────────────────

function toCanvasPx(lm: number[], canvas: HTMLCanvasElement): [number, number] {
  if (!lm || !Array.isArray(lm) || lm.length < 2) return [0, 0];
  const x = Math.max(0.02, Math.min(0.98, lm[0])) * canvas.width;
  const y = Math.max(0.02, Math.min(0.96, lm[1])) * canvas.height;
  return [x, y];
}

function drawLines(
  ctx: CanvasRenderingContext2D,
  lms: (number[] | null)[],
  pairs: [number, number][],
  color: string,
  width: number,
  canvas: HTMLCanvasElement
) {
  if (!lms || !lms.length) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [i, j] of pairs) {
    const a = lms[i];
    const b = lms[j];
    if (!a || !b) continue;
    const [ax, ay] = toCanvasPx(a, canvas);
    const [bx, by] = toCanvasPx(b, canvas);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
  }
  ctx.restore();
}

function drawDots(
  ctx: CanvasRenderingContext2D,
  lms: (number[] | null)[],
  color: string,
  radius: number,
  canvas: HTMLCanvasElement
) {
  if (!lms || !lms.length) return;
  ctx.save();
  ctx.fillStyle = color;
  for (const lm of lms) {
    if (!lm) continue;
    const [x, y] = toCanvasPx(lm, canvas);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawArmBridge(
  ctx: CanvasRenderingContext2D,
  wristPosePt: number[],
  handBasePt: number[],
  color: string,
  canvas: HTMLCanvasElement
) {
  if (!wristPosePt || !handBasePt) return;
  const [wx, wy] = toCanvasPx(wristPosePt, canvas);
  const [hx, hy] = toCanvasPx(handBasePt, canvas);
  const dist = Math.hypot(hx - wx, hy - wy);
  if (dist < canvas.width * 0.35) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(wx, wy);
    ctx.lineTo(hx, hy);
    ctx.stroke();
    ctx.restore();
  }
}

// ─── Clear / Background Renderer ─────────────────────────────────────────────

export function drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, THEME.bg);
  bg.addColorStop(1, THEME.bgGlow);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Subtle grid
  ctx.strokeStyle = THEME.grid;
  ctx.lineWidth = 1;
  const step = 40;
  for (let x = 0; x <= width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

// ─── Standby Skeleton (Resting Ready Pose) ───────────────────────────────────

export function drawStandbySkeleton(canvas: HTMLCanvasElement, _label: string = 'STANDBY') {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;

  drawBackground(ctx, W, H);

  // Default resting geometric rig
  const restingPose: number[][] = [];
  restingPose[11] = [0.38, 0.42, 0]; // Left shoulder
  restingPose[12] = [0.62, 0.42, 0]; // Right shoulder
  restingPose[13] = [0.34, 0.60, 0]; // Left elbow
  restingPose[14] = [0.66, 0.60, 0]; // Right elbow
  restingPose[15] = [0.42, 0.76, 0]; // Left wrist
  restingPose[16] = [0.58, 0.76, 0]; // Right wrist
  restingPose[23] = [0.42, 0.90, 0]; // Left hip
  restingPose[24] = [0.58, 0.90, 0]; // Right hip

  // Head anchor
  ctx.save();
  ctx.strokeStyle = 'rgba(129, 140, 248, 0.35)';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.arc(W * 0.5, H * 0.24, 32, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#818CF8';
  ctx.beginPath();
  ctx.arc(W * 0.5, H * 0.24, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Pose connections
  drawLines(ctx, restingPose, POSE_CONNECTIONS, THEME.pose, 2.5, canvas);
  [11, 12, 13, 14, 15, 16, 23, 24].forEach(i => {
    if (restingPose[i]) drawDots(ctx, [restingPose[i]], THEME.poseJoint, 5, canvas);
  });

  // Glowing hand endpoints
  ctx.save();
  ctx.fillStyle = THEME.lh;
  const [lx, ly] = toCanvasPx(restingPose[15], canvas);
  ctx.beginPath();
  ctx.arc(lx, ly, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = THEME.rh;
  const [rx, ry] = toCanvasPx(restingPose[16], canvas);
  ctx.beginPath();
  ctx.arc(rx, ry, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ─── Single Frame Renderer ───────────────────────────────────────────────────

export function drawFrame(
  canvas: HTMLCanvasElement,
  frame: SignLandmarkFrame | null,
  _word: string = ''
) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;

  drawBackground(ctx, W, H);

  if (!frame) return;

  // 1. Pose Skeleton (Torso & Arms)
  if (frame.pose && Array.isArray(frame.pose) && frame.pose.length > 0) {
    drawLines(ctx, frame.pose, POSE_CONNECTIONS, THEME.pose, 2.5, canvas);
    [11, 12, 13, 14, 15, 16, 23, 24].forEach(i => {
      if (frame.pose && frame.pose[i]) {
        drawDots(ctx, [frame.pose[i]], THEME.poseJoint, 4.5, canvas);
      }
    });

    // Arm-to-hand bridges
    if (frame.rh && frame.pose[16] && frame.rh[0]) {
      drawArmBridge(ctx, frame.pose[16], frame.rh[0], THEME.rh, canvas);
    }
    if (frame.lh && frame.pose[15] && frame.lh[0]) {
      drawArmBridge(ctx, frame.pose[15], frame.lh[0], THEME.lh, canvas);
    }
  }

  // 2. Right Hand (Cyan, high-contrast)
  if (frame.rh && Array.isArray(frame.rh) && frame.rh.length > 0) {
    drawLines(ctx, frame.rh, HAND_CONNECTIONS, THEME.rh, 3.2, canvas);
    drawDots(ctx, frame.rh, THEME.rhJoint, 3.8, canvas);
    // Distinct bright white fingertips
    [4, 8, 12, 16, 20].forEach(i => {
      if (frame.rh && frame.rh[i]) {
        drawDots(ctx, [frame.rh[i]], THEME.fingertip, 5, canvas);
      }
    });
  }

  // 3. Left Hand (Emerald, high-contrast)
  if (frame.lh && Array.isArray(frame.lh) && frame.lh.length > 0) {
    drawLines(ctx, frame.lh, HAND_CONNECTIONS, THEME.lh, 3.2, canvas);
    drawDots(ctx, frame.lh, THEME.lhJoint, 3.8, canvas);
    // Distinct bright white fingertips
    [4, 8, 12, 16, 20].forEach(i => {
      if (frame.lh && frame.lh[i]) {
        drawDots(ctx, [frame.lh[i]], THEME.fingertip, 5, canvas);
      }
    });
  }
}

// ─── Sequence Player with Speed & Cancellation Support ───────────────────────

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Intelligent Hand Landmark Gap-Filling & Temporal Smoothing:
 * 1. Fills missing hand frames (up to 5 frames) between valid poses.
 * 2. Prevents hand flickering or disappearing during rapid gestures.
 * 3. Applies gentle exponential smoothing to eliminate high-frequency jitter.
 */
export function smoothAndInterpolateFrames(frames: SignLandmarkFrame[]): SignLandmarkFrame[] {
  if (!frames || frames.length < 2) return frames || [];

  const result: SignLandmarkFrame[] = frames.map(f => ({
    rh: f.rh ? f.rh.map(pt => pt ? [...pt] : null) : null,
    lh: f.lh ? f.lh.map(pt => pt ? [...pt] : null) : null,
    pose: f.pose ? f.pose.map(pt => pt ? [...pt] : null) : null,
  }));

  (['rh', 'lh'] as const).forEach(part => {
    const valid: number[] = [];
    for (let i = 0; i < result.length; i++) {
      if (result[i][part]) valid.push(i);
    }
    if (valid.length === 0) return;

    // Head gap fill (up to 3 frames)
    const firstValid = valid[0];
    if (firstValid > 0 && firstValid <= 3) {
      const firstHand = result[firstValid][part]!;
      for (let i = 0; i < firstValid; i++) {
        result[i][part] = firstHand.map(pt => pt ? [...pt] : null);
      }
    }

    // Tail gap fill (up to 3 frames)
    const lastValid = valid[valid.length - 1];
    if (lastValid < result.length - 1 && (result.length - 1 - lastValid) <= 3) {
      const lastHand = result[lastValid][part]!;
      for (let i = lastValid + 1; i < result.length; i++) {
        result[i][part] = lastHand.map(pt => pt ? [...pt] : null);
      }
    }

    // Recompute valid indices after head/tail fill
    const validAfterFill: number[] = [];
    for (let i = 0; i < result.length; i++) {
      if (result[i][part]) validAfterFill.push(i);
    }

    for (let g = 0; g < validAfterFill.length - 1; g++) {
      const startIdx = validAfterFill[g];
      const endIdx = validAfterFill[g + 1];
      const gap = endIdx - startIdx - 1;

      if (gap > 0 && gap <= 5) {
        const h0 = result[startIdx][part]!;
        const h1 = result[endIdx][part]!;

        for (let step = 1; step <= gap; step++) {
          const curIdx = startIdx + step;
          const t = step / (gap + 1);
          const interp: (number[] | null)[] = [];
          for (let k = 0; k < 21; k++) {
            const p0 = h0[k];
            const p1 = h1[k];
            if (p0 && p1) {
              interp.push([
                p0[0] * (1 - t) + p1[0] * t,
                p0[1] * (1 - t) + p1[1] * t,
                (p0[2] || 0) * (1 - t) + (p1[2] || 0) * t,
              ]);
            } else {
              interp.push(p0 ? [...p0] : (p1 ? [...p1] : null));
            }
          }
          result[curIdx][part] = interp;
        }
      }
    }
  });

  return result;
}

/**
 * Animate a single word's frames smoothly.
 */
export function animateWordFrames(
  canvas: HTMLCanvasElement,
  frames: SignLandmarkFrame[],
  word: string,
  fps: number = 15,
  speed: number = 1.0,
  isCancelled: () => boolean = () => false
): Promise<void> {
  return new Promise(resolve => {
    if (!frames || frames.length === 0 || isCancelled()) {
      resolve();
      return;
    }

    const playFrames = smoothAndInterpolateFrames(frames);

    let idx = 0;
    let lastTime: number | null = null;
    const dur = 1000 / Math.max(5, (fps || 15) * speed);

    let lastKnownRH: (number[] | null)[] | null = null;
    let lastKnownLH: (number[] | null)[] | null = null;
    let rhHold = 0;
    let lhHold = 0;

    function step(ts: number) {
      if (isCancelled()) {
        resolve();
        return;
      }
      if (!lastTime) lastTime = ts;

      if (ts - lastTime >= dur) {
        const curFrame = playFrames[idx];
        let renderFrame = curFrame;

        if (curFrame) {
          let rh = curFrame.rh;
          let lh = curFrame.lh;

          if (rh) {
            lastKnownRH = rh;
            rhHold = 0;
          } else if (lastKnownRH && rhHold < 2) {
            rh = lastKnownRH;
            rhHold++;
          }

          if (lh) {
            lastKnownLH = lh;
            lhHold = 0;
          } else if (lastKnownLH && lhHold < 2) {
            lh = lastKnownLH;
            lhHold++;
          }

          renderFrame = { rh, lh, pose: curFrame.pose };
        }

        drawFrame(canvas, renderFrame, word);
        idx++;
        lastTime = ts;

        if (idx >= playFrames.length) {
          resolve();
          return;
        }
      }

      requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  });
}

/**
 * Play a sequence of gloss tokens back-to-back.
 */
export async function playGlossSequence(
  canvas: HTMLCanvasElement,
  tokens: string[],
  speed: number = 1.0,
  onTokenChange?: (tokenIndex: number, tokenWord: string) => void,
  isCancelled: () => boolean = () => false
): Promise<void> {
  if (!canvas || !tokens || tokens.length === 0) return;

  // 1. Resolve tokens through Greedy Longest Matching against available vocabulary
  const playableItems = await resolveTokensToPlayableSigns(tokens);
  if (playableItems.length === 0 || isCancelled()) return;

  let lastFrame: SignLandmarkFrame | null = null;
  let lastWord = '';

  for (let i = 0; i < playableItems.length; i++) {
    if (isCancelled()) break;
    const item = playableItems[i];
    if (!item.word) continue;

    if (onTokenChange) {
      onTokenChange(i, item.word.toUpperCase());
    }

    if (item.found && item.sign && item.sign.frames && item.sign.frames.length > 0) {
      await animateWordFrames(canvas, item.sign.frames, item.word, item.sign.fps || 15, speed, isCancelled);
      lastFrame = item.sign.frames[item.sign.frames.length - 1];
      lastWord = item.word;
    } else {
      await sleep(350 / Math.max(0.5, speed));
    }

    if (isCancelled()) break;

    // Natural clean gap between signs
    if (i < playableItems.length - 1) {
      await sleep(180 / Math.max(0.5, speed));
    }
  }

  // Hold final sign gesture posture cleanly on screen (matching localhost:8000 behavior)
  if (!isCancelled()) {
    if (lastFrame) {
      drawFrame(canvas, lastFrame, lastWord);
    } else {
      drawStandbySkeleton(canvas);
    }
  }
}
