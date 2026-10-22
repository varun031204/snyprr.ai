/**
 * ZoneLinesChart — lightweight-charts + full SVG drawing toolkit
 *
 * Features:
 * - 18 drawing tools (lines, channels, shapes, Fib, positions, measure, text)
 * - Click-to-select in Cursor mode → drag handles to reposition any point
 * - Price value labels shown on every drawing
 * - Edit panel (color picker + price inputs) on selection
 * - Eraser tool — click nearest drawing to delete
 * - Ghost preview while placing 2nd/3rd point
 * - Drawings persist across timeframe switches (keyed by instrument)
 */

import React, {
  useEffect, useRef, useCallback, useState, useMemo,
} from 'react';
import {
  createChart, CandlestickSeries, CrosshairMode, LineStyle,
  type IChartApi, type ISeriesApi, type MouseEventParams,
} from 'lightweight-charts';
import {
  RotateCcw, ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
  MousePointer, Trash2, Type, TrendingUp, TrendingDown,
  Minus, AlignJustify, ArrowRight, ArrowUpRight,
  Square, Triangle, Ruler, GitCommitHorizontal,
  TrendingUp as TrendIcon, BarChart2, Eraser, Layers, X, Hand,
} from 'lucide-react';
import type { Prediction } from '../../types';
import { useUIStore } from '../../state/useUIStore';

// ─── Constants ─────────────────────────────────────────────────────────────────
const INSTRUMENT_TO_BINANCE: Record<string, string> = {
  'BTC/USDT': 'BTCUSDT', 'ETH/USDT': 'ETHUSDT',
  'SOL/USDT': 'SOLUSDT', 'XRP/USDT': 'XRPUSDT',
};
const TIMEFRAME_TO_INTERVAL: Record<string, string> = {
  '1m': '1m', '3m': '3m', '5m': '5m', '15m': '15m', '30m': '30m',
  '1h': '1h', '2h': '2h', '4h': '4h', '6h': '6h', '8h': '8h',
  '12h': '12h', '1d': '1d', '3d': '3d', '1w': '1w',
};
const TF_OPTIONS = ['1m', '5m', '15m', '1h', '4h', '1d', '1w'];
const PALETTE = ['#b17cfe', '#22c55e', '#ef4444', '#f97316', '#60a5fa', '#fbbf24', '#a78bfa', '#fb7185', '#34d399', '#38bdf8', '#e879f9'];
const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
const FIB_EXT = [1.272, 1.414, 1.618, 2.0, 2.618];
const FIB_COLORS: Record<number, string> = {
  0: '#94a3b8', 0.236: '#60a5fa', 0.382: '#34d399', 0.5: '#fbbf24',
  0.618: '#f97316', 0.786: '#f43f5e', 1: '#94a3b8',
  1.272: '#a78bfa', 1.414: '#e879f9', 1.618: '#fb7185', 2.0: '#38bdf8', 2.618: '#94a3b8',
};
const HANDLE_R = 6; // drag handle radius px

// ─── Drawing types ──────────────────────────────────────────────────────────────
type DrawTool =
  | 'cursor' | 'eraser'
  | 'hline' | 'vline' | 'extline' | 'trendline' | 'ray' | 'arrow'
  | 'hchannel' | 'pchannel'
  | 'rect' | 'triangle'
  | 'zone' | 'fib' | 'fibext'
  | 'long' | 'short' | 'measure'
  | 'text';

type PT = { time: number; price: number };

interface Base { id: string; color: string; }
interface HLine extends Base { type: 'hline'; price: number; label: string; }
interface VLine extends Base { type: 'vline'; time: number; }
interface TLine extends Base { type: 'extline' | 'trendline' | 'ray' | 'arrow'; p1: PT; p2: PT; }
interface HChannel extends Base { type: 'hchannel'; priceTop: number; priceBot: number; }
interface PChannel extends Base { type: 'pchannel'; p1: PT; p2: PT; offset: number; }
interface Rect extends Base { type: 'rect'; p1: PT; p2: PT; fill: string; }
interface Tri extends Base { type: 'triangle'; p1: PT; p2: PT; p3: PT; fill: string; }
interface Zone extends Base { type: 'zone'; priceTop: number; priceBot: number; label: string; }
interface Fib extends Base { type: 'fib' | 'fibext'; p1: PT; p2: PT; }
interface LongPos extends Base { type: 'long'; entry: number; tp: number; sl: number; }
interface ShortPos extends Base { type: 'short'; entry: number; tp: number; sl: number; }
interface Measure extends Base { type: 'measure'; p1: PT; p2: PT; }
interface TextLbl extends Base { type: 'text'; price: number; time: number; text: string; }

type Drawing = HLine | VLine | TLine | HChannel | PChannel | Rect | Tri | Zone | Fib | LongPos | ShortPos | Measure | TextLbl;

// ─── Drag handle descriptor ─────────────────────────────────────────────────────
interface Handle {
  id: string;       // drawing id
  key: string;       // unique handle key e.g. 'p1','p2','price','priceTop'
  x: number;       // pixel x
  y: number;       // pixel y
}

// ─── Candle helpers ─────────────────────────────────────────────────────────────
async function fetchCandles(sym: string, interval: string, limit = 300) {
  const r = await fetch(`https://api.binance.com/api/v3/klines?symbol=${sym}&interval=${interval}&limit=${limit}`);
  if (!r.ok) throw new Error('fetch failed');
  const raw: any[][] = await r.json();
  return raw.map(k => ({ time: Math.floor(k[0] / 1000) as any, open: +k[1], high: +k[2], low: +k[3], close: +k[4] }));
}
function deterministicCandles(ins: string, count = 300) {
  const CFG: Record<string, { price: number; vol: number; prec: number }> = {
    GOLD: { price: 2684.5, vol: 0.0035, prec: 2 }, SILVER: { price: 31.85, vol: 0.0075, prec: 3 },
    'BTC/USDT': { price: 92500, vol: 0.012, prec: 2 }, 'ETH/USDT': { price: 3480, vol: 0.014, prec: 2 },
    'SOL/USDT': { price: 186, vol: 0.018, prec: 2 }, 'XRP/USDT': { price: 2.45, vol: 0.016, prec: 4 },
  };
  const { price: base, vol, prec } = CFG[ins] ?? { price: 100, vol: 0.01, prec: 2 };
  const now = Math.floor(Date.now() / 1000);
  let s = Math.abs([...ins].reduce((a, c) => (a << 5) - a + c.charCodeAt(0), 0)) || 5381;
  const rng = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
  let p = base; const out = [];
  for (let i = 0; i < count; i++) {
    const d = (rng() - 0.49) * vol * p, o = +((p - d).toFixed(prec)), c = +(p.toFixed(prec)), sp = Math.abs(c - o);
    out.push({ time: (now - i * 3600) as any, open: o, high: +((Math.max(o, c) + rng() * (sp + p * 0.001)).toFixed(prec)), low: +((Math.min(o, c) - rng() * (sp + p * 0.001)).toFixed(prec)), close: c });
    p = o;
  }
  return out.reverse();
}
const fmt = (p: number, ins: string) => {
  const d = ins === 'XRP/USDT' ? 4 : ins === 'SILVER' ? 3 : 2;
  return p.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
};

// ─── Coordinate helpers (v5: priceToCoordinate is on series, NOT priceScale) ─────
function toXY(chart: IChartApi, series: ISeriesApi<'Candlestick'>, time: number, price: number): [number, number] | null {
  const x = chart.timeScale().timeToCoordinate(time as any);
  const y = series.priceToCoordinate(price);
  if (x == null || y == null) return null;
  return [x, y];
}

// ─── Props ──────────────────────────────────────────────────────────────────────
interface Props {
  tvSymbol?: string; instrument: string; prediction?: Prediction | null;
  timeframe?: string; height?: number; showTimeframeBar?: boolean;
  allowDrawing?: boolean; currentPrice?: number | null;
}

