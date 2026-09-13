import React, { useRef } from 'react';
import { CandleData } from '../../types';

interface SimpleChartProps {
  candles: CandleData[];
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  buyingZone?: number;
  sellingZone?: number;
  direction?: 'LONG' | 'SHORT';
}

/**
 * ChartAdapter — Lightweight SVG price chart for visualizing prediction context.
 * Renders visual context lines including Buying Zone, Selling Zone, or entry levels.
 */
export const SimpleChart: React.FC<SimpleChartProps> = ({
  candles,
  entryPrice,
  buyingZone,
  sellingZone,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  if (!candles.length) {
    return (
      <div className="w-full h-full flex items-center justify-center text-xs text-[var(--text-muted)]">
        Chart data not available
      </div>
    );
  }

  const w = 760;
  const h = 380;
  const padTop = 25;
  const padBottom = 35;
  const padLeft = 15;
  const padRight = 100;
  const chartW = w - padLeft - padRight;
  const chartH = h - padTop - padBottom;

  const validExtraPrices = [
    entryPrice,
    buyingZone,
    sellingZone,
  ].filter((p): p is number => typeof p === 'number' && p > 0);

  const candleExtremes = candles.flatMap((c) => [c.high, c.low]);
  const allPrices = [...candleExtremes, ...validExtraPrices];
  const minP = Math.min(...allPrices) * 0.998;
  const maxP = Math.max(...allPrices) * 1.002;
  const range = maxP - minP || 1;

  const py = (price: number) => padTop + ((maxP - price) / range) * chartH;

  // Candlestick rendering calculations
  const candleWidth = Math.max(3, chartW / candles.length - 2);

  const formatPrice = (p: number) =>
    p > 1 ? p.toLocaleString(undefined, { maximumFractionDigits: 2 }) : p.toFixed(4);

  const latestCandle = candles[candles.length - 1];

  return (
    <div ref={containerRef} className="w-full h-full relative select-none">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full h-full overflow-visible"
        style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
      >
        <defs>
          {/* Neon Glow Filters for Zones */}
          <filter id="glow-green" x="-20%" y="-50%" width="140%" height="200%">
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#10b981" floodOpacity="0.6" />
          </filter>
          <filter id="glow-red" x="-20%" y="-50%" width="140%" height="200%">
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#f43f5e" floodOpacity="0.6" />
          </filter>
          <linearGradient id="buying-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="selling-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Background Grid Lines & Price Ticks */}
        {[0.2, 0.4, 0.6, 0.8].map((f) => {
          const priceLevel = maxP - f * range;
          const y = padTop + f * chartH;
          return (
            <g key={f}>
              <line
                x1={padLeft}
                y1={y}
                x2={padLeft + chartW}
                y2={y}
                stroke="var(--border-subtle)"
                strokeWidth={0.7}
                strokeDasharray="4,4"
                opacity={0.6}
              />
              <text
                x={padLeft + chartW + 6}
                y={y + 3.5}
                fontSize={9}
                fill="var(--text-muted)"
                fontFamily="ui-monospace, monospace"
              >
                {formatPrice(priceLevel)}
              </text>
            </g>
          );
        })}

        {/* Candlesticks Rendering */}
        {candles.map((c, i) => {
          const xC = padLeft + (i / Math.max(1, candles.length - 1)) * chartW;
          const bullish = c.close >= c.open;
          const color = bullish ? '#10b981' : '#f43f5e';
          const bodyTop = py(Math.max(c.open, c.close));
          const bodyH = Math.max(1.5, Math.abs(py(c.open) - py(c.close)));

          return (
            <g key={i}>
              {/* High-Low Wick */}
              <line
                x1={xC}
                y1={py(c.high)}
                x2={xC}
                y2={py(c.low)}
                stroke={color}
                strokeWidth={1}
                opacity={0.85}
              />
              {/* Candlestick Body */}
              <rect
                x={xC - candleWidth / 2}
                y={bodyTop}
                width={candleWidth}
                height={bodyH}
                fill={color}
                opacity={0.8}
                rx={1}
              />
            </g>
          );
        })}

        {/* Current Live Price Line */}
        {latestCandle && (
          <g>
            <line
              x1={padLeft}
              y1={py(latestCandle.close)}
              x2={padLeft + chartW}
              y2={py(latestCandle.close)}
              stroke="#60a5fa"
              strokeWidth={1}
              strokeDasharray="2,2"
              opacity={0.5}
            />
            <circle
              cx={padLeft + chartW}
              cy={py(latestCandle.close)}
              r={3}
              fill="#3b82f6"
              className="animate-ping"
              opacity={0.7}
            />
            <circle
              cx={padLeft + chartW}
              cy={py(latestCandle.close)}
              r={3}
              fill="#60a5fa"
            />
          </g>
        )}

        {/* Buying Zone: Shaded Band, Glowing Line & Right-Edge Price Badge */}
        {buyingZone && buyingZone > 0 && (
          <g>
            {/* Shaded Area */}
            <rect
              x={padLeft}
              y={Math.max(padTop, py(buyingZone) - 12)}
              width={chartW}
              height={24}
              fill="url(#buying-gradient)"
              rx={4}
            />
            {/* Solid glowing level line */}
            <line
              x1={padLeft}
              y1={py(buyingZone)}
              x2={padLeft + chartW}
              y2={py(buyingZone)}
              stroke="#10b981"
              strokeWidth={2.5}
              strokeDasharray="6,3"
              filter="url(#glow-green)"
            />
            {/* Price Badge on Right Margin */}
            <rect
              x={padLeft + chartW + 4}
              y={py(buyingZone) - 10}
              width={90}
              height={20}
              rx={5}
              fill="#064e3b"
              stroke="#10b981"
              strokeWidth={1.5}
            />
            <text
              x={padLeft + chartW + 49}
              y={py(buyingZone) + 3.5}
              fontSize={9.5}
              fill="#34d399"
              fontWeight="800"
              textAnchor="middle"
              fontFamily="ui-monospace, monospace"
            >
              BUY {formatPrice(buyingZone)}
            </text>
          </g>
        )}

        {/* Selling Zone: Shaded Band, Glowing Line & Right-Edge Price Badge */}
        {sellingZone && sellingZone > 0 && (
          <g>
            {/* Shaded Area */}
            <rect
              x={padLeft}
              y={Math.max(padTop, py(sellingZone) - 12)}
              width={chartW}
              height={24}
              fill="url(#selling-gradient)"
              rx={4}
            />
            {/* Solid glowing level line */}
            <line
              x1={padLeft}
              y1={py(sellingZone)}
              x2={padLeft + chartW}
              y2={py(sellingZone)}
              stroke="#f43f5e"
              strokeWidth={2.5}
              strokeDasharray="6,3"
              filter="url(#glow-red)"
            />
            {/* Price Badge on Right Margin */}
            <rect
              x={padLeft + chartW + 4}
              y={py(sellingZone) - 10}
              width={90}
              height={20}
              rx={5}
              fill="#4c0519"
              stroke="#f43f5e"
              strokeWidth={1.5}
            />
            <text
              x={padLeft + chartW + 49}
              y={py(sellingZone) + 3.5}
              fontSize={9.5}
              fill="#fb7185"
              fontWeight="800"
              textAnchor="middle"
              fontFamily="ui-monospace, monospace"
            >
              SELL {formatPrice(sellingZone)}
            </text>
          </g>
        )}

        {/* Entry line if provided */}
        {entryPrice && entryPrice > 0 && (
          <g>
            <line
              x1={padLeft}
              y1={py(entryPrice)}
              x2={padLeft + chartW}
              y2={py(entryPrice)}
              stroke="#60a5fa"
              strokeWidth={2}
              strokeDasharray="4,2"
            />
            <rect
              x={padLeft + chartW + 4}
              y={py(entryPrice) - 9}
              width={80}
              height={18}
              rx={4}
              fill="#1e3a8a"
              stroke="#60a5fa"
            />
            <text
              x={padLeft + chartW + 44}
              y={py(entryPrice) + 3}
              fontSize={9}
              fill="#93c5fd"
              fontWeight="bold"
              textAnchor="middle"
              fontFamily="ui-monospace, monospace"
            >
              ENTRY {formatPrice(entryPrice)}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
};
