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
  Trash2,
  Save,
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
} from '../../types';
import { useUIStore } from '../../state/useUIStore';
import { saveChartDrawings, loadChartDrawings } from '../../services/api/signalsService';

const INSTRUMENT_TO_BINANCE: Record<string, string> = { 'BTC/USDT':'BTCUSDT','ETH/USDT':'ETHUSDT','SOL/USDT':'SOLUSDT','XRP/USDT':'XRPUSDT' };
const TIMEFRAME_TO_INTERVAL: Record<string, string> = { '1m':'1m','3m':'3m','5m':'5m','15m':'15m','30m':'30m','1h':'1h','2h':'2h','4h':'4h','6h':'6h','8h':'8h','12h':'12h','1d':'1d','3d':'3d','1w':'1w' };

function getDeterministicCandles(instrument: string, count = 150) {
  const cfgs: Record<string,{price:number;vol:number;prec:number}> = {
    GOLD:{price:2684.5,vol:0.0035,prec:2},SILVER:{price:31.85,vol:0.0075,prec:3},
    'BTC/USDT':{price:92500,vol:0.012,prec:2},'ETH/USDT':{price:3480,vol:0.014,prec:2},
    'SOL/USDT':{price:186,vol:0.018,prec:2},'XRP/USDT':{price:2.45,vol:0.016,prec:4},
  };
  const {price:cur,vol,prec}=cfgs[instrument]??{price:100,vol:0.01,prec:2};
  const now=Math.floor(Date.now()/1000);
  let seed=0; for(let i=0;i<instrument.length;i++){seed=(seed<<5)-seed+instrument.charCodeAt(i);seed|=0;} seed=Math.abs(seed)||5381;
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
  return raw.map(k=>({time:Math.floor(k[0]/1000) as any,open:parseFloat(k[1]),high:parseFloat(k[2]),low:parseFloat(k[3]),close:parseFloat(k[4])}));
}

function uid(){return Math.random().toString(36).slice(2,10);}

const TOOL_LABELS:Record<DrawingTool,string>={pointer:'Select / Move',horizontal:'Horizontal Line',trendline:'Trend Line',long:'Long Position',short:'Short Position',rectangle:'Rectangle',brush:'Brush / Freehand',text:'Text Annotation'};
const DEFAULT_COLORS:Record<DrawingTool,string>={pointer:'#ffffff',horizontal:'#94a3b8',trendline:'#818cf8',long:'#22c55e',short:'#ef4444',rectangle:'#f59e0b',brush:'#ec4899',text:'#e2e8f0'};

interface TradingChartProProps {
  tvSymbol: string;
  instrument: string;
  prediction?: Prediction | null;
  timeframe?: string;
  height?: number;
  predictionId?: string;
}

