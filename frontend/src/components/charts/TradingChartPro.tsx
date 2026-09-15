import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useLayoutEffect,
  type MouseEvent as ReactMouseEvent,
  type ChangeEvent,
} from 'react';
import {
  createChart,
  CandlestickSeries,
  CrosshairMode,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
} from 'lightweight-charts';
import {
  MousePointer2,
  Minus,
  TrendingUp,
  TrendingDown,
  Square,
  Pen,
  Type,
  ArrowUpRight,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ZoomIn,
  ZoomOut,
  Undo2,
  Redo2,
  Trash2,
  Save,
  AlignVerticalJustifyCenter,
  MoveHorizontal,
  Spline,
  GitBranch,
  Triangle,
  Circle,
  ArrowUp,
  ArrowDown,
  Ruler,
  ScanLine,
  Columns2,
} from 'lucide-react';
import type {
  Prediction,
  ChartDrawing,
  DrawingTool,
  HorizontalLineDrawing,
  TrendLineDrawing,
  LongPositionDrawing,
  ShortPositionDrawing,
  RectangleDrawing,
  BrushDrawing,
  TextDrawing,
  VerticalLineDrawing,
  RayDrawing,
  ExtendedLineDrawing,
  ChannelDrawing,
  PitchforkDrawing,
  FibRetracementDrawing,
  FibExtensionDrawing,
  FibChannelDrawing,
  CircleDrawing,
  TriangleDrawing,
  ArrowUpDrawing,
  ArrowDownDrawing,
  PriceRangeDrawing,
  DatePriceRangeDrawing,
} from '../../types';
import { useUIStore } from '../../state/useUIStore';
import { saveChartDrawings, loadChartDrawings } from '../../services/api/signalsService';

// ─── Constants ────────────────────────────────────────────────────────────────

const INSTRUMENT_TO_BINANCE: Record<string, string> = {
  'BTC/USDT': 'BTCUSDT', 'ETH/USDT': 'ETHUSDT',
  'SOL/USDT': 'SOLUSDT', 'XRP/USDT': 'XRPUSDT',
};
const TIMEFRAME_TO_INTERVAL: Record<string, string> = {
  '1m':'1m','3m':'3m','5m':'5m','15m':'15m','30m':'30m',
  '1h':'1h','2h':'2h','4h':'4h','6h':'6h','8h':'8h','12h':'12h',
  '1d':'1d','3d':'3d','1w':'1w',
};

const FIB_RETRACEMENT_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
const FIB_EXTENSION_LEVELS   = [0, 0.618, 1, 1.272, 1.618, 2, 2.618];
const FIB_CHANNEL_LEVELS     = [0, 0.382, 0.618, 1, 1.618, 2.618];

const TOOL_LABELS: Record<DrawingTool, string> = {
  pointer:         'Select / Move',
  horizontal:      'Horizontal Line',
  vertical:        'Vertical Line',
  trendline:       'Trend Line',
  ray:             'Ray',
  extended:        'Extended Line',
  channel:         'Parallel Channel',
  pitchfork:       'Andrews Pitchfork',
  fibretracement:  'Fib Retracement',
  fibextension:    'Fib Extension',
  fibchannel:      'Fib Channel',
  rectangle:       'Rectangle',
  circle:          'Circle / Ellipse',
  triangle:        'Triangle',
  arrow_up:        'Arrow Up',
  arrow_down:      'Arrow Down',
  price_range:     'Price Range',
  date_price_range:'Date & Price Range',
  long:            'Long Position',
  short:           'Short Position',
  brush:           'Brush / Freehand',
  text:            'Text Annotation',
};

const DEFAULT_COLORS: Record<DrawingTool, string> = {
  pointer:         '#ffffff',
  horizontal:      '#94a3b8',
  vertical:        '#94a3b8',
  trendline:       '#818cf8',
  ray:             '#818cf8',
  extended:        '#818cf8',
  channel:         '#f59e0b',
  pitchfork:       '#06b6d4',
  fibretracement:  '#a78bfa',
  fibextension:    '#a78bfa',
  fibchannel:      '#a78bfa',
  rectangle:       '#f59e0b',
  circle:          '#f59e0b',
  triangle:        '#f59e0b',
  arrow_up:        '#22c55e',
  arrow_down:      '#ef4444',
  price_range:     '#38bdf8',
  date_price_range:'#38bdf8',
  long:            '#22c55e',
  short:           '#ef4444',
  brush:           '#ec4899',
  text:            '#e2e8f0',
};

// ─── Data helpers ─────────────────────────────────────────────────────────────

function getDeterministicCandles(instrument: string, count = 150) {
  const cfgs: Record<string,{price:number;vol:number;prec:number}> = {
    GOLD:{price:2684.5,vol:0.0035,prec:2},SILVER:{price:31.85,vol:0.0075,prec:3},
    'BTC/USDT':{price:92500,vol:0.012,prec:2},'ETH/USDT':{price:3480,vol:0.014,prec:2},
    'SOL/USDT':{price:186,vol:0.018,prec:2},'XRP/USDT':{price:2.45,vol:0.016,prec:4},
  };
  const {price:cur,vol,prec}=cfgs[instrument]??{price:100,vol:0.01,prec:2};
  const now=Math.floor(Date.now()/1000);
  let seed=0;
  for(let i=0;i<instrument.length;i++){seed=(seed<<5)-seed+instrument.charCodeAt(i);seed|=0;}
  seed=Math.abs(seed)||5381;
  const rand=()=>{seed=(seed*1664525+1013904223)%4294967296;return seed/4294967296;};
  let rc=cur; const out:any[]=[];
  for(let i=0;i<count;i++){
    const t=(now-i*3600) as any;
    const drift=(rand()-0.49)*vol*rc; const open=+((rc-drift).toFixed(prec)); const close=+(rc.toFixed(prec));
    const sp=Math.abs(close-open);
    const high=+((Math.max(open,close)+rand()*(sp*0.8+rc*0.0012)).toFixed(prec));
    const low=+((Math.min(open,close)-rand()*(sp*0.8+rc*0.0012)).toFixed(prec));
    out.push({time:t,open,high,low,close}); rc=open;
  }
  return out.reverse();
}

async function fetchBinanceCandles(symbol:string,interval:string,limit=200){
  const res=await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
  if(!res.ok) throw new Error('Binance failed');
  const raw:any[][]=await res.json();
  return raw.map(k=>({time:Math.floor(k[0]/1000) as any,open:+k[1],high:+k[2],low:+k[3],close:+k[4]}));
}

function uid(){return Math.random().toString(36).slice(2,10);}

// ─── Geometry helpers ─────────────────────────────────────────────────────────

/** Extend a line defined by (x1,y1)→(x2,y2) to hit the left/right edges of the SVG. */
function extendLineToEdges(x1:number,y1:number,x2:number,y2:number,w:number,h:number){
  if(x1===x2) return {lx:x1,ly:0,rx:x2,ry:h};
  const slope=(y2-y1)/(x2-x1);
  const lx=0,  ly=y1+slope*(lx-x1);
  const rx=w,  ry=y1+slope*(rx-x1);
  return{lx,ly,rx,ry};
}

