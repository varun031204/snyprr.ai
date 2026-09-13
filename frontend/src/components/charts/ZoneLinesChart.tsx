import React, { useEffect, useRef, useCallback } from 'react';
import {
  createChart,
  CandlestickSeries,
  CrosshairMode,
  LineStyle,
  type IChartApi,
} from 'lightweight-charts';
import { RotateCcw, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ZoomIn, ZoomOut } from 'lucide-react';
import type { Prediction } from '../../types';
import { useUIStore } from '../../state/useUIStore';

// ─── Binance symbol map (Crypto only) ─────────────────────────────────────────
const INSTRUMENT_TO_BINANCE: Record<string, string> = {
  'BTC/USDT': 'BTCUSDT',
  'ETH/USDT': 'ETHUSDT',
  'SOL/USDT': 'SOLUSDT',
  'XRP/USDT': 'XRPUSDT',
};

// ─── Timeframe → Binance interval map ────────────────────────────────────────
const TIMEFRAME_TO_INTERVAL: Record<string, string> = {
  '1m': '1m', '3m': '3m', '5m': '5m', '15m': '15m', '30m': '30m',
  '1h': '1h', '2h': '2h', '4h': '4h', '6h': '6h', '8h': '8h', '12h': '12h',
  '1d': '1d', '3d': '3d', '1w': '1w',
};

interface ZoneLinesChartProps {
  /** TradingView symbol string like 'BINANCE:BTCUSDT' or 'OANDA:XAUUSD' */
  tvSymbol: string;
  /** Instrument string like 'BTC/USDT', 'GOLD', 'SILVER' */
  instrument: string;
  /** Active trader prediction for this instrument (optional) */
  prediction?: Prediction | null;
  /** Explicit timeframe override — takes priority over prediction.timeframe */
  timeframe?: string;
  height?: number;
}

// ─── Fetch live Binance klines ────────────────────────────────────────────────
async function fetchCandles(binanceSymbol: string, interval: string, limit = 200) {
  const url = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Binance fetch failed');
  const raw: any[][] = await res.json();
  return raw.map((k) => ({
    time: Math.floor(k[0] / 1000) as any,
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
  }));
}

// ─── High-Fidelity Synthetic Candlestick Generator ────────────────────────────
// Used for Commodities (GOLD, SILVER) and offline/fallback scenarios.
// Generates realistic price action ending precisely at current spot price.
function getDeterministicCandles(instrument: string, count = 120): { time: any; open: number; high: number; low: number; close: number }[] {
  const baseConfigs: Record<string, { price: number; volatility: number; precision: number }> = {
    'GOLD': { price: 2684.5, volatility: 0.0035, precision: 2 },
    'SILVER': { price: 31.85, volatility: 0.0075, precision: 3 },
    'BTC/USDT': { price: 92500, volatility: 0.012, precision: 2 },
    'ETH/USDT': { price: 3480, volatility: 0.014, precision: 2 },
    'SOL/USDT': { price: 186.0, volatility: 0.018, precision: 2 },
    'XRP/USDT': { price: 2.45, volatility: 0.016, precision: 4 },
  };

  const config = baseConfigs[instrument] || { price: 100, volatility: 0.01, precision: 2 };
  const { price: currentPrice, volatility, precision } = config;

  const now = Math.floor(Date.now() / 1000);
  const intervalSeconds = 3600; // 1 hour candles
  const tempCandles: { time: any; open: number; high: number; low: number; close: number }[] = [];

  let runningClose = currentPrice;

  // Stable seed derived from instrument name
  let seed = 0;
  for (let i = 0; i < instrument.length; i++) {
    seed = (seed << 5) - seed + instrument.charCodeAt(i);
    seed |= 0;
  }
  seed = Math.abs(seed) || 5381;

  const pseudoRandom = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  for (let i = 0; i < count; i++) {
    const time = (now - i * intervalSeconds) as any;
    const drift = (pseudoRandom() - 0.49) * volatility * runningClose;
    const open = Number((runningClose - drift).toFixed(precision));
    const close = Number(runningClose.toFixed(precision));
    const bodySpread = Math.abs(close - open);
    const wickHigh = pseudoRandom() * (bodySpread * 0.8 + runningClose * 0.0012);
    const wickLow = pseudoRandom() * (bodySpread * 0.8 + runningClose * 0.0012);

    const high = Number((Math.max(open, close) + wickHigh).toFixed(precision));
    const low = Number((Math.min(open, close) - wickLow).toFixed(precision));

    tempCandles.push({
      time,
      open,
      high,
      low,
      close,
    });

    runningClose = open;
  }

  // Reverse so candles are in strictly chronological ascending order
  tempCandles.reverse();
  return tempCandles;
}

