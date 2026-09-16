// Snyprr.ai knowledge base for the client-side chatbot

const KNOWLEDGE = [
  { id: 'overview', title: 'What is Snyprr.ai?', content: `Snyprr.ai is a trading intelligence and signal platform. Verified analysts publish predictions with precise Buying Zones and Selling Zones. Users can track predictions, follow traders, manage a watchlist and review historical performance. Snyprr.ai does NOT execute trades or hold user funds.` },
  { id: 'signup',   title: 'Account creation', content: `Signup asks for Full Name, Email and Password (min 8 chars). Existing users use Sign In.` },
  { id: 'markets',  title: 'Supported markets', content: `BTC/USDT, ETH/USDT, SOL/USDT, XRP/USDT (Crypto). GOLD, SILVER (Commodities).` },
  { id: 'predictions', title: 'Predictions', content: `Predictions include: Instrument, Direction (LONG/SHORT), Buying Zone, Selling Zone, Stop Loss, Take Profit, Risk/Reward, Timeframe, Strategy, Analysis. Statuses: DRAFT, PUBLISHED, ACTIVE, TARGET_HIT, STOP_HIT, CLOSED, CANCELLED, EXPIRED.` },
  { id: 'paper-trading', title: 'Paper Trading', content: `Paper Trading uses a simulated $10,000 virtual balance. Market orders execute at current price. Limit orders execute when price reaches the Buying Zone. Fully risk-free — no real money.` },
  { id: 'ai-analysis', title: 'AI Analysis', content: `The AI Analysis panel evaluates trader setups and provides: overview, risk/reward, market sentiment, verdict (BULLISH/BEARISH/NEUTRAL/CAUTION) and key points. An embedded chat allows follow-up questions.` },
  { id: 'pro', title: 'PRO subscription', content: `PRO: $29/month or $290/year. Includes subscriber-only predictions, realtime alerts, email/web alerts, prediction overlays, follow up to 15 traders, historical analytics.` },
  { id: 'vip', title: 'VIP subscription', content: `VIP: $79/month or $790/year. Includes exclusive predictions, unlimited trader follows, instant WebSocket alerts, Trader Journal, priority AI search, VIP Discord.` },
  { id: 'trial', title: 'Free trial', content: `30-day free trial. $0 due today. Yearly plan includes 2 months free.` },
  { id: 'traders', title: 'Traders', content: `Trader profiles show: display name, handle, verified badge, followers, subscribers, win rate, avg risk/reward, featured markets, social links.` },
  { id: 'smc', title: 'Smart Money Concepts', content: `Order Block: last opposing candle before a strong move. FVG (Fair Value Gap): price imbalance. Liquidity: areas with stop-loss clusters. BOS (Break of Structure): market structure change. Educational — not trading advice.` },
  { id: 'charts', title: 'Charts', content: `Snyprr.ai uses TradingView charts and Lightweight Charts. Green overlay = Buying Zone. Red overlay = Selling Zone. Drawing tools include trend lines, Fibonacci retracements, channels, pitchfork, and more.` },
  { id: 'strategies', title: 'Strategies', content: `Available strategies: Breakout & Retest, Smart Money Concepts, Supply & Demand Zones, Trendline Breakout, Fibonacci Retracement, RSI/MACD Divergence, Liquidity Sweep, Harmonic Pattern.` },
  { id: 'support', title: 'Support', content: `Support: support@snyprr.ai. Developer contact: dev@snyprr.ai.` },
];

function scoreKnowledge(query: string) {
  const q = query.toLowerCase();
  const words = q.split(/[^a-z0-9/.-]+/).filter(w => w.length > 1);

  return KNOWLEDGE
    .map(item => {
      let score = 0;
      const title   = item.title.toLowerCase();
      const content = item.content.toLowerCase();
      for (const w of words) {
        if (title.includes(w))   score += 3;
        if (content.includes(w)) score += 1;
      }
      return { item, score };
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(r => r.item);
}

export function buildKnowledgeContext(query: string): string {
  const matches = scoreKnowledge(query);
  if (!matches.length) return 'No specific Snyprr.ai knowledge matched. Do NOT invent platform-specific information.';
  return matches.map(m => `### ${m.title}\n${m.content}`).join('\n\n');
}
