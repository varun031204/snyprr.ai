/**
 * GoChartingWidget — GoCharting SDK chart with Binance live data + prediction overlays
 *
 * SDK loaded from GoCharting public CDN (no private registry, no token required).
 * All Binance data proxied through the backend to bypass India geo-blocks.
 */

import React, { useEffect, useRef } from 'react';
import { useUIStore } from '../../../state/useUIStore';
import { createSnyprDatafeed } from './datafeed';
import type { Prediction } from '../../../types';

const LICENSE_KEY =
  (import.meta.env.VITE_GOCHARTING_LICENSE_KEY as string | undefined) ||
  'demo-550e8400-e29b-41d4-a716-446655440000';

const SDK_CDN_URL = `https://gocharting.com/sdk/library/${LICENSE_KEY}/index.umd.js`;

// ── SDK loader ─────────────────────────────────────────────────────────────────

let sdkLoadPromise: Promise<any> | null = null;

function loadGoChartingSDK(): Promise<any> {
  if (sdkLoadPromise) return sdkLoadPromise;
  sdkLoadPromise = new Promise((resolve, reject) => {
    if ((window as any).GoChartingSDK?.createChart) {
      resolve((window as any).GoChartingSDK); return;
    }
    const existing = document.querySelector('script[data-gocharting-sdk]');
    if (existing) {
      existing.addEventListener('load', () => resolve((window as any).GoChartingSDK));
      existing.addEventListener('error', () => reject(new Error('GoCharting SDK CDN failed')));
      return;
    }
    const script = document.createElement('script');
    script.src = SDK_CDN_URL;
    script.async = true;
    script.setAttribute('data-gocharting-sdk', '1');
    script.onload = () => {
      const sdk = (window as any).GoChartingSDK;
      sdk?.createChart ? resolve(sdk) : reject(new Error('GoChartingSDK.createChart not found'));
    };
    script.onerror = () => reject(new Error('GoCharting SDK CDN script failed'));
    document.head.appendChild(script);
  });
  return sdkLoadPromise;
}

