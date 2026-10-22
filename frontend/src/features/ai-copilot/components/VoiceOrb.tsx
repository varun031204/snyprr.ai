import React, { useRef, useEffect, useCallback } from 'react';
import type { VoiceState } from '../hooks/useVoiceConversation';

interface VoiceOrbProps {
  state: VoiceState;
  amplitude: number; // 0–1
  size?: number;
  onClick?: () => void;
}

// ─── Draw the 3-D moon onto ctx ───────────────────────────────────────────────
function renderMoon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,          // sphere radius in CSS px
  state: VoiceState,
  amplitude: number,
  tick: number,
) {
  const t = tick / 60; // seconds

  // ── glow intensity  ──────────────────────────────────────────────────────
  let glow: number;
  if (state === 'listening') {
    glow = 0.6 + amplitude * 0.4;
  } else if (state === 'speaking') {
    glow = 0.55 + Math.abs(Math.sin(t * 5)) * 0.35;
  } else if (state === 'thinking') {
    glow = 0.35 + Math.abs(Math.sin(t * 2)) * 0.2;
  } else {
    // idle — gentle breathe
    glow = 0.28 + Math.abs(Math.sin(t * 0.8)) * 0.14;
  }

  // 1. FAR OUTER DIFFUSE HALO
  const hR = r * 2.8;
  const h1 = ctx.createRadialGradient(cx, cy, r * 0.9, cx, cy, hR);
  h1.addColorStop(0,   `rgba(155,70,255,${glow * 0.28})`);
  h1.addColorStop(0.4, `rgba(130,50,230,${glow * 0.13})`);
  h1.addColorStop(1,   'rgba(80,20,180,0)');
  ctx.beginPath(); ctx.arc(cx, cy, hR, 0, Math.PI * 2);
  ctx.fillStyle = h1; ctx.fill();

  // 2. MID PURPLE RING
  const mR = r * 1.65;
  const h2 = ctx.createRadialGradient(cx, cy, r * 0.88, cx, cy, mR);
  h2.addColorStop(0,   `rgba(180,100,255,${glow * 0.60})`);
  h2.addColorStop(0.4, `rgba(160,80,245,${glow * 0.32})`);
  h2.addColorStop(1,   'rgba(110,40,210,0)');
  ctx.beginPath(); ctx.arc(cx, cy, mR, 0, Math.PI * 2);
  ctx.fillStyle = h2; ctx.fill();

  // 3. TIGHT INNER LIMB BLOOM
  const iR = r * 1.18;
  const h3 = ctx.createRadialGradient(cx, cy, r * 0.93, cx, cy, iR);
  h3.addColorStop(0,   `rgba(210,150,255,${glow * 0.85})`);
  h3.addColorStop(0.6, `rgba(180,100,255,${glow * 0.40})`);
  h3.addColorStop(1,   'rgba(140,60,230,0)');
  ctx.beginPath(); ctx.arc(cx, cy, iR, 0, Math.PI * 2);
  ctx.fillStyle = h3; ctx.fill();

  // 4. SPHERE BODY — deep violet, NOT pure black
  //    Light from upper-left for 3-D depth
  const lx = cx - r * 0.30;
  const ly = cy - r * 0.32;
  const sphere = ctx.createRadialGradient(lx, ly, r * 0.05, cx, cy, r);
  sphere.addColorStop(0.00, '#3d1878'); // lit violet
  sphere.addColorStop(0.20, '#250e52');
  sphere.addColorStop(0.48, '#140830');
  sphere.addColorStop(0.78, '#080318');
  sphere.addColorStop(1.00, '#030109'); // deep dark limb
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = sphere; ctx.fill();

  // 5. SURFACE SHIMMER SWIRL — slow moving highlight
  const sa = t * 0.14;
  const sx = cx + Math.cos(sa) * r * 0.20;
  const sy = cy + Math.sin(sa) * r * 0.12;
  const sw = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 0.62);
  sw.addColorStop(0,   'rgba(220,180,255,0.11)');
  sw.addColorStop(0.5, 'rgba(180,120,255,0.05)');
  sw.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = sw; ctx.fill();

  // 6. SPECULAR GLINT — top-left bright spot
  const sp = ctx.createRadialGradient(
    cx - r * 0.27, cy - r * 0.30, 0,
    cx - r * 0.27, cy - r * 0.30, r * 0.40,
  );
  sp.addColorStop(0,   'rgba(240,210,255,0.26)');
  sp.addColorStop(0.4, 'rgba(200,160,255,0.10)');
  sp.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = sp; ctx.fill();

  // 7. TERMINATOR SHADOW — right-side dark crescent
  const td = ctx.createRadialGradient(cx + r * 0.30, cy, 0, cx + r * 0.30, cy, r * 0.95);
  td.addColorStop(0,    'rgba(0,0,0,0)');
  td.addColorStop(0.52, 'rgba(0,0,0,0)');
  td.addColorStop(0.80, 'rgba(0,0,0,0.50)');
  td.addColorStop(1.00, 'rgba(0,0,0,0.88)');
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = td; ctx.fill();

  // 8. ATMOSPHERIC RIM LIGHT — THE KEY purple edge painted ON the sphere
  const rim = ctx.createRadialGradient(cx, cy, r * 0.78, cx, cy, r);
  rim.addColorStop(0.00, 'rgba(0,0,0,0)');
  rim.addColorStop(0.50, `rgba(150,70,255,${0.14 + glow * 0.22})`);
  rim.addColorStop(0.78, `rgba(180,100,255,${0.30 + glow * 0.40})`);
  rim.addColorStop(1.00, `rgba(210,140,255,${0.22 + glow * 0.30})`);
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = rim; ctx.fill();

  // 9. REACTIVE OUTER RINGS (listening / speaking)
  if (state === 'listening' || state === 'speaking') {
    const scale1 = state === 'listening'
      ? 1.25 + amplitude * 0.30
      : 1.25 + Math.abs(Math.sin(t * 5)) * 0.22;

    const rr1 = r * scale1;
    const ring1 = ctx.createRadialGradient(cx, cy, r * 1.04, cx, cy, rr1);
    ring1.addColorStop(0,   `rgba(180,100,255,${glow * 0.60})`);
    ring1.addColorStop(0.5, `rgba(160,80,240,${glow * 0.25})`);
    ring1.addColorStop(1,   'rgba(120,40,200,0)');
    ctx.beginPath(); ctx.arc(cx, cy, rr1, 0, Math.PI * 2);
    ctx.fillStyle = ring1; ctx.fill();

    // second softer ring
    const rr2 = r * scale1 * 0.86;
    const ring2 = ctx.createRadialGradient(cx, cy, r * 0.97, cx, cy, rr2);
    ring2.addColorStop(0, `rgba(200,140,255,${glow * 0.35})`);
    ring2.addColorStop(1, 'rgba(140,60,230,0)');
    ctx.beginPath(); ctx.arc(cx, cy, rr2, 0, Math.PI * 2);
    ctx.fillStyle = ring2; ctx.fill();
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export const VoiceOrb: React.FC<VoiceOrbProps> = ({
  state, amplitude, size = 300, onClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef  = useRef<number>(0);
  const tickRef   = useRef(0);
  const initRef   = useRef(false); // canvas dimensions set once
  const stateRef  = useRef(state);
  const ampRef    = useRef(amplitude);
  stateRef.current = state;
  ampRef.current   = amplitude;

  const loop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set physical dimensions ONCE to avoid clearing the canvas each frame
    if (!initRef.current) {
      const dpr = window.devicePixelRatio || 1;
      canvas.width  = size * dpr;
      canvas.height = size * dpr;
      canvas.style.width  = `${size}px`;
      canvas.style.height = `${size}px`;
      ctx.scale(dpr, dpr);
      initRef.current = true;
    }

    ctx.clearRect(0, 0, size, size);

    const r  = size * 0.34;
    const cx = size / 2;
    const cy = size / 2;
    renderMoon(ctx, cx, cy, r, stateRef.current, ampRef.current, tickRef.current);
    tickRef.current++;

    frameRef.current = requestAnimationFrame(loop);
  }, [size]);

  useEffect(() => {
    initRef.current = false; // reset on size change
    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [loop]);

  // Cursor changes based on state
  const cursor =
    state === 'thinking' || state === 'speaking' ? 'default' : 'pointer';

  // Pulsing shadow glow ring behind the canvas for extra presence
  const shadowColor =
    state === 'listening' ? 'rgba(177,100,255,0.55)'
    : state === 'speaking' ? 'rgba(177,100,255,0.45)'
    : state === 'thinking' ? 'rgba(120,60,220,0.30)'
    : 'rgba(100,40,200,0.20)';

  return (
    <button
      onClick={onClick}
      disabled={state === 'thinking' || state === 'speaking'}
      aria-label={
        state === 'listening' ? 'Stop listening' :
        state === 'idle'      ? 'Tap to speak'   : undefined
      }
      style={{ cursor, background: 'none', border: 'none', padding: 0 }}
      className="relative flex items-center justify-center select-none group focus:outline-none disabled:cursor-default"
    >
      {/* Outer CSS glow ring that pulses behind the canvas */}
      <span
        className="absolute rounded-full transition-all duration-500 pointer-events-none"
        style={{
          width:  size + 60,
          height: size + 60,
          background: `radial-gradient(ellipse at center, ${shadowColor} 0%, transparent 72%)`,
          animation: state === 'listening'
            ? 'voice-ring-expand 1.5s ease-out infinite'
            : state === 'speaking'
            ? 'voice-btn-glow-pulse 1.2s ease-in-out infinite'
            : 'none',
        }}
      />

      {/* Canvas moon */}
      <canvas
        ref={canvasRef}
        style={{ display: 'block', borderRadius: '50%' }}
        className="relative z-10 transition-transform duration-300 group-hover:scale-[1.03]"
      />

      {/* "Tap to speak" label — only when idle */}
      {(state === 'idle') && (
        <span
          className="absolute bottom-0 translate-y-8 text-[11px] font-semibold text-[var(--text-muted)] tracking-widest uppercase pointer-events-none select-none"
          style={{ whiteSpace: 'nowrap' }}
        >
          Tap to speak
        </span>
      )}

      {/* Listening pulse indicator */}
      {state === 'listening' && (
        <span className="absolute bottom-0 translate-y-8 flex items-center gap-1.5 pointer-events-none">
          {[0,1,2].map((i) => (
            <span
              key={i}
              className="w-1 h-1 rounded-full bg-[var(--brand-primary)]"
              style={{ animation: `bounce 1s ease-in-out infinite`, animationDelay: `${i * 150}ms` }}
            />
          ))}
        </span>
      )}
    </button>
  );
};
