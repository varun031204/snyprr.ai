/**
 * GoChartingWidget — GoCharting SDK chart with Binance live data + prediction overlays
 *
 * Overlay implementation notes (from SDK bundle analysis):
 * - createShape uses type: "HORIZONTAL_LINE" (uppercase)
 * - appearance: { strokeStyle (CSS color), lineWidth, lineDash, text }
 * - lineDash values: "Solid" | "ShortDash" | "Dot" | "Dash"
 * - The point is passed as { time, price } inside a points array
 * - time must be a unix timestamp in SECONDS (not ms)
 * - For horizontal lines that span the chart, any visible time works
 *
 * Vendor files fix:
 * The SDK loads drawTypeIcons.js etc. dynamically from "./vendor/" relative path,
 * which breaks on any route except "/". We pre-load them with absolute /vendor/ paths.
 * Files were copied to frontend/public/vendor/ during setup.
 */

import React, { useEffect, useRef } from 'react';
import { createChart } from '@gocharting/chart-sdk';
import { useUIStore } from '../../../state/useUIStore';
import { createSnyprDatafeed } from './datafeed';
import type { Prediction } from '../../../types';

const LICENSE_KEY =
  (import.meta.env.VITE_GOCHARTING_LICENSE_KEY as string | undefined) ||
  'demo-550e8400-e29b-41d4-a716-446655440000';

// ── Vendor pre-loader ──────────────────────────────────────────────────────────

const VENDOR_SCRIPTS: Array<{ src: string; attr: string }> = [
  { src: '/vendor/drawTypeIcons.js', attr: 'data-gc-draw-type-icons' },
  { src: '/vendor/drawingDecorations.js', attr: 'data-gc-drawing-decorations' },
  { src: '/vendor/chartTypeIcons.js', attr: 'data-gc-chart-type-icons' },
  { src: '/vendor/indicatorCatalog.js', attr: 'data-gc-indicator-catalog' },
];

let vendorInjected = false;

