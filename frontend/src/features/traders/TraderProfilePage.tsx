import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ShieldCheck, Users, TrendingUp, BarChart2, Star,
  CheckCircle, Globe, Send, Crown, Sparkles
} from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { DirectionBadge, StatusBadge, RiskRewardBadge } from '../../components/ui/Badge';
import { useTraderDetail, useFollowTrader } from '../../hooks/useTradersQuery';
import { usePredictions } from '../../hooks/usePredictionsQuery';
import { useUIStore } from '../../state/useUIStore';

export default function TraderProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'predictions' | 'performance' | 'about'>('predictions');

  const { data: traderData, isLoading: traderLoading, isError } = useTraderDetail(id || '');
  const { data: predsData, isLoading: predsLoading } = usePredictions({ traderId: id });
  const followMutation = useFollowTrader();
  const { addToast } = useUIStore();

  const trader = traderData?.data;
  const predictions = predsData?.data || [];

  const handleFollow = async () => {
    if (!trader) return;
    try {
      await followMutation.mutateAsync(trader.id);
      addToast({
        type: 'success',
        title: 'Following Trader',
        message: `You are now receiving prediction alerts from ${trader.displayName}.`,
      });
    } catch {
      addToast({
        type: 'danger',
        title: 'Follow Failed',
        message: 'Could not follow trader.',
      });
    }
  };

  if (traderLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (isError || !trader) {
    return <ErrorState message="Trader profile not found." onRetry={() => navigate('/traders')} />;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate('/traders')}
        className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Directory
      </button>

      {/* Profile Header GlassCard */}
      <GlassCard hoverEffect={false} className="p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative">
              <img
                src={trader.avatar}
                alt={trader.displayName}
                className="w-20 h-20 md:w-24 md:h-24 rounded-3xl object-cover ring-4 ring-[var(--brand-primary)]/40 shadow-xl"
              />
              {trader.verifiedBadge && (
                <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-[var(--brand-primary)] flex items-center justify-center ring-4 ring-[var(--bg-surface)]">
                  <ShieldCheck className="w-4 h-4 text-white" />
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--text-primary)]">
                  {trader.displayName}
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--brand-glow)] text-[var(--brand-primary)] font-semibold">
                  PRO
                </span>
              </div>
              <p className="text-sm text-[var(--text-muted)] mt-0.5">{trader.handle} · Joined {trader.joinedDate}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {trader.featuredMarkets.map((m) => (
                  <span key={m} className="text-xs px-2 py-0.5 rounded-md bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                    {m}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <Button
              variant="primary"
              size="lg"
              className="flex-1 md:flex-initial"
              leftIcon={<Crown className="w-4 h-4" />}
              onClick={() => navigate('/subscriptions')}
            >
              Subscribe Tier
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="flex-1 md:flex-initial"
              leftIcon={<Users className="w-4 h-4" />}
              onClick={handleFollow}
              isLoading={followMutation.isPending}
            >
              Follow
            </Button>
          </div>
        </div>

        {/* 4 KPIs Header */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-6 border-t border-[var(--border-subtle)]">
          <div className="p-3.5 rounded-2xl bg-[var(--bg-secondary)] text-center">
            <p className="text-xs text-[var(--text-muted)] mb-1">Win Rate</p>
            <p className="text-2xl font-bold font-mono-num text-[var(--color-success)]">{trader.winRate}%</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-[var(--bg-secondary)] text-center">
            <p className="text-xs text-[var(--text-muted)] mb-1">Avg Declared R:R</p>
            <p className="text-2xl font-bold font-mono-num text-[var(--brand-primary)]">1:{trader.avgRiskReward.toFixed(2)}</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-[var(--bg-secondary)] text-center">
            <p className="text-xs text-[var(--text-muted)] mb-1">Total Predictions</p>
            <p className="text-2xl font-bold font-mono-num text-[var(--text-primary)]">{trader.totalPredictions}</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-[var(--bg-secondary)] text-center">
            <p className="text-xs text-[var(--text-muted)] mb-1">Followers</p>
            <p className="text-2xl font-bold font-mono-num text-[var(--text-primary)]">{(trader.followersCount / 1000).toFixed(1)}k</p>
          </div>
        </div>
      </GlassCard>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border-subtle)] gap-6">
        {[
          { key: 'predictions', label: `Predictions (${predictions.length})` },
          { key: 'performance', label: 'Performance Breakdown' },
          { key: 'about', label: 'About & Strategy' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`pb-3 text-sm font-semibold transition-all relative ${
              activeTab === tab.key
                ? 'text-[var(--brand-primary)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--brand-primary)] rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'predictions' && (
        <div>
          {predsLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-2xl" />
              ))}
            </div>
          ) : predictions.length === 0 ? (
            <GlassCard hoverEffect={false} className="p-8 text-center text-sm text-[var(--text-muted)]">
              No published predictions yet from this trader.
            </GlassCard>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {predictions.map((p) => (
                <GlassCard
                  key={p.id}
                  className="flex flex-col gap-4 cursor-pointer hover:border-[var(--brand-primary)] transition-all"
                  onClick={() => navigate(`/predictions/${p.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--text-muted)]">
                      {p.instrument} · {p.timeframe}
                    </span>
                    <StatusBadge status={p.status} />
                  </div>

                  <h3 className="text-sm font-semibold text-[var(--text-primary)] line-clamp-2">
                    {p.title}
                  </h3>

                  <div className="flex items-center gap-2">
                    <DirectionBadge direction={p.direction} />
                    {p.riskRewardRatio && !p.buyingZone && <RiskRewardBadge ratio={p.riskRewardRatio} />}
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-[var(--bg-secondary)] p-2 rounded-xl text-center">
                    <div>
                      <p className="text-[10px] text-[var(--color-success)] font-semibold">Buy Zone</p>
                      <p className="text-xs font-bold font-mono-num text-[var(--color-success)]">{(p.buyingZone ?? p.entryPrice).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[var(--color-danger)] font-semibold">Sell Zone</p>
                      <p className="text-xs font-bold font-mono-num text-[var(--color-danger)]">{(p.sellingZone ?? p.takeProfit ?? p.entryPrice).toLocaleString()}</p>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'performance' && (
        <div className="grid md:grid-cols-2 gap-6">
          <GlassCard hoverEffect={false} className="space-y-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Category Win Rates</h3>
            <div className="space-y-3">
              {[
                { category: 'Bitcoin (BTC)', winRate: 82.4, count: 58 },
                { category: 'Ethereum & Solana (ETH, SOL)', winRate: 79.5, count: 48 },
                { category: 'Metals & Altcoins (Gold, Silver, XRP)', winRate: 76.8, count: 42 },
              ].map((c) => (
                <div key={c.category} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--text-secondary)]">{c.category} ({c.count} ideas)</span>
                    <span className="font-bold font-mono-num text-[var(--color-success)]">{c.winRate}%</span>
                  </div>
                  <div className="w-full bg-[var(--bg-secondary)] h-2 rounded-full overflow-hidden">
                    <div className="bg-[var(--color-success)] h-full rounded-full" style={{ width: `${c.winRate}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard hoverEffect={false} className="space-y-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Outcome Distribution</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-[var(--color-success-bg)] border border-[var(--color-success)]/30 text-center">
                <p className="text-2xl font-extrabold font-mono-num text-[var(--color-success)]">116</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">Targets Hit (78.5%)</p>
              </div>
              <div className="p-4 rounded-xl bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/30 text-center">
                <p className="text-2xl font-extrabold font-mono-num text-[var(--color-danger)]">32</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">Stops Hit (21.5%)</p>
              </div>
            </div>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              * Track record is autonomously calculated from verified declared levels. No manual post-facto editing allowed.
            </p>
          </GlassCard>
        </div>
      )}

      {activeTab === 'about' && (
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <GlassCard hoverEffect={false} className="space-y-4">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">About {trader.displayName}</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{trader.bio}</p>
            </GlassCard>
          </div>

          <GlassCard hoverEffect={false} className="space-y-4">
            <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Social Links</h3>
            <div className="space-y-2.5">
              {trader.socialLinks?.twitter && (
                <a
                  href={`https://twitter.com/${trader.socialLinks.twitter}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2.5 text-xs text-[var(--text-secondary)] hover:text-[var(--brand-primary)] transition-colors"
                >
                  <Globe className="w-4 h-4 text-[#1DA1F2]" />
                  @{trader.socialLinks.twitter}
                </a>
              )}
              {trader.socialLinks?.telegram && (
                <a
                  href={`https://t.me/${trader.socialLinks.telegram}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2.5 text-xs text-[var(--text-secondary)] hover:text-[var(--brand-primary)] transition-colors"
                >
                  <Send className="w-4 h-4 text-[#0088cc]" />
                  @{trader.socialLinks.telegram}
                </a>
              )}
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
