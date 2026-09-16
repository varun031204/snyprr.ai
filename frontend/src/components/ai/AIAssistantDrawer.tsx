import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, X, Send, Bot, User, Plus, RotateCcw,
  TrendingUp, TrendingDown, BarChart2, Zap, Copy, Check,
  ThumbsUp, ThumbsDown, ArrowRight, ChevronRight,
  Activity, Target, Shield, Layers, Volume2, VolumeX,
  MessageSquare, LineChart, Wrench,
} from 'lucide-react';
import { useUIStore } from '../../state/useUIStore';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  image?: string;
  timestamp: string;
  reaction?: 'up' | 'down';
  copied?: boolean;
  chips?: string[];
  action?: { label: string; path: string };
}

interface BotResponse {
  text: string;
  chips?: string[];
  action?: { label: string; path: string };
}

// ─── Knowledge Base ───────────────────────────────────────────────────────────
const KB: { keywords: string[]; response: BotResponse }[] = [
  {
    keywords: ['hi', 'hello', 'hey', 'start', 'help'],
    response: {
      text: "👋 Welcome back, Trader!\n\nI'm **snyprr AI**, your real-time trade intelligence agent. I can help you:\n• Analyze trade setups & risk/reward\n• Explain market structure (SMC, FVG, OB)\n• Review active predictions\n• Guide you through the platform",
      chips: ['Analyze BTC setup', 'Explain SMC strategy', 'View active predictions', 'What is an FVG?'],
    },
  },
  {
    keywords: ['btc', 'bitcoin', 'btc/usdt'],
    response: {
      text: "⚡ **BTC/USDT Analysis**\n\nCurrent structure: **Bullish continuation** above $92,500 EQ level.\n\n• **Buying Zone**: $91,800 – $92,500\n• **Target Zone**: $101,000 (6H Order Block)\n• **Stop Loss**: $89,800 (Below FVG)\n• **R:R Ratio**: 1 : 2.8\n\n🔮 **Confluence**: 4H SMC Order Block retest + Bullish FVG fill + Volume divergence",
      chips: ['Check ETH setup', 'Explain the confluences', 'View BTC prediction'],
      action: { label: 'Open BTC Prediction', path: '/predictions' },
    },
  },
  {
    keywords: ['eth', 'ethereum', 'eth/usdt'],
    response: {
      text: "⚡ **ETH/USDT Analysis**\n\nCurrent structure: **Accumulation range** near $3,380 support.\n\n• **Buying Zone**: $3,350 – $3,400\n• **Target Zone**: $3,850 (1D Resistance)\n• **Stop Loss**: $3,280\n• **R:R Ratio**: 1 : 2.5\n\n🔮 **Confluence**: Institutional demand shelf + Bullish engulfing on 4H",
      chips: ['Check BTC setup', 'Check GOLD setup', 'Explain R:R ratio'],
      action: { label: 'Open ETH Prediction', path: '/predictions' },
    },
  },
  {
    keywords: ['gold', 'xau', 'xauusd'],
    response: {
      text: "⚡ **GOLD (XAU/USD) Analysis**\n\nMacro bullish trend intact. Central bank accumulation continues.\n\n• **Buying Zone**: $2,860 – $2,875\n• **Target Zone**: $2,980\n• **Stop Loss**: $2,835\n• **R:R Ratio**: 1 : 3.2\n\n🔮 **Confluence**: Global central bank accumulation + Weekly demand zone retest",
      chips: ['Check Silver setup', 'What drives gold prices?', 'View GOLD prediction'],
      action: { label: 'Open GOLD Prediction', path: '/predictions' },
    },
  },
  {
    keywords: ['smc', 'smart money', 'order block', 'institutional'],
    response: {
      text: "📚 **Smart Money Concepts (SMC)**\n\nSMC is a methodology that tracks **institutional footprints** in the market:\n\n• **Order Block (OB)**: Last opposing candle before a strong move — where institutions entered.\n• **Fair Value Gap (FVG)**: Imbalance left by rapid institutional moves, often revisited.\n• **Liquidity**: Areas where retail stop-losses cluster — institutional targets.\n• **Break of Structure (BOS)**: Signals trend continuation.\n\nAll snyprr.ai predictions are built on SMC + volume confluence.",
      chips: ['What is an FVG?', 'What is a liquidity sweep?', 'Show BTC SMC setup'],
    },
  },
  {
    keywords: ['fvg', 'fair value gap', 'imbalance'],
    response: {
      text: "📐 **Fair Value Gap (FVG)**\n\nAn FVG is a **3-candle imbalance** where price moves so fast that a gap exists between candle 1's high and candle 3's low (bullish) or candle 1's low and candle 3's high (bearish).\n\n**Why it matters**: Price tends to revisit (\"fill\") FVGs before continuing the trend. This is one of the highest-probability entry zones on snyprr.ai.\n\n✅ All our active predictions highlight FVG levels on the Zone Lines chart.",
      chips: ['What is an Order Block?', 'Analyze BTC setup', 'How to read zone lines?'],
    },
  },
  {
    keywords: ['risk', 'r:r', 'risk reward', 'stop loss', 'target'],
    response: {
      text: "🎯 **Risk Management on snyprr.ai**\n\nEvery prediction includes:\n• **Buying Zone** (entry range)\n• **Selling Zone** (profit target)\n• **Declared R:R** (risk-to-reward ratio)\n\n📊 Platform average R:R: **1 : 2.8**\n📈 Platform win rate: **76.4%** (verified, auditable)\n\n💡 **Pro Tip**: Never risk more than 1–2% of your account per idea regardless of conviction level.",
      chips: ['How is win rate calculated?', 'Analyze BTC setup', 'View all predictions'],
      action: { label: 'View Predictions', path: '/predictions' },
    },
  },
  {
    keywords: ['win rate', 'accuracy', 'success rate', 'performance'],
    response: {
      text: "📊 **Win Rate Calculation**\n\n`Win Rate = (Trades hitting Selling Zone ÷ Total Closed Predictions) × 100`\n\n**Current Platform Stats**:\n• Overall win rate: **76.4%**\n• SMC Strategy win rate: **81.2%**\n• Average R:R: **1 : 2.8**\n• Best 30-day streak: **14 consecutive wins**\n\nAll data is publicly auditable — no cherry-picking.",
      chips: ['Who are the top traders?', 'View my predictions', 'Explain SMC strategy'],
    },
  },
  {
    keywords: ['prediction', 'setup', 'idea', 'trade idea', 'signal'],
    response: {
      text: "🔮 **How Predictions Work**\n\n1. Verified traders publish a setup with **Buying Zone**, **Selling Zone**, and confluences.\n2. You track it on our live Zone Lines chart.\n3. When price hits the Selling Zone → **Target Hit** ✅\n4. If price breaks below the Buying Zone → **Stop Hit** ❌\n\nAll outcomes are auto-recorded to the trader's public scorecard.",
      chips: ['View active predictions', 'How to create a prediction?', 'Explain buying zone'],
      action: { label: 'View All Predictions', path: '/predictions' },
    },
  },
  {
    keywords: ['create prediction', 'publish', 'how to create'],
    response: {
      text: "✍️ **Creating a Prediction (Trader Portal)**\n\nQuick method — use the **Create Prediction panel** on your Trader Dashboard:\n1. Select instrument (BTC, ETH, GOLD…)\n2. Choose direction (LONG / SHORT)\n3. Set Buying Zone, Selling Zone & Entry\n4. Select timeframe\n5. Hit **Publish Prediction**\n\nYour setup goes live instantly on the member feed!",
      chips: ['Go to my dashboard', 'What is a buying zone?', 'View my predictions'],
      action: { label: 'Go to Trader Dashboard', path: '/trader/dashboard' },
    },
  },
  {
    keywords: ['chart', 'zone lines', 'tradingview', 'how to read'],
    response: {
      text: "📈 **Reading the Zone Lines Chart**\n\nThe Zone Lines chart overlays the active prediction directly on the price action:\n\n• 🟢 **Green band** = Buying Zone (accumulation area)\n• 🔴 **Red band** = Selling Zone (profit target)\n• ⬜ **Entry line** = Declared entry price\n• 📍 Horizontal price labels update in real-time\n\nSwitch between **Zone Lines** (prediction overlay) and **TradingView** (full analysis) using the toggle on the chart.",
      chips: ['Analyze BTC setup', 'What is an FVG?', 'View predictions'],
    },
  },
];

