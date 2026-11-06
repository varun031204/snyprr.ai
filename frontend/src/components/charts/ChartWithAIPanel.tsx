/**
 * ChartWithAIPanel
 *
 * Reusable layout wrapper for the trading chart + AI Analysis panel.
 *
 * Layout:
 *   Mobile  (<1024px): stacked — chart on top, AI panel below (natural page scroll)
 *   Desktop (≥1024px): side-by-side — chart ~70%, AI panel ~30% with independent scroll
 *
 * The AI panel has its own independent scroll on desktop only.
 * On mobile both sections stack and the page scrolls naturally — no fixed heights.
 */

import React from 'react';
import { AIAnalysisPanel, type Props as AIProps } from '../ai/AIAnalysisPanel';

interface ChartWithAIPanelProps {
  children: React.ReactNode;
  aiPanelProps: AIProps;
  /** Chart height used on desktop only (default: 600) */
  chartHeight?: number;
}

export function ChartWithAIPanel({
  children,
  aiPanelProps,
  chartHeight = 600,
}: ChartWithAIPanelProps) {
  return (
    <div className="flex flex-col lg:flex-row w-full rounded-2xl overflow-hidden border border-[var(--border-subtle)] shadow-xl bg-[var(--bg-surface)]">

      {/* ── Chart — full width on mobile, 70% on desktop ─────────────────── */}
      <div className="w-full lg:flex-1 lg:min-w-0">
        {children}
      </div>

      {/* ── Divider ──────────────────────────────────────────────────────── */}
      <div className="hidden lg:block w-px bg-[var(--border-subtle)] flex-shrink-0" />
      <div className="lg:hidden h-px w-full bg-[var(--border-subtle)] flex-shrink-0" />

      {/* ── AI Panel — full width + auto height on mobile, 30% + fixed height on desktop ── */}
      <div
        className="w-full lg:w-[30%] lg:flex-shrink-0 flex flex-col bg-[var(--bg-surface)]"
        style={{ height: undefined }}
      >
        {/* Desktop: fixed height with internal scroll */}
        <div
          className="hidden lg:flex flex-col"
          style={{ height: chartHeight, overflow: 'hidden' }}
        >
          <AIAnalysisPanel {...aiPanelProps} />
        </div>

        {/* Mobile: natural height, no scroll lock */}
        <div className="lg:hidden">
          <AIAnalysisPanel {...aiPanelProps} />
        </div>
      </div>
    </div>
  );
}
