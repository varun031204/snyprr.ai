import { describe, it, expect } from 'vitest';
import { predictionFormSchema, loginSchema } from '../schemas';

describe('Prediction Form Zod Schema Validation', () => {
  it('should accept a valid prediction with buyingZone and sellingZone', () => {
    const validLong = {
      title: 'BTC Liquidity Sweep Setup',
      instrument: 'BTC/USDT',
      category: 'CRYPTO' as const,
      direction: 'LONG' as const,
      entryPrice: 92000,
      buyingZone: 91500,
      sellingZone: 98000,
      timeframe: '4h',
      strategy: 'Smart Money Concepts',
      analysis: 'Detailed analysis text exceeding twenty characters threshold for validation.',
      visibility: 'PUBLIC' as const,
      tags: ['Crypto', 'Breakout'],
    };

    const result = predictionFormSchema.safeParse(validLong);
    expect(result.success).toBe(true);
  });

  it('should reject a prediction where buyingZone and sellingZone are identical', () => {
    const invalidSetup = {
      title: 'Invalid Setup with Same Zones',
      instrument: 'BTC/USDT',
      category: 'CRYPTO' as const,
      direction: 'LONG' as const,
      entryPrice: 92000,
      buyingZone: 95000,
      sellingZone: 95000,
      timeframe: '4h',
      strategy: 'Breakout',
      analysis: 'Detailed analysis text exceeding twenty characters threshold for validation.',
      visibility: 'PUBLIC' as const,
      tags: ['Crypto'],
    };

    const result = predictionFormSchema.safeParse(invalidSetup);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('sellingZone'))).toBe(true);
    }
  });

  it('should accept a valid SHORT prediction with buyingZone and sellingZone', () => {
    const validShort = {
      title: 'EUR/USD Resistance Rejection',
      instrument: 'EUR/USD',
      category: 'FOREX' as const,
      direction: 'SHORT' as const,
      entryPrice: 1.0850,
      buyingZone: 1.0690,
      sellingZone: 1.0850,
      timeframe: '1d',
      strategy: 'Price Action',
      analysis: 'Detailed analysis text exceeding twenty characters threshold for validation.',
      visibility: 'PUBLIC' as const,
      tags: ['Forex', 'EURUSD'],
    };

    const result = predictionFormSchema.safeParse(validShort);
    expect(result.success).toBe(true);
  });

  it('should reject a prediction missing buyingZone', () => {
    const missingBuying = {
      title: 'Missing Buying Zone Setup',
      instrument: 'EUR/USD',
      category: 'FOREX' as const,
      direction: 'SHORT' as const,
      entryPrice: 1.0850,
      sellingZone: 1.0850,
      timeframe: '1d',
      strategy: 'Price Action',
      analysis: 'Detailed analysis text exceeding twenty characters threshold for validation.',
      visibility: 'PUBLIC' as const,
      tags: ['Forex'],
    };

    const result = predictionFormSchema.safeParse(missingBuying);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('buyingZone'))).toBe(true);
    }
  });
});

describe('Login Schema Validation', () => {
  it('should validate valid email and password', () => {
    const valid = { email: 'user@tradebeast.io', password: 'password123' };
    expect(loginSchema.safeParse(valid).success).toBe(true);
  });

  it('should reject invalid email formats', () => {
    const invalid = { email: 'notanemail', password: 'password123' };
    expect(loginSchema.safeParse(invalid).success).toBe(false);
  });
});
