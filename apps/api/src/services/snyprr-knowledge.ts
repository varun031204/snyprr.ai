// ─── Snyprr.ai Knowledge Base ────────────────────────────────────────────────
// Used by the integrated chatbot route.

const SNYPRR_AI_KNOWLEDGE = [
  {
    id: 'overview',
    title: 'What is Snyprr.ai?',
    content: `
Snyprr.ai is a prediction and trade-idea tracking platform.
Verified analysts publish prediction ideas with precise Buying Zones and Selling Zones.
Users can: track predictions, follow traders, manage a watchlist, review historical performance, view trading analysis.
Snyprr.ai does NOT execute trades on behalf of users and does NOT take custody of user funds.
`,
  },
  {
    id: 'signup',
    title: 'Account creation and signup',
    content: `
Snyprr.ai signup asks for: Full Name, Email Address, Password (minimum 8 characters).
Users who already have an account can use the Sign In option.
`,
  },
  {
    id: 'markets',
    title: 'Supported markets',
    content: `
Snyprr.ai instruments: BTC/USDT (Crypto), ETH/USDT (Crypto), SOL/USDT (Crypto), XRP/USDT (Crypto), GOLD (Commodities), SILVER (Commodities).
`,
  },
  {
    id: 'predictions',
    title: 'Snyprr.ai Predictions',
    content: `
Predictions contain: Instrument, Direction (LONG/SHORT), Entry Price, Buying Zone, Selling Zone, Stop Loss, Take Profit, Risk/Reward, Timeframe, Strategy, Analysis, Tags, Status, Visibility.
Statuses: DRAFT, PUBLISHED, ACTIVE, TARGET_HIT, STOP_HIT, CLOSED, CANCELLED, EXPIRED.
Visibility: PUBLIC, SUBSCRIBERS_ONLY, EXCLUSIVE.
`,
  },
  {
    id: 'strategies',
    title: 'Snyprr.ai strategies',
    content: `
Strategy labels: Breakout & Retest, Smart Money Concepts, Supply & Demand Zones, Trendline Breakout, Fibonacci Retracement, RSI/MACD Divergence, Liquidity Sweep, Harmonic Pattern.
`,
  },
  {
    id: 'smc',
    title: 'Smart Money Concepts',
    content: `
Order Block: last opposing candle before a strong move.
Fair Value Gap (FVG): price imbalance area.
Liquidity: areas where orders/stop losses concentrate.
Break of Structure (BOS): change in market structure.
These are educational — they do not guarantee future movements.
`,
  },
  {
    id: 'charts',
    title: 'Charts and Zone Lines',
    content: `
Snyprr.ai uses: Green band = Buying Zone, Red band = Selling Zone, Entry line = Declared Entry Price.
Also uses TradingView-style charts and Lightweight Charts.
`,
  },
  {
    id: 'pro',
    title: 'Snyprr.ai PRO subscription',
    content: `
PRO: $29/month or $290/year.
Includes: Subscriber-Only predictions, realtime alerts, email/web alerts, prediction overlays & analysis, follow up to 15 traders, historical analytics.
`,
  },
  {
    id: 'vip',
    title: 'Snyprr.ai VIP subscription',
    content: `
VIP: $79/month or $790/year.
Includes: Exclusive/VIP predictions, unlimited trader follows, instant WebSocket alerts, Trader Journal, rationale access, Priority AI search, VIP Discord channel.
`,
  },
  {
    id: 'trial',
    title: 'Snyprr.ai free trial',
    content: `30-Day Free Trial available. $0 due today. Yearly billing: 2 Months Free.`,
  },
  {
    id: 'traders',
    title: 'Traders and verification',
    content: `
Trader profiles include: display name, handle, verification badge, followers, subscribers, total predictions, win rate, avg risk/reward, featured markets, social links.
`,
  },
  {
    id: 'notifications',
    title: 'Notifications',
    content: `Snyprr.ai sends notifications for: New Prediction Published, Selling Zone Reached, Prediction status changes.`,
  },
  {
    id: 'support',
    title: 'Snyprr.ai support',
    content: `Support: support@snyprr.ai. Developer contact: dev@snyprr.ai.`,
  },
  {
    id: 'paper-trading',
    title: 'Paper Trading',
    content: `
Snyprr.ai includes a Paper Trading feature with simulated $10,000 virtual balance.
Users can place Market orders (executed at current market price) or Limit orders (executed when price reaches set entry).
Paper trades include: Buying Zone, Selling Zone, Stop Loss, Take Profit, timeframe, and trade notes.
Paper trading is risk-free simulation — no real money involved.
`,
  },
  {
    id: 'ai-analysis',
    title: 'AI Analysis',
    content: `
Snyprr.ai includes an AI Analysis panel powered by advanced AI models.
It evaluates trader setups and provides: overview, risk/reward assessment, market sentiment, verdict (BULLISH/BEARISH/NEUTRAL/CAUTION), and key points.
An embedded chat lets users ask follow-up questions about the trade setup.
`,
  },
];

function scoreKnowledge(query: string) {
  const q = query.toLowerCase();
  const words = q.split(/[^a-z0-9/.-]+/).filter(Boolean);

  return SNYPRR_AI_KNOWLEDGE
    .map((item) => {
      let score = 0;
      const title = item.title.toLowerCase();
      const content = item.content.toLowerCase();
      for (const word of words) {
        if (word.length < 2) continue;
        if (title.includes(word)) score += 3;
        if (content.includes(word)) score += 1;
      }
      return { item, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((r) => r.item);
}

export function buildKnowledgeContext(query: string): string {
  const matches = scoreKnowledge(query);
  if (matches.length === 0) {
    return `No specific Snyprr.ai knowledge matched. Do NOT invent Snyprr.ai-specific information. If asked about a Snyprr.ai feature not confirmed, say you don't have confirmed info about it.`;
  }
  return matches.map((item) => `### ${item.title}\n${item.content.trim()}`).join('\n\n');
}