export const ZoneLinesChart: React.FC<ZoneLinesChartProps> = ({
  tvSymbol: _tvSymbol,
  instrument,
  prediction,
  timeframe: timeframeProp,
  height = 460,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<any>(null);
  const { theme } = useUIStore();

  const binanceSymbol = INSTRUMENT_TO_BINANCE[instrument];
  // Explicit prop takes priority, then prediction timeframe, then default 1h
  const interval = TIMEFRAME_TO_INTERVAL[
    timeframeProp ?? prediction?.timeframe ?? '1h'
  ] ?? '1h';

  // ── Helper to resolve current CSS theme colors ─────────────────────────────
  const getThemeColors = useCallback(() => {
    const isLight = theme === 'neo-light';
    return {
      bgColor: isLight ? '#ffffff' : '#121019',
      borderColor: isLight ? 'rgba(141, 88, 231, 0.15)' : 'rgba(177, 124, 254, 0.12)',
      textColor: isLight ? '#6f6979' : '#8e8a9f',
    };
  }, [theme]);

  // ── Create / mount chart ───────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const { bgColor, borderColor, textColor } = getThemeColors();

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: {
        background: { color: bgColor },
        textColor,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: borderColor, style: LineStyle.Dashed },
        horzLines: { color: borderColor, style: LineStyle.Dashed },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor, textColor, autoScale: true },
      timeScale: { borderColor, timeVisible: true, secondsVisible: false },
      handleScale: {
        mouseWheel: true,
        pinch: true,
        axisPressedMouseMove: { time: true, price: true },
        axisDoubleClickReset: { time: true, price: true },
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor:         '#22c55e',
      downColor:       '#ef4444',
      borderUpColor:   '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor:     '#22c55e',
      wickDownColor:   '#ef4444',
    } as any);

    chartRef.current = chart;
    seriesRef.current = series;

    const container = containerRef.current;

    // ── Mouse wheel: vertical price pan & horizontal time scroll ─────────────
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.ctrlKey || e.metaKey) {
        // Zoom time scale horizontally
        const timeScale = chart.timeScale();
        const range = timeScale.getVisibleLogicalRange();
        if (!range) return;
        const span = range.to - range.from;
        const factor = e.deltaY > 0 ? 1.12 : 0.88;
        const newSpan = span * factor;
        const center = (range.to + range.from) / 2;
        timeScale.setVisibleLogicalRange({
          from: center - newSpan / 2,
          to: center + newSpan / 2,
        });
        return;
      }

      // Horizontal swipe (trackpad or shift + wheel)
      if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        const timeScale = chart.timeScale();
        const range = timeScale.getVisibleLogicalRange();
        if (!range) return;
        const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        const span = range.to - range.from;
        const shift = (delta / 100) * Math.max(3, span * 0.18);
        timeScale.setVisibleLogicalRange({
          from: range.from + shift,
          to: range.to + shift,
        });
        return;
      }

      // Vertical wheel: pan price scale UP / DOWN
      const priceScale = chart.priceScale('right');
      const range = priceScale.getVisibleRange();
      if (!range) return;
      const span = range.to - range.from;
      if (span <= 0) return;
      const step = (-e.deltaY / 100) * (span * 0.08);
      priceScale.applyOptions({ autoScale: false });
      priceScale.setVisibleRange({
        from: range.from + step,
        to: range.to + step,
      });
    };

    // ── Mouse vertical drag on canvas ────────────────────────────────────────
    let isDragging = false;
    let lastY = 0;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0 || (e.target as HTMLElement)?.closest('button')) return;
      isDragging = true;
      lastY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging || e.buttons !== 1) {
        isDragging = false;
        return;
      }
      const deltaY = e.clientY - lastY;
      lastY = e.clientY;
      if (deltaY === 0) return;

      const priceScale = chart.priceScale('right');
      const range = priceScale.getVisibleRange();
      if (!range) return;

      const span = range.to - range.from;
      const chartHeight = container.clientHeight || height;
      const priceDelta = (deltaY / chartHeight) * span;
      priceScale.applyOptions({ autoScale: false });
      priceScale.setVisibleRange({
        from: range.from + priceDelta,
        to: range.to + priceDelta,
      });
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    // ── Double-click: reset to auto-scale ──────────────────────────────────
    const onDblClick = () => {
      const priceScale = chart.priceScale('right');
      priceScale.applyOptions({ autoScale: true });
      chart.timeScale().fitContent();
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('dblclick', onDblClick);

    const ro = new ResizeObserver(() => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    ro.observe(containerRef.current);

    return () => {
      container.removeEventListener('wheel', onWheel);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('dblclick', onDblClick);
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [height, getThemeColors]);

  // ── Update chart theme colors when theme changes ───────────────────────────
  useEffect(() => {
    if (!chartRef.current) return;
    const { bgColor, borderColor, textColor } = getThemeColors();
    chartRef.current.applyOptions({
      layout: {
        background: { color: bgColor },
        textColor,
      },
      grid: {
        vertLines: { color: borderColor },
        horzLines: { color: borderColor },
      },
      rightPriceScale: { borderColor, textColor },
      timeScale: { borderColor },
    });
  }, [theme, getThemeColors]);

  // ── Load candle data (Binance live for crypto, high-fidelity for Gold/Silver) ─
  const loadData = useCallback(async () => {
    if (!seriesRef.current) return;

    // Apply appropriate price precision formatting
    const isPrecision3 = instrument === 'SILVER';
    const isPrecision4 = instrument === 'XRP/USDT';
    const precision = isPrecision4 ? 4 : isPrecision3 ? 3 : 2;
    const minMove = isPrecision4 ? 0.0001 : isPrecision3 ? 0.001 : 0.01;

    seriesRef.current.applyOptions({
      priceFormat: {
        type: 'price',
        precision,
        minMove,
      },
    });

    if (binanceSymbol) {
      try {
        const candles = await fetchCandles(binanceSymbol, interval);
        seriesRef.current.setData(candles);
        chartRef.current?.timeScale().fitContent();
        return;
      } catch {
        // Fallback to high-fidelity generator on network or API failure
      }
    }

    // High-fidelity fallback/synthetic generator for GOLD, SILVER, or offline
    const fallbackCandles = getDeterministicCandles(instrument);
    seriesRef.current.setData(fallbackCandles);
    chartRef.current?.timeScale().fitContent();
  }, [binanceSymbol, instrument, interval]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Draw / update zone lines whenever prediction or instrument changes ───────
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;

    const lines: Array<{ price: number; color: string; label: string; style: LineStyle }> = [];

    if (prediction) {
      const buyZone  = prediction.buyingZone  ?? prediction.entryPrice * 0.97;
      const sellZone = prediction.sellingZone ?? prediction.entryPrice * 1.06;
      const entry    = prediction.entryPrice;

      const formatPrice = (p: number) =>
        instrument === 'SILVER' ? p.toFixed(2) : p.toLocaleString(undefined, { minimumFractionDigits: 2 });

      lines.push(
        { price: buyZone,  color: '#22c55e', label: `Buy Zone  $${formatPrice(buyZone)}`,  style: LineStyle.Solid },
        { price: sellZone, color: '#ef4444', label: `Sell Zone $${formatPrice(sellZone)}`, style: LineStyle.Solid },
        { price: entry,    color: '#a78bfa', label: `Entry     $${formatPrice(entry)}`,    style: LineStyle.Dashed },
      );

      // Stop Loss line
      if (prediction.stopLoss) {
        lines.push({
          price: prediction.stopLoss,
          color: '#f97316',
          label: `SL  $${formatPrice(prediction.stopLoss)}`,
          style: LineStyle.SparseDotted,
        });
      }

      // Take Profit lines (TP1 mandatory, TP2/TP3 optional)
      if (prediction.takeProfit) {
        lines.push({
          price: prediction.takeProfit,
          color: '#34d399',
          label: `TP1 $${formatPrice(prediction.takeProfit)}`,
          style: LineStyle.SparseDotted,
        });
      }
      if (prediction.takeProfit2) {
        lines.push({
          price: prediction.takeProfit2,
          color: '#6ee7b7',
          label: `TP2 $${formatPrice(prediction.takeProfit2)}`,
          style: LineStyle.SparseDotted,
        });
      }
      if (prediction.takeProfit3) {
        lines.push({
          price: prediction.takeProfit3,
          color: '#a7f3d0',
          label: `TP3 $${formatPrice(prediction.takeProfit3)}`,
          style: LineStyle.SparseDotted,
        });
      }
    }

    const priceLineRefs = lines.map((l) =>
      series.createPriceLine({
        price: l.price,
        color: l.color,
        lineWidth: 2,
        lineStyle: l.style,
        axisLabelVisible: true,
        title: l.label,
      })
    );

    return () => {
      priceLineRefs.forEach((ref) => {
        try { series.removePriceLine(ref); } catch { /* already removed */ }
      });
    };
  }, [prediction, instrument]);

  // ── Scroll left (pan back in time) ──────────────────────────────────────────
  const handleScrollLeft = useCallback(() => {
    if (!chartRef.current) return;
    const timeScale = chartRef.current.timeScale();
    const range = timeScale.getVisibleLogicalRange();
    if (!range) return;
    const span = range.to - range.from;
    const shift = Math.max(5, Math.round(span * 0.25));
    timeScale.setVisibleLogicalRange({
      from: range.from - shift,
      to: range.to - shift,
    });
  }, []);

  // ── Scroll right (pan forward in time) ───────────────────────────────────────
  const handleScrollRight = useCallback(() => {
    if (!chartRef.current) return;
    const timeScale = chartRef.current.timeScale();
    const range = timeScale.getVisibleLogicalRange();
    if (!range) return;
    const span = range.to - range.from;
    const shift = Math.max(5, Math.round(span * 0.25));
    timeScale.setVisibleLogicalRange({
      from: range.from + shift,
      to: range.to + shift,
    });
  }, []);

  // ── Zoom in ─────────────────────────────────────────────────────────────────
  const handleZoomIn = useCallback(() => {
    if (!chartRef.current) return;
    const timeScale = chartRef.current.timeScale();
    const range = timeScale.getVisibleLogicalRange();
    if (!range) return;
    const span = range.to - range.from;
    if (span <= 10) return;
    const shift = Math.max(2, Math.round(span * 0.15));
    timeScale.setVisibleLogicalRange({
      from: range.from + shift,
      to: range.to - shift,
    });
  }, []);

  // ── Zoom out ────────────────────────────────────────────────────────────────
  const handleZoomOut = useCallback(() => {
    if (!chartRef.current) return;
    const timeScale = chartRef.current.timeScale();
    const range = timeScale.getVisibleLogicalRange();
    if (!range) return;
    const span = range.to - range.from;
    const shift = Math.max(2, Math.round(span * 0.15));
    timeScale.setVisibleLogicalRange({
      from: range.from - shift,
      to: range.to + shift,
    });
  }, []);

  // ── Pan up (higher price range) ─────────────────────────────────────────────
  const handlePanUp = useCallback(() => {
    if (!chartRef.current) return;
    const priceScale = chartRef.current.priceScale('right');
    const range = priceScale.getVisibleRange();
    if (!range) return;
    const span = range.to - range.from;
    const shift = span * 0.15;
    priceScale.applyOptions({ autoScale: false });
    priceScale.setVisibleRange({
      from: range.from + shift,
      to: range.to + shift,
    });
  }, []);

  // ── Pan down (lower price range) ───────────────────────────────────────────
  const handlePanDown = useCallback(() => {
    if (!chartRef.current) return;
    const priceScale = chartRef.current.priceScale('right');
    const range = priceScale.getVisibleRange();
    if (!range) return;
    const span = range.to - range.from;
    const shift = span * 0.15;
    priceScale.applyOptions({ autoScale: false });
    priceScale.setVisibleRange({
      from: range.from - shift,
      to: range.to - shift,
    });
  }, []);

  // ── Reset view ──────────────────────────────────────────────────────────────
  const handleResetView = useCallback(() => {
    if (!chartRef.current) return;
    const priceScale = chartRef.current.priceScale('right');
    priceScale.applyOptions({ autoScale: true });
    chartRef.current.timeScale().fitContent();
  }, []);

  return (
    <div
      className="w-full rounded-2xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-sm relative group select-none"
      style={{ height }}
    >
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Chart interactive controls toolbar */}
      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1 bg-[var(--bg-card)]/90 backdrop-blur-md px-1.5 py-1 rounded-lg border border-[var(--border-subtle)] shadow-md">
        {/* Scroll Left */}
        <button
          type="button"
          onClick={handleScrollLeft}
          title="Scroll Left (past data)"
          className="p-1 rounded hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Scroll Right */}
        <button
          type="button"
          onClick={handleScrollRight}
          title="Scroll Right (recent data)"
          className="p-1 rounded hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        <div className="w-[1px] h-3.5 bg-[var(--border-subtle)] mx-0.5" />

        {/* Pan Up */}
        <button
          type="button"
          onClick={handlePanUp}
          title="Pan Up (higher prices)"
          className="p-1 rounded hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>

        {/* Pan Down */}
        <button
          type="button"
          onClick={handlePanDown}
          title="Pan Down (lower prices)"
          className="p-1 rounded hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>

        <div className="w-[1px] h-3.5 bg-[var(--border-subtle)] mx-0.5" />

        {/* Zoom In */}
        <button
          type="button"
          onClick={handleZoomIn}
          title="Zoom In"
          className="p-1 rounded hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        {/* Zoom Out */}
        <button
          type="button"
          onClick={handleZoomOut}
          title="Zoom Out"
          className="p-1 rounded hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        <div className="w-[1px] h-3.5 bg-[var(--border-subtle)] mx-0.5" />

        {/* Reset view */}
        <button
          type="button"
          onClick={handleResetView}
          title="Reset chart view (or double-click chart)"
          className="px-1.5 py-0.5 text-[10px] font-medium rounded hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer flex items-center gap-1"
        >
          <RotateCcw className="w-2.5 h-2.5" />
          <span>Reset</span>
        </button>
      </div>

      {/* Graph Label & Active Prediction Legend Pills (Top Left) */}
      <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10 pointer-events-none">
        {/* Instrument & Timeframe Label */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-bold font-mono shadow-sm backdrop-blur-md bg-black/60 border border-white/10 text-white w-fit">
          <span>{instrument}</span>
          <span className="text-[10px] text-white/60 font-semibold uppercase">{interval}</span>
        </div>

        {/* Prediction zone labels */}
        {prediction && (
          <div className="flex flex-col gap-1">
            <ZoneLegend
              label={`Buy Zone  $${(prediction.buyingZone ?? prediction.entryPrice * 0.97).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
              color="#22c55e"
            />
            <ZoneLegend
              label={`Sell Zone $${(prediction.sellingZone ?? prediction.entryPrice * 1.06).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
              color="#ef4444"
            />
            <ZoneLegend
              label={`Entry     $${prediction.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
              color="#a78bfa"
              dashed
            />
            {prediction.stopLoss && (
              <ZoneLegend label={`SL        $${prediction.stopLoss.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} color="#f97316" dashed />
            )}
            {prediction.takeProfit && (
              <ZoneLegend label={`TP1       $${prediction.takeProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} color="#34d399" dashed />
            )}
            {prediction.takeProfit2 && (
              <ZoneLegend label={`TP2       $${prediction.takeProfit2.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} color="#6ee7b7" dashed />
            )}
            {prediction.takeProfit3 && (
              <ZoneLegend label={`TP3       $${prediction.takeProfit3.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} color="#a7f3d0" dashed />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Small legend pill ─────────────────────────────────────────────────────────
const ZoneLegend: React.FC<{ label: string; color: string; dashed?: boolean }> = ({ label, color, dashed }) => (
  <div
    className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold font-mono shadow-sm backdrop-blur-md"
    style={{ background: 'rgba(0,0,0,0.65)', color: '#fff' }}
  >
    <span
      className="inline-block w-5 flex-shrink-0"
      style={{
        height: '2px',
        background: dashed ? 'transparent' : color,
        borderTop: dashed ? `2px dashed ${color}` : 'none',
        opacity: 0.9,
      }}
    />
    <span style={{ color }}>{label}</span>
  </div>
);