/** Extend a ray from p1 through p2 to the right edge only. */
function extendRayToRight(x1:number,y1:number,x2:number,y2:number,w:number,h:number){
  if(x1===x2) return {tx:x2,ty:y2>y1?h:0};
  const slope=(y2-y1)/(x2-x1);
  const tx=w, ty=y1+slope*(tx-x1);
  // also clip to top/bottom
  if(ty<0){ const tx2=(0-y1)/slope+x1; return{tx:tx2,ty:0}; }
  if(ty>h){ const tx2=(h-y1)/slope+x1; return{tx:tx2,ty:h}; }
  return{tx,ty};
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface TradingChartProProps {
  tvSymbol: string;
  instrument: string;
  prediction?: Prediction | null;
  timeframe?: string;
  height?: number;
  predictionId?: string;
}

// ─── Tool groups for the sidebar ─────────────────────────────────────────────

type ToolGroup = { label: string; tools: { tool: DrawingTool; Icon: React.FC<any>; label: string }[] };

const TOOL_GROUPS: ToolGroup[] = [
  {
    label: 'Select',
    tools: [
      { tool: 'pointer',          Icon: MousePointer2,             label: TOOL_LABELS.pointer },
    ],
  },
  {
    label: 'Lines',
    tools: [
      { tool: 'horizontal',       Icon: Minus,                     label: TOOL_LABELS.horizontal },
      { tool: 'vertical',         Icon: AlignVerticalJustifyCenter, label: TOOL_LABELS.vertical },
      { tool: 'trendline',        Icon: TrendingUp,                label: TOOL_LABELS.trendline },
      { tool: 'ray',              Icon: MoveHorizontal,            label: TOOL_LABELS.ray },
      { tool: 'extended',         Icon: Spline,                    label: TOOL_LABELS.extended },
    ],
  },
  {
    label: 'Channels',
    tools: [
      { tool: 'channel',          Icon: Columns2,                  label: TOOL_LABELS.channel },
      { tool: 'pitchfork',        Icon: GitBranch,                 label: TOOL_LABELS.pitchfork },
    ],
  },
  {
    label: 'Fibonacci',
    tools: [
      { tool: 'fibretracement',   Icon: TrendingUp,                label: TOOL_LABELS.fibretracement },
      { tool: 'fibextension',     Icon: TrendingDown,              label: TOOL_LABELS.fibextension },
      { tool: 'fibchannel',       Icon: ScanLine,                  label: TOOL_LABELS.fibchannel },
    ],
  },
  {
    label: 'Shapes',
    tools: [
      { tool: 'rectangle',        Icon: Square,                    label: TOOL_LABELS.rectangle },
      { tool: 'circle',           Icon: Circle,                    label: TOOL_LABELS.circle },
      { tool: 'triangle',         Icon: Triangle,                  label: TOOL_LABELS.triangle },
    ],
  },
  {
    label: 'Arrows',
    tools: [
      { tool: 'arrow_up',         Icon: ArrowUp,                   label: TOOL_LABELS.arrow_up },
      { tool: 'arrow_down',       Icon: ArrowDown,                 label: TOOL_LABELS.arrow_down },
    ],
  },
  {
    label: 'Measure',
    tools: [
      { tool: 'price_range',      Icon: Ruler,                     label: TOOL_LABELS.price_range },
      { tool: 'date_price_range', Icon: Ruler,                     label: TOOL_LABELS.date_price_range },
    ],
  },
  {
    label: 'Positions',
    tools: [
      { tool: 'long',             Icon: ArrowUpRight,              label: TOOL_LABELS.long },
      { tool: 'short',            Icon: TrendingDown,              label: TOOL_LABELS.short },
    ],
  },
  {
    label: 'Misc',
    tools: [
      { tool: 'brush',            Icon: Pen,                       label: TOOL_LABELS.brush },
      { tool: 'text',             Icon: Type,                      label: TOOL_LABELS.text },
    ],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export const TradingChartPro: React.FC<TradingChartProProps> = ({
  tvSymbol: _tvSymbol, instrument, prediction, timeframe: timeframeProp, height=520, predictionId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef       = useRef<SVGSVGElement>(null);
  const chartRef     = useRef<IChartApi|null>(null);
  const seriesRef    = useRef<ISeriesApi<'Candlestick'>|null>(null);
  const priceLineRefs = useRef<any[]>([]);
  const textInputRef  = useRef<HTMLInputElement>(null);
  const { theme } = useUIStore();
  const themeRef = useRef(theme);

  const [activeTool, setActiveTool]   = useState<DrawingTool>('pointer');
  const [drawColor,  setDrawColor]    = useState('#94a3b8');
  const [drawings,   setDrawings]     = useState<ChartDrawing[]>([]);
  const [redoStack,  setRedoStack]    = useState<ChartDrawing[]>([]);
  const [selectedId, setSelectedId]   = useState<string|null>(null);
  const [draft,      setDraft]        = useState<ChartDrawing|null>(null);
  const [pendingText, setPendingText] = useState<{x:number;y:number;price:number;barIdx:number}|null>(null);
  const [textValue,  setTextValue]    = useState('');
  const [overlayTick, setOverlayTick] = useState(0);
  const [savedAt,    setSavedAt]      = useState<string|null>(null);
  // multi-click tools track how many points placed so far
  const [clickPhase, setClickPhase]   = useState(0);

  const interval = TIMEFRAME_TO_INTERVAL[timeframeProp ?? prediction?.timeframe ?? '1h'] ?? '1h';
  const binanceSymbol = INSTRUMENT_TO_BINANCE[instrument];

  const getThemeColors = useCallback((t: string) => {
    const light = t === 'neo-light';
    return {
      bgColor:     light ? '#ffffff' : '#121019',
      borderColor: light ? 'rgba(141,88,231,0.15)' : 'rgba(177,124,254,0.12)',
      textColor:   light ? '#6f6979' : '#8e8a9f',
    };
  }, []);

  // ── Load saved drawings ───────────────────────────────────────────────────
  useEffect(() => {
    if (!predictionId) return;
    const loaded = loadChartDrawings(predictionId) as ChartDrawing[];
    if (loaded.length) setDrawings(loaded);
  }, [predictionId]);

  // ── Mount chart ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    const { bgColor, borderColor, textColor } = getThemeColors(themeRef.current);
    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth, height,
      layout: { background: { color: bgColor }, textColor, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11 },
      grid: { vertLines: { color: borderColor, style: LineStyle.Dashed }, horzLines: { color: borderColor, style: LineStyle.Dashed } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor, textColor, autoScale: true },
      timeScale: { borderColor, timeVisible: true, secondsVisible: false },
      handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: { time: true, price: true }, axisDoubleClickReset: { time: true, price: true } },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: true },
    });
    const series = chart.addSeries(CandlestickSeries, {
      upColor:'#22c55e',downColor:'#ef4444',
      borderUpColor:'#22c55e',borderDownColor:'#ef4444',
      wickUpColor:'#22c55e',wickDownColor:'#ef4444',
    } as any);
    chartRef.current = chart;
    seriesRef.current = series as ISeriesApi<'Candlestick'>;

    // Capture container reference once for all event listeners
    const el = containerRef.current;

    const onRange = () => setOverlayTick(t => t + 1);
    chart.timeScale().subscribeVisibleLogicalRangeChange(onRange);

    // ── Native wheel: vertical pan + horizontal scroll + zoom ───────────────
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.ctrlKey || e.metaKey) {
        // Ctrl/Cmd + wheel → zoom time axis
        const ts = chart.timeScale();
        const r = ts.getVisibleLogicalRange();
        if (!r) return;
        const span = r.to - r.from;
        const factor = e.deltaY > 0 ? 1.12 : 0.88;
        const newSpan = span * factor;
        const center = (r.to + r.from) / 2;
        ts.setVisibleLogicalRange({ from: center - newSpan / 2, to: center + newSpan / 2 });
        return;
      }

      // Horizontal scroll (trackpad swipe or Shift+wheel)
      if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        const ts = chart.timeScale();
        const r = ts.getVisibleLogicalRange();
        if (!r) return;
        const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        const span = r.to - r.from;
        const shift = (delta / 100) * Math.max(3, span * 0.18);
        ts.setVisibleLogicalRange({ from: r.from + shift, to: r.to + shift });
        return;
      }

      // Vertical wheel → pan price scale up/down
      const ps = chart.priceScale('right');
      const r = ps.getVisibleRange();
      if (!r) return;
      const span = r.to - r.from;
      if (span <= 0) return;
      const step = (-e.deltaY / 100) * (span * 0.08);
      ps.applyOptions({ autoScale: false });
      ps.setVisibleRange({ from: r.from + step, to: r.to + step });
    };

    // ── Native mouse drag: vertical drag on the canvas pans price ───────────
    let isDragging = false;
    let lastY = 0;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0 || (e.target as HTMLElement)?.closest('button')) return;
      isDragging = true;
      lastY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging || e.buttons !== 1) { isDragging = false; return; }
      const deltaY = e.clientY - lastY;
      lastY = e.clientY;
      if (deltaY === 0) return;
      const ps = chart.priceScale('right');
      const r = ps.getVisibleRange();
      if (!r) return;
      const span = r.to - r.from;
      const priceDelta = (deltaY / (el.clientHeight || height)) * span;
      ps.applyOptions({ autoScale: false });
      ps.setVisibleRange({ from: r.from + priceDelta, to: r.to + priceDelta });
    };

    const onMouseUp = () => { isDragging = false; };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
        setOverlayTick(t => t + 1);
      }
    });
    ro.observe(containerRef.current);

    const onDbl = () => {
      chart.priceScale('right').applyOptions({ autoScale: true });
      chart.timeScale().fitContent();
    };
    el.addEventListener('dblclick', onDbl);

    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(onRange);
      ro.disconnect();
      el?.removeEventListener('dblclick', onDbl);
      el?.removeEventListener('wheel', onWheel);
      el?.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [height, getThemeColors]);

  // ── Theme sync ────────────────────────────────────────────────────────────
  useEffect(() => {
    themeRef.current = theme;
    if (!chartRef.current) return;
    const { bgColor, borderColor, textColor } = getThemeColors(theme);
    chartRef.current.applyOptions({
      layout: { background: { color: bgColor }, textColor },
      grid: { vertLines: { color: borderColor }, horzLines: { color: borderColor } },
      rightPriceScale: { borderColor, textColor },
      timeScale: { borderColor },
    });
    chartRef.current.timeScale().fitContent();
  }, [theme, getThemeColors]);

  // ── Load candle data ──────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!seriesRef.current) return;
    const p4 = instrument === 'XRP/USDT', p3 = instrument === 'SILVER';
    const prec = p4 ? 4 : p3 ? 3 : 2;
    const mm   = p4 ? 0.0001 : p3 ? 0.001 : 0.01;
    seriesRef.current.applyOptions({ priceFormat: { type: 'price', precision: prec, minMove: mm } });
    if (binanceSymbol) {
      try {
        const c = await fetchBinanceCandles(binanceSymbol, interval);
        seriesRef.current.setData(c);
        chartRef.current?.timeScale().fitContent();
        return;
      } catch {}
    }
    seriesRef.current.setData(getDeterministicCandles(instrument));
    chartRef.current?.timeScale().fitContent();
  }, [binanceSymbol, instrument, interval]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Prediction price lines ────────────────────────────────────────────────
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;
    const lines: { price:number;color:string;label:string;style:LineStyle }[] = [];
    if (prediction) {
      const buy  = prediction.buyingZone  ?? prediction.entryPrice * 0.97;
      const sell = prediction.sellingZone ?? prediction.entryPrice * 1.06;
      const f = (p:number) => instrument === 'SILVER' ? p.toFixed(2) : p.toLocaleString(undefined,{minimumFractionDigits:2});
      lines.push(
        {price:buy,  color:'#22c55e',label:`Buy Zone  $${f(buy)}`,  style:LineStyle.Solid},
        {price:sell, color:'#ef4444',label:`Sell Zone $${f(sell)}`, style:LineStyle.Solid},
        {price:prediction.entryPrice,color:'#a78bfa',label:`Entry     $${f(prediction.entryPrice)}`,style:LineStyle.Dashed},
      );
      if(prediction.stopLoss)    lines.push({price:prediction.stopLoss,   color:'#f97316',label:`SL  $${f(prediction.stopLoss)}`,   style:LineStyle.SparseDotted});
      if(prediction.takeProfit)  lines.push({price:prediction.takeProfit, color:'#34d399',label:`TP1 $${f(prediction.takeProfit)}`, style:LineStyle.SparseDotted});
      if(prediction.takeProfit2) lines.push({price:prediction.takeProfit2,color:'#6ee7b7',label:`TP2 $${f(prediction.takeProfit2)}`,style:LineStyle.SparseDotted});
      if(prediction.takeProfit3) lines.push({price:prediction.takeProfit3,color:'#a7f3d0',label:`TP3 $${f(prediction.takeProfit3)}`,style:LineStyle.SparseDotted});
    }
    priceLineRefs.current.forEach(r=>{try{seriesRef.current?.removePriceLine(r);}catch{}});
    priceLineRefs.current = lines.map(l=>series.createPriceLine({price:l.price,color:l.color,lineWidth:2,lineStyle:l.style,axisLabelVisible:true,title:l.label}));
    return () => {
      priceLineRefs.current.forEach(r=>{try{series.removePriceLine(r);}catch{}});
      priceLineRefs.current = [];
    };
  }, [prediction, instrument]);

  // ── Coordinate helpers (invalidated on pan/zoom/resize) ───────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const priceToY = useCallback((p:number) => seriesRef.current?.priceToCoordinate(p) ?? null, [overlayTick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const yToPrice = useCallback((y:number) => seriesRef.current?.coordinateToPrice(y) ?? null, [overlayTick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const barToX   = useCallback((i:number) => chartRef.current?.timeScale().logicalToCoordinate(i as any) ?? null, [overlayTick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const xToBar   = useCallback((x:number) => (chartRef.current?.timeScale().coordinateToLogical(x as any) as number) ?? 0, [overlayTick]);
  const svgW = useCallback(() => svgRef.current?.clientWidth  ?? 0, []);
  const svgH = useCallback(() => svgRef.current?.clientHeight ?? 0, []);

  const isDrawing = activeTool !== 'pointer';

  // ── Tools that require multiple clicks (not drag) ─────────────────────────
  const CLICK_TOOLS: DrawingTool[] = [
    'vertical','horizontal','arrow_up','arrow_down',
    'pitchfork','fibextension','fibchannel','triangle',
    'channel',
  ];
  const isClickTool = CLICK_TOOLS.includes(activeTool);

  // ── MouseDown: start drag tools ───────────────────────────────────────────
  const handleSvgMouseDown = useCallback((e: ReactMouseEvent<SVGSVGElement>) => {
    if (!isDrawing || activeTool === 'text' || isClickTool) return;
    const rect = svgRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const price = yToPrice(y) ?? 0, bi = xToBar(x);

    if (activeTool === 'horizontal') {
      setDrawings(p => [...p, {id:uid(),type:'horizontal',color:drawColor,opacity:0.9,price} as HorizontalLineDrawing]);
      setRedoStack([]);
      return;
    }
    if (activeTool === 'brush') {
      setDraft({id:uid(),type:'brush',color:drawColor,opacity:0.85,points:[{price,barIndex:bi}]} as BrushDrawing);
      return;
    }
    if (activeTool === 'trendline') {
      setDraft({id:uid(),type:'trendline',color:drawColor,opacity:0.9,price1:price,price2:price,barIndex1:bi,barIndex2:bi} as TrendLineDrawing);
      return;
    }
    if (activeTool === 'ray') {
      setDraft({id:uid(),type:'ray',color:drawColor,opacity:0.9,price1:price,price2:price,barIndex1:bi,barIndex2:bi} as RayDrawing);
      return;
    }
    if (activeTool === 'extended') {
      setDraft({id:uid(),type:'extended',color:drawColor,opacity:0.9,price1:price,price2:price,barIndex1:bi,barIndex2:bi} as ExtendedLineDrawing);
      return;
    }
    if (activeTool === 'rectangle') {
      setDraft({id:uid(),type:'rectangle',color:drawColor,opacity:0.4,price1:price,price2:price,barIndex1:bi,barIndex2:bi} as RectangleDrawing);
      return;
    }
    if (activeTool === 'circle') {
      setDraft({id:uid(),type:'circle',color:drawColor,opacity:0.35,centerPrice:price,centerBarIndex:bi,edgePrice:price,edgeBarIndex:bi} as CircleDrawing);
      return;
    }
    if (activeTool === 'fibretracement') {
      setDraft({id:uid(),type:'fibretracement',color:drawColor,opacity:0.85,price1:price,price2:price,barIndex1:bi,barIndex2:bi,levels:FIB_RETRACEMENT_LEVELS} as FibRetracementDrawing);
      return;
    }
    if (activeTool === 'price_range') {
      setDraft({id:uid(),type:'price_range',color:drawColor,opacity:0.7,price1:price,price2:price,barIndex1:bi,barIndex2:bi} as PriceRangeDrawing);
      return;
    }
    if (activeTool === 'date_price_range') {
      setDraft({id:uid(),type:'date_price_range',color:drawColor,opacity:0.35,price1:price,price2:price,barIndex1:bi,barIndex2:bi} as DatePriceRangeDrawing);
      return;
    }
    if (activeTool === 'long') {
      setDraft({id:uid(),type:'long',color:'#22c55e',opacity:0.35,entryPrice:price,stopPrice:price*0.98,targetPrice:price*1.04,barIndex1:bi,barIndex2:bi+20} as LongPositionDrawing);
      return;
    }
    if (activeTool === 'short') {
      setDraft({id:uid(),type:'short',color:'#ef4444',opacity:0.35,entryPrice:price,stopPrice:price*1.02,targetPrice:price*0.96,barIndex1:bi,barIndex2:bi+20} as ShortPositionDrawing);
      return;
    }
  }, [activeTool, isDrawing, isClickTool, drawColor, yToPrice, xToBar]);

  // ── MouseMove: update draft ───────────────────────────────────────────────
  const handleSvgMouseMove = useCallback((e: ReactMouseEvent<SVGSVGElement>) => {
    if (!draft) return;
    const rect = svgRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const price = yToPrice(y) ?? 0, bi = xToBar(x);

    setDraft(prev => {
      if (!prev) return null;
      if (prev.type === 'brush')         return { ...prev, points: [...prev.points, {price, barIndex:bi}] };
      if (prev.type === 'trendline')     return { ...prev, price2: price, barIndex2: bi };
      if (prev.type === 'ray')           return { ...prev, price2: price, barIndex2: bi };
      if (prev.type === 'extended')      return { ...prev, price2: price, barIndex2: bi };
      if (prev.type === 'rectangle')     return { ...prev, price2: price, barIndex2: bi };
      if (prev.type === 'fibretracement')return { ...prev, price2: price, barIndex2: bi };
      if (prev.type === 'price_range')   return { ...prev, price2: price, barIndex2: bi };
      if (prev.type === 'date_price_range')return{...prev, price2: price, barIndex2: bi };
      if (prev.type === 'circle')        return { ...prev, edgePrice: price, edgeBarIndex: bi };
      if (prev.type === 'long') {
        const d = Math.abs(price - prev.entryPrice);
        return { ...prev, targetPrice: price, stopPrice: prev.entryPrice - d * 0.5, barIndex2: bi };
      }
      if (prev.type === 'short') {
        const d = Math.abs(price - prev.entryPrice);
        return { ...prev, targetPrice: price, stopPrice: prev.entryPrice + d * 0.5, barIndex2: bi };
      }
      return prev;
    });
  }, [draft, yToPrice, xToBar]);

  // ── MouseUp: commit drag tools ────────────────────────────────────────────
  const handleSvgMouseUp = useCallback(() => {
    if (!draft) return;
    setDrawings(p => [...p, draft]);
    setRedoStack([]);
    setDraft(null);
  }, [draft]);

  // ── Click: handle click-based tools + text ────────────────────────────────
  const handleSvgClick = useCallback((e: ReactMouseEvent<SVGSVGElement>) => {
    if (!isDrawing) return;
    const rect = svgRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const price = yToPrice(y) ?? 0, bi = xToBar(x);

    // Text: open inline input
    if (activeTool === 'text') {
      setPendingText({ x, y, price, barIdx: bi });
      setTextValue('');
      setTimeout(() => textInputRef.current?.focus(), 50);
      return;
    }

    // Single-click tools
    if (activeTool === 'vertical') {
      setDrawings(p => [...p, {id:uid(),type:'vertical',color:drawColor,opacity:0.9,barIndex:bi} as VerticalLineDrawing]);
      setRedoStack([]);
      return;
    }
    if (activeTool === 'arrow_up') {
      setDrawings(p => [...p, {id:uid(),type:'arrow_up',color:drawColor,opacity:1,price,barIndex:bi} as ArrowUpDrawing]);
      setRedoStack([]);
      return;
    }
    if (activeTool === 'arrow_down') {
      setDrawings(p => [...p, {id:uid(),type:'arrow_down',color:drawColor,opacity:1,price,barIndex:bi} as ArrowDownDrawing]);
      setRedoStack([]);
      return;
    }

    // 3-point tools: pitchfork, fibextension, fibchannel, triangle, channel(offset)
    if (activeTool === 'pitchfork') {
      setDraft(prev => {
        if (!prev) {
          return {id:uid(),type:'pitchfork',color:drawColor,opacity:0.8,price1:price,barIndex1:bi,price2:price,barIndex2:bi,price3:price,barIndex3:bi,phase:1} as PitchforkDrawing;
        }
        if (prev.type === 'pitchfork' && prev.phase === 1) return {...prev, price2:price, barIndex2:bi, phase:2};
        if (prev.type === 'pitchfork' && prev.phase === 2) {
          const committed = {...prev, price3:price, barIndex3:bi, phase:3} as PitchforkDrawing;
          setDrawings(p => [...p, committed]);
          setRedoStack([]);
          return null;
        }
        return prev;
      });
      setClickPhase(p => (p+1) % 3);
      return;
    }

    if (activeTool === 'fibextension') {
      setDraft(prev => {
        if (!prev) {
          return {id:uid(),type:'fibextension',color:drawColor,opacity:0.85,price1:price,barIndex1:bi,price2:price,barIndex2:bi,price3:price,barIndex3:bi,levels:FIB_EXTENSION_LEVELS,phase:1} as FibExtensionDrawing;
        }
        if (prev.type === 'fibextension' && prev.phase === 1) return {...prev, price2:price, barIndex2:bi, phase:2};
        if (prev.type === 'fibextension' && prev.phase === 2) {
          const committed = {...prev, price3:price, barIndex3:bi, phase:3} as FibExtensionDrawing;
          setDrawings(p => [...p, committed]);
          setRedoStack([]);
          return null;
        }
        return prev;
      });
      setClickPhase(p => (p+1) % 3);
      return;
    }

    if (activeTool === 'fibchannel') {
      setDraft(prev => {
        if (!prev) {
          return {id:uid(),type:'fibchannel',color:drawColor,opacity:0.85,price1:price,barIndex1:bi,price2:price,barIndex2:bi,price3:price,barIndex3:bi,levels:FIB_CHANNEL_LEVELS,phase:1} as FibChannelDrawing;
        }
        if (prev.type === 'fibchannel' && prev.phase === 1) return {...prev, price2:price, barIndex2:bi, phase:2};
        if (prev.type === 'fibchannel' && prev.phase === 2) {
          const committed = {...prev, price3:price, barIndex3:bi, phase:3} as FibChannelDrawing;
          setDrawings(p => [...p, committed]);
          setRedoStack([]);
          return null;
        }
        return prev;
      });
      setClickPhase(p => (p+1) % 3);
      return;
    }

    if (activeTool === 'triangle') {
      setDraft(prev => {
        if (!prev) {
          return {id:uid(),type:'triangle',color:drawColor,opacity:0.35,price1:price,barIndex1:bi,price2:price,barIndex2:bi,price3:price,barIndex3:bi,phase:1} as TriangleDrawing;
        }
        if (prev.type === 'triangle' && prev.phase === 1) return {...prev, price2:price, barIndex2:bi, phase:2};
        if (prev.type === 'triangle' && prev.phase === 2) {
          const committed = {...prev, price3:price, barIndex3:bi, phase:3} as TriangleDrawing;
          setDrawings(p => [...p, committed]);
          setRedoStack([]);
          return null;
        }
        return prev;
      });
      setClickPhase(p => (p+1) % 3);
      return;
    }

    if (activeTool === 'channel') {
      setDraft(prev => {
        if (!prev) {
          return {id:uid(),type:'channel',color:drawColor,opacity:0.25,price1:price,barIndex1:bi,price2:price,barIndex2:bi,offsetPrice:0,phase:1} as ChannelDrawing;
        }
        if (prev.type === 'channel' && prev.phase === 1) {
          // second click sets end of baseline; next click will set offset
          return {...prev, price2:price, barIndex2:bi, phase:2};
        }
        if (prev.type === 'channel' && prev.phase === 2) {
          // third click sets the parallel offset line
          const committed = {...prev, offsetPrice:price - prev.price1, phase:2} as ChannelDrawing;
          setDrawings(p => [...p, committed]);
          setRedoStack([]);
          return null;
        }
        return prev;
      });
      setClickPhase(p => (p+1) % 3);
      return;
    }
  }, [activeTool, isDrawing, drawColor, yToPrice, xToBar]);

  // Track mouse for live preview of multi-click drafts
  const handleSvgMouseMoveForClickTools = useCallback((e: ReactMouseEvent<SVGSVGElement>) => {
    if (!draft || !isClickTool) return;
    const rect = svgRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const price = yToPrice(y) ?? 0, bi = xToBar(x);

    setDraft(prev => {
      if (!prev) return null;
      if (prev.type === 'pitchfork') {
        if (prev.phase === 1) return {...prev, price2:price, barIndex2:bi, price3:price, barIndex3:bi};
        if (prev.phase === 2) return {...prev, price3:price, barIndex3:bi};
      }
      if (prev.type === 'fibextension') {
        if (prev.phase === 1) return {...prev, price2:price, barIndex2:bi};
        if (prev.phase === 2) return {...prev, price3:price, barIndex3:bi};
      }
      if (prev.type === 'fibchannel') {
        if (prev.phase === 1) return {...prev, price2:price, barIndex2:bi};
        if (prev.phase === 2) return {...prev, price3:price, barIndex3:bi};
      }
      if (prev.type === 'triangle') {
        if (prev.phase === 1) return {...prev, price2:price, barIndex2:bi};
        if (prev.phase === 2) return {...prev, price3:price, barIndex3:bi};
      }
      if (prev.type === 'channel') {
        if (prev.phase === 1) return {...prev, price2:price, barIndex2:bi};
        if (prev.phase === 2) return {...prev, offsetPrice:price - prev.price1};
      }
      return prev;
    });
  }, [draft, isClickTool, yToPrice, xToBar]);

  // ── Text commit ───────────────────────────────────────────────────────────
  const commitText = useCallback(() => {
    if (!pendingText || !textValue.trim()) { setPendingText(null); return; }
    setDrawings(p => [...p, {id:uid(),type:'text',color:drawColor,opacity:1,price:pendingText.price,barIndex:pendingText.barIdx,text:textValue.trim(),fontSize:13} as TextDrawing]);
    setRedoStack([]);
    setPendingText(null); setTextValue('');
  }, [pendingText, textValue, drawColor]);

  // ── Selection click ───────────────────────────────────────────────────────
  const handleDClick = useCallback((id: string, e: ReactMouseEvent) => {
    e.stopPropagation();
    if (activeTool === 'pointer') setSelectedId(s => s === id ? null : id);
  }, [activeTool]);

  // ── Edit actions ──────────────────────────────────────────────────────────
  const handleUndo = () => {
    setDrawings(p => {
      if (!p.length) return p;
      const last = p[p.length - 1];
      setRedoStack(r => [...r, last]);
      return p.slice(0, -1);
    });
  };
  const handleRedo = () => {
    setRedoStack(r => {
      if (!r.length) return r;
      const next = r[r.length - 1];
      setDrawings(p => [...p, next]);
      return r.slice(0, -1);
    });
  };
  const handleClear = () => { setDrawings([]); setRedoStack([]); setSelectedId(null); };
  const handleSave  = () => {
    if (predictionId) {
      saveChartDrawings(predictionId, drawings as object[]);
      setSavedAt(new Date().toLocaleTimeString());
    }
  };

  // ── Navigation ────────────────────────────────────────────────────────────
  const scrollLeft  = useCallback(()=>{const ts=chartRef.current?.timeScale(),r=ts?.getVisibleLogicalRange();if(!r)return;const s=r.to-r.from;ts!.setVisibleLogicalRange({from:r.from-Math.max(5,s*.25),to:r.to-Math.max(5,s*.25)});},[]);
  const scrollRight = useCallback(()=>{const ts=chartRef.current?.timeScale(),r=ts?.getVisibleLogicalRange();if(!r)return;const s=r.to-r.from;ts!.setVisibleLogicalRange({from:r.from+Math.max(5,s*.25),to:r.to+Math.max(5,s*.25)});},[]);
  const panUp       = useCallback(()=>{const ps=chartRef.current?.priceScale('right'),r=ps?.getVisibleRange();if(!r)return;const st=(r.to-r.from)*.15;ps!.applyOptions({autoScale:false});ps!.setVisibleRange({from:r.from+st,to:r.to+st});},[]);
  const panDown     = useCallback(()=>{const ps=chartRef.current?.priceScale('right'),r=ps?.getVisibleRange();if(!r)return;const st=(r.to-r.from)*.15;ps!.applyOptions({autoScale:false});ps!.setVisibleRange({from:r.from-st,to:r.to-st});},[]);
  const zoomIn      = useCallback(()=>{const ts=chartRef.current?.timeScale(),r=ts?.getVisibleLogicalRange();if(!r)return;const s=r.to-r.from;if(s<=10)return;const sh=Math.max(2,s*.15);ts!.setVisibleLogicalRange({from:r.from+sh,to:r.to-sh});},[]);
  const zoomOut     = useCallback(()=>{const ts=chartRef.current?.timeScale(),r=ts?.getVisibleLogicalRange();if(!r)return;const s=r.to-r.from;const sh=Math.max(2,s*.15);ts!.setVisibleLogicalRange({from:r.from-sh,to:r.to+sh});},[]);
  const resetView   = useCallback(()=>{chartRef.current?.priceScale('right').applyOptions({autoScale:true});chartRef.current?.timeScale().fitContent();},[]);

  // ── Render a single drawing as SVG ────────────────────────────────────────
  const renderDrawing = useCallback((d: ChartDrawing, isDraft = false) => {
    const isSel   = !isDraft && d.id === selectedId;
    const stroke  = isSel ? '#fff' : d.color;
    const selGlow = isSel ? { filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.7))' } : {};
    const cp = {
      onClick: (e: ReactMouseEvent) => handleDClick(d.id, e),
      style: {
        cursor: activeTool === 'pointer' ? 'pointer' : 'crosshair',
        // In pointer mode the SVG has pointerEvents:none so we must re-enable
        // on each drawn element individually so selection still works.
        pointerEvents: 'all' as const,
        ...selGlow,
      },
    };
    const w = svgW(), h = svgH();
    const fmt = (p:number) => p.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:4});

    // ── Horizontal line ────────────────────────────────────────────────────
    if (d.type === 'horizontal') {
      const y = priceToY(d.price); if (y === null) return null;
      return (
        <g key={d.id} {...cp}>
          <line x1={0} y1={y} x2={w} y2={y} stroke={stroke} strokeWidth={2} strokeDasharray="6,4" opacity={d.opacity}/>
          <text x={8} y={y-4} fill={stroke} fontSize={10} fontFamily="ui-monospace,monospace" opacity={0.9}>{fmt(d.price)}</text>
        </g>
      );
    }

    // ── Vertical line ──────────────────────────────────────────────────────
    if (d.type === 'vertical') {
      const x = barToX(d.barIndex); if (x === null) return null;
      return (
        <g key={d.id} {...cp}>
          <line x1={x} y1={0} x2={x} y2={h} stroke={stroke} strokeWidth={2} strokeDasharray="6,4" opacity={d.opacity}/>
        </g>
      );
    }

    // ── Trend line ─────────────────────────────────────────────────────────
    if (d.type === 'trendline') {
      const x1=barToX(d.barIndex1),y1=priceToY(d.price1),x2=barToX(d.barIndex2),y2=priceToY(d.price2);
      if(x1===null||y1===null||x2===null||y2===null) return null;
      return <line key={d.id} x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={2} opacity={d.opacity} {...cp}/>;
    }

    // ── Ray ────────────────────────────────────────────────────────────────
    if (d.type === 'ray') {
      const x1=barToX(d.barIndex1),y1=priceToY(d.price1),x2=barToX(d.barIndex2),y2=priceToY(d.price2);
      if(x1===null||y1===null||x2===null||y2===null) return null;
      const {tx,ty} = extendRayToRight(x1,y1,x2,y2,w,h);
      return <line key={d.id} x1={x1} y1={y1} x2={tx} y2={ty} stroke={stroke} strokeWidth={2} opacity={d.opacity} {...cp}/>;
    }

    // ── Extended line ──────────────────────────────────────────────────────
    if (d.type === 'extended') {
      const x1=barToX(d.barIndex1),y1=priceToY(d.price1),x2=barToX(d.barIndex2),y2=priceToY(d.price2);
      if(x1===null||y1===null||x2===null||y2===null) return null;
      const {lx,ly,rx,ry} = extendLineToEdges(x1,y1,x2,y2,w,h);
      return <line key={d.id} x1={lx} y1={ly} x2={rx} y2={ry} stroke={stroke} strokeWidth={2} opacity={d.opacity} {...cp}/>;
    }

    // ── Rectangle ──────────────────────────────────────────────────────────
    if (d.type === 'rectangle') {
      const x1=barToX(d.barIndex1),y1=priceToY(d.price1),x2=barToX(d.barIndex2),y2=priceToY(d.price2);
      if(x1===null||y1===null||x2===null||y2===null) return null;
      return (
        <g key={d.id} {...cp}>
          <rect x={Math.min(x1,x2)} y={Math.min(y1,y2)} width={Math.abs(x2-x1)} height={Math.abs(y2-y1)}
            fill={d.color} fillOpacity={d.opacity} stroke={stroke} strokeWidth={1.5} rx={2}/>
        </g>
      );
    }

    // ── Circle ─────────────────────────────────────────────────────────────
    if (d.type === 'circle') {
      const cx=barToX(d.centerBarIndex),cy=priceToY(d.centerPrice),ex=barToX(d.edgeBarIndex),ey=priceToY(d.edgePrice);
      if(cx===null||cy===null||ex===null||ey===null) return null;
      const rx=Math.abs(ex-cx)||4, ry=Math.abs(ey-cy)||4;
      return (
        <g key={d.id} {...cp}>
          <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={d.color} fillOpacity={d.opacity} stroke={stroke} strokeWidth={1.5}/>
        </g>
      );
    }

    // ── Triangle ───────────────────────────────────────────────────────────
    if (d.type === 'triangle') {
      const x1=barToX(d.barIndex1),y1=priceToY(d.price1),x2=barToX(d.barIndex2),y2=priceToY(d.price2),x3=barToX(d.barIndex3),y3=priceToY(d.price3);
      if(x1===null||y1===null||x2===null||y2===null||x3===null||y3===null) return null;
      return (
        <g key={d.id} {...cp}>
          <polygon points={`${x1},${y1} ${x2},${y2} ${x3},${y3}`} fill={d.color} fillOpacity={d.opacity} stroke={stroke} strokeWidth={1.5}/>
        </g>
      );
    }

    // ── Long position ──────────────────────────────────────────────────────
    if (d.type === 'long' || d.type === 'short') {
      const isL = d.type === 'long';
      const x1=barToX(d.barIndex1),x2=barToX(d.barIndex2),yE=priceToY(d.entryPrice),yT=priceToY(d.targetPrice),yS=priceToY(d.stopPrice);
      if(x1===null||x2===null||yE===null||yT===null||yS===null) return null;
      const rx=Math.min(x1,x2),rw=Math.abs(x2-x1);
      const pC=isL?'#22c55e':'#ef4444', lC=isL?'#ef4444':'#22c55e';
      const pY=Math.min(yE,yT),pH=Math.abs(yT-yE),lY=Math.min(yE,yS),lH=Math.abs(yS-yE);
      return (
        <g key={d.id} {...cp}>
          <rect x={rx} y={pY} width={rw} height={pH} fill={pC} fillOpacity={0.18} stroke={pC} strokeWidth={1}/>
          <rect x={rx} y={lY} width={rw} height={lH} fill={lC} fillOpacity={0.18} stroke={lC} strokeWidth={1}/>
          <line x1={rx} y1={yE} x2={rx+rw} y2={yE} stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4,2"/>
          <text x={rx+4} y={pY+13}          fill={pC}      fontSize={9} fontFamily="ui-monospace,monospace" fontWeight="700">{isL?'▲ TP':'▼ TP'} {fmt(d.targetPrice)}</text>
          <text x={rx+4} y={yE+(isL?-4:13)} fill="#94a3b8" fontSize={9} fontFamily="ui-monospace,monospace" fontWeight="700">Entry {fmt(d.entryPrice)}</text>
          <text x={rx+4} y={lY+lH-4}        fill={lC}      fontSize={9} fontFamily="ui-monospace,monospace" fontWeight="700">{isL?'▼ SL':'▲ SL'} {fmt(d.stopPrice)}</text>
        </g>
      );
    }

    // ── Brush ──────────────────────────────────────────────────────────────
    if (d.type === 'brush') {
      if (d.points.length < 2) return null;
      const pts = d.points.map(p => {
        const x = barToX(p.barIndex), y = priceToY(p.price);
        return x !== null && y !== null ? `${x},${y}` : null;
      }).filter(Boolean).join(' ');
      return <polyline key={d.id} points={pts} fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={d.opacity} {...cp}/>;
    }

    // ── Text ───────────────────────────────────────────────────────────────
    if (d.type === 'text') {
      const x = barToX(d.barIndex), y = priceToY(d.price);
      if (x === null || y === null) return null;
      return (
        <g key={d.id} {...cp}>
          <text x={x} y={y} fill={stroke} fontSize={d.fontSize} fontFamily="Inter,system-ui,sans-serif" fontWeight="600" opacity={d.opacity}>{d.text}</text>
        </g>
      );
    }

    // ── Arrow Up ───────────────────────────────────────────────────────────
    if (d.type === 'arrow_up') {
      const x = barToX(d.barIndex), y = priceToY(d.price);
      if (x === null || y === null) return null;
      return (
        <g key={d.id} {...cp}>
          <polygon points={`${x},${y-16} ${x-8},${y} ${x+8},${y}`} fill={stroke} opacity={d.opacity}/>
          <line x1={x} y1={y} x2={x} y2={y+12} stroke={stroke} strokeWidth={2} opacity={d.opacity}/>
        </g>
      );
    }

    // ── Arrow Down ─────────────────────────────────────────────────────────
    if (d.type === 'arrow_down') {
      const x = barToX(d.barIndex), y = priceToY(d.price);
      if (x === null || y === null) return null;
      return (
        <g key={d.id} {...cp}>
          <polygon points={`${x},${y+16} ${x-8},${y} ${x+8},${y}`} fill={stroke} opacity={d.opacity}/>
          <line x1={x} y1={y-12} x2={x} y2={y} stroke={stroke} strokeWidth={2} opacity={d.opacity}/>
        </g>
      );
    }

    // ── Parallel Channel ───────────────────────────────────────────────────
    if (d.type === 'channel') {
      const x1=barToX(d.barIndex1),y1=priceToY(d.price1),x2=barToX(d.barIndex2),y2=priceToY(d.price2);
      if(x1===null||y1===null||x2===null||y2===null) return null;
      const offsetY = (priceToY(d.price1 + d.offsetPrice) ?? y1) - y1;
      // Extend both lines to edges
      const base  = extendLineToEdges(x1,y1,x2,y2,w,h);
      const baseO = extendLineToEdges(x1,y1+offsetY,x2,y2+offsetY,w,h);
      return (
        <g key={d.id} {...cp}>
          <polygon
            points={`${base.lx},${base.ly} ${base.rx},${base.ry} ${baseO.rx},${baseO.ry} ${baseO.lx},${baseO.ly}`}
            fill={d.color} fillOpacity={d.opacity} stroke="none"/>
          <line x1={base.lx}  y1={base.ly}  x2={base.rx}  y2={base.ry}  stroke={stroke} strokeWidth={1.5} opacity={0.9}/>
          <line x1={baseO.lx} y1={baseO.ly} x2={baseO.rx} y2={baseO.ry} stroke={stroke} strokeWidth={1.5} opacity={0.9}/>
          {/* midline */}
          <line x1={base.lx}  y1={(base.ly+baseO.ly)/2}  x2={base.rx}  y2={(base.ry+baseO.ry)/2}
            stroke={stroke} strokeWidth={1} strokeDasharray="4,3" opacity={0.5}/>
        </g>
      );
    }

    // ── Andrews Pitchfork ──────────────────────────────────────────────────
    if (d.type === 'pitchfork') {
      const x1=barToX(d.barIndex1),y1=priceToY(d.price1),
            x2=barToX(d.barIndex2),y2=priceToY(d.price2),
            x3=barToX(d.barIndex3),y3=priceToY(d.price3);
      if(x1===null||y1===null||x2===null||y2===null||x3===null||y3===null) return null;
      // midpoint of p2-p3
      const mx=(x2+x3)/2, my=(y2+y3)/2;
      // Median line: p1 → extended through midpoint
      const med = extendRayToRight(x1,y1,mx,my,w,h);
      // Upper tine: p2 → extended parallel to median
      const slope = my===y1 ? 0 : (my-y1)/(mx-x1||1);
      const upTip  = extendRayToRight(x2,y2,x2+(mx-x1),y2+(my-y1),w,h);
      const lowTip = extendRayToRight(x3,y3,x3+(mx-x1),y3+(my-y1),w,h);
      void slope;
      return (
        <g key={d.id} {...cp}>
          {/* handle bar: p2—p3 */}
          <line x1={x2} y1={y2} x2={x3} y2={y3} stroke={stroke} strokeWidth={1.5} opacity={0.7}/>
          {/* handle to midpoint */}
          <line x1={x1} y1={y1} x2={mx} y2={my} stroke={stroke} strokeWidth={1} strokeDasharray="3,3" opacity={0.5}/>
          {/* median */}
          <line x1={x1} y1={y1} x2={med.tx} y2={med.ty} stroke={stroke} strokeWidth={2} opacity={0.9}/>
          {/* upper tine */}
          <line x1={x2} y1={y2} x2={upTip.tx} y2={upTip.ty} stroke={stroke} strokeWidth={1.5} opacity={0.85} strokeDasharray="5,3"/>
          {/* lower tine */}
          <line x1={x3} y1={y3} x2={lowTip.tx} y2={lowTip.ty} stroke={stroke} strokeWidth={1.5} opacity={0.85} strokeDasharray="5,3"/>
        </g>
      );
    }

    // ── Fibonacci Retracement ──────────────────────────────────────────────
    if (d.type === 'fibretracement') {
      const x1=barToX(d.barIndex1),y1=priceToY(d.price1),x2=barToX(d.barIndex2),y2=priceToY(d.price2);
      if(x1===null||y1===null||x2===null||y2===null) return null;
      const priceRange = d.price1 - d.price2;
      const fibColors = ['#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#818cf8','#a78bfa'];
      return (
        <g key={d.id} {...cp}>
          {d.levels.map((lvl,i) => {
            const fp = d.price2 + priceRange * lvl;
            const fy = priceToY(fp);
            if (fy === null) return null;
            const fc = fibColors[i % fibColors.length];
            return (
              <g key={lvl}>
                <line x1={Math.min(x1,x2)} y1={fy} x2={Math.max(x1,x2)} y2={fy} stroke={fc} strokeWidth={1.5} opacity={0.8}/>
                <rect x={Math.min(x1,x2)} y={fy} width={Math.abs(x2-x1)} height={i<d.levels.length-1?Math.abs((priceToY(d.price2+priceRange*d.levels[i+1])??fy)-fy):0}
                  fill={fc} fillOpacity={0.04}/>
                <text x={Math.max(x1,x2)+4} y={fy+4} fill={fc} fontSize={9} fontFamily="ui-monospace,monospace" opacity={0.9}>
                  {(lvl*100).toFixed(1)}%  {fmt(fp)}
                </text>
              </g>
            );
          })}
          {/* anchor dots */}
          <circle cx={x1} cy={y1} r={4} fill={stroke} opacity={0.8}/>
          <circle cx={x2} cy={y2} r={4} fill={stroke} opacity={0.8}/>
        </g>
      );
    }

    // ── Fibonacci Extension ────────────────────────────────────────────────
    if (d.type === 'fibextension') {
      const x1=barToX(d.barIndex1),y1=priceToY(d.price1),
            x2=barToX(d.barIndex2),y2=priceToY(d.price2),
            x3=barToX(d.barIndex3),y3=priceToY(d.price3);
      if(x1===null||y1===null||x2===null||y2===null||x3===null||y3===null) return null;
      const baseRange = Math.abs(d.price1 - d.price2);
      const dir       = d.price1 > d.price2 ? -1 : 1;
      const fibColors = ['#94a3b8','#06b6d4','#22c55e','#eab308','#f97316','#ef4444','#a78bfa'];
      return (
        <g key={d.id} {...cp}>
          {/* baseline */}
          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={1} strokeDasharray="4,3" opacity={0.5}/>
          <line x1={x2} y1={y2} x2={x3} y2={y3} stroke={stroke} strokeWidth={1} strokeDasharray="4,3" opacity={0.5}/>
          {d.levels.map((lvl,i) => {
            const fp = d.price3 + dir * baseRange * lvl;
            const fy = priceToY(fp);
            if (fy === null) return null;
            const fc = fibColors[i % fibColors.length];
            return (
              <g key={lvl}>
                <line x1={x3} y1={fy} x2={w} y2={fy} stroke={fc} strokeWidth={1.5} opacity={0.8}/>
                <text x={w+4} y={fy+4} fill={fc} fontSize={9} fontFamily="ui-monospace,monospace" opacity={0.9}>
                  {lvl.toFixed(3)}  {fmt(fp)}
                </text>
              </g>
            );
          })}
          <circle cx={x1} cy={y1} r={3} fill={stroke} opacity={0.7}/>
          <circle cx={x2} cy={y2} r={3} fill={stroke} opacity={0.7}/>
          <circle cx={x3} cy={y3} r={3} fill={stroke} opacity={0.7}/>
        </g>
      );
    }

    // ── Fibonacci Channel ──────────────────────────────────────────────────
    if (d.type === 'fibchannel') {
      const x1=barToX(d.barIndex1),y1=priceToY(d.price1),
            x2=barToX(d.barIndex2),y2=priceToY(d.price2),
            x3=barToX(d.barIndex3),y3=priceToY(d.price3);
      if(x1===null||y1===null||x2===null||y2===null||x3===null||y3===null) return null;
      // baseline direction vector
      const dx=x2-x1, dy=y2-y1;
      // width vector (perpendicular distance from p3 to baseline)
      const baseLen = Math.sqrt(dx*dx+dy*dy)||1;
      const ux=dx/baseLen, uy=dy/baseLen;
      // projection of p3 onto baseline normal
      const nx=-uy, ny=ux;
      const dot=(x3-x1)*nx+(y3-y1)*ny;
      const fibColors = ['#94a3b8','#818cf8','#06b6d4','#22c55e','#f97316','#ef4444'];
      return (
        <g key={d.id} {...cp}>
          {d.levels.map((lvl, i) => {
            const ox = nx*dot*lvl, oy = ny*dot*lvl;
            const e1 = extendLineToEdges(x1+ox,y1+oy,x2+ox,y2+oy,w,h);
            const fc = fibColors[i % fibColors.length];
            return (
              <g key={lvl}>
                <line x1={e1.lx} y1={e1.ly} x2={e1.rx} y2={e1.ry} stroke={fc} strokeWidth={1.5} opacity={0.8}/>
                <text x={e1.rx+4} y={e1.ry+4} fill={fc} fontSize={9} fontFamily="ui-monospace,monospace" opacity={0.9}>{lvl.toFixed(3)}</text>
              </g>
            );
          })}
          <circle cx={x1} cy={y1} r={3} fill={stroke} opacity={0.7}/>
          <circle cx={x2} cy={y2} r={3} fill={stroke} opacity={0.7}/>
          <circle cx={x3} cy={y3} r={3} fill={stroke} opacity={0.7}/>
        </g>
      );
    }

    // ── Price Range ────────────────────────────────────────────────────────
    if (d.type === 'price_range') {
      const x1=barToX(d.barIndex1),y1=priceToY(d.price1),x2=barToX(d.barIndex2),y2=priceToY(d.price2);
      if(x1===null||y1===null||x2===null||y2===null) return null;
      const diff   = Math.abs(d.price2 - d.price1);
      const pct    = (diff / Math.min(d.price1, d.price2) * 100).toFixed(2);
      const cx     = (x1+x2)/2;
      const midY   = (y1+y2)/2;
      return (
        <g key={d.id} {...cp}>
          <rect x={Math.min(x1,x2)} y={Math.min(y1,y2)} width={Math.abs(x2-x1)} height={Math.abs(y2-y1)}
            fill={d.color} fillOpacity={0.12} stroke={stroke} strokeWidth={1.5} strokeDasharray="5,3"/>
          {/* left price ruler */}
          <line x1={Math.min(x1,x2)} y1={y1} x2={Math.min(x1,x2)-6} y2={y1} stroke={stroke} strokeWidth={1.5} opacity={0.8}/>
          <line x1={Math.min(x1,x2)} y1={y2} x2={Math.min(x1,x2)-6} y2={y2} stroke={stroke} strokeWidth={1.5} opacity={0.8}/>
          <line x1={Math.min(x1,x2)-3} y1={y1} x2={Math.min(x1,x2)-3} y2={y2} stroke={stroke} strokeWidth={1.5} opacity={0.8}/>
          {/* center label */}
          <rect x={cx-42} y={midY-10} width={84} height={20} rx={4} fill="rgba(0,0,0,0.7)" stroke={stroke} strokeWidth={1} opacity={0.95}/>
          <text x={cx} y={midY+4} fill={stroke} fontSize={9.5} fontFamily="ui-monospace,monospace" textAnchor="middle" fontWeight="700">
            {fmt(diff)} ({pct}%)
          </text>
        </g>
      );
    }

    // ── Date & Price Range ─────────────────────────────────────────────────
    if (d.type === 'date_price_range') {
      const x1=barToX(d.barIndex1),y1=priceToY(d.price1),x2=barToX(d.barIndex2),y2=priceToY(d.price2);
      if(x1===null||y1===null||x2===null||y2===null) return null;
      const diff    = Math.abs(d.price2 - d.price1);
      const pct     = (diff / Math.min(d.price1, d.price2) * 100).toFixed(2);
      const barDiff = Math.abs(d.barIndex2 - d.barIndex1);
      const cx = (x1+x2)/2, midY = (y1+y2)/2;
      return (
        <g key={d.id} {...cp}>
          <rect x={Math.min(x1,x2)} y={Math.min(y1,y2)} width={Math.abs(x2-x1)} height={Math.abs(y2-y1)}
            fill={d.color} fillOpacity={d.opacity} stroke={stroke} strokeWidth={1.5} rx={2}/>
          {/* price label */}
          <rect x={cx-52} y={midY-24} width={104} height={18} rx={3} fill="rgba(0,0,0,0.75)" stroke={stroke} strokeWidth={1}/>
          <text x={cx} y={midY-11} fill={stroke} fontSize={9} fontFamily="ui-monospace,monospace" textAnchor="middle" fontWeight="700">
            Δ{fmt(diff)} ({pct}%)
          </text>
          {/* bars label */}
          <rect x={cx-36} y={midY+6} width={72} height={16} rx={3} fill="rgba(0,0,0,0.75)" stroke={stroke} strokeWidth={1}/>
          <text x={cx} y={midY+17} fill={stroke} fontSize={9} fontFamily="ui-monospace,monospace" textAnchor="middle" fontWeight="700">
            {barDiff} bars
          </text>
        </g>
      );
    }

    return null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, activeTool, priceToY, barToX, svgW, svgH, handleDClick, overlayTick]);

  // Auto-update draw color when tool changes
  useLayoutEffect(() => { setDrawColor(DEFAULT_COLORS[activeTool]); }, [activeTool]);
  // Reset click phase when tool changes
  useEffect(() => { setClickPhase(0); setDraft(null); }, [activeTool]);

  const fmt = (p:number) => p.toLocaleString(undefined, {minimumFractionDigits:2});
  const buy  = prediction ? prediction.buyingZone  ?? prediction.entryPrice * 0.97 : null;
  const sell = prediction ? prediction.sellingZone ?? prediction.entryPrice * 1.06 : null;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      className="w-full rounded-2xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-sm relative select-none"
      style={{ height }}
    >
      {/* lightweight-charts canvas */}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }}/>

      {/* SVG drawing overlay — only intercepts events when a drawing tool is active */}
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full"
        style={{
          cursor: activeTool === 'pointer' ? 'default' : 'crosshair',
          // Pass events through to the chart when in pointer/select mode so
          // pan, scroll and drag all work normally on the canvas below.
          pointerEvents: activeTool === 'pointer' ? 'none' : 'all',
          zIndex: 5,
        }}
        onMouseDown={handleSvgMouseDown}
        onMouseMove={(e) => { handleSvgMouseMove(e); handleSvgMouseMoveForClickTools(e); }}
        onMouseUp={handleSvgMouseUp}
        onClick={handleSvgClick}
        onMouseLeave={handleSvgMouseUp}
      >
        {drawings.map(d => renderDrawing(d, false))}
        {draft && renderDrawing(draft, true)}
      </svg>

      {/* Inline text input */}
      {pendingText && (
        <div className="absolute z-20" style={{ left: pendingText.x + 4, top: pendingText.y - 20 }}>
          <input
            ref={textInputRef}
            value={textValue}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setTextValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') commitText(); if (e.key === 'Escape') setPendingText(null); }}
            onBlur={commitText}
            className="bg-[var(--bg-card)] border border-[var(--brand-primary)] text-[var(--text-primary)] text-xs px-2 py-1 rounded-lg outline-none shadow-lg font-medium"
            style={{ minWidth: 140 }}
            placeholder="Type annotation…"
          />
        </div>
      )}

      {/* ── Left toolbar (tool groups) ─────────────────────────────────── */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-0.5 bg-[var(--bg-card)]/90 backdrop-blur-md px-1 py-1.5 rounded-xl border border-[var(--border-subtle)] shadow-lg max-h-[calc(100%-32px)] overflow-y-auto scrollbar-thin">
        {TOOL_GROUPS.map((grp, gi) => (
          <React.Fragment key={grp.label}>
            {gi > 0 && <div className="w-5 h-px bg-[var(--border-subtle)] my-0.5"/>}
            {grp.tools.map(({ tool, Icon, label }) => (
              <button
                key={tool}
                type="button"
                title={label}
                onClick={() => setActiveTool(tool)}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTool === tool
                    ? 'bg-[var(--brand-primary)] text-white shadow-[0_0_8px_var(--brand-primary)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Icon className="w-3.5 h-3.5"/>
              </button>
            ))}
          </React.Fragment>
        ))}
        {/* separator + color picker */}
        <div className="w-5 h-px bg-[var(--border-subtle)] my-0.5"/>
        <label title="Drawing color" className="p-1 rounded cursor-pointer hover:bg-[var(--bg-surface-hover)]">
          <div className="w-3.5 h-3.5 rounded-full border border-white/30" style={{ background: drawColor }}/>
          <input type="color" value={drawColor} onChange={e => setDrawColor(e.target.value)} className="sr-only"/>
        </label>
      </div>

      {/* ── Bottom toolbar (navigation + actions) ─────────────────────── */}
      <div className="absolute bottom-3 left-14 z-10 flex items-center gap-1 bg-[var(--bg-card)]/90 backdrop-blur-md px-1.5 py-1 rounded-lg border border-[var(--border-subtle)] shadow-md">
        <button type="button" onClick={scrollLeft}  title="Scroll Left"  className="p-1 rounded hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"><ChevronLeft  className="w-3.5 h-3.5"/></button>
        <button type="button" onClick={scrollRight} title="Scroll Right" className="p-1 rounded hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"><ChevronRight className="w-3.5 h-3.5"/></button>
        <div className="w-px h-3.5 bg-[var(--border-subtle)] mx-0.5"/>
        <button type="button" onClick={panUp}       title="Pan Up"       className="p-1 rounded hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"><ChevronUp    className="w-3.5 h-3.5"/></button>
        <button type="button" onClick={panDown}     title="Pan Down"     className="p-1 rounded hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"><ChevronDown  className="w-3.5 h-3.5"/></button>
        <div className="w-px h-3.5 bg-[var(--border-subtle)] mx-0.5"/>
        <button type="button" onClick={zoomIn}      title="Zoom In"      className="p-1 rounded hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"><ZoomIn       className="w-3.5 h-3.5"/></button>
        <button type="button" onClick={zoomOut}     title="Zoom Out"     className="p-1 rounded hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"><ZoomOut      className="w-3.5 h-3.5"/></button>
        <div className="w-px h-3.5 bg-[var(--border-subtle)] mx-0.5"/>
        <button type="button" onClick={resetView} title="Reset View" className="px-1.5 py-0.5 text-[10px] font-medium rounded hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer flex items-center gap-1">
          <RotateCcw className="w-2.5 h-2.5"/><span>Reset</span>
        </button>
        <div className="w-px h-3.5 bg-[var(--border-subtle)] mx-0.5"/>
        <button type="button" onClick={handleUndo}  disabled={!drawings.length} title="Undo last" className="p-1 rounded hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 transition-all cursor-pointer"><Undo2  className="w-3.5 h-3.5"/></button>
        <button type="button" onClick={handleRedo}  disabled={!redoStack.length} title="Redo" className="p-1 rounded hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 transition-all cursor-pointer"><Redo2  className="w-3.5 h-3.5"/></button>
        <button type="button" onClick={handleClear} disabled={!drawings.length} title="Clear all"  className="p-1 rounded hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-red-400 disabled:opacity-30 transition-all cursor-pointer"><Trash2 className="w-3.5 h-3.5"/></button>
        {predictionId && (
          <button type="button" onClick={handleSave} title={savedAt ? `Saved at ${savedAt}` : 'Save drawings'} className="p-1 rounded hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-emerald-400 transition-all cursor-pointer flex items-center gap-1">
            <Save className="w-3.5 h-3.5"/>
            {savedAt && <span className="text-[9px] text-emerald-400 font-medium">{savedAt}</span>}
          </button>
        )}
      </div>

      {/* ── Top-left: instrument / interval legend + zone badges ──────── */}
      <div className="absolute top-3 left-14 flex flex-col gap-1.5 z-10 pointer-events-none">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-bold font-mono shadow-sm backdrop-blur-md bg-black/60 border border-white/10 text-white w-fit">
          <span>{instrument}</span>
          <span className="text-[10px] text-white/60 font-semibold uppercase">{interval}</span>
        </div>
        {prediction && (
          <div className="flex flex-col gap-1">
            {buy  !== null && <ZoneLegend label={`Buy Zone  $${fmt(buy)}`}  color="#22c55e"/>}
            {sell !== null && <ZoneLegend label={`Sell Zone $${fmt(sell)}`} color="#ef4444"/>}
            <ZoneLegend label={`Entry     $${fmt(prediction.entryPrice)}`} color="#a78bfa" dashed/>
            {prediction.stopLoss    && <ZoneLegend label={`SL        $${fmt(prediction.stopLoss)}`}    color="#f97316" dashed/>}
            {prediction.takeProfit  && <ZoneLegend label={`TP1       $${fmt(prediction.takeProfit)}`}  color="#34d399" dashed/>}
            {prediction.takeProfit2 && <ZoneLegend label={`TP2       $${fmt(prediction.takeProfit2)}`} color="#6ee7b7" dashed/>}
            {prediction.takeProfit3 && <ZoneLegend label={`TP3       $${fmt(prediction.takeProfit3)}`} color="#a7f3d0" dashed/>}
          </div>
        )}
      </div>

      {/* ── Active tool badge (top-right) ─────────────────────────────── */}
      {activeTool !== 'pointer' && (
        <div className="absolute top-3 right-3 z-10 pointer-events-none">
          <div className="px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wide shadow-sm backdrop-blur-md bg-[var(--brand-primary)]/20 border border-[var(--brand-primary)]/40 text-[var(--brand-primary)]">
            {TOOL_LABELS[activeTool]}
            {/* show click phase hint for multi-click tools */}
            {isClickTool && draft && (
              <span className="ml-1.5 text-white/50">
                {draft.type === 'pitchfork' || draft.type === 'fibextension' || draft.type === 'fibchannel' || draft.type === 'triangle'
                  ? `· click ${(draft as any).phase === 1 ? '2nd' : '3rd'} point`
                  : draft.type === 'channel' ? `· click ${(draft as any).phase === 1 ? '2nd' : 'offset'} point`
                  : ''}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Delete-selected button ─────────────────────────────────────── */}
      {selectedId && activeTool === 'pointer' && (
        <div className="absolute top-3 right-3 z-10 pointer-events-auto">
          <button
            type="button"
            onClick={() => { setDrawings(p => p.filter(d => d.id !== selectedId)); setSelectedId(null); }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold shadow-sm backdrop-blur-md bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3 h-3"/> Delete selected
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Zone legend pill ─────────────────────────────────────────────────────────

const ZoneLegend: React.FC<{ label: string; color: string; dashed?: boolean }> = ({ label, color, dashed }) => (
  <div
    className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold font-mono shadow-sm backdrop-blur-md"
    style={{ background: 'rgba(0,0,0,0.65)', color: '#fff' }}
  >
    <span
      className="inline-block w-5 flex-shrink-0"
      style={{ height: '2px', background: dashed ? 'transparent' : color, borderTop: dashed ? `2px dashed ${color}` : 'none', opacity: 0.9 }}
    />
    <span style={{ color }}>{label}</span>
  </div>
);