// ─── Tooltip toolbar button ─────────────────────────────────────────────────────
const Tip: React.FC<{ label: string; active: boolean; onClick: () => void; variant?: 'green' | 'red'; children: React.ReactNode }> =
  ({ label, active, onClick, variant, children }) => {
    const [show, setShow] = useState(false);
    const cls = active
      ? variant === 'green' ? 'bg-[var(--color-success)] text-white'
        : variant === 'red' ? 'bg-[var(--color-danger)] text-white'
          : 'bg-[var(--brand-primary)] text-white'
      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]';
    return (
      <div className="relative" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
        <button type="button" onClick={onClick} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${cls}`}>{children}</button>
        {show && (
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-[999] pointer-events-none">
            <div className="px-2.5 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] shadow-xl whitespace-nowrap">{label}</div>
          </div>
        )}
      </div>
    );
  };

type ToolEntry = { tool: DrawTool; icon: React.ReactNode; label: string; variant?: 'green' | 'red' };
const TOOL_GROUPS: { name: string; tools: ToolEntry[] }[] = [
  {
    name: 'nav', tools: [
      { tool: 'cursor', icon: <MousePointer className="w-4 h-4" />, label: 'Cursor — select & drag drawings' },
      { tool: 'eraser', icon: <Eraser className="w-4 h-4" />, label: 'Eraser — click drawing to delete' },
    ]
  },
  {
    name: 'lines', tools: [
      { tool: 'hline', icon: <Minus className="w-4 h-4" />, label: 'Horizontal Line — 1 click' },
      { tool: 'vline', icon: <AlignJustify className="w-4 h-4 rotate-90" />, label: 'Vertical Line — 1 click' },
      { tool: 'extline', icon: <Layers className="w-4 h-4" />, label: 'Extended Line (both dirs) — 2 clicks' },
      { tool: 'trendline', icon: <TrendIcon className="w-4 h-4" />, label: 'Trend Line — 2 clicks' },
      { tool: 'ray', icon: <ArrowRight className="w-4 h-4" />, label: 'Ray (extends right) — 2 clicks' },
      { tool: 'arrow', icon: <ArrowUpRight className="w-4 h-4" />, label: 'Arrow — 2 clicks' },
    ]
  },
  {
    name: 'channels', tools: [
      { tool: 'hchannel', icon: <BarChart2 className="w-4 h-4" />, label: 'Horizontal Channel — 2 clicks' },
      { tool: 'pchannel', icon: <TrendIcon className="w-4 h-4" />, label: 'Parallel Channel — 3 clicks' },
    ]
  },
  {
    name: 'shapes', tools: [
      { tool: 'rect', icon: <Square className="w-4 h-4" />, label: 'Rectangle — 2 clicks' },
      { tool: 'triangle', icon: <Triangle className="w-4 h-4" />, label: 'Triangle — 3 clicks' },
      { tool: 'zone', icon: <Layers className="w-4 h-4" />, label: 'Price Zone — 2 clicks' },
    ]
  },
  {
    name: 'fib', tools: [
      { tool: 'fib', icon: <GitCommitHorizontal className="w-4 h-4" />, label: 'Fibonacci Retracement — 2 clicks' },
      { tool: 'fibext', icon: <GitCommitHorizontal className="w-4 h-4 rotate-180" />, label: 'Fibonacci Extension — 2 clicks' },
    ]
  },
  {
    name: 'positions', tools: [
      { tool: 'long', icon: <TrendingUp className="w-4 h-4" />, label: 'Long Position — entry then TP', variant: 'green' },
      { tool: 'short', icon: <TrendingDown className="w-4 h-4" />, label: 'Short Position — entry then TP', variant: 'red' },
      { tool: 'measure', icon: <Ruler className="w-4 h-4" />, label: 'Measure Range — 2 clicks' },
    ]
  },
  {
    name: 'misc', tools: [
      { tool: 'text', icon: <Type className="w-4 h-4" />, label: 'Text Label — 1 click' },
    ]
  },
];

// ─── Main Component ─────────────────────────────────────────────────────────────
export const ZoneLinesChart: React.FC<Props> = ({
  instrument, prediction, timeframe: tframeProp,
  height = 460, showTimeframeBar = true,
  allowDrawing = false, currentPrice = null,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const { theme } = useUIStore();
  const themeRef = useRef(theme);

  const [activeTF, setActiveTF] = useState(tframeProp ?? prediction?.timeframe ?? '1h');
  const binanceSym = INSTRUMENT_TO_BINANCE[instrument];
  const interval = TIMEFRAME_TO_INTERVAL[activeTF] ?? '1h';

  // Drawing state
  const [activeTool, setActiveTool] = useState<DrawTool>('cursor');
  const [drawings, setDrawings] = useState<Map<string, Drawing[]>>(new Map());
  const [pendingPts, setPendingPts] = useState<PT[]>([]);
  const [preview, setPreview] = useState<PT | null>(null);
  const [colorIdx, setColorIdx] = useState(0);
  const [textPrompt, setTextPrompt] = useState<PT | null>(null);
  const [textVal, setTextVal] = useState('');
  const [svgSize, setSvgSize] = useState({ w: 0, h: 0 });
  const [tick, setTick] = useState(0);

  // Selection & drag
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ drawingId: string; handleKey: string } | null>(null);
  const [editPanel, setEditPanel] = useState<{ drawingId: string; x: number; y: number } | null>(null);

  // Refs mirror state for closures
  const activeToolRef = useRef<DrawTool>('cursor');
  const pendingPtsRef = useRef<PT[]>([]);
  const colorIdxRef = useRef(0);
  const instrumentRef = useRef(instrument);
  const drawingsRef = useRef<Map<string, Drawing[]>>(new Map());
  const draggingRef = useRef<{ drawingId: string; handleKey: string } | null>(null);

  useEffect(() => { activeToolRef.current = activeTool; }, [activeTool]);
  useEffect(() => { pendingPtsRef.current = pendingPts; }, [pendingPts]);
  useEffect(() => { colorIdxRef.current = colorIdx; }, [colorIdx]);
  useEffect(() => { instrumentRef.current = instrument; }, [instrument]);
  useEffect(() => { drawingsRef.current = drawings; }, [drawings]);
  useEffect(() => { draggingRef.current = dragging; }, [dragging]);

  const nc = useCallback(() => { const c = PALETTE[colorIdxRef.current % PALETTE.length]; setColorIdx(i => i + 1); return c; }, []);

  const insDrawings = useMemo(() => drawings.get(instrument) ?? [], [drawings, instrument]);

  const updateDrawing = useCallback((id: string, patch: Partial<Drawing>) => {
    setDrawings(prev => {
      const next = new Map(prev);
      const ins = instrumentRef.current;
      next.set(ins, (next.get(ins) ?? []).map(d => d.id === id ? { ...d, ...patch } as Drawing : d));
      return next;
    });
    setTick(t => t + 1);
  }, []);

  const removeDrawing = useCallback((id: string) => {
    setDrawings(prev => { const n = new Map(prev); n.set(instrument, (n.get(instrument) ?? []).filter(d => d.id !== id)); return n; });
    setSelectedId(s => s === id ? null : s);
    setEditPanel(e => e?.drawingId === id ? null : e);
    setTick(t => t + 1);
  }, [instrument]);

  const clearAll = useCallback(() => {
    setDrawings(prev => { const n = new Map(prev); n.set(instrument, []); return n; });
    setPendingPts([]); pendingPtsRef.current = [];
    setSelectedId(null); setEditPanel(null);
    setTick(t => t + 1);
  }, [instrument]);

  // ── Theme ────────────────────────────────────────────────────────────────────
  const getColors = useCallback(() => {
    const l = theme === 'neo-light';
    return { bg: l ? '#ffffff' : '#121019', border: l ? 'rgba(141,88,231,0.15)' : 'rgba(177,124,254,0.12)', text: l ? '#6f6979' : '#8e8a9f' };
  }, [theme]);

  const tfBarH = showTimeframeBar ? 34 : 0;
  const canvasH = height - tfBarH;

  // ── Create chart ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    const { bg, border, text } = getColors();
    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth, height: canvasH,
      layout: { background: { color: bg }, textColor: text, fontFamily: 'Inter,system-ui,sans-serif', fontSize: 11 },
      grid: { vertLines: { color: border, style: LineStyle.Dashed }, horzLines: { color: border, style: LineStyle.Dashed } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: border, autoScale: true },
      timeScale: { borderColor: border, timeVisible: true, secondsVisible: false },
      handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: { time: true, price: true }, axisDoubleClickReset: { time: true, price: true } },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: true },
    });
    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e', downColor: '#ef4444', borderUpColor: '#22c55e', borderDownColor: '#ef4444', wickUpColor: '#22c55e', wickDownColor: '#ef4444',
    } as any);
    chartRef.current = chart; candleRef.current = series;
    const container = containerRef.current;

    const syncSize = () => { if (containerRef.current) { const { clientWidth, clientHeight } = containerRef.current; setSvgSize({ w: clientWidth, h: clientHeight }); chart.applyOptions({ width: clientWidth }); } };
    const ro = new ResizeObserver(syncSize); ro.observe(container); syncSize();
    chart.timeScale().subscribeVisibleTimeRangeChange(() => setTick(t => t + 1));

    // ── subscribeClick: place drawings ─────────────────────────────────────────
    chart.subscribeClick((p: MouseEventParams) => {
      const tool = activeToolRef.current;
      // In cursor mode, click deselects (selection is handled by SVG handles)
      if (tool === 'cursor') { setSelectedId(null); setEditPanel(null); return; }
      if (!p.point || !p.time) return;
      const price = series.coordinateToPrice(p.point.y); if (price == null) return;
      const time = typeof p.time === 'number' ? p.time : Math.floor(Date.now() / 1000);
      const pt: PT = { time, price };
      const id = `d_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const ins = instrumentRef.current;
      const col = PALETTE[colorIdxRef.current % PALETTE.length];
      const pts = pendingPtsRef.current;

      if (tool === 'eraser') {
        const chartI = chartRef.current, seriesI = candleRef.current;
        if (!chartI || !seriesI) return;
        const all = drawingsRef.current.get(ins) ?? [];
        let nearest: Drawing | null = null, minDist = 40;
        all.forEach(d => {
          let dist = 9999;
          if (d.type === 'hline') { const y2 = seriesI.priceToCoordinate((d as HLine).price); if (y2 != null) dist = Math.abs(y2 - p.point!.y); }
          else if (d.type === 'vline') { const x2 = chartI.timeScale().timeToCoordinate((d as VLine).time as any); if (x2 != null) dist = Math.abs(x2 - p.point!.x); }
          else if ('p1' in d) {
            const tl = d as TLine;
            const a = toXY(chartI, seriesI, tl.p1.time, tl.p1.price), b = toXY(chartI, seriesI, tl.p2.time, tl.p2.price);
            if (a && b) { const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.sqrt(dx * dx + dy * dy); if (len > 0) dist = Math.abs(dx * (a[1] - p.point!.y) - dy * (a[0] - p.point!.x)) / len; }
          }
          if (dist < minDist) { minDist = dist; nearest = d; }
        });
        if (nearest) { setDrawings(prev => { const n = new Map(prev); n.set(ins, (n.get(ins) ?? []).filter(d => d.id !== (nearest as Drawing).id)); return n; }); setTick(t => t + 1); }
        return;
      }

      const add = (d: Drawing) => { setDrawings(prev => { const n = new Map(prev); n.set(ins, [...(n.get(ins) ?? []), d]); return n; }); setColorIdx(i => i + 1); setTick(t => t + 1); };

      if (tool === 'hline') { add({ id, type: 'hline', price, color: col, label: fmt(price, ins) } as HLine); return; }
      if (tool === 'vline') { add({ id, type: 'vline', time, color: col } as VLine); return; }
      if (tool === 'text') { setTextPrompt(pt); return; }

      // 2-point
      const two = ['extline', 'trendline', 'ray', 'arrow', 'hchannel', 'rect', 'fib', 'fibext', 'measure'] as DrawTool[];
      if (two.includes(tool)) {
        if (!pts.length) { setPendingPts([pt]); pendingPtsRef.current = [pt]; }
        else {
          const p1 = pts[0];
          if (tool === 'extline') add({ id, type: 'extline', p1, p2: pt, color: col } as TLine);
          if (tool === 'trendline') add({ id, type: 'trendline', p1, p2: pt, color: col } as TLine);
          if (tool === 'ray') add({ id, type: 'ray', p1, p2: pt, color: col } as TLine);
          if (tool === 'arrow') add({ id, type: 'arrow', p1, p2: pt, color: col } as TLine);
          if (tool === 'hchannel') add({ id, type: 'hchannel', priceTop: Math.max(p1.price, pt.price), priceBot: Math.min(p1.price, pt.price), color: col } as HChannel);
          if (tool === 'rect') add({ id, type: 'rect', p1, p2: pt, color: col, fill: col + '33' } as Rect);
          if (tool === 'fib') add({ id, type: 'fib', p1, p2: pt, color: col } as Fib);
          if (tool === 'fibext') add({ id, type: 'fibext', p1, p2: pt, color: col } as Fib);
          if (tool === 'measure') add({ id, type: 'measure', p1, p2: pt, color: '#fbbf24' } as Measure);
          setPendingPts([]); pendingPtsRef.current = [];
        }
        return;
      }
      // zone
      if (tool === 'zone') {
        if (!pts.length) { setPendingPts([pt]); pendingPtsRef.current = [pt]; }
        else { const top = Math.max(pts[0].price, pt.price), bot = Math.min(pts[0].price, pt.price); add({ id, type: 'zone', priceTop: top, priceBot: bot, color: col, label: `${fmt(bot, ins)}–${fmt(top, ins)}` } as Zone); setPendingPts([]); pendingPtsRef.current = []; }
        return;
      }
      // 3-point
      if (tool === 'long') {
        if (!pts.length) { setPendingPts([pt]); pendingPtsRef.current = [pt]; }
        else { const entry = pts[0].price, tp = pt.price, sl = entry - (tp - entry); add({ id, type: 'long', entry, tp, sl, color: '#22c55e' } as LongPos); setPendingPts([]); pendingPtsRef.current = []; }
        return;
      }
      if (tool === 'short') {
        if (!pts.length) { setPendingPts([pt]); pendingPtsRef.current = [pt]; }
        else { const entry = pts[0].price, tp = pt.price, sl = entry + (entry - tp); add({ id, type: 'short', entry, tp, sl, color: '#ef4444' } as ShortPos); setPendingPts([]); pendingPtsRef.current = []; }
        return;
      }
      if (tool === 'pchannel') {
        if (pts.length < 2) { setPendingPts([...pts, pt]); pendingPtsRef.current = [...pts, pt]; }
        else { const offset = pt.price - pts[0].price; add({ id, type: 'pchannel', p1: pts[0], p2: pts[1], offset, color: col } as PChannel); setPendingPts([]); pendingPtsRef.current = []; }
        return;
      }
      if (tool === 'triangle') {
        if (pts.length < 2) { setPendingPts([...pts, pt]); pendingPtsRef.current = [...pts, pt]; }
        else { add({ id, type: 'triangle', p1: pts[0], p2: pts[1], p3: pt, color: col, fill: col + '33' } as Tri); setPendingPts([]); pendingPtsRef.current = []; }
      }
    });

    chart.subscribeCrosshairMove((p: MouseEventParams) => {
      if (!p.point || !p.time) { setPreview(null); return; }
      const price = series.coordinateToPrice(p.point.y); if (price == null) { setPreview(null); return; }
      const time = typeof p.time === 'number' ? p.time : Math.floor(Date.now() / 1000);
      setPreview({ time, price }); setTick(t => t + 1);
    });

    const onWheel = (e: WheelEvent) => {
      e.preventDefault(); e.stopPropagation();
      if (e.ctrlKey || e.metaKey) { const ts = chart.timeScale(); const r = ts.getVisibleLogicalRange(); if (!r) return; const f = e.deltaY > 0 ? 1.12 : 0.88, c = (r.to + r.from) / 2, span = r.to - r.from; ts.setVisibleLogicalRange({ from: c - (span * f) / 2, to: c + (span * f) / 2 }); return; }
      if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) { const ts = chart.timeScale(); const r = ts.getVisibleLogicalRange(); if (!r) return; const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY; ts.setVisibleLogicalRange({ from: r.from + (d / 100) * Math.max(3, (r.to - r.from) * 0.18), to: r.to + (d / 100) * Math.max(3, (r.to - r.from) * 0.18) }); return; }
      const ps = chart.priceScale('right'); const r = ps.getVisibleRange(); if (!r) return;
      const step = (-e.deltaY / 100) * ((r.to - r.from) * 0.08); ps.applyOptions({ autoScale: false }); ps.setVisibleRange({ from: r.from + step, to: r.to + step });
    };
    container.addEventListener('wheel', onWheel, { passive: false });
    container.addEventListener('dblclick', () => { chart.priceScale('right').applyOptions({ autoScale: true }); chart.timeScale().fitContent(); });
    return () => { container.removeEventListener('wheel', onWheel); ro.disconnect(); chart.remove(); chartRef.current = null; candleRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasH, getColors]);

  // Theme sync
  useEffect(() => { if (!chartRef.current) return; const { bg, border, text } = getColors(); chartRef.current.applyOptions({ layout: { background: { color: bg }, textColor: text }, grid: { vertLines: { color: border }, horzLines: { color: border } }, rightPriceScale: { borderColor: border }, timeScale: { borderColor: border } }); }, [theme, getColors]);

  // Load candles
  useEffect(() => {
    const s = candleRef.current; if (!s) return;
    const prec = instrument === 'XRP/USDT' ? 4 : instrument === 'SILVER' ? 3 : 2;
    s.applyOptions({ priceFormat: { type: 'price', precision: prec, minMove: Math.pow(10, -prec) } });
    const load = binanceSym ? fetchCandles(binanceSym, interval).catch(() => deterministicCandles(instrument)) : Promise.resolve(deterministicCandles(instrument));
    load.then(d => { s.setData(d); chartRef.current?.timeScale().fitContent(); });
  }, [binanceSym, instrument, interval]);

  // Signal lines
  useEffect(() => {
    const s = candleRef.current; if (!s) return;
    const f = (p: number) => fmt(p, instrument);
    const lines = prediction ? [
      prediction.buyingZone && { price: prediction.buyingZone, color: '#22c55e', label: `Buy Zone $${f(prediction.buyingZone)}`, style: LineStyle.Solid },
      prediction.sellingZone && { price: prediction.sellingZone, color: '#ef4444', label: `Sell Zone $${f(prediction.sellingZone)}`, style: LineStyle.Solid },
      prediction.stopLoss && { price: prediction.stopLoss, color: '#f97316', label: `SL $${f(prediction.stopLoss)}`, style: LineStyle.SparseDotted },
      prediction.takeProfit && { price: prediction.takeProfit, color: '#34d399', label: `TP1 $${f(prediction.takeProfit)}`, style: LineStyle.SparseDotted },
      prediction.takeProfit2 && { price: prediction.takeProfit2, color: '#6ee7b7', label: `TP2 $${f(prediction.takeProfit2)}`, style: LineStyle.SparseDotted },
      prediction.takeProfit3 && { price: prediction.takeProfit3, color: '#a7f3d0', label: `TP3 $${f(prediction.takeProfit3)}`, style: LineStyle.SparseDotted },
    ].filter(Boolean) as any[] : [];
    const refs = lines.map((l: any) => s.createPriceLine({ price: l.price, color: l.color, lineWidth: 2, lineStyle: l.style, axisLabelVisible: true, title: l.label }));
    return () => { refs.forEach((r: any) => { try { s.removePriceLine(r); } catch { } }); };
  }, [prediction, instrument]);

  // Current price line
  useEffect(() => {
    const s = candleRef.current; if (!s || !currentPrice || currentPrice <= 0) return;
    const entry = prediction?.buyingZone ?? prediction?.sellingZone ?? null;
    const isLong = prediction?.direction === 'LONG';
    let color = '#94a3b8';
    if (entry) color = (isLong ? currentPrice >= entry : currentPrice <= entry) ? '#22c55e' : '#ef4444';
    const pnl = entry ? ` (${isLong ? (currentPrice >= entry ? '▲' : '▼') : (currentPrice <= entry ? '▲' : '▼')} $${fmt(Math.abs(currentPrice - entry), instrument)})` : '';
    const line = s.createPriceLine({ price: currentPrice, color, lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: `Now $${fmt(currentPrice, instrument)}${pnl}` });
    return () => { try { s.removePriceLine(line); } catch { } };
  }, [currentPrice, prediction, instrument]);

  // ── Build handles for selected drawing ────────────────────────────────────────
  const buildHandles = useCallback((d: Drawing, series: ISeriesApi<'Candlestick'>, chart: IChartApi): Handle[] => {
    const pY = (p: number) => series.priceToCoordinate(p);
    const tX = (t: number) => chart.timeScale().timeToCoordinate(t as any);
    const xy = (t: number, p: number) => toXY(chart, series, t, p);
    const handles: Handle[] = [];
    switch (d.type) {
      case 'hline': { const y = pY((d as HLine).price); if (y != null) { handles.push({ id: d.id, key: 'price', x: svgSize.w / 2, y }); handles.push({ id: d.id, key: 'price', x: svgSize.w * 0.25, y }); } break; }
      case 'vline': { const x = tX((d as VLine).time); if (x != null) { handles.push({ id: d.id, key: 'time', x, y: svgSize.h / 2 }); } break; }
      case 'extline': case 'trendline': case 'ray': case 'arrow': { const tl = d as TLine; const a = xy(tl.p1.time, tl.p1.price), b = xy(tl.p2.time, tl.p2.price); if (a) handles.push({ id: d.id, key: 'p1', x: a[0], y: a[1] }); if (b) handles.push({ id: d.id, key: 'p2', x: b[0], y: b[1] }); break; }
      case 'hchannel': { const hc = d as HChannel; const yT = pY(hc.priceTop), yB = pY(hc.priceBot); if (yT != null) handles.push({ id: d.id, key: 'priceTop', x: svgSize.w / 2, y: yT }); if (yB != null) handles.push({ id: d.id, key: 'priceBot', x: svgSize.w / 2, y: yB }); break; }
      case 'pchannel': { const pc = d as PChannel; const a = xy(pc.p1.time, pc.p1.price), b = xy(pc.p2.time, pc.p2.price); if (a) handles.push({ id: d.id, key: 'p1', x: a[0], y: a[1] }); if (b) handles.push({ id: d.id, key: 'p2', x: b[0], y: b[1] }); break; }
      case 'rect': { const r = d as Rect; const a = xy(r.p1.time, r.p1.price), b = xy(r.p2.time, r.p2.price); if (a) handles.push({ id: d.id, key: 'p1', x: a[0], y: a[1] }); if (b) handles.push({ id: d.id, key: 'p2', x: b[0], y: b[1] }); break; }
      case 'triangle': { const t = d as Tri; const a = xy(t.p1.time, t.p1.price), b = xy(t.p2.time, t.p2.price), c = xy(t.p3.time, t.p3.price); if (a) handles.push({ id: d.id, key: 'p1', x: a[0], y: a[1] }); if (b) handles.push({ id: d.id, key: 'p2', x: b[0], y: b[1] }); if (c) handles.push({ id: d.id, key: 'p3', x: c[0], y: c[1] }); break; }
      case 'zone': { const z = d as Zone; const yT = pY(z.priceTop), yB = pY(z.priceBot); if (yT != null) handles.push({ id: d.id, key: 'priceTop', x: svgSize.w / 2, y: yT }); if (yB != null) handles.push({ id: d.id, key: 'priceBot', x: svgSize.w / 2, y: yB }); break; }
      case 'fib': case 'fibext': { const f = d as Fib; const a = xy(f.p1.time, f.p1.price), b = xy(f.p2.time, f.p2.price); if (a) handles.push({ id: d.id, key: 'p1', x: a[0], y: a[1] }); if (b) handles.push({ id: d.id, key: 'p2', x: b[0], y: b[1] }); break; }
      case 'long': { const lp = d as LongPos; const yE = pY(lp.entry), yT = pY(lp.tp), yS = pY(lp.sl); if (yE != null) handles.push({ id: d.id, key: 'entry', x: svgSize.w * 0.3, y: yE }); if (yT != null) handles.push({ id: d.id, key: 'tp', x: svgSize.w * 0.3, y: yT }); if (yS != null) handles.push({ id: d.id, key: 'sl', x: svgSize.w * 0.3, y: yS }); break; }
      case 'short': { const sp = d as ShortPos; const yE = pY(sp.entry), yT = pY(sp.tp), yS = pY(sp.sl); if (yE != null) handles.push({ id: d.id, key: 'entry', x: svgSize.w * 0.3, y: yE }); if (yT != null) handles.push({ id: d.id, key: 'tp', x: svgSize.w * 0.3, y: yT }); if (yS != null) handles.push({ id: d.id, key: 'sl', x: svgSize.w * 0.3, y: yS }); break; }
      case 'measure': { const m = d as Measure; const a = xy(m.p1.time, m.p1.price), b = xy(m.p2.time, m.p2.price); if (a) handles.push({ id: d.id, key: 'p1', x: a[0], y: a[1] }); if (b) handles.push({ id: d.id, key: 'p2', x: b[0], y: b[1] }); break; }
      case 'text': { const tl = d as TextLbl; const c = xy(tl.time, tl.price); if (c) handles.push({ id: d.id, key: 'pos', x: c[0], y: c[1] }); break; }
    }
    return handles;
  }, [svgSize]);

  // ── SVG drag handlers ─────────────────────────────────────────────────────────
  const onHandleMouseDown = useCallback((e: React.MouseEvent, drawingId: string, handleKey: string) => {
    e.stopPropagation(); e.preventDefault();
    setDragging({ drawingId, handleKey }); draggingRef.current = { drawingId, handleKey };
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const drag = draggingRef.current; if (!drag) return;
      const chart = chartRef.current, series = candleRef.current; if (!chart || !series) return;
      const container = containerRef.current; if (!container) return;
      const rect = container.getBoundingClientRect();
      const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
      const price = series.coordinateToPrice(cy);
      const time = chart.timeScale().coordinateToTime(cx) as any;
      if (price == null) return;
      const ins = instrumentRef.current;
      const { drawingId, handleKey } = drag;

      setDrawings(prev => {
        const n = new Map(prev);
        n.set(ins, (n.get(ins) ?? []).map(d => {
          if (d.id !== drawingId) return d;
          const dd = { ...d } as any;
          if (handleKey === 'p1' && 'p1' in dd) dd.p1 = { time: time ?? dd.p1.time, price };
          else if (handleKey === 'p2' && 'p2' in dd) dd.p2 = { time: time ?? dd.p2.time, price };
          else if (handleKey === 'p3' && 'p3' in dd) dd.p3 = { time: time ?? dd.p3.time, price };
          else if (handleKey === 'price') dd.price = price;
          else if (handleKey === 'priceTop') dd.priceTop = price;
          else if (handleKey === 'priceBot') dd.priceBot = price;
          else if (handleKey === 'entry') dd.entry = price;
          else if (handleKey === 'tp') dd.tp = price;
          else if (handleKey === 'sl') dd.sl = price;
          else if (handleKey === 'pos') { dd.price = price; dd.time = time ?? dd.time; }
          else if (handleKey === 'time') dd.time = time ?? dd.time;
          // Sync labels
          if (dd.type === 'hline') dd.label = fmt(dd.price, ins);
          if (dd.type === 'zone') dd.label = `${fmt(dd.priceBot, ins)}–${fmt(dd.priceTop, ins)}`;
          return dd as Drawing;
        }));
        return n;
      });
      setTick(t => t + 1);
    };
    const onUp = () => { setDragging(null); draggingRef.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  // ── SVG Renderer ─────────────────────────────────────────────────────────────
  const renderSVG = useCallback(() => {
    const chart = chartRef.current; if (!chart || svgSize.w === 0) return null;
    const series = candleRef.current; if (!series) return null;
    const ins = instrument;
    const xy = (t: number, p: number) => toXY(chart, series, t, p);
    const pY = (p: number) => series.priceToCoordinate(p);
    const tX = (t: number) => chart.timeScale().timeToCoordinate(t as any);
    const W = svgSize.w, H = svgSize.h;
    const FL = -200, FR = W + 200;

    const extLine = (x1: number, y1: number, x2: number, y2: number, mode: 'extend' | 'ray' | 'seg'): [number, number, number, number] => {
      if (mode === 'seg') return [x1, y1, x2, y2];
      const dx = x2 - x1, dy = y2 - y1;
      if (Math.abs(dx) < 0.001) return [x1, 0, x1, H];
      const slope = dy / dx, b = y1 - slope * x1;
      if (mode === 'ray') return [x1, y1, FR, slope * FR + b];
      return [FL, slope * FL + b, FR, slope * FR + b];
    };

    const elems: React.ReactNode[] = [];
    const allD = drawings.get(ins) ?? [];
    const sel = selectedId;

    allD.forEach(d => {
      const isSel = d.id === sel;
      const selGlow = isSel ? `drop-shadow(0 0 4px ${d.color})` : 'none';

      switch (d.type) {
        case 'hline': {
          const h = d as HLine; const y = pY(h.price); if (y == null) break;
          elems.push(
            <g key={d.id} style={{ filter: selGlow }} onClick={e => { e.stopPropagation(); setSelectedId(d.id); setEditPanel({ drawingId: d.id, x: W - 210, y: y - 60 }); }}>
              <line x1={FL} y1={y} x2={FR} y2={y} stroke={h.color} strokeWidth={isSel ? 2.5 : 1.5} strokeDasharray="6,3" />
              {/* Price label on line */}
              <rect x={4} y={y - 14} width={h.label.length * 6.5 + 10} height={16} rx={3} fill={h.color} opacity={0.85} />
              <text x={9} y={y - 3} fill="#fff" fontSize={9.5} fontFamily="monospace" fontWeight="700">{h.label}</text>
            </g>
          ); break;
        }
        case 'vline': {
          const v = d as VLine; const x = tX(v.time); if (x == null) break;
          elems.push(
            <g key={d.id} style={{ filter: selGlow }} onClick={e => { e.stopPropagation(); setSelectedId(d.id); }}>
              <line x1={x} y1={0} x2={x} y2={H} stroke={v.color} strokeWidth={isSel ? 2 : 1} strokeDasharray="4,3" opacity={0.85} />
            </g>
          ); break;
        }
        case 'extline': case 'trendline': case 'ray': case 'arrow': {
          const tl = d as TLine; const a = xy(tl.p1.time, tl.p1.price), b = xy(tl.p2.time, tl.p2.price); if (!a || !b) break;
          const mode = tl.type === 'extline' ? 'extend' : tl.type === 'ray' ? 'ray' : 'seg';
          const [lx1, ly1, lx2, ly2] = extLine(a[0], a[1], b[0], b[1], mode);
          const arrId = `arr_${d.id}`;
          // Price labels at anchor points
          const pLabelA = `$${fmt(tl.p1.price, ins)}`; const pLabelB = `$${fmt(tl.p2.price, ins)}`;
          elems.push(
            <g key={d.id} style={{ filter: selGlow }} onClick={e => { e.stopPropagation(); setSelectedId(d.id); setEditPanel({ drawingId: d.id, x: Math.max(10, a[0] - 100), y: a[1] - 70 }); }}>
              {tl.type === 'arrow' && <defs><marker id={arrId} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill={tl.color} /></marker></defs>}
              <line x1={lx1} y1={ly1} x2={lx2} y2={ly2} stroke={tl.color} strokeWidth={isSel ? 2.5 : 1.5} markerEnd={tl.type === 'arrow' ? `url(#${arrId})` : 'none'} />
              {/* Anchor dots */}
              <circle cx={a[0]} cy={a[1]} r={3} fill={tl.color} opacity={0.9} />
              <circle cx={b[0]} cy={b[1]} r={3} fill={tl.color} opacity={0.9} />
              {/* Price labels */}
              <rect x={a[0] + 5} y={a[1] - 14} width={pLabelA.length * 6 + 8} height={14} rx={2} fill="rgba(0,0,0,0.7)" />
              <text x={a[0] + 9} y={a[1] - 3} fill={tl.color} fontSize={9} fontFamily="monospace">{pLabelA}</text>
              <rect x={b[0] + 5} y={b[1] - 14} width={pLabelB.length * 6 + 8} height={14} rx={2} fill="rgba(0,0,0,0.7)" />
              <text x={b[0] + 9} y={b[1] - 3} fill={tl.color} fontSize={9} fontFamily="monospace">{pLabelB}</text>
            </g>
          ); break;
        }
        case 'hchannel': {
          const hc = d as HChannel; const yT = pY(hc.priceTop), yB = pY(hc.priceBot); if (yT == null || yB == null) break;
          elems.push(
            <g key={d.id} style={{ filter: selGlow }} onClick={e => { e.stopPropagation(); setSelectedId(d.id); setEditPanel({ drawingId: d.id, x: W - 210, y: (yT + yB) / 2 - 40 }); }}>
              <rect x={0} y={Math.min(yT, yB)} width={W} height={Math.abs(yB - yT)} fill={hc.color} opacity={0.08} />
              <line x1={0} y1={yT} x2={W} y2={yT} stroke={hc.color} strokeWidth={isSel ? 2.5 : 1.5} strokeDasharray="6,3" />
              <line x1={0} y1={yB} x2={W} y2={yB} stroke={hc.color} strokeWidth={isSel ? 2.5 : 1.5} strokeDasharray="6,3" />
              <rect x={4} y={yT - 14} width={fmt(hc.priceTop, ins).length * 6.5 + 10} height={14} rx={2} fill={hc.color} opacity={0.85} />
              <text x={9} y={yT - 3} fill="#fff" fontSize={9} fontFamily="monospace" fontWeight="700">{fmt(hc.priceTop, ins)}</text>
              <rect x={4} y={yB + 2} width={fmt(hc.priceBot, ins).length * 6.5 + 10} height={14} rx={2} fill={hc.color} opacity={0.85} />
              <text x={9} y={yB + 12} fill="#fff" fontSize={9} fontFamily="monospace" fontWeight="700">{fmt(hc.priceBot, ins)}</text>
            </g>
          ); break;
        }
        case 'pchannel': {
          const pc = d as PChannel; const a = xy(pc.p1.time, pc.p1.price), b = xy(pc.p2.time, pc.p2.price);
          const a2 = xy(pc.p1.time, pc.p1.price + pc.offset), b2 = xy(pc.p2.time, pc.p2.price + pc.offset);
          if (!a || !b || !a2 || !b2) break;
          const [lx1, ly1, lx2, ly2] = extLine(a[0], a[1], b[0], b[1], 'extend');
          const [lx3, ly3, lx4, ly4] = extLine(a2[0], a2[1], b2[0], b2[1], 'extend');
          elems.push(
            <g key={d.id} style={{ filter: selGlow }} onClick={e => { e.stopPropagation(); setSelectedId(d.id); }}>
              <polygon points={`${lx1},${ly1} ${lx2},${ly2} ${lx4},${ly4} ${lx3},${ly3}`} fill={pc.color} opacity={0.06} />
              <line x1={lx1} y1={ly1} x2={lx2} y2={ly2} stroke={pc.color} strokeWidth={1.5} />
              <line x1={lx3} y1={ly3} x2={lx4} y2={ly4} stroke={pc.color} strokeWidth={1.5} strokeDasharray="5,3" />
            </g>
          ); break;
        }
        case 'rect': {
          const r = d as Rect; const a = xy(r.p1.time, r.p1.price), b = xy(r.p2.time, r.p2.price); if (!a || !b) break;
          const rx2 = Math.min(a[0], b[0]), ry2 = Math.min(a[1], b[1]), rw = Math.abs(b[0] - a[0]), rh = Math.abs(b[1] - a[1]);
          elems.push(
            <g key={d.id} style={{ filter: selGlow }} onClick={e => { e.stopPropagation(); setSelectedId(d.id); setEditPanel({ drawingId: d.id, x: rx2, y: ry2 - 50 }); }}>
              <rect x={rx2} y={ry2} width={rw} height={rh} fill={r.fill} stroke={r.color} strokeWidth={isSel ? 2 : 1.5} rx={2} />
              <text x={rx2 + 4} y={ry2 - 3} fill={r.color} fontSize={9} fontFamily="monospace">{fmt(r.p1.price, ins)} → {fmt(r.p2.price, ins)}</text>
            </g>
          ); break;
        }
        case 'triangle': {
          const t = d as Tri; const a = xy(t.p1.time, t.p1.price), b = xy(t.p2.time, t.p2.price), c = xy(t.p3.time, t.p3.price); if (!a || !b || !c) break;
          elems.push(
            <g key={d.id} style={{ filter: selGlow }} onClick={e => { e.stopPropagation(); setSelectedId(d.id); }}>
              <polygon points={`${a[0]},${a[1]} ${b[0]},${b[1]} ${c[0]},${c[1]}`} fill={t.fill} stroke={t.color} strokeWidth={isSel ? 2 : 1.5} />
            </g>
          ); break;
        }
        case 'zone': {
          const z = d as Zone; const yT = pY(z.priceTop), yB = pY(z.priceBot); if (yT == null || yB == null) break;
          elems.push(
            <g key={d.id} style={{ filter: selGlow }} onClick={e => { e.stopPropagation(); setSelectedId(d.id); setEditPanel({ drawingId: d.id, x: W - 210, y: (yT + yB) / 2 - 40 }); }}>
              <rect x={0} y={Math.min(yT, yB)} width={W} height={Math.abs(yB - yT)} fill={d.color} opacity={0.12} />
              <line x1={0} y1={yT} x2={W} y2={yT} stroke={d.color} strokeWidth={1.5} />
              <line x1={0} y1={yB} x2={W} y2={yB} stroke={d.color} strokeWidth={1.5} />
              {/* Price labels on both borders */}
              <rect x={4} y={yT - 14} width={fmt(z.priceTop, ins).length * 6.5 + 10} height={14} rx={2} fill={d.color} opacity={0.85} />
              <text x={9} y={yT - 3} fill="#fff" fontSize={9} fontFamily="monospace" fontWeight="700">{fmt(z.priceTop, ins)}</text>
              <rect x={4} y={yB + 2} width={fmt(z.priceBot, ins).length * 6.5 + 10} height={14} rx={2} fill={d.color} opacity={0.85} />
              <text x={9} y={yB + 12} fill="#fff" fontSize={9} fontFamily="monospace" fontWeight="700">{fmt(z.priceBot, ins)}</text>
            </g>
          ); break;
        }
        case 'fib': case 'fibext': {
          const f = d as Fib; const high = Math.max(f.p1.price, f.p2.price), range = Math.abs(f.p2.price - f.p1.price);
          const levels = d.type === 'fib' ? FIB_LEVELS : [...FIB_LEVELS, ...FIB_EXT];
          elems.push(
            <g key={d.id} style={{ filter: selGlow }} onClick={e => { e.stopPropagation(); setSelectedId(d.id); }}>
              {levels.map(level => {
                const fibP = high - range * level; const y = pY(fibP); if (y == null) return null;
                const c = FIB_COLORS[level] ?? '#94a3b8';
                return (
                  <g key={level}>
                    <line x1={0} y1={y} x2={W} y2={y} stroke={c} strokeWidth={1} strokeDasharray="4,3" />
                    <rect x={W - 110} y={y - 12} width={108} height={14} rx={2} fill="rgba(0,0,0,0.75)" />
                    <text x={W - 6} y={y - 1} textAnchor="end" fill={c} fontSize={9} fontFamily="monospace" fontWeight="600">
                      {(level * 100).toFixed(1)}% — {fmt(fibP, ins)}
                    </text>
                  </g>
                );
              })}
              {[f.p1, f.p2].map((pt, i) => { const c = xy(pt.time, pt.price); return c ? <circle key={i} cx={c[0]} cy={c[1]} r={4} fill={d.color} opacity={0.9} /> : null; })}
            </g>
          ); break;
        }
        case 'long': {
          const lp = d as LongPos; const yE = pY(lp.entry), yT = pY(lp.tp), yS = pY(lp.sl); if (yE == null || yT == null || yS == null) break;
          const pH = Math.abs(yE - yT), lH = Math.abs(yS - yE);
          elems.push(
            <g key={d.id} style={{ filter: selGlow }} onClick={e => { e.stopPropagation(); setSelectedId(d.id); setEditPanel({ drawingId: d.id, x: 10, y: Math.min(yT, yE, yS) - 60 }); }}>
              <rect x={0} y={Math.min(yE, yT)} width={W} height={pH} fill="#22c55e" opacity={0.12} />
              <rect x={0} y={Math.min(yE, yS)} width={W} height={lH} fill="#ef4444" opacity={0.12} />
              <line x1={0} y1={yE} x2={W} y2={yE} stroke="#22c55e" strokeWidth={2} />
              <line x1={0} y1={yT} x2={W} y2={yT} stroke="#34d399" strokeWidth={1.5} strokeDasharray="6,3" />
              <line x1={0} y1={yS} x2={W} y2={yS} stroke="#ef4444" strokeWidth={1.5} strokeDasharray="6,3" />
              {/* Price labels */}
              <rect x={4} y={yE - 14} width={90} height={14} rx={2} fill="#22c55e" opacity={0.85} />
              <text x={9} y={yE - 3} fill="#fff" fontSize={9} fontFamily="monospace" fontWeight="700">▲ Entry {fmt(lp.entry, ins)}</text>
              <rect x={4} y={yT - 14} width={80} height={14} rx={2} fill="#34d399" opacity={0.85} />
              <text x={9} y={yT - 3} fill="#fff" fontSize={9} fontFamily="monospace" fontWeight="700">✓ TP {fmt(lp.tp, ins)}</text>
              <rect x={4} y={yS + 2} width={80} height={14} rx={2} fill="#ef4444" opacity={0.85} />
              <text x={9} y={yS + 12} fill="#fff" fontSize={9} fontFamily="monospace" fontWeight="700">✗ SL {fmt(lp.sl, ins)}</text>
            </g>
          ); break;
        }
        case 'short': {
          const sp = d as ShortPos; const yE = pY(sp.entry), yT = pY(sp.tp), yS = pY(sp.sl); if (yE == null || yT == null || yS == null) break;
          const pH = Math.abs(yE - yT), lH = Math.abs(yS - yE);
          elems.push(
            <g key={d.id} style={{ filter: selGlow }} onClick={e => { e.stopPropagation(); setSelectedId(d.id); setEditPanel({ drawingId: d.id, x: 10, y: Math.min(yT, yE, yS) - 60 }); }}>
              <rect x={0} y={Math.min(yE, yT)} width={W} height={pH} fill="#34d399" opacity={0.12} />
              <rect x={0} y={Math.min(yE, yS)} width={W} height={lH} fill="#f97316" opacity={0.12} />
              <line x1={0} y1={yE} x2={W} y2={yE} stroke="#ef4444" strokeWidth={2} />
              <line x1={0} y1={yT} x2={W} y2={yT} stroke="#34d399" strokeWidth={1.5} strokeDasharray="6,3" />
              <line x1={0} y1={yS} x2={W} y2={yS} stroke="#f97316" strokeWidth={1.5} strokeDasharray="6,3" />
              <rect x={4} y={yE - 14} width={90} height={14} rx={2} fill="#ef4444" opacity={0.85} />
              <text x={9} y={yE - 3} fill="#fff" fontSize={9} fontFamily="monospace" fontWeight="700">▼ Entry {fmt(sp.entry, ins)}</text>
              <rect x={4} y={yT + 2} width={80} height={14} rx={2} fill="#34d399" opacity={0.85} />
              <text x={9} y={yT + 12} fill="#fff" fontSize={9} fontFamily="monospace" fontWeight="700">✓ TP {fmt(sp.tp, ins)}</text>
              <rect x={4} y={yS - 14} width={80} height={14} rx={2} fill="#f97316" opacity={0.85} />
              <text x={9} y={yS - 3} fill="#fff" fontSize={9} fontFamily="monospace" fontWeight="700">✗ SL {fmt(sp.sl, ins)}</text>
            </g>
          ); break;
        }
        case 'measure': {
          const m = d as Measure; const a = xy(m.p1.time, m.p1.price), b = xy(m.p2.time, m.p2.price); if (!a || !b) break;
          const dp = m.p2.price - m.p1.price, pct = ((dp / m.p1.price) * 100).toFixed(2);
          const bars = Math.round(Math.abs(m.p2.time - m.p1.time) / 3600);
          const midX = (a[0] + b[0]) / 2, midY = (a[1] + b[1]) / 2;
          elems.push(
            <g key={d.id} style={{ filter: selGlow }} onClick={e => { e.stopPropagation(); setSelectedId(d.id); }}>
              <rect x={Math.min(a[0], b[0])} y={Math.min(a[1], b[1])} width={Math.abs(b[0] - a[0])} height={Math.abs(b[1] - a[1])} fill="#fbbf24" opacity={0.08} stroke="#fbbf24" strokeWidth={1} strokeDasharray="4,3" />
              <rect x={midX - 65} y={midY - 16} width={130} height={28} rx={5} fill="rgba(0,0,0,0.8)" stroke="#fbbf24" strokeWidth={1} />
              <text x={midX} y={midY - 2} textAnchor="middle" fill="#fbbf24" fontSize={9.5} fontFamily="monospace" fontWeight="700">{dp >= 0 ? '+' : ''}{fmt(dp, ins)} ({dp >= 0 ? '+' : ''}{pct}%)</text>
              <text x={midX} y={midY + 11} textAnchor="middle" fill="#94a3b8" fontSize={8.5} fontFamily="monospace">{bars} bar{bars !== 1 ? 's' : ''}</text>
            </g>
          ); break;
        }
        case 'text': {
          const tl = d as TextLbl; const c = xy(tl.time, tl.price); if (!c) break;
          elems.push(
            <g key={d.id} style={{ filter: selGlow }} onClick={e => { e.stopPropagation(); setSelectedId(d.id); setEditPanel({ drawingId: d.id, x: c[0] + 10, y: c[1] - 60 }); }}>
              <circle cx={c[0]} cy={c[1]} r={4} fill={tl.color} />
              <rect x={c[0] + 6} y={c[1] - 16} width={tl.text.length * 6.5 + 12} height={20} rx={4} fill="rgba(0,0,0,0.75)" stroke={tl.color} strokeWidth={1} />
              <text x={c[0] + 12} y={c[1] - 2} fill={tl.color} fontSize={11} fontFamily="monospace" fontWeight="600">{tl.text}</text>
            </g>
          ); break;
        }
      }

      // Drag handles for selected drawing
      if (isSel) {
        const handles = buildHandles(d, series, chart);
        handles.forEach((h, i) => (
          elems.push(
            <circle key={`h_${d.id}_${i}`}
              cx={h.x} cy={h.y} r={HANDLE_R}
              fill={d.color} stroke="#fff" strokeWidth={1.5}
              style={{ cursor: 'move', pointerEvents: 'all' }}
              onMouseDown={e => onHandleMouseDown(e, h.id, h.key)}
            />
          )
        ));
      }
    });

    // Ghost preview
    if (pendingPts.length > 0 && preview && activeTool !== 'cursor') {
      const pt1 = pendingPts[pendingPts.length - 1];
      const a = xy(pt1.time, pt1.price), b = xy(preview.time, preview.price);
      if (a && b) {
        elems.push(
          <g key="ghost" opacity={0.5}>
            <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#fbbf24" strokeWidth={1.5} strokeDasharray="5,3" />
            <circle cx={a[0]} cy={a[1]} r={4} fill="#fbbf24" />
            <circle cx={b[0]} cy={b[1]} r={4} fill="#fbbf24" />
          </g>
        );
      }
    }

    // Live price crosshair label
    if (preview && activeTool !== 'cursor' && activeTool !== 'eraser') {
      const y = pY(preview.price);
      if (y != null) {
        elems.push(
          <g key="clabel">
            <rect x={W - 95} y={y - 11} width={92} height={18} rx={3} fill="rgba(0,0,0,0.8)" />
            <text x={W - 49} y={y + 4} textAnchor="middle" fill="#fbbf24" fontSize={9.5} fontFamily="monospace" fontWeight="700">${fmt(preview.price, ins)}</text>
          </g>
        );
      }
    }

    // The overlay root is pointer-transparent so every gesture reaches the
    // chart canvas (pan / zoom / crosshair). Drawings and drag handles opt back
    // in with `pointerEvents: all` so selection still works while drawing.
    return <g style={{ pointerEvents: allowDrawing ? 'all' : 'none' }}>{elems}</g>;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, svgSize, instrument, drawings, pendingPts, preview, activeTool, selectedId, buildHandles, onHandleMouseDown, allowDrawing]);

  // ── Nav helpers ───────────────────────────────────────────────────────────────
  const scrollL = useCallback(() => { const ts = chartRef.current?.timeScale(); if (!ts) return; const r = ts.getVisibleLogicalRange(); if (!r) return; ts.setVisibleLogicalRange({ from: r.from - Math.max(5, (r.to - r.from) * 0.25), to: r.to - Math.max(5, (r.to - r.from) * 0.25) }); }, []);
  const scrollR = useCallback(() => { const ts = chartRef.current?.timeScale(); if (!ts) return; const r = ts.getVisibleLogicalRange(); if (!r) return; ts.setVisibleLogicalRange({ from: r.from + Math.max(5, (r.to - r.from) * 0.25), to: r.to + Math.max(5, (r.to - r.from) * 0.25) }); }, []);
  const zIn = useCallback(() => { const ts = chartRef.current?.timeScale(); if (!ts) return; const r = ts.getVisibleLogicalRange(); if (!r || r.to - r.from <= 10) return; const s = Math.max(2, (r.to - r.from) * 0.15); ts.setVisibleLogicalRange({ from: r.from + s, to: r.to - s }); }, []);
  const zOut = useCallback(() => { const ts = chartRef.current?.timeScale(); if (!ts) return; const r = ts.getVisibleLogicalRange(); if (!r) return; const s = Math.max(2, (r.to - r.from) * 0.15); ts.setVisibleLogicalRange({ from: r.from - s, to: r.to + s }); }, []);
  const rv = useCallback(() => { const c = chartRef.current; if (!c) return; c.priceScale('right').applyOptions({ autoScale: true }); c.timeScale().fitContent(); }, []);

  const cur = activeTool === 'text' ? 'text' : activeTool === 'eraser' ? 'cell' : activeTool === 'cursor' ? 'default' : 'crosshair';

  // hint for current tool state
  const hint = pendingPts.length > 0
    ? activeTool === 'long' ? '▲ Click Take Profit level'
      : activeTool === 'short' ? '▼ Click Take Profit level'
        : activeTool === 'pchannel' ? pendingPts.length === 1 ? 'Click 2nd anchor' : 'Click offset point'
          : activeTool === 'triangle' ? pendingPts.length === 1 ? 'Click 2nd corner' : 'Click 3rd corner'
            : '● Click second point'
    : activeTool === 'hline' ? '— Click to place horizontal line'
      : activeTool === 'vline' ? '| Click to place vertical line'
        : activeTool === 'extline' ? '↔ Click start — extends both directions'
          : activeTool === 'trendline' ? '↗ Click start point'
            : activeTool === 'ray' ? '→ Click start — extends right'
              : activeTool === 'arrow' ? '↗ Click start of arrow'
                : activeTool === 'hchannel' ? '≡ Click top price'
                  : activeTool === 'pchannel' ? '↗ Click line start'
                    : activeTool === 'rect' ? '□ Click first corner'
                      : activeTool === 'triangle' ? '△ Click first corner'
                        : activeTool === 'zone' ? '▭ Click first price'
                          : activeTool === 'fib' ? '📐 Click high then low'
                            : activeTool === 'fibext' ? '📐 Click first anchor'
                              : activeTool === 'long' ? '▲ Click entry price'
                                : activeTool === 'short' ? '▼ Click entry price'
                                  : activeTool === 'measure' ? '↔ Click start of range'
                                    : activeTool === 'text' ? 'T Click to place label'
                                      : activeTool === 'eraser' ? '✕ Click drawing to erase'
                                        : activeTool === 'cursor' ? selectedId ? 'Drag handles to edit · click elsewhere to deselect' : ''
                                          : '';

  // Selected drawing for edit panel
  const selectedDrawing = useMemo(() => insDrawings.find(d => d.id === selectedId) ?? null, [insDrawings, selectedId]);

  return (
    <div className="w-full flex flex-col" style={{ height }}>
      {showTimeframeBar && (
        <div className="flex items-center gap-1 px-2 py-1.5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] border-b-0 rounded-t-2xl flex-shrink-0">
          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mr-1 select-none">TF</span>
          {TF_OPTIONS.map(tf => (
            <button key={tf} type="button" onClick={() => setActiveTF(tf)}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${activeTF === tf ? 'bg-[var(--brand-primary)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'}`}>
              {tf}
            </button>
          ))}
          {prediction && <span className="ml-auto text-[9px] text-[var(--text-muted)] select-none">Signal: <span className="font-bold text-[var(--brand-primary)]">{prediction.timeframe}</span> · all TFs</span>}
        </div>
      )}

      <div className={`w-full relative flex-1 overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-sm select-none ${showTimeframeBar ? 'rounded-b-2xl' : 'rounded-2xl'}`}
        style={{ cursor: activeTool !== 'cursor' ? cur : undefined }}
        onClick={() => { if (activeTool === 'cursor') { setSelectedId(null); setEditPanel(null); } }}>

        {/* Canvas */}
        <div ref={containerRef} className="absolute inset-0" />

        {/* SVG overlay — transparent to pointer input so the chart underneath
            stays fully interactive; child drawings re-enable events for clicks. */}
        <svg className="absolute inset-0 z-10"
          width={svgSize.w} height={svgSize.h}
          style={{ overflow: 'visible', pointerEvents: 'none' }}>
          {renderSVG()}
        </svg>

        {/* Hint banner */}
        {allowDrawing && hint && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
            <div className="px-3 py-1 rounded-full text-[11px] font-semibold bg-[var(--brand-primary)]/90 text-white shadow-lg backdrop-blur-sm">{hint}</div>
          </div>
        )}

        {/* Drawing toolbar */}
        {allowDrawing && (
          <div className="absolute left-1.5 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-0.5 bg-[var(--bg-card)]/95 backdrop-blur-md p-1.5 rounded-2xl border border-[var(--border-subtle)] shadow-xl overflow-y-auto max-h-[85%] scrollbar-thin">
            {TOOL_GROUPS.map((g, gi) => (
              <React.Fragment key={g.name}>
                {gi > 0 && <div className="w-full h-px bg-[var(--border-subtle)] my-0.5" />}
                {g.tools.map(t => (
                  <Tip key={t.tool} label={t.label} active={activeTool === t.tool} variant={t.variant}
                    onClick={() => { setActiveTool(t.tool); setPendingPts([]); pendingPtsRef.current = []; setSelectedId(null); setEditPanel(null); }}>
                    {t.icon}
                  </Tip>
                ))}
              </React.Fragment>
            ))}
            <div className="w-full h-px bg-[var(--border-subtle)] my-0.5" />
            {/* Interactivity toggle — restores cursor / pan / zoom mode */}
            <Tip label={activeTool === 'cursor' ? 'Interactivity ON — chart pan, zoom & crosshair' : 'Re-activate chart interactivity (cursor mode)'}
              active={activeTool === 'cursor'}
              onClick={() => { setActiveTool('cursor'); setPendingPts([]); pendingPtsRef.current = []; setEditPanel(null); }}>
              <Hand className="w-4 h-4" />
            </Tip>
            <div className="w-full h-px bg-[var(--border-subtle)] my-0.5" />
            <Tip label="Clear all drawings" active={false} onClick={clearAll}>
              <Trash2 className={`w-4 h-4 ${insDrawings.length === 0 ? 'opacity-30' : 'text-[var(--color-danger)]'}`} />
            </Tip>
          </div>
        )}

        {/* ── Edit Panel — shown when drawing is selected ───────────────────── */}
        {allowDrawing && editPanel && selectedDrawing && (
          <div className="absolute z-30 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl p-3 w-52"
            style={{ left: Math.min(editPanel.x, svgSize.w - 220), top: Math.max(8, editPanel.y) }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[var(--text-primary)] capitalize">{selectedDrawing.type} — Edit</span>
              <button type="button" onClick={() => { setSelectedId(null); setEditPanel(null); }} className="p-0.5 rounded hover:bg-[var(--bg-surface-hover)] cursor-pointer">
                <X className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              </button>
            </div>

            {/* Color picker */}
            <div className="mb-2">
              <p className="text-[10px] text-[var(--text-muted)] mb-1 font-semibold">Color</p>
              <div className="flex flex-wrap gap-1">
                {PALETTE.map(c => (
                  <button key={c} type="button" onClick={() => updateDrawing(selectedDrawing.id, { color: c })}
                    className="w-5 h-5 rounded-full border-2 transition-all cursor-pointer"
                    style={{ background: c, borderColor: selectedDrawing.color === c ? '#fff' : 'transparent' }} />
                ))}
              </div>
            </div>

            {/* Price inputs based on drawing type */}
            {selectedDrawing.type === 'hline' && (
              <div>
                <p className="text-[10px] text-[var(--text-muted)] mb-1 font-semibold">Price</p>
                <input type="number" step="any" defaultValue={(selectedDrawing as HLine).price}
                  onBlur={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) updateDrawing(selectedDrawing.id, { price: v, label: fmt(v, instrument) } as any); }}
                  className="w-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 text-xs font-mono-num text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]" />
              </div>
            )}
            {(selectedDrawing.type === 'zone' || selectedDrawing.type === 'hchannel') && (
              <div className="space-y-1.5">
                {['priceTop', 'priceBot'].map(k => (
                  <div key={k}>
                    <p className="text-[10px] text-[var(--text-muted)] mb-0.5 font-semibold">{k === 'priceTop' ? 'Top Price' : 'Bottom Price'}</p>
                    <input type="number" step="any" defaultValue={(selectedDrawing as any)[k]}
                      onBlur={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) { const patch: any = { [k]: v }; if (selectedDrawing.type === 'zone') patch.label = `${fmt(Math.min(v, (selectedDrawing as Zone).priceBot), instrument)}–${fmt(Math.max(v, (selectedDrawing as Zone).priceTop), instrument)}`; updateDrawing(selectedDrawing.id, patch); } }}
                      className="w-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 text-xs font-mono-num text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]" />
                  </div>
                ))}
              </div>
            )}
            {(selectedDrawing.type === 'long' || selectedDrawing.type === 'short') && (
              <div className="space-y-1.5">
                {[{ k: 'entry', label: 'Entry' }, { k: 'tp', label: 'Take Profit' }, { k: 'sl', label: 'Stop Loss' }].map(({ k, label }) => (
                  <div key={k}>
                    <p className="text-[10px] text-[var(--text-muted)] mb-0.5 font-semibold">{label}</p>
                    <input type="number" step="any" defaultValue={(selectedDrawing as any)[k]}
                      onBlur={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) updateDrawing(selectedDrawing.id, { [k]: v } as any); }}
                      className="w-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 text-xs font-mono-num text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]" />
                  </div>
                ))}
              </div>
            )}
            {selectedDrawing.type === 'text' && (
              <div>
                <p className="text-[10px] text-[var(--text-muted)] mb-1 font-semibold">Label text</p>
                <input type="text" defaultValue={(selectedDrawing as TextLbl).text}
                  onBlur={e => { updateDrawing(selectedDrawing.id, { text: e.target.value } as any); }}
                  className="w-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]" />
              </div>
            )}

            {/* Delete */}
            <button type="button" onClick={() => removeDrawing(selectedDrawing.id)}
              className="mt-2 w-full py-1.5 rounded-lg bg-[var(--color-danger-bg)] text-[var(--color-danger)] border border-[var(--color-danger)]/30 text-xs font-semibold hover:bg-[var(--color-danger)] hover:text-white transition-all cursor-pointer">
              Delete drawing
            </button>
          </div>
        )}

        {/* Drawing legend */}
        {allowDrawing && insDrawings.length > 0 && (
          <div className="absolute bottom-12 z-20 flex flex-col gap-0.5 max-h-40 overflow-y-auto scrollbar-thin" style={{ left: '3.5rem' }}>
            {insDrawings.map(d => {
              const label =
                d.type === 'hline' ? `H-Line $${fmt((d as HLine).price, instrument)}` :
                  d.type === 'vline' ? 'V-Line' :
                    d.type === 'extline' ? 'Extended Line' :
                      d.type === 'trendline' ? 'Trend Line' :
                        d.type === 'ray' ? 'Ray' :
                          d.type === 'arrow' ? 'Arrow' :
                            d.type === 'hchannel' ? 'H-Channel' :
                              d.type === 'pchannel' ? 'Parallel Channel' :
                                d.type === 'rect' ? 'Rectangle' :
                                  d.type === 'triangle' ? 'Triangle' :
                                    d.type === 'zone' ? (d as Zone).label :
                                      d.type === 'fib' ? 'Fibonacci' :
                                        d.type === 'fibext' ? 'Fib Extension' :
                                          d.type === 'long' ? `▲ Long $${fmt((d as LongPos).entry, instrument)}` :
                                            d.type === 'short' ? `▼ Short $${fmt((d as ShortPos).entry, instrument)}` :
                                              d.type === 'measure' ? 'Measure' :
                                                d.type === 'text' ? `"${(d as TextLbl).text}"` : d.type;
              const col = d.type === 'long' ? '#22c55e' : d.type === 'short' ? '#ef4444' : d.type === 'fib' || d.type === 'fibext' ? '#fbbf24' : (d as any).color ?? '#94a3b8';
              const isSel = d.id === selectedId;
              return (
                <div key={d.id}
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-mono backdrop-blur-sm border group cursor-pointer ${isSel ? 'bg-white/15 border-white/30' : 'bg-black/75 border-white/10'}`}
                  style={{ color: col }}
                  onClick={() => { setSelectedId(d.id); setActiveTool('cursor'); }}>
                  <span className="truncate max-w-[160px]">{label}</span>
                  <button type="button" onClick={e => { e.stopPropagation(); removeDrawing(d.id); }}
                    className="ml-auto opacity-0 group-hover:opacity-100 text-white/50 hover:text-red-400 transition-all cursor-pointer flex-shrink-0">×</button>
                </div>
              );
            })}
          </div>
        )}

        {/* Signal legend */}
        {prediction && (
          <div className="absolute top-2 right-2 z-10 flex flex-col gap-1 pointer-events-none">
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-bold font-mono shadow-sm backdrop-blur-md bg-black/60 border border-white/10 text-white w-fit">
              <span>{instrument}</span><span className="text-[10px] text-white/60 uppercase">{activeTF}</span>
            </div>
            {[
              prediction.buyingZone && { label: 'Buy Zone', value: prediction.buyingZone, color: '#22c55e' },
              prediction.sellingZone && { label: 'Sell Zone', value: prediction.sellingZone, color: '#ef4444' },
              prediction.stopLoss && { label: 'SL', value: prediction.stopLoss, color: '#f97316', dashed: true },
              prediction.takeProfit && { label: 'TP1', value: prediction.takeProfit, color: '#34d399', dashed: true },
              prediction.takeProfit2 && { label: 'TP2', value: prediction.takeProfit2, color: '#6ee7b7', dashed: true },
              prediction.takeProfit3 && { label: 'TP3', value: prediction.takeProfit3, color: '#a7f3d0', dashed: true },
            ].filter(Boolean).map((lv: any) => (
              <div key={lv.label} className="flex items-center gap-2 px-2.5 py-1 rounded-lg text-[11px] font-bold font-mono shadow-lg"
                style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', border: `1px solid ${lv.color}40` }}>
                <span className="w-2.5 flex-shrink-0" style={{ display: 'inline-block', height: '2px', background: lv.dashed ? 'transparent' : lv.color, borderTop: lv.dashed ? `2px dashed ${lv.color}` : 'none' }} />
                <span style={{ color: lv.color }}>{lv.label}</span>
                <span className="text-white/80">${fmt(lv.value, instrument)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Nav toolbar */}
        <div className="absolute bottom-3 z-20 flex items-center gap-0.5 bg-[var(--bg-card)]/90 backdrop-blur-md px-1.5 py-1 rounded-lg border border-[var(--border-subtle)] shadow-md"
          style={{ left: allowDrawing ? '3.5rem' : '0.75rem' }}>
          {[{ icon: <ChevronLeft className="w-3.5 h-3.5" />, fn: scrollL, tip: 'Scroll left' }, { icon: <ChevronRight className="w-3.5 h-3.5" />, fn: scrollR, tip: 'Scroll right' }].map(b => (
            <div key={b.tip} className="relative group/n">
              <button type="button" onClick={b.fn} className="p-1 rounded hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">{b.icon}</button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 pointer-events-none opacity-0 group-hover/n:opacity-100 transition-opacity whitespace-nowrap">
                <div className="px-2 py-1 rounded-md bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[10px] font-semibold text-[var(--text-primary)] shadow-lg">{b.tip}</div>
              </div>
            </div>
          ))}
          <div className="w-px h-3.5 bg-[var(--border-subtle)] mx-0.5" />
          {[{ icon: <ZoomIn className="w-3.5 h-3.5" />, fn: zIn, tip: 'Zoom in' }, { icon: <ZoomOut className="w-3.5 h-3.5" />, fn: zOut, tip: 'Zoom out' }].map(b => (
            <div key={b.tip} className="relative group/n">
              <button type="button" onClick={b.fn} className="p-1 rounded hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">{b.icon}</button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 pointer-events-none opacity-0 group-hover/n:opacity-100 transition-opacity whitespace-nowrap">
                <div className="px-2 py-1 rounded-md bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[10px] font-semibold text-[var(--text-primary)] shadow-lg">{b.tip}</div>
              </div>
            </div>
          ))}
          <div className="w-px h-3.5 bg-[var(--border-subtle)] mx-0.5" />
          <div className="relative group/n">
            <button type="button" onClick={rv} className="px-1.5 py-0.5 text-[10px] font-medium rounded hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer flex items-center gap-1">
              <RotateCcw className="w-2.5 h-2.5" /><span>Reset</span>
            </button>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 pointer-events-none opacity-0 group-hover/n:opacity-100 transition-opacity whitespace-nowrap">
              <div className="px-2 py-1 rounded-md bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[10px] font-semibold text-[var(--text-primary)] shadow-lg">Reset view · double-click chart</div>
            </div>
          </div>
        </div>

        {/* Text input modal */}
        {textPrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setTextPrompt(null)}>
            <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-5 shadow-2xl space-y-3 w-72" onClick={e => e.stopPropagation()}>
              <p className="text-sm font-bold text-[var(--text-primary)]">Add Text Label</p>
              <input autoFocus type="text" value={textVal} onChange={e => setTextVal(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && textVal.trim()) {
                    const col = PALETTE[colorIdxRef.current % PALETTE.length];
                    setDrawings(prev => { const n = new Map(prev); const ins = instrumentRef.current; n.set(ins, [...(n.get(ins) ?? []), { id: `txt_${Date.now()}`, type: 'text', price: textPrompt.price, time: textPrompt.time, text: textVal.trim(), color: col } as TextLbl]); return n; });
                    setColorIdx(i => i + 1); setTick(t => t + 1); setTextVal(''); setTextPrompt(null);
                  }
                  if (e.key === 'Escape') { setTextVal(''); setTextPrompt(null); }
                }}
                placeholder="Type label, press Enter…"
                className="w-full bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--brand-primary)]" />
              <div className="flex gap-2">
                <button type="button" onClick={() => { setTextVal(''); setTextPrompt(null); }} className="flex-1 px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">Cancel</button>
                <button type="button" onClick={() => { if (!textVal.trim()) return; const col = PALETTE[colorIdxRef.current % PALETTE.length]; setDrawings(prev => { const n = new Map(prev); const ins = instrumentRef.current; n.set(ins, [...(n.get(ins) ?? []), { id: `txt_${Date.now()}`, type: 'text', price: textPrompt.price, time: textPrompt.time, text: textVal.trim(), color: col } as TextLbl]); return n; }); setColorIdx(i => i + 1); setTick(t => t + 1); setTextVal(''); setTextPrompt(null); }} className="flex-1 px-3 py-1.5 rounded-lg bg-[var(--brand-primary)] text-white text-xs font-semibold cursor-pointer">Add</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
