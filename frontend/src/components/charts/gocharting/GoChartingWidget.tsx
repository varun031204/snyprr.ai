/**
 * GoChartingWidget — GoCharting SDK chart with Binance live data + prediction overlays
 *
 * SDK loading strategy:
 * The @gocharting/chart-sdk npm package is on a private registry that requires
 * an auth token. On Vercel we can't reliably store a short-lived token.
 *
 * Instead, we load the UMD build from GoCharting's public CDN at runtime:
 *   https://gocharting.com/sdk/library/<key>/index.umd.js
 *
 * This approach:
 *  - Requires no npm install token
 *  - Works on any deployment (Vercel, Netlify, any static host)
 *  - Uses the same demo key — replace with production key when available
 *  - SDK is available as window.GoChartingSDK after the script loads
 */

import React, { useEffect, useRef } from 'react';
import { useUIStore } from '../../../state/useUIStore';
import { createSnyprDatafeed } from './datafeed';
import type { Prediction } from '../../../types';

const LICENSE_KEY =
  (import.meta.env.VITE_GOCHARTING_LICENSE_KEY as string | undefined) ||
  'demo-550e8400-e29b-41d4-a716-446655440000';

const SDK_CDN_URL = `https://gocharting.com/sdk/library/${LICENSE_KEY}/index.umd.js`;

// ── GoCharting SDK loader ──────────────────────────────────────────────────────
// Loads the UMD bundle from CDN once. Returns window.GoChartingSDK.

let sdkLoadPromise: Promise<any> | null = null;

function loadGoChartingSDK(): Promise<any> {
  if (sdkLoadPromise) return sdkLoadPromise;

  sdkLoadPromise = new Promise((resolve, reject) => {
    // Already loaded (e.g. HMR reload)
    if ((window as any).GoChartingSDK?.createChart) {
      resolve((window as any).GoChartingSDK);
      return;
    }

    const existing = document.querySelector('script[data-gocharting-sdk]');
    if (existing) {
      // Script tag present but SDK not yet defined — wait for it
      existing.addEventListener('load', () => resolve((window as any).GoChartingSDK));
      existing.addEventListener('error', () => reject(new Error('GoCharting SDK CDN load failed')));
      return;
    }

    const script = document.createElement('script');
    script.src = SDK_CDN_URL;
    script.async = true;
    script.setAttribute('data-gocharting-sdk', '1');
    script.onload = () => {
      const sdk = (window as any).GoChartingSDK;
      if (sdk?.createChart) {
        resolve(sdk);
      } else {
        reject(new Error('GoCharting SDK loaded but createChart not found on window.GoChartingSDK'));
      }
    };
    script.onerror = () => reject(new Error('GoCharting SDK CDN script failed to load'));
    document.head.appendChild(script);
  });

  return sdkLoadPromise;
}

// ── GoCharting interval strings (from SDK jh[] array) ─────────────────────────
const TF_TO_GC: Record<string, string> = {
  '1m': '1m', '2m': '2m', '3m': '3m', '5m': '5m',
  '15m': '15m', '30m': '30m', '45m': '30m',
  '1h': '1h', '2h': '2h', '3h': '2h', '4h': '4h',
  '6h': '6h', '8h': '6h', '12h': '12h',
  '1d': '1D', '1D': '1D', '3d': '1D',
  '1w': '1W', '1W': '1W',
  '1M': '1M',
};

export interface GoChartingWidgetProps {
  instrument: string;
  tvSymbol?: string;
  prediction?: Prediction | null;
  timeframe?: string;
  height?: number;
  allowDrawing?: boolean;
  predictionId?: string;
  currentPrice?: number | null;
  showTimeframeBar?: boolean;
}

// ── Prediction overlay levels ──────────────────────────────────────────────────

