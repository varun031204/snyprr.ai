import { describe, it, expect } from 'vitest';

function calculateRiskReward(direction: 'LONG' | 'SHORT', entry: number, sl: number, tp: number) {
  if (direction === 'LONG') {
    const risk = entry - sl;
    const reward = tp - entry;
    return risk > 0 ? reward / risk : 0;
  } else {
    const risk = sl - entry;
    const reward = entry - tp;
    return risk > 0 ? reward / risk : 0;
  }
}

describe('Risk/Reward Mathematical Calculations', () => {
  it('should correctly calculate R:R for a LONG position', () => {
    // Entry: 90000, SL: 88000 (risk = 2000), TP: 96000 (reward = 6000) -> R:R = 3.0
    const rr = calculateRiskReward('LONG', 90000, 88000, 96000);
    expect(rr).toBe(3);
  });

  it('should correctly calculate R:R for a SHORT position', () => {
    // Entry: 100, SL: 105 (risk = 5), TP: 85 (reward = 15) -> R:R = 3.0
    const rr = calculateRiskReward('SHORT', 100, 105, 85);
    expect(rr).toBe(3);
  });

  it('should calculate decimal R:R accurately', () => {
    // Entry: 1.0800, SL: 1.0750 (risk = 0.0050), TP: 1.0925 (reward = 0.0125) -> R:R = 2.5
    const rr = calculateRiskReward('LONG', 1.0800, 1.0750, 1.0925);
    expect(rr).toBeCloseTo(2.5);
  });
});