export const TradingChartPro: React.FC<TradingChartProProps> = ({
  tvSymbol: _tvSymbol, instrument, prediction, timeframe: timeframeProp, height=520, predictionId,
}) => {
  const containerRef=useRef<HTMLDivElement>(null);
  const svgRef=useRef<SVGSVGElement>(null);
  const chartRef=useRef<IChartApi|null>(null);
  const seriesRef=useRef<ISeriesApi<'Candlestick'>|null>(null);
  const priceLineRefs=useRef<any[]>([]);
  const textInputRef=useRef<HTMLInputElement>(null);
  const {theme}=useUIStore();
  const themeRef=useRef(theme);

  const [activeTool,setActiveTool]=useState<DrawingTool>('pointer');
  const [drawColor,setDrawColor]=useState('#94a3b8');
  const [drawings,setDrawings]=useState<ChartDrawing[]>([]);
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [draft,setDraft]=useState<ChartDrawing|null>(null);
  const [pendingText,setPendingText]=useState<{x:number;y:number;price:number;barIdx:number}|null>(null);
  const [textValue,setTextValue]=useState('');
  const [overlayTick,setOverlayTick]=useState(0);
  const [savedAt,setSavedAt]=useState<string|null>(null);

  const interval=TIMEFRAME_TO_INTERVAL[timeframeProp??prediction?.timeframe??'1h']??'1h';
  const binanceSymbol=INSTRUMENT_TO_BINANCE[instrument];

  const getThemeColors=useCallback((t:string)=>{
    const light=t==='neo-light';
    return {bgColor:light?'#ffffff':'#121019',borderColor:light?'rgba(141,88,231,0.15)':'rgba(177,124,254,0.12)',textColor:light?'#6f6979':'#8e8a9f'};
  },[]);

  useEffect(()=>{
    if(!predictionId) return;
    const loaded=loadChartDrawings(predictionId) as ChartDrawing[];
    if(loaded.length) setDrawings(loaded);
  },[predictionId]);

  useEffect(()=>{
    if(!containerRef.current) return;
    const {bgColor,borderColor,textColor}=getThemeColors(themeRef.current);
    const chart=createChart(containerRef.current,{
      width:containerRef.current.clientWidth,height,
      layout:{background:{color:bgColor},textColor,fontFamily:'Inter, system-ui, sans-serif',fontSize:11},
      grid:{vertLines:{color:borderColor,style:LineStyle.Dashed},horzLines:{color:borderColor,style:LineStyle.Dashed}},
      crosshair:{mode:CrosshairMode.Normal},
      rightPriceScale:{borderColor,textColor,autoScale:true},
      timeScale:{borderColor,timeVisible:true,secondsVisible:false},
      handleScale:{mouseWheel:true,pinch:true,axisPressedMouseMove:{time:true,price:true},axisDoubleClickReset:{time:true,price:true}},
      handleScroll:{mouseWheel:true,pressedMouseMove:true,horzTouchDrag:true,vertTouchDrag:true},
    });
    const series=chart.addSeries(CandlestickSeries,{upColor:'#22c55e',downColor:'#ef4444',borderUpColor:'#22c55e',borderDownColor:'#ef4444',wickUpColor:'#22c55e',wickDownColor:'#ef4444'} as any);
    chartRef.current=chart; seriesRef.current=series as ISeriesApi<'Candlestick'>;
    const onLogicalRangeChange = () => setOverlayTick(t => t + 1);
    chart.timeScale().subscribeVisibleLogicalRangeChange(onLogicalRangeChange);
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
    const container = containerRef.current;
    container.addEventListener('dblclick', onDbl);
    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(onLogicalRangeChange);
      ro.disconnect();
      container?.removeEventListener('dblclick', onDbl);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [height, getThemeColors]);

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

  const loadData = useCallback(async () => {
    if (!seriesRef.current) return;
    const p4 = instrument === 'XRP/USDT';
    const p3 = instrument === 'SILVER';
    const prec = p4 ? 4 : p3 ? 3 : 2;
    const mm = p4 ? 0.0001 : p3 ? 0.001 : 0.01;
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

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;
    const lines: Array<{ price: number; color: string; label: string; style: LineStyle }> = [];
    if (prediction) {
      const buy = prediction.buyingZone ?? prediction.entryPrice * 0.97;
      const sell = prediction.sellingZone ?? prediction.entryPrice * 1.06;
      const f = (p: number) => instrument === 'SILVER' ? p.toFixed(2) : p.toLocaleString(undefined, { minimumFractionDigits: 2 });
      lines.push(
        { price: buy, color: '#22c55e', label: `Buy Zone  $${f(buy)}`, style: LineStyle.Solid },
        { price: sell, color: '#ef4444', label: `Sell Zone $${f(sell)}`, style: LineStyle.Solid },
        { price: prediction.entryPrice, color: '#a78bfa', label: `Entry     $${f(prediction.entryPrice)}`, style: LineStyle.Dashed }
      );
      if (prediction.stopLoss) lines.push({ price: prediction.stopLoss, color: '#f97316', label: `SL  $${f(prediction.stopLoss)}`, style: LineStyle.SparseDotted });
      if (prediction.takeProfit) lines.push({ price: prediction.takeProfit, color: '#34d399', label: `TP1 $${f(prediction.takeProfit)}`, style: LineStyle.SparseDotted });
      if (prediction.takeProfit2) lines.push({ price: prediction.takeProfit2, color: '#6ee7b7', label: `TP2 $${f(prediction.takeProfit2)}`, style: LineStyle.SparseDotted });
      if (prediction.takeProfit3) lines.push({ price: prediction.takeProfit3, color: '#a7f3d0', label: `TP3 $${f(prediction.takeProfit3)}`, style: LineStyle.SparseDotted });
    }
    priceLineRefs.current.forEach(r => { try { seriesRef.current?.removePriceLine(r); } catch {} });
    priceLineRefs.current = lines.map(l => series.createPriceLine({ price: l.price, color: l.color, lineWidth: 2, lineStyle: l.style, axisLabelVisible: true, title: l.label }));
    return () => {
      priceLineRefs.current.forEach(r => { try { series.removePriceLine(r); } catch {} });
      priceLineRefs.current = [];
    };
  }, [prediction, instrument]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const priceToY = useCallback((p: number) => seriesRef.current?.priceToCoordinate(p) ?? null, [overlayTick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const yToPrice = useCallback((y: number) => seriesRef.current?.coordinateToPrice(y) ?? null, [overlayTick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const barToX = useCallback((i: number) => chartRef.current?.timeScale().logicalToCoordinate(i as any) ?? null, [overlayTick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const xToBar = useCallback((x: number) => (chartRef.current?.timeScale().coordinateToLogical(x as any) as number) ?? 0, [overlayTick]);
  const svgW = useCallback(() => svgRef.current?.clientWidth ?? 0, []);

  const isDrawing=activeTool!=='pointer';

  const handleSvgMouseDown=useCallback((e:ReactMouseEvent<SVGSVGElement>)=>{
    if(!isDrawing||activeTool==='text') return;
    const rect=svgRef.current!.getBoundingClientRect();
    const x=e.clientX-rect.left,y=e.clientY-rect.top;
    const price=yToPrice(y)??0,bi=xToBar(x);
    if(activeTool==='horizontal'){setDrawings(p=>[...p,{id:uid(),type:'horizontal',color:drawColor,opacity:0.9,price} as HorizontalLineDrawing]);return;}
    if(activeTool==='brush')     {setDraft({id:uid(),type:'brush',    color:drawColor,opacity:0.85,points:[{price,barIndex:bi}]} as BrushDrawing);return;}
    if(activeTool==='trendline') {setDraft({id:uid(),type:'trendline',color:drawColor,opacity:0.9,price1:price,price2:price,barIndex1:bi,barIndex2:bi} as TrendLineDrawing);return;}
    if(activeTool==='rectangle') {setDraft({id:uid(),type:'rectangle',color:drawColor,opacity:0.4,price1:price,price2:price,barIndex1:bi,barIndex2:bi} as RectangleDrawing);return;}
    if(activeTool==='long')      {setDraft({id:uid(),type:'long',     color:'#22c55e',opacity:0.35,entryPrice:price,stopPrice:price*0.98,targetPrice:price*1.04,barIndex1:bi,barIndex2:bi+20} as LongPositionDrawing);return;}
    if(activeTool==='short')     {setDraft({id:uid(),type:'short',    color:'#ef4444',opacity:0.35,entryPrice:price,stopPrice:price*1.02,targetPrice:price*0.96,barIndex1:bi,barIndex2:bi+20} as ShortPositionDrawing);return;}
  },[activeTool,isDrawing,drawColor,yToPrice,xToBar]);

  const handleSvgMouseMove=useCallback((e:ReactMouseEvent<SVGSVGElement>)=>{
    if(!draft) return;
    const rect=svgRef.current!.getBoundingClientRect();
    const x=e.clientX-rect.left,y=e.clientY-rect.top;
    const price=yToPrice(y)??0,bi=xToBar(x);
    setDraft(prev=>{
      if(!prev) return null;
      if(prev.type==='brush')     return{...prev,points:[...prev.points,{price,barIndex:bi}]};
      if(prev.type==='trendline') return{...prev,price2:price,barIndex2:bi};
      if(prev.type==='rectangle') return{...prev,price2:price,barIndex2:bi};
      if(prev.type==='long'){const d=Math.abs(price-prev.entryPrice);return{...prev,targetPrice:price,stopPrice:prev.entryPrice-d*0.5,barIndex2:bi};}
      if(prev.type==='short'){const d=Math.abs(price-prev.entryPrice);return{...prev,targetPrice:price,stopPrice:prev.entryPrice+d*0.5,barIndex2:bi};}
      return prev;
    });
  },[draft,yToPrice,xToBar]);

  const handleSvgMouseUp=useCallback(()=>{if(!draft)return;setDrawings(p=>[...p,draft]);setDraft(null);},[draft]);

  const handleSvgClick=useCallback((e:ReactMouseEvent<SVGSVGElement>)=>{
    if(activeTool!=='text') return;
    const rect=svgRef.current!.getBoundingClientRect();
    const x=e.clientX-rect.left,y=e.clientY-rect.top;
    setPendingText({x,y,price:yToPrice(y)??0,barIdx:xToBar(x)});
    setTextValue(''); setTimeout(()=>textInputRef.current?.focus(),50);
  },[activeTool,yToPrice,xToBar]);

  const commitText=useCallback(()=>{
    if(!pendingText||!textValue.trim()){setPendingText(null);return;}
    setDrawings(p=>[...p,{id:uid(),type:'text',color:drawColor,opacity:1,price:pendingText.price,barIndex:pendingText.barIdx,text:textValue.trim(),fontSize:13} as TextDrawing]);
    setPendingText(null);setTextValue('');
  },[pendingText,textValue,drawColor]);

  const handleDClick=useCallback((id:string,e:ReactMouseEvent)=>{e.stopPropagation();if(activeTool==='pointer')setSelectedId(s=>s===id?null:id);},[activeTool]);

  const handleUndo =()=>setDrawings(p=>p.slice(0,-1));
  const handleClear=()=>{setDrawings([]);setSelectedId(null);};
  const handleSave =()=>{if(predictionId){saveChartDrawings(predictionId,drawings as object[]);setSavedAt(new Date().toLocaleTimeString());}};

  const scrollLeft =useCallback(()=>{const ts=chartRef.current?.timeScale(),r=ts?.getVisibleLogicalRange();if(!r)return;const s=r.to-r.from;ts!.setVisibleLogicalRange({from:r.from-Math.max(5,s*.25),to:r.to-Math.max(5,s*.25)});},[]);
  const scrollRight=useCallback(()=>{const ts=chartRef.current?.timeScale(),r=ts?.getVisibleLogicalRange();if(!r)return;const s=r.to-r.from;ts!.setVisibleLogicalRange({from:r.from+Math.max(5,s*.25),to:r.to+Math.max(5,s*.25)});},[]);
  const panUp      =useCallback(()=>{const ps=chartRef.current?.priceScale('right'),r=ps?.getVisibleRange();if(!r)return;const st=(r.to-r.from)*.15;ps!.applyOptions({autoScale:false});ps!.setVisibleRange({from:r.from+st,to:r.to+st});},[]);
  const panDown    =useCallback(()=>{const ps=chartRef.current?.priceScale('right'),r=ps?.getVisibleRange();if(!r)return;const st=(r.to-r.from)*.15;ps!.applyOptions({autoScale:false});ps!.setVisibleRange({from:r.from-st,to:r.to-st});},[]);
  const zoomIn     =useCallback(()=>{const ts=chartRef.current?.timeScale(),r=ts?.getVisibleLogicalRange();if(!r)return;const s=r.to-r.from;if(s<=10)return;const sh=Math.max(2,s*.15);ts!.setVisibleLogicalRange({from:r.from+sh,to:r.to-sh});},[]);
  const zoomOut    =useCallback(()=>{const ts=chartRef.current?.timeScale(),r=ts?.getVisibleLogicalRange();if(!r)return;const s=r.to-r.from;const sh=Math.max(2,s*.15);ts!.setVisibleLogicalRange({from:r.from-sh,to:r.to+sh});},[]);
  const resetView  =useCallback(()=>{chartRef.current?.priceScale('right').applyOptions({autoScale:true});chartRef.current?.timeScale().fitContent();},[]);

  const renderDrawing=useCallback((d:ChartDrawing,isDraft=false)=>{
    const isSel=!isDraft&&d.id===selectedId;
    const stroke=isSel?'#fff':d.color;
    const selStyle=isSel?{filter:'drop-shadow(0 0 3px rgba(255,255,255,0.6))'}:{};
    const cp={onClick:(e:ReactMouseEvent)=>handleDClick(d.id,e),style:{cursor:activeTool==='pointer'?'pointer':'crosshair',...selStyle}};

    if(d.type==='horizontal'){
      const y=priceToY(d.price); if(y===null)return null;
      const w=svgW();
      return(<g key={d.id} {...cp}><line x1={0} y1={y} x2={w} y2={y} stroke={stroke} strokeWidth={2} strokeDasharray="6,4" opacity={d.opacity}/><text x={8} y={y-4} fill={stroke} fontSize={10} fontFamily="ui-monospace,monospace" opacity={0.9}>{d.price.toLocaleString(undefined,{minimumFractionDigits:2})}</text></g>);
    }
    if(d.type==='trendline'){
      const x1=barToX(d.barIndex1),y1=priceToY(d.price1),x2=barToX(d.barIndex2),y2=priceToY(d.price2);
      if(x1===null||y1===null||x2===null||y2===null)return null;
      return <line key={d.id} x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={2} opacity={d.opacity} {...cp}/>;
    }
    if(d.type==='rectangle'){
      const x1=barToX(d.barIndex1),y1=priceToY(d.price1),x2=barToX(d.barIndex2),y2=priceToY(d.price2);
      if(x1===null||y1===null||x2===null||y2===null)return null;
      return(<g key={d.id} {...cp}><rect x={Math.min(x1,x2)} y={Math.min(y1,y2)} width={Math.abs(x2-x1)} height={Math.abs(y2-y1)} fill={d.color} fillOpacity={d.opacity} stroke={stroke} strokeWidth={1.5} rx={2}/></g>);
    }
    if(d.type==='long'||d.type==='short'){
      const isL=d.type==='long';
      const x1=barToX(d.barIndex1),x2=barToX(d.barIndex2),yE=priceToY(d.entryPrice),yT=priceToY(d.targetPrice),yS=priceToY(d.stopPrice);
      if(x1===null||x2===null||yE===null||yT===null||yS===null)return null;
      const rx=Math.min(x1,x2),rw=Math.abs(x2-x1);
      const pC=isL?'#22c55e':'#ef4444',lC=isL?'#ef4444':'#22c55e';
      const pY=Math.min(yE,yT),pH=Math.abs(yT-yE),lY=Math.min(yE,yS),lH=Math.abs(yS-yE);
      const f=(p:number)=>p.toLocaleString(undefined,{minimumFractionDigits:2});
      return(<g key={d.id} {...cp}>
        <rect x={rx} y={pY} width={rw} height={pH} fill={pC} fillOpacity={0.18} stroke={pC} strokeWidth={1}/>
        <rect x={rx} y={lY} width={rw} height={lH} fill={lC} fillOpacity={0.18} stroke={lC} strokeWidth={1}/>
        <line x1={rx} y1={yE} x2={rx+rw} y2={yE} stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4,2"/>
        <text x={rx+4} y={pY+13}           fill={pC}      fontSize={9} fontFamily="ui-monospace,monospace" fontWeight="700">{isL?'▲ TP':'▼ TP'} {f(d.targetPrice)}</text>
        <text x={rx+4} y={yE+(isL?-4:13)}  fill="#94a3b8" fontSize={9} fontFamily="ui-monospace,monospace" fontWeight="700">Entry {f(d.entryPrice)}</text>
        <text x={rx+4} y={lY+lH-4}         fill={lC}      fontSize={9} fontFamily="ui-monospace,monospace" fontWeight="700">{isL?'▼ SL':'▲ SL'} {f(d.stopPrice)}</text>
      </g>);
    }
    if(d.type==='brush'){
      if(d.points.length<2)return null;
      const pts=d.points.map(p=>{const x=barToX(p.barIndex),y=priceToY(p.price);return x!==null&&y!==null?`${x},${y}`:null;}).filter(Boolean).join(' ');
      return <polyline key={d.id} points={pts} fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={d.opacity} {...cp}/>;
    }
    if(d.type==='text'){
      const x=barToX(d.barIndex),y=priceToY(d.price); if(x===null||y===null)return null;
      return(<g key={d.id} {...cp}><text x={x} y={y} fill={stroke} fontSize={d.fontSize} fontFamily="Inter,system-ui,sans-serif" fontWeight="600" opacity={d.opacity}>{d.text}</text></g>);
    }
    return null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[selectedId,activeTool,priceToY,barToX,svgW,handleDClick,overlayTick]);

  useLayoutEffect(()=>{setDrawColor(DEFAULT_COLORS[activeTool]);},[activeTool]);

  const fmt=(p:number)=>p.toLocaleString(undefined,{minimumFractionDigits:2});
  const buy =prediction?prediction.buyingZone ??prediction.entryPrice*0.97:null;
  const sell=prediction?prediction.sellingZone??prediction.entryPrice*1.06:null;

  const tools:{tool:DrawingTool;Icon:React.FC<any>;label:string}[]=[
    {tool:'pointer',   Icon:MousePointer2,label:TOOL_LABELS.pointer},
    {tool:'horizontal',Icon:Minus,        label:TOOL_LABELS.horizontal},
    {tool:'trendline', Icon:TrendingUp,   label:TOOL_LABELS.trendline},
    {tool:'long',      Icon:ArrowUpRight, label:TOOL_LABELS.long},
    {tool:'short',     Icon:TrendingDown, label:TOOL_LABELS.short},
    {tool:'rectangle', Icon:Square,       label:TOOL_LABELS.rectangle},
    {tool:'brush',     Icon:Pen,          label:TOOL_LABELS.brush},
    {tool:'text',      Icon:Type,         label:TOOL_LABELS.text},
  ];

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-sm relative select-none" style={{height}}>
      <div ref={containerRef} style={{width:'100%',height:'100%'}}/>

      <svg ref={svgRef} className="absolute inset-0 w-full h-full"
        style={{cursor:activeTool==='pointer'?'default':'crosshair',pointerEvents:'all',zIndex:5}}
        onMouseDown={handleSvgMouseDown} onMouseMove={handleSvgMouseMove}
        onMouseUp={handleSvgMouseUp} onClick={handleSvgClick} onMouseLeave={handleSvgMouseUp}>
        {drawings.map(d=>renderDrawing(d,false))}
        {draft&&renderDrawing(draft,true)}
      </svg>

      {pendingText&&(
        <div className="absolute z-20" style={{left:pendingText.x+4,top:pendingText.y-20}}>
          <input ref={textInputRef} value={textValue}
            onChange={(e:ChangeEvent<HTMLInputElement>)=>setTextValue(e.target.value)}
            onKeyDown={e=>{if(e.key==='Enter')commitText();if(e.key==='Escape')setPendingText(null);}}
            onBlur={commitText}
            className="bg-[var(--bg-card)] border border-[var(--brand-primary)] text-[var(--text-primary)] text-xs px-2 py-1 rounded-lg outline-none shadow-lg font-medium"
            style={{minWidth:140}} placeholder="Type annotation…"/>
        </div>
      )}

      {/* Left toolbar */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-1 bg-[var(--bg-card)]/90 backdrop-blur-md px-1 py-1.5 rounded-xl border border-[var(--border-subtle)] shadow-lg">
        {tools.map(({tool,Icon,label})=>(
          <button key={tool} type="button" title={label} onClick={()=>setActiveTool(tool)}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${activeTool===tool?'bg-[var(--brand-primary)] text-white shadow-[0_0_8px_var(--brand-primary)]':'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]'}`}>
            <Icon className="w-3.5 h-3.5"/>
          </button>
        ))}
        <div className="w-5 h-px bg-[var(--border-subtle)] my-0.5"/>
        <label title="Drawing color" className="p-1 rounded cursor-pointer hover:bg-[var(--bg-surface-hover)]">
          <div className="w-3.5 h-3.5 rounded-full border border-white/30" style={{background:drawColor}}/>
          <input type="color" value={drawColor} onChange={e=>setDrawColor(e.target.value)} className="sr-only"/>
        </label>
      </div>

      {/* Bottom toolbar */}
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
        <button type="button" onClick={handleUndo}  disabled={!drawings.length} title="Undo" className="p-1 rounded hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 transition-all cursor-pointer"><Undo2  className="w-3.5 h-3.5"/></button>
        <button type="button" onClick={handleClear} disabled={!drawings.length} title="Clear all" className="p-1 rounded hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-red-400 disabled:opacity-30 transition-all cursor-pointer"><Trash2 className="w-3.5 h-3.5"/></button>
        {predictionId&&(
          <button type="button" onClick={handleSave} title={savedAt?`Saved at ${savedAt}`:'Save drawings'} className="p-1 rounded hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-emerald-400 transition-all cursor-pointer flex items-center gap-1">
            <Save className="w-3.5 h-3.5"/>{savedAt&&<span className="text-[9px] text-emerald-400 font-medium">{savedAt}</span>}
          </button>
        )}
      </div>

      {/* Top-left legend */}
      <div className="absolute top-3 left-14 flex flex-col gap-1.5 z-10 pointer-events-none">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-bold font-mono shadow-sm backdrop-blur-md bg-black/60 border border-white/10 text-white w-fit">
          <span>{instrument}</span><span className="text-[10px] text-white/60 font-semibold uppercase">{interval}</span>
        </div>
        {prediction&&(
          <div className="flex flex-col gap-1">
            {buy !==null&&<ZoneLegend label={`Buy Zone  $${fmt(buy)}`}  color="#22c55e"/>}
            {sell!==null&&<ZoneLegend label={`Sell Zone $${fmt(sell)}`} color="#ef4444"/>}
            <ZoneLegend label={`Entry     $${fmt(prediction.entryPrice)}`} color="#a78bfa" dashed/>
            {prediction.stopLoss   &&<ZoneLegend label={`SL        $${fmt(prediction.stopLoss)}`}    color="#f97316" dashed/>}
            {prediction.takeProfit &&<ZoneLegend label={`TP1       $${fmt(prediction.takeProfit)}`}  color="#34d399" dashed/>}
            {prediction.takeProfit2&&<ZoneLegend label={`TP2       $${fmt(prediction.takeProfit2)}`} color="#6ee7b7" dashed/>}
            {prediction.takeProfit3&&<ZoneLegend label={`TP3       $${fmt(prediction.takeProfit3)}`} color="#a7f3d0" dashed/>}
          </div>
        )}
      </div>

      {activeTool!=='pointer'&&(
        <div className="absolute top-3 right-3 z-10 pointer-events-none">
          <div className="px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wide shadow-sm backdrop-blur-md bg-[var(--brand-primary)]/20 border border-[var(--brand-primary)]/40 text-[var(--brand-primary)]">
            {TOOL_LABELS[activeTool]}
          </div>
        </div>
      )}

      {selectedId&&activeTool==='pointer'&&(
        <div className="absolute top-3 right-3 z-10 pointer-events-auto">
          <button type="button"
            onClick={()=>{setDrawings(p=>p.filter(d=>d.id!==selectedId));setSelectedId(null);}}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold shadow-sm backdrop-blur-md bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 transition-colors cursor-pointer">
            <Trash2 className="w-3 h-3"/> Delete selected
          </button>
        </div>
      )}
    </div>
  );
};

const ZoneLegend:React.FC<{label:string;color:string;dashed?:boolean}>=({label,color,dashed})=>(
  <div className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold font-mono shadow-sm backdrop-blur-md" style={{background:'rgba(0,0,0,0.65)',color:'#fff'}}>
    <span className="inline-block w-5 flex-shrink-0" style={{height:'2px',background:dashed?'transparent':color,borderTop:dashed?`2px dashed ${color}`:'none',opacity:0.9}}/>
    <span style={{color}}>{label}</span>
  </div>
);