function buildLevels(prediction: Prediction | null | undefined) {
  if (!prediction) return [];
  const f = (p: number) => p.toLocaleString(undefined, { minimumFractionDigits: 2 });
  return [
    prediction.buyingZone && { price: prediction.buyingZone, color: '#22c55e', label: `Buy Zone $${f(prediction.buyingZone)}`, lineDash: 'Solid', lineWidth: 2 },
    prediction.sellingZone && { price: prediction.sellingZone, color: '#ef4444', label: `Sell Zone $${f(prediction.sellingZone)}`, lineDash: 'Solid', lineWidth: 2 },
    prediction.entryPrice && { price: prediction.entryPrice, color: '#a78bfa', label: `Entry $${f(prediction.entryPrice)}`, lineDash: 'Dash', lineWidth: 2 },
    prediction.stopLoss && { price: prediction.stopLoss, color: '#f97316', label: `SL $${f(prediction.stopLoss)}`, lineDash: 'ShortDash', lineWidth: 1 },
    prediction.takeProfit && { price: prediction.takeProfit, color: '#34d399', label: `TP1 $${f(prediction.takeProfit)}`, lineDash: 'ShortDash', lineWidth: 1 },
    prediction.takeProfit2 && { price: prediction.takeProfit2, color: '#6ee7b7', label: `TP2 $${f(prediction.takeProfit2)}`, lineDash: 'ShortDash', lineWidth: 1 },
    prediction.takeProfit3 && { price: prediction.takeProfit3, color: '#a7f3d0', label: `TP3 $${f(prediction.takeProfit3)}`, lineDash: 'ShortDash', lineWidth: 1 },
  ].filter(Boolean) as Array<{ price: number; color: string; label: string; lineDash: string; lineWidth: number }>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyOverlays(instance: any, prediction: Prediction | null | undefined) {
  if (!instance) return;
  try { instance.removeAllShapes?.(); } catch { /* ignore */ }
  if (!prediction) return;

  const levels = buildLevels(prediction);
  if (!levels.length) return;
  const nowSec = Math.floor(Date.now() / 1000);

  levels.forEach((l) => {
    // Try multiple call signatures — GoCharting has evolved its API
    const attempts = [
      () => instance.createShape?.({
        type: 'HORIZONTAL_LINE',
        points: [{ time: nowSec, price: l.price }],
        appearance: { strokeStyle: l.color, lineWidth: l.lineWidth, lineDash: l.lineDash, text: l.label, lock: true },
        options: { direction: 'X' },
        kind: 'DRAWING',
        visible: true,
      }),
      () => instance.createShape?.(
        { time: nowSec, price: l.price },
        {
          shape: 'horizontal_line',
          text: l.label,
          lock: true,
          disableSave: true,
          disableUndo: true,
          overrides: {
            strokeStyle: l.color, linecolor: l.color, textcolor: l.color,
            linestyle: l.lineDash === 'Solid' ? 0 : l.lineDash === 'Dash' ? 2 : 1,
            lineWidth: l.lineWidth, linewidth: l.lineWidth,
            showLabel: true, horzLabelsAlign: 'right',
            extendRight: true, extendLeft: false,
          },
        },
      ),
      () => instance.createShape?.({ type: 'HLINE', price: l.price, time: nowSec, appearance: { strokeStyle: l.color, lineWidth: l.lineWidth, lineDash: l.lineDash, text: l.label } }),
    ];

    for (const attempt of attempts) {
      try { const r = attempt(); if (r !== undefined) return; } catch { /* try next */ }
    }
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export const GoChartingWidget: React.FC<GoChartingWidgetProps> = ({
  instrument,
  prediction,
  timeframe = '1h',
  height = 520,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wrapperRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const instanceRef = useRef<any>(null);
  const predictionRef = useRef(prediction);
  const datafeedRef = useRef(createSnyprDatafeed());
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { theme } = useUIStore();

  const gcInterval = TF_TO_GC[timeframe] ?? '1h';
  const gcTheme = theme === 'neo-light' ? 'light' : 'dark';

  predictionRef.current = prediction;

  // ── Create chart once SDK is loaded ───────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    instanceRef.current = null;

    loadGoChartingSDK()
      .then((sdk) => {
        if (!containerRef.current) return;

        wrapperRef.current = sdk.createChart(containerRef.current, {
          symbol: instrument,
          interval: gcInterval,
          datafeed: datafeedRef.current,
          licenseKey: LICENSE_KEY,
          theme: gcTheme,
          autofit: true,
          trading: { enableTrading: false },

          onReady: (chartInstance: any) => {
            instanceRef.current = chartInstance;
            if (predictionRef.current) {
              applyOverlays(instanceRef.current, predictionRef.current);
              retryRef.current = setTimeout(() => {
                if (instanceRef.current && predictionRef.current)
                  applyOverlays(instanceRef.current, predictionRef.current);
              }, 1000);
            }
          },

          onError: (err: any) => { console.error('[GoChartingWidget]', err); },
        });
      })
      .catch((err) => { console.error('[GoChartingWidget] SDK load failed:', err); });

    return () => {
      if (retryRef.current) clearTimeout(retryRef.current);
      instanceRef.current = null;
      if (wrapperRef.current) { try { wrapperRef.current.destroy(); } catch { /* ignore */ } wrapperRef.current = null; }
      try { datafeedRef.current.destroy?.(); } catch { /* ignore */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (instanceRef.current) try { instanceRef.current.setSymbol?.(instrument); } catch { /* ignore */ } }, [instrument]);
  useEffect(() => { if (instanceRef.current) try { instanceRef.current.setInterval?.(gcInterval); } catch { /* ignore */ } }, [gcInterval]);
  useEffect(() => { if (instanceRef.current) try { instanceRef.current.applyTheme?.(gcTheme); } catch { /* ignore */ } }, [gcTheme]);

  useEffect(() => {
    predictionRef.current = prediction;
    if (!instanceRef.current) return;
    if (retryRef.current) clearTimeout(retryRef.current);
    applyOverlays(instanceRef.current, prediction);
    retryRef.current = setTimeout(() => {
      if (instanceRef.current) applyOverlays(instanceRef.current, predictionRef.current);
    }, 500);
  }, [prediction]);

  return (
    <div
      className="w-full rounded-2xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-sm"
      style={{ height }}
    >
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} aria-label={`${instrument} live chart`} />
    </div>
  );
};

export default GoChartingWidget;