// ── GoCharting native interval strings ────────────────────────────────────────
// Ordered from most granular to least for the chart's built-in timeframe toolbar
const TF_TO_GC: Record<string, string> = {
  '10s': '10s', '15s': '15s', '30s': '30s',
  '1m': '1m', '2m': '2m', '3m': '3m', '5m': '5m', '15m': '15m', '30m': '30m',
  '1h': '1h', '2h': '2h', '4h': '4h', '6h': '6h', '12h': '12h',
  '1d': '1D', '1D': '1D', '1w': '1W', '1W': '1W', '1M': '1M',
  // Aliases
  '45m': '30m', '3h': '2h', '8h': '6h', '3d': '1D',
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

// ── Prediction overlay price lines ────────────────────────────────────────────

function buildLevels(prediction: Prediction | null | undefined) {
  if (!prediction) return [];
  const fmt = (p: number) => p.toLocaleString(undefined, { minimumFractionDigits: 2 });
  const lvs = [
    prediction.buyingZone  && { price: prediction.buyingZone,  color: '#22c55e', label: `Buy Zone  $${fmt(prediction.buyingZone)}`,  dash: 0, width: 2 },
    prediction.sellingZone && { price: prediction.sellingZone, color: '#ef4444', label: `Sell Zone $${fmt(prediction.sellingZone)}`, dash: 0, width: 2 },
    prediction.entryPrice  && { price: prediction.entryPrice,  color: '#a78bfa', label: `Entry     $${fmt(prediction.entryPrice)}`,  dash: 2, width: 2 },
    prediction.stopLoss    && { price: prediction.stopLoss,    color: '#f97316', label: `SL        $${fmt(prediction.stopLoss)}`,    dash: 1, width: 1 },
    prediction.takeProfit  && { price: prediction.takeProfit,  color: '#34d399', label: `TP1       $${fmt(prediction.takeProfit)}`,  dash: 1, width: 1 },
    prediction.takeProfit2 && { price: prediction.takeProfit2, color: '#6ee7b7', label: `TP2       $${fmt(prediction.takeProfit2)}`, dash: 1, width: 1 },
    prediction.takeProfit3 && { price: prediction.takeProfit3, color: '#a7f3d0', label: `TP3       $${fmt(prediction.takeProfit3)}`, dash: 1, width: 1 },
  ].filter(Boolean);
  return lvs as Array<{ price: number; color: string; label: string; dash: number; width: number }>;
}

function applyOverlays(instance: any, prediction: Prediction | null | undefined) {
  if (!instance) return;

  // Clear previous
  try { instance.removeAllShapes?.(); } catch { /* ignore */ }
  if (!prediction) return;

  const levels = buildLevels(prediction);
  if (!levels.length) return;

  const nowSec = Math.floor(Date.now() / 1000);

  levels.forEach((l) => {
    // GoCharting SDK createShape — try all known signatures.
    // The API version that works depends on the SDK build loaded from CDN.
    // We try from most likely to least likely and stop on first success.

    const shapes = [
      // ── Signature A: new SDK format with type + points ──────────────────────
      () => instance.createShape?.({
        type: 'HORIZONTAL_LINE',
        points: [{ time: nowSec, price: l.price }],
        appearance: {
          strokeStyle: l.color,
          lineWidth:   l.width,
          lineDash:    l.dash === 0 ? 'Solid' : l.dash === 2 ? 'Dash' : 'ShortDash',
          text:        l.label,
          lock:        true,
        },
        options: { direction: 'X' },
        kind:    'DRAWING',
        visible: true,
      }),

      // ── Signature B: TradingView-compatible (point obj + options obj) ────────
      () => instance.createShape?.(
        { time: nowSec, price: l.price },
        {
          shape:        'horizontal_line',
          text:         l.label,
          lock:         true,
          disableSave:  true,
          disableUndo:  true,
          overrides: {
            linecolor:       l.color,
            textcolor:       l.color,
            linestyle:       l.dash,
            linewidth:       l.width,
            showLabel:       true,
            horzLabelsAlign: 'right',
            vertLabelsAlign: 'middle',
            extendRight:     true,
            extendLeft:      false,
            fontsize:        11,
          },
        },
      ),

      // ── Signature C: flat object with price at top level ─────────────────────
      () => instance.createShape?.({
        type:  'HORIZONTAL_LINE',
        price: l.price,
        time:  nowSec,
        name:  l.label,
        appearance: {
          strokeStyle: l.color,
          lineWidth:   l.width,
          text:        l.label,
        },
      }),

      // ── Signature D: createMultipointShape ───────────────────────────────────
      () => instance.createMultipointShape?.(
        [{ time: nowSec, price: l.price }, { time: nowSec + 3600, price: l.price }],
        {
          shape:       'trend_line',
          text:        l.label,
          lock:        true,
          disableSave: true,
          overrides: {
            linecolor: l.color, linewidth: l.width, linestyle: l.dash,
            textcolor: l.color, showLabel: true,
          },
        },
      ),
    ];

    for (const fn of shapes) {
      try {
        const result = fn();
        // If we got back a defined result (shape ID string or object), it worked
        if (result !== undefined && result !== null) return;
      } catch { /* try next signature */ }
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
  const containerRef  = useRef<HTMLDivElement>(null);
  const wrapperRef    = useRef<any>(null);
  const instanceRef   = useRef<any>(null);
  const predictionRef = useRef(prediction);
  const datafeedRef   = useRef(createSnyprDatafeed());
  const retryRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { theme }     = useUIStore();

  const gcInterval = TF_TO_GC[timeframe] ?? '1h';
  const gcTheme    = theme === 'neo-light' ? 'light' : 'dark';

  predictionRef.current = prediction;

  useEffect(() => {
    if (!containerRef.current) return;
    instanceRef.current = null;

    loadGoChartingSDK()
      .then((sdk) => {
        if (!containerRef.current) return;

        wrapperRef.current = sdk.createChart(containerRef.current, {
          symbol:     instrument,
          interval:   gcInterval,
          datafeed:   datafeedRef.current,
          licenseKey: LICENSE_KEY,
          theme:      gcTheme,
          autofit:    true,
          trading:    { enableTrading: false },

          onReady: (chartInstance: any) => {
            instanceRef.current = chartInstance;

            // Log available methods once to help debug shape API issues
            if (import.meta.env.DEV) {
              const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(chartInstance) ?? chartInstance)
                .filter(k => typeof chartInstance[k] === 'function');
              console.log('[GoChartingWidget] Chart instance methods:', methods);
            }

            // Apply prediction overlays — retry 3 times with increasing delay
            // to handle the chart not fully initializing before onReady fires
            const tryApply = (attempt: number) => {
              if (!instanceRef.current || !predictionRef.current) return;
              applyOverlays(instanceRef.current, predictionRef.current);
              if (attempt < 3) {
                retryRef.current = setTimeout(() => tryApply(attempt + 1), attempt * 800 + 500);
              }
            };
            tryApply(0);
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

  useEffect(() => {
    if (!instanceRef.current) return;
    try { instanceRef.current.setSymbol?.(instrument); } catch { /* ignore */ }
  }, [instrument]);

  useEffect(() => {
    if (!instanceRef.current) return;
    try { instanceRef.current.setInterval?.(gcInterval); } catch { /* ignore */ }
  }, [gcInterval]);

  useEffect(() => {
    if (!instanceRef.current) return;
    try { instanceRef.current.applyTheme?.(gcTheme); } catch { /* ignore */ }
  }, [gcTheme]);

  useEffect(() => {
    predictionRef.current = prediction;
    if (!instanceRef.current) return;
    if (retryRef.current) clearTimeout(retryRef.current);
    // Apply immediately then retry twice
    applyOverlays(instanceRef.current, prediction);
    retryRef.current = setTimeout(() => {
      if (instanceRef.current) applyOverlays(instanceRef.current, predictionRef.current);
    }, 600);
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