function matchQuery(input: string): BotResponse {
  const clean = input.toLowerCase().trim();
  let best: BotResponse | null = null;
  let topScore = 0;

  for (const item of KB) {
    let score = 0;
    for (const kw of item.keywords) {
      if (clean.includes(kw)) score += kw.length;
    }
    if (score > topScore) {
      topScore = score;
      best = item.response;
    }
  }

  if (best && topScore > 0) return best;

  return {
    text: "🤔 Great question! I'm still learning about that specific topic. Try asking me about:\n• **BTC, ETH or GOLD** setups\n• **SMC strategy** and confluences\n• **Risk management** principles\n• **How predictions work** on snyprr.ai",
    chips: ['Analyze BTC setup', 'Explain SMC strategy', 'How does risk management work?'],
  };
}

function playChime() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(659, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch {
    // Audio context may not be allowed before user interaction
  }
}

// ─── Live Market Pulse Data ───────────────────────────────────────────────────
const MARKET_PULSE = [
  { symbol: 'BTC/USDT', price: '$92,840', change: '+2.4%', dir: 'up', r: '1:2.8', zone: '$91,800–$92,500' },
  { symbol: 'ETH/USDT', price: '$3,412', change: '+1.8%', dir: 'up', r: '1:2.5', zone: '$3,350–$3,400' },
  { symbol: 'GOLD', price: '$2,871', change: '+0.6%', dir: 'up', r: '1:3.2', zone: '$2,860–$2,875' },
  { symbol: 'XRP/USDT', price: '$2.48', change: '-0.9%', dir: 'down', r: '1:2.1', zone: '$2.35–$2.42' },
  { symbol: 'SOL/USDT', price: '$188.4', change: '+3.1%', dir: 'up', r: '1:2.6', zone: '$182–$186' },
];

