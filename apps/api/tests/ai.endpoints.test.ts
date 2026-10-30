/**
 * AI Endpoints Test Suite
 * Auth, validation, rate limiting, safe errors — Gemini is always mocked.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';

const getUserMock = vi.fn();

vi.mock('../src/config/supabaseClient.js', () => ({
  supabaseAdmin: {
    auth: {
      getUser: (...args: unknown[]) => getUserMock(...args),
    },
  },
  supabaseForUser: vi.fn(() => ({})),
}));

vi.mock('../src/services/ai.service.js', async () => {
  const actual = await vi.importActual<typeof import('../src/services/ai.service.js')>(
    '../src/services/ai.service.js',
  );
  return {
    ...actual,
    checkRateLimit: vi.fn(),
    getRateLimitStatus: vi.fn(),
    analyzeTraderSetup: vi.fn(),
    sendChatMessage: vi.fn(),
    sendCopilotMessage: vi.fn(),
    sendVoiceCopilotMessage: vi.fn(),
  };
});

vi.mock('../src/db/pool.js', () => ({
  db: {
    query: vi.fn(),
    end: vi.fn(),
  },
}));

import { app } from '../src/app.js';
import * as aiService from '../src/services/ai.service.js';
import { db } from '../src/db/pool.js';
import { env } from '../src/config/env.js';

describe('AI Endpoints Security', () => {
  const mockToken = 'mock-jwt-token';
  const mockUserId = 'user-123';
  const otherUserId = 'user-456';

  beforeEach(() => {
    vi.clearAllMocks();
    getUserMock.mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null,
    });
    vi.mocked(aiService.checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 9,
      resetAt: new Date('2099-01-01T00:00:00.000Z'),
      limit: 10,
    });
    vi.mocked(aiService.getRateLimitStatus).mockResolvedValue({
      allowed: true,
      remaining: 9,
      resetAt: new Date('2099-01-01T00:00:00.000Z'),
      limit: 10,
    });
  });

  describe('authentication', () => {
    it.each([
      ['POST', '/api/ai/analyze'],
      ['POST', '/api/ai/chat'],
      ['POST', '/api/ai/copilot'],
      ['POST', '/api/ai/voice'],
      ['GET', '/api/ai/quota'],
    ] as const)('%s %s rejects unauthenticated requests', async (method, path) => {
      const req =
        method === 'GET' ? request(app).get(path) : request(app).post(path).send({});
      const response = await req;
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });
  });

  describe('POST /api/ai/analyze', () => {
    it('rejects invalid body', async () => {
      const response = await request(app)
        .post('/api/ai/analyze')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/Invalid/i);
    });

    it('rejects when rate limit exceeded', async () => {
      vi.mocked(aiService.checkRateLimit).mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetAt: new Date('2099-01-01T00:00:00.000Z'),
        limit: 10,
      });

      const response = await request(app)
        .post('/api/ai/analyze')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          prediction: { instrument: 'BTCUSDT', direction: 'LONG' },
        });

      expect(response.status).toBe(429);
      expect(response.body.error).toBe('Rate Limit Exceeded');
      expect(aiService.analyzeTraderSetup).not.toHaveBeenCalled();
    });

    it('succeeds with valid auth and quota', async () => {
      vi.mocked(aiService.analyzeTraderSetup).mockResolvedValue({
        overview: 'Test analysis',
        riskReward: 'Good R:R',
        sentiment: 'Bullish',
        verdict: 'BULLISH',
        keyPoints: ['Point 1'],
      });

      const response = await request(app)
        .post('/api/ai/analyze')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          prediction: { instrument: 'BTCUSDT', direction: 'LONG' },
        });

      expect(response.status).toBe(200);
      expect(response.body.analysis).toBeDefined();
      expect(response.body.rateLimit).toBeDefined();
      expect(JSON.stringify(response.body)).not.toMatch(/AIza|GEMINI_API_KEY|test-gemini-key/i);
    });
  });

  describe('POST /api/ai/chat|copilot|voice', () => {
    it('rejects chat without messages', async () => {
      const response = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ messages: [] });

      expect(response.status).toBe(400);
    });

    it('rejects copilot without priceContext', async () => {
      const response = await request(app)
        .post('/api/ai/copilot')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          messages: [{ role: 'user', parts: [{ text: 'hi' }] }],
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/priceContext/i);
    });

    it('rejects voice without priceContext', async () => {
      const response = await request(app)
        .post('/api/ai/voice')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          messages: [{ role: 'user', parts: [{ text: 'hi' }] }],
        });

      expect(response.status).toBe(400);
    });

    it('copilot succeeds when authenticated', async () => {
      vi.mocked(aiService.sendCopilotMessage).mockResolvedValue('ok');
      const response = await request(app)
        .post('/api/ai/copilot')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          messages: [{ role: 'user', parts: [{ text: 'price of btc?' }] }],
          priceContext: 'BTC=1',
        });
      expect(response.status).toBe(200);
      expect(response.body.response).toBe('ok');
    });

    it('voice succeeds when authenticated', async () => {
      vi.mocked(aiService.sendVoiceCopilotMessage).mockResolvedValue('spoken');
      const response = await request(app)
        .post('/api/ai/voice')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          messages: [{ role: 'user', parts: [{ text: 'hello' }] }],
          priceContext: 'BTC=1',
        });
      expect(response.status).toBe(200);
      expect(response.body.response).toBe('spoken');
    });
  });

  describe('GET /api/ai/quota', () => {
    it('returns quota via peek (getRateLimitStatus), not checkRateLimit', async () => {
      const response = await request(app)
        .get('/api/ai/quota')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.rateLimit.limit).toBe(10);
      expect(aiService.getRateLimitStatus).toHaveBeenCalledWith(mockUserId);
      expect(aiService.checkRateLimit).not.toHaveBeenCalled();
    });

    it('uses authenticated user id only (cannot query another user)', async () => {
      await request(app)
        .get('/api/ai/quota')
        .set('Authorization', `Bearer ${mockToken}`)
        .query({ userId: otherUserId });

      expect(aiService.getRateLimitStatus).toHaveBeenCalledTimes(1);
      expect(aiService.getRateLimitStatus).toHaveBeenCalledWith(mockUserId);
      expect(aiService.getRateLimitStatus).not.toHaveBeenCalledWith(otherUserId);
    });
  });

  describe('error handling', () => {
    it('does not expose provider/internal error details or stacks', async () => {
      vi.mocked(aiService.analyzeTraderSetup).mockRejectedValue(
        new Error('AI_PROVIDER_ERROR:403 secret-database-connection-string'),
      );

      const response = await request(app)
        .post('/api/ai/analyze')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          prediction: { instrument: 'BTCUSDT', direction: 'LONG' },
        });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('An error occurred while processing your request');
      expect(response.body.message).not.toMatch(/database|secret|403|AI_PROVIDER/i);
      expect(response.body).not.toHaveProperty('stack');
      expect(JSON.stringify(response.body)).not.toContain(env.GEMINI_API_KEY);
    });
  });
});

describe('AI rate limit store (in-memory)', () => {
  beforeEach(() => {
    aiService.resetRateLimitStore();
    vi.mocked(db.query).mockReset();
  });

  it('isolates quota between users and enforces FREE limit', async () => {
    // Unmock checkRateLimit / getRateLimitStatus for this suite — use real implementations
    const actual = await vi.importActual<typeof import('../src/services/ai.service.js')>(
      '../src/services/ai.service.js',
    );

    vi.mocked(db.query).mockResolvedValue({ rows: [], rowCount: 0 } as never);

    // Directly exercise real functions via importActual to avoid the vi.mock wrappers
    for (let i = 0; i < 10; i++) {
      const info = await actual.checkRateLimit('alice');
      expect(info.allowed).toBe(true);
      expect(info.limit).toBe(10);
    }
    const blocked = await actual.checkRateLimit('alice');
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);

    const bob = await actual.checkRateLimit('bob');
    expect(bob.allowed).toBe(true);
    expect(bob.remaining).toBe(9);
  });

  it('peek does not consume quota', async () => {
    const actual = await vi.importActual<typeof import('../src/services/ai.service.js')>(
      '../src/services/ai.service.js',
    );
    vi.mocked(db.query).mockResolvedValue({ rows: [], rowCount: 0 } as never);

    const before = await actual.getRateLimitStatus('carol');
    expect(before.remaining).toBe(10);
    const afterPeek = await actual.getRateLimitStatus('carol');
    expect(afterPeek.remaining).toBe(10);
    const consumed = await actual.checkRateLimit('carol');
    expect(consumed.remaining).toBe(9);
  });

  it('maps ACTIVE Pro subscription to PRO limit', async () => {
    const actual = await vi.importActual<typeof import('../src/services/ai.service.js')>(
      '../src/services/ai.service.js',
    );
    vi.mocked(db.query).mockResolvedValue({
      rows: [{ plan_name: 'Pro' }],
      rowCount: 1,
    } as never);

    const info = await actual.checkRateLimit('pro-user');
    expect(info.limit).toBe(100);
    expect(info.allowed).toBe(true);
  });
});