function injectVendorScripts(): Promise<void> {
  if (vendorInjected) return Promise.resolve();
  vendorInjected = true;
  const promises = VENDOR_SCRIPTS.map(({ src, attr }) =>
    new Promise<void>((resolve) => {
      if (document.querySelector(`script[${attr}]`)) { resolve(); return; }
      const s = document.createElement('script');
      s.src = src;
      s.async = false;
      s.setAttribute(attr, '1');
      s.onload = () => resolve();
      s.onerror = () => { console.warn(`[GoCharting] Vendor load failed: ${src}`); resolve(); };
      document.head.appendChild(s);
    }),
  );
  return Promise.all(promises).then(() => undefined);
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

// ── Overlay level definition ───────────────────────────────────────────────────

interface OverlayLevel {
  price: number;
  color: string;       // hex or rgba
  label: string;
  lineDash: 'Solid' | 'Dash' | 'ShortDash' | 'Dot';
  lineWidth: number;
  zone?: { bandPrice: number };  // optional price band (fill zone between two prices)
}

function buildLevels(prediction: Prediction | null | undefined): OverlayLevel[] {
  if (!prediction) return [];
  const f = (p: number) => p.toLocaleString(undefined, { minimumFractionDigits: 2 });
  const levels: OverlayLevel[] = [];

  if (prediction.buyingZone)
    levels.push({ price: prediction.buyingZone, color: '#22c55e', label: `Buy Zone $${f(prediction.buyingZone)}`, lineDash: 'Solid', lineWidth: 2 });
  if (prediction.sellingZone)
    levels.push({ price: prediction.sellingZone, color: '#ef4444', label: `Sell Zone $${f(prediction.sellingZone)}`, lineDash: 'Solid', lineWidth: 2 });
  if (prediction.entryPrice)
    levels.push({ price: prediction.entryPrice, color: '#a78bfa', label: `Entry $${f(prediction.entryPrice)}`, lineDash: 'Dash', lineWidth: 2 });
  if (prediction.stopLoss)
    levels.push({ price: prediction.stopLoss, color: '#f97316', label: `SL $${f(prediction.stopLoss)}`, lineDash: 'ShortDash', lineWidth: 1 });
  if (prediction.takeProfit)
    levels.push({ price: prediction.takeProfit, color: '#34d399', label: `TP1 $${f(prediction.takeProfit)}`, lineDash: 'ShortDash', lineWidth: 1 });
  if (prediction.takeProfit2)
    levels.push({ price: prediction.takeProfit2, color: '#6ee7b7', label: `TP2 $${f(prediction.takeProfit2)}`, lineDash: 'ShortDash', lineWidth: 1 });
  if (prediction.takeProfit3)
    levels.push({ price: prediction.takeProfit3, color: '#a7f3d0', label: `TP3 $${f(prediction.takeProfit3)}`, lineDash: 'ShortDash', lineWidth: 1 });

  return levels;
}

// ── Apply overlays to a chart instance ────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyOverlays(instance: any, prediction: Prediction | null | undefined) {
  if (!instance) return;

  // Clear existing prediction shapes
  try { instance.removeAllShapes?.(); } catch { /* ignore */ }
  if (!prediction) return;

  const levels = buildLevels(prediction);
  if (levels.length === 0) return;

  // Use "now" as the time anchor for horizontal lines (they extend across the chart anyway)
  const nowSec = Math.floor(Date.now() / 1000);

  levels.forEach((l) => {
    // Try all known GoCharting createShape argument formats
    const attempts = [
      // Format 1: type + points array (modern GoCharting format)
      () => instance.createShape?.({
        type: 'HORIZONTAL_LINE',
        points: [{ time: nowSec, price: l.price }],
        appearance: {
          strokeStyle: l.color,
          lineWidth: l.lineWidth,
          lineDash: l.lineDash,
          text: l.label,
          lock: true,
        },
        options: { direction: 'X' },
        kind: 'DRAWING',
        visible: true,
      }),
      // Format 2: TV-compat shape name + point object
      () => instance.createShape?.(
        { time: nowSec, price: l.price },
        {
          shape: 'horizontal_line',
          text: l.label,
          lock: true,
          disableSelection: false,
          disableSave: true,
          disableUndo: true,
          overrides: {
            strokeStyle: l.color,
            linecolor: l.color,
            textcolor: l.color,
            linestyle: l.lineDash === 'Solid' ? 0 : l.lineDash === 'Dash' ? 2 : 1,
            lineWidth: l.lineWidth,
            linewidth: l.lineWidth,
            showLabel: true,
            horzLabelsAlign: 'right',
            extendRight: true,
            extendLeft: false,
          },
        },
      ),
      // Format 3: type only with price top-level
      () => instance.createShape?.({
        type: 'HLINE',
        price: l.price,
        time: nowSec,
        appearance: {
          strokeStyle: l.color,
          lineWidth: l.lineWidth,
          lineDash: l.lineDash,
          text: l.label,
        },
      }),
    ];

    for (const attempt of attempts) {
      try {
        const result = attempt();
        if (result !== undefined) return; // succeeded
      } catch { /* try next format */ }
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

  // ── Create chart on mount ──────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    instanceRef.current = null;

    injectVendorScripts().then(() => {
      if (!containerRef.current) return;

      wrapperRef.current = createChart(containerRef.current, {
        symbol: instrument,
        interval: gcInterval,
        datafeed: datafeedRef.current as any,
        licenseKey: LICENSE_KEY,
        theme: gcTheme,
        autofit: true,
        trading: { enableTrading: false },

        onReady: (chartInstance: any) => {
          instanceRef.current = chartInstance;
          // Apply immediately, then retry after a short delay in case the chart
          // hasn't finished rendering its initial bars yet
          if (predictionRef.current) {
            applyOverlays(instanceRef.current, predictionRef.current);
            // Retry after 1s in case first application was too early
            retryRef.current = setTimeout(() => {
              if (instanceRef.current && predictionRef.current) {
                applyOverlays(instanceRef.current, predictionRef.current);
              }
            }, 1000);
          }
        },

        onError: (err: any) => {
          console.error('[GoChartingWidget]', err);
        },
      } as any);
    });

    return () => {
      if (retryRef.current) clearTimeout(retryRef.current);
      instanceRef.current = null;
      if (wrapperRef.current) {
        try { wrapperRef.current.destroy(); } catch { /* ignore */ }
        wrapperRef.current = null;
      }
      try { datafeedRef.current.destroy?.(); } catch { /* ignore */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sync symbol ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!instanceRef.current) return;
    try { instanceRef.current.setSymbol?.(instrument); } catch { /* ignore */ }
  }, [instrument]);

  // ── Sync interval ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!instanceRef.current) return;
    try { instanceRef.current.setInterval?.(gcInterval); } catch { /* ignore */ }
  }, [gcInterval]);

  // ── Sync theme ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!instanceRef.current) return;
    try { instanceRef.current.applyTheme?.(gcTheme); } catch { /* ignore */ }
  }, [gcTheme]);

  // ── Sync prediction overlays ───────────────────────────────────────────────
  useEffect(() => {
    predictionRef.current = prediction;
    if (!instanceRef.current) return;
    if (retryRef.current) clearTimeout(retryRef.current);
    applyOverlays(instanceRef.current, prediction);
    // Retry once after 500ms in case chart just rendered new data
    retryRef.current = setTimeout(() => {
      if (instanceRef.current) applyOverlays(instanceRef.current, predictionRef.current);
    }, 500);
  }, [prediction]);

  return (
    <div
      className="w-full rounded-2xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-sm"
      style={{ height }}
    >
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%' }}
        aria-label={`${instrument} live chart`}
      />
    </div>
  );
};

export default GoChartingWidget;