const QUICK_TOOLS = [
  { label: 'R:R Calculator', icon: <Target className="w-4 h-4" />, desc: 'Calculate risk-to-reward for any setup' },
  { label: 'Win Rate Tracker', icon: <BarChart2 className="w-4 h-4" />, desc: 'View your prediction accuracy over time' },
  { label: 'Zone Screener', icon: <Layers className="w-4 h-4" />, desc: 'Scan all instruments for active zones' },
  { label: 'Trade Journal', icon: <MessageSquare className="w-4 h-4" />, desc: 'Review and annotate past setups' },
];

// ─── Component ────────────────────────────────────────────────────────────────
export const AIAssistantDrawer: React.FC = () => {
  const { aiDrawerOpen, setAIDrawerOpen } = useUIStore();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'chat' | 'pulse' | 'tools'>('chat');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init',
      sender: 'ai',
      text: "👋 Hey! I'm **snyprr AI**, your trade intelligence agent.\n\nAsk me about any setup, strategy, or instrument — or explore the **Market Pulse** and **Tools** tabs!",
      timestamp: 'Just now',
      chips: ['Analyze BTC setup', 'Explain SMC strategy', 'How do predictions work?', 'View active signals'],
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (aiDrawerOpen && activeTab === 'chat') {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
      inputRef.current?.focus();
    }
  }, [aiDrawerOpen, messages, isTyping, activeTab]);

  const handleSend = useCallback((text: string, image?: string) => {
    const query = text.trim();
    if (!query && !image) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query || 'Chart analysis request',
      image,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((p) => [...p, userMsg]);
    setInput('');
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsTyping(true);

    const delay = image ? 1200 : Math.min(900, Math.max(400, query.length * 14));

    setTimeout(() => {
      let resp: BotResponse;
      if (image) {
        resp = {
          text: "🔍 **Chart Analysis Complete**\n\nBased on the structure visible in your screenshot:\n\n• **Trend**: Bullish above key EQ level\n• **Key Zone**: Price approaching 4H Order Block\n• **FVG**: Unmitigated bullish FVG visible below current price\n• **Suggestion**: Wait for a retest of the FVG before entry\n\n⚠️ Always confirm with volume and higher timeframe bias.",
          chips: ['Explain Order Block', 'What is an FVG?', 'How to calculate R:R?'],
        };
      } else {
        resp = matchQuery(query);
      }

      const botMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: resp.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        chips: resp.chips,
        action: resp.action,
      };
      setMessages((p) => [...p, botMsg]);
      setIsTyping(false);
      if (soundEnabled) playChime();
    }, delay);
  }, [soundEnabled]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend(input, selectedImage || undefined);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setSelectedImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleReaction = (id: string, type: 'up' | 'down') => {
    setMessages((p) => p.map((m) => m.id === id ? { ...m, reaction: m.reaction === type ? undefined : type } : m));
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setMessages((p) => p.map((m) => m.id === id ? { ...m, copied: true } : m));
    setTimeout(() => setMessages((p) => p.map((m) => m.id === id ? { ...m, copied: false } : m)), 1800);
  };

  const handleReset = () => {
    setMessages([{
      id: `init-${Date.now()}`,
      sender: 'ai',
      text: "✨ Chat cleared! What would you like to analyze?",
      timestamp: 'Just now',
      chips: ['Analyze BTC setup', 'Explain SMC strategy', 'View active signals'],
    }]);
  };

  const formatText = (text: string) => text.split('\n').map((line, i) => {
    const parts = line.split(/(\*\*.*?\*\*)/g);
    return (
      <span key={i} className="block leading-relaxed">
        {parts.map((part, j) =>
          part.startsWith('**') && part.endsWith('**')
            ? <strong key={j} className="font-bold text-[var(--text-primary)]">{part.slice(2, -2)}</strong>
            : part
        )}
      </span>
    );
  });

  if (!aiDrawerOpen) return null;

  return (
    <aside
      className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-50 w-[calc(100vw-2.5rem)] sm:w-[400px] flex flex-col bg-[var(--bg-surface-glass)] backdrop-blur-2xl border border-[var(--border-glass)] rounded-3xl shadow-2xl overflow-hidden animate-fade-in"
      style={{ height: '580px', maxHeight: 'calc(100vh - 100px)' }}
      aria-label="snyprr AI Assistant"
    >
      {/* ── Header ── */}
      <div className="px-4 pt-3.5 pb-2 border-b border-[var(--border-subtle)] bg-gradient-to-r from-[var(--bg-surface)] to-[var(--bg-secondary)] flex-shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-vivid)] text-white flex items-center justify-center shadow-md relative">
              <Sparkles className="w-4 h-4" />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[var(--color-success)] border-2 border-[var(--bg-surface)]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-extrabold text-[var(--text-primary)]">snyprr AI</h3>
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--brand-primary)]/15 text-[var(--brand-primary)] border border-[var(--brand-primary)]/20">
                  Platform Agent
                </span>
              </div>
              <p className="text-[10px] text-[var(--color-success)] font-medium flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)] animate-pulse" />
                Live Intelligence · Trade Analysis
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setSoundEnabled(!soundEnabled)} title={soundEnabled ? 'Mute' : 'Unmute'} className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer">
              {soundEnabled ? <Volume2 className="w-4 h-4 text-[var(--brand-primary)]" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button onClick={handleReset} title="Reset chat" className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer">
              <RotateCcw className="w-4 h-4" />
            </button>
            <button onClick={() => setAIDrawerOpen(false)} title="Close" className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-base)]/70 border border-[var(--border-subtle)] text-[11px] font-semibold">
          {([
            { id: 'chat', label: 'AI Chat', icon: <Bot className="w-3.5 h-3.5" /> },
            { id: 'pulse', label: 'Market Pulse', icon: <Activity className="w-3.5 h-3.5" /> },
            { id: 'tools', label: 'Tools', icon: <Wrench className="w-3.5 h-3.5" /> },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-1 px-1.5 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${activeTab === tab.id ? 'bg-[var(--brand-primary)] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
            >
              {tab.icon}<span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab: Chat ── */}
      {activeTab === 'chat' && (
        <>
          {/* Quick Chips Bar */}
          <div className="px-3 pt-2 pb-1.5 flex items-center gap-1.5 overflow-x-auto scrollbar-none border-b border-[var(--border-subtle)]/40 flex-shrink-0">
            {[
              { label: 'BTC Setup', icon: <TrendingUp className="w-3 h-3" />, q: 'Analyze BTC setup' },
              { label: 'ETH Setup', icon: <TrendingUp className="w-3 h-3" />, q: 'Analyze ETH setup' },
              { label: 'GOLD Setup', icon: <LineChart className="w-3 h-3" />, q: 'Analyze GOLD setup' },
              { label: 'SMC Guide', icon: <Shield className="w-3 h-3" />, q: 'Explain SMC strategy' },
              { label: 'Risk Mgmt', icon: <Target className="w-3 h-3" />, q: 'Explain risk management' },
            ].map((c) => (
              <button
                key={c.label}
                onClick={() => handleSend(c.q)}
                className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-[var(--brand-glow)]/30 hover:bg-[var(--brand-primary)] text-[var(--brand-primary)] hover:text-white border border-[var(--brand-primary)]/25 transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 flex-shrink-0"
              >
                {c.icon}{c.label}
              </button>
            ))}
          </div>

          {/* Message Thread */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 scrollbar-thin">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} space-y-1.5`}>
                <div className={`flex gap-2 max-w-[93%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Avatar */}
                  {msg.sender === 'ai' && (
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-vivid)] text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                      <Sparkles className="w-3 h-3" />
                    </div>
                  )}
                  {msg.sender === 'user' && (
                    <div className="w-6 h-6 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <User className="w-3 h-3 text-[var(--text-muted)]" />
                    </div>
                  )}

                  {/* Bubble */}
                  <div className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${msg.sender === 'user'
                    ? 'bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-vivid)] text-white rounded-tr-sm shadow-md'
                    : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)] rounded-tl-sm shadow-sm'
                  }`}>
                    {msg.image && (
                      <img src={msg.image} alt="Chart" className="w-full rounded-xl max-h-32 object-cover mb-2 border border-white/20" />
                    )}
                    {formatText(msg.text)}

                    {/* Action CTA inside bubble */}
                    {msg.action && (
                      <button
                        onClick={() => { navigate(msg.action!.path); setAIDrawerOpen(false); }}
                        className="mt-2.5 w-full py-1.5 px-3 rounded-xl bg-[var(--brand-glow)] hover:bg-[var(--brand-primary)] text-[var(--brand-primary)] hover:text-white border border-[var(--brand-primary)]/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer group"
                      >
                        {msg.action.label}
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Bot: reaction + copy + timestamp */}
                {msg.sender === 'ai' && (
                  <div className="flex items-center gap-1 pl-8">
                    <button onClick={() => handleReaction(msg.id, 'up')} className={`p-1 rounded-md transition-colors ${msg.reaction === 'up' ? 'text-[var(--color-success)] bg-[var(--color-success-bg)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'}`} title="Helpful">
                      <ThumbsUp className="w-3 h-3" />
                    </button>
                    <button onClick={() => handleReaction(msg.id, 'down')} className={`p-1 rounded-md transition-colors ${msg.reaction === 'down' ? 'text-[var(--color-danger)] bg-[var(--color-danger-bg)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'}`} title="Not helpful">
                      <ThumbsDown className="w-3 h-3" />
                    </button>
                    <button onClick={() => handleCopy(msg.id, msg.text)} className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors" title="Copy">
                      {msg.copied ? <Check className="w-3 h-3 text-[var(--color-success)]" /> : <Copy className="w-3 h-3" />}
                    </button>
                    <span className="text-[9px] text-[var(--text-muted)] ml-1">{msg.timestamp}</span>
                  </div>
                )}

                {/* Follow-up chips */}
                {msg.chips && msg.chips.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pl-8 pt-0.5">
                    {msg.chips.map((chip, ci) => (
                      <button
                        key={ci}
                        onClick={() => handleSend(chip)}
                        className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--brand-glow)] text-[var(--text-muted)] hover:text-[var(--brand-primary)] border border-[var(--border-subtle)] hover:border-[var(--brand-primary)]/30 transition-all cursor-pointer active:scale-95"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-vivid)] text-white flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-3 h-3 animate-pulse" />
                </div>
                <div className="px-3 py-2.5 rounded-2xl rounded-tl-sm bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)] animate-bounce" style={{ animationDelay: `${i * 140}ms` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Image preview */}
          {selectedImage && (
            <div className="px-4 py-2 bg-[var(--bg-secondary)] border-t border-[var(--border-subtle)] flex items-center gap-2 flex-shrink-0">
              <div className="relative">
                <img src={selectedImage} alt="Chart preview" className="w-12 h-12 rounded-lg object-cover border border-[var(--brand-primary)]" />
                <button onClick={() => { setSelectedImage(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] shadow">×</button>
              </div>
              <span className="text-[11px] text-[var(--text-muted)] truncate">Chart image attached — will analyze on send</span>
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]/60 flex-shrink-0">
            <form onSubmit={handleFormSubmit} className="flex items-center gap-2 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-2xl px-3 py-1.5 focus-within:border-[var(--brand-primary)] focus-within:ring-2 focus-within:ring-[var(--brand-primary)]/20 transition-all">
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} className="hidden" />
              <button type="button" onClick={() => fileInputRef.current?.click()} className="text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-colors p-1 cursor-pointer" title="Upload chart image">
                <Plus className="w-4 h-4" />
              </button>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about setups, strategy, risk..."
                className="flex-1 bg-transparent text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
              />
              <button type="submit" disabled={!input.trim() && !selectedImage} className="w-7 h-7 rounded-xl bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-vivid)] text-white flex items-center justify-center disabled:opacity-40 hover:opacity-90 active:scale-95 transition-all cursor-pointer disabled:cursor-not-allowed flex-shrink-0 shadow-sm" title="Send">
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </>
      )}

      {/* ── Tab: Market Pulse ── */}
      {activeTab === 'pulse' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
          <div className="flex items-center justify-between pb-1.5 border-b border-[var(--border-subtle)]">
            <span className="text-[11px] font-bold text-[var(--text-primary)] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--color-success)] animate-pulse" />
              Live Market Pulse
            </span>
            <span className="text-[10px] text-[var(--text-muted)] font-medium">Platform win avg: 76.4%</span>
          </div>

          {MARKET_PULSE.map((m) => (
            <div key={m.symbol} className="p-3.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--brand-primary)]/30 transition-all space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[var(--text-primary)]">{m.symbol}</span>
                  <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${m.dir === 'up' ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]' : 'bg-[var(--color-danger-bg)] text-[var(--color-danger)]'}`}>
                    LONG
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-[var(--text-primary)] block">{m.price}</span>
                  <span className={`text-[10px] font-semibold ${m.dir === 'up' ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
                    {m.dir === 'up' ? <TrendingUp className="w-3 h-3 inline mr-0.5" /> : <TrendingDown className="w-3 h-3 inline mr-0.5" />}
                    {m.change}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] pt-1 border-t border-[var(--border-subtle)]/50">
                <div>
                  <span className="text-[var(--text-muted)] block">Buying Zone</span>
                  <span className="font-semibold text-[var(--text-primary)]">{m.zone}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block">Declared R:R</span>
                  <span className="font-bold text-[var(--color-success)]">{m.r}</span>
                </div>
              </div>
              <button
                onClick={() => { navigate('/predictions'); setAIDrawerOpen(false); }}
                className="w-full flex items-center justify-center gap-1 text-[10px] font-bold text-[var(--brand-primary)] hover:underline pt-0.5 cursor-pointer"
              >
                View Full Setup <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          ))}

          <button
            onClick={() => { navigate('/predictions'); setAIDrawerOpen(false); }}
            className="w-full py-2.5 rounded-xl bg-[var(--brand-primary)] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md hover:opacity-90 transition-opacity cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" />
            Explore All Active Predictions
          </button>
        </div>
      )}

      {/* ── Tab: Tools ── */}
      {activeTab === 'tools' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
          <p className="text-[11px] font-bold text-[var(--text-primary)] pb-1 border-b border-[var(--border-subtle)]">Quick Trade Tools</p>

          {QUICK_TOOLS.map((tool) => (
            <button
              key={tool.label}
              onClick={() => { setActiveTab('chat'); handleSend(`Tell me about ${tool.label}`); }}
              className="w-full p-3.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--brand-primary)]/40 hover:bg-[var(--brand-glow)]/10 transition-all text-left flex items-center gap-3 group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-[var(--brand-glow)] text-[var(--brand-primary)] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                {tool.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-[var(--text-primary)]">{tool.label}</p>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{tool.desc}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--brand-primary)] group-hover:translate-x-0.5 transition-all flex-shrink-0" />
            </button>
          ))}

          {/* Platform stats strip */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[var(--brand-glow)]/30 to-transparent border border-[var(--brand-primary)]/20 space-y-2">
            <p className="text-[10px] font-bold text-[var(--brand-primary)] uppercase tracking-wider">Platform Stats (Live)</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Win Rate', val: '76.4%' },
                { label: 'Avg R:R', val: '1 : 2.8' },
                { label: 'Active Ideas', val: '24' },
                { label: 'Analysts', val: '38' },
              ].map((s) => (
                <div key={s.label} className="text-center p-2 rounded-xl bg-[var(--bg-surface)]/60">
                  <p className="text-sm font-extrabold text-[var(--text-primary)]">{s.val}</p>
                  <p className="text-[9px] text-[var(--text-muted)]">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
