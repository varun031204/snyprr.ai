/**
 * AI Endpoints Test Suite
 * Tests authentication, rate limiting, and security
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import * as aiService from '../src/services/ai.service';

// Mock the AI service to avoid real Gemini API calls
vi.mock('../src/services/ai.service', async () => {
  const actual = await vi.importActual<typeof import('../src/services/ai.service')>('../src/services/ai.service');
  return {
    ...actual,
    checkRateLimit: vi.fn(),
    analyzeTraderSetup: vi.fn(),
    sendChatMessage: vi.fn(),
    sendCopilotMessage: vi.fn(),
    sendVoiceCopilotMessage: vi.fn(),
  };
});

// Mock Supabase auth
vi.mock('../src/config/supabaseClient', () => ({
  supabaseAdmin: {
    auth: {
      getUser: vi.fn(),
    },
  },
  supabaseForUser: vi.fn(() => ({})),
}));

describe('AI Endpoints Security', () => {
  const mockToken = 'mock-jwt-token';
  const mockUserId = 'user-123';

  beforeAll(() => {
    // Setup default mocks
    const { supabaseAdmin } = require('../src/config/supabaseClient');
    supabaseAdmin.auth.getUser.mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null,
    });
  });

  describe('POST /api/ai/analyze', () => {
    it('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .post('/api/ai/analyze')
        .send({ prediction: { instrument: 'BTCUSDT', direction: 'LONG' } });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });

    it('should reject requests without prediction', async () => {
      const response = await request(app)
        .post('/api/ai/analyze')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('prediction');
    });

    it('should reject when rate limit exceeded', async () => {
      vi.mocked(aiService.checkRateLimit).mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetAt: new Date(),
        limit: 10,
      });

      const response = await request(app)
        .post('/api/ai/analyze')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          prediction: {
            instrument: 'BTCUSDT',
            direction: 'LONG',
          },
        });

      expect(response.status).toBe(429);
      expect(response.body.error).toBe('Rate Limit Exceeded');
    });

    it('should succeed with valid auth and quota', async () => {
      vi.mocked(aiService.checkRateLimit).mockResolvedValue({
        allowed: true,
        remaining: 9,
        resetAt: new Date(),
        limit: 10,
      });

      vi.mocked(aiService.analyzeTraderSetup).mockResolvedValue({
        overview: 'Test analysis',
        riskReward: 'Good R:R',
        sentiment: 'Bullish',
        verdict: 'BULLISH',
        keyPoints: ['Point 1', 'Point 2'],
      });

      const response = await request(app)
        .post('/api/ai/analyze')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          prediction: {
            instrument: 'BTCUSDT',
            direction: 'LONG',
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.analysis).toBeDefined();
      expect(response.body.rateLimit).toBeDefined();
    });
  });

  describe('GET /api/ai/quota', () => {
    it('should reject unauthenticated requests', async () => {
      const response = await request(app).get('/api/ai/quota');

      expect(response.status).toBe(401);
    });

    it('should return quota for authenticated user', async () => {
      vi.mocked(aiService.checkRateLimit).mockResolvedValue({
        allowed: true,
        remaining: 8,
        resetAt: new Date(),
        limit: 10,
      });

      const response = await request(app)
        .get('/api/ai/quota')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.rateLimit).toBeDefined();
      expect(response.body.rateLimit.limit).toBe(10);
    });
  });

  describe('POST /api/ai/copilot', () => {
    it('should validate priceContext', async () => {
      vi.mocked(aiService.checkRateLimit).mockResolvedValue({
        allowed: true,
        remaining: 9,
        resetAt: new Date(),
        limit: 10,
      });

      const response = await request(app)
        .post('/api/ai/copilot')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          messages: [{ role: 'user', parts: [{ text: 'test' }] }],
          // Missing priceContext
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('priceContext');
    });
  });

  describe('Error Handling', () => {
    it('should not expose internal errors', async () => {
      vi.mocked(aiService.checkRateLimit).mockResolvedValue({
        allowed: true,
        remaining: 9,
        resetAt: new Date(),
        limit: 10,
      });

      vi.mocked(aiService.analyzeTraderSetup).mockRejectedValue(
        new Error('Internal database error with sensitive info')
      );

      const response = await request(app)
        .post('/api/ai/analyze')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          prediction: {
            instrument: 'BTCUSDT',
            direction: 'LONG',
          },
        });

      expect(response.status).toBe(500);
      // Should not expose database connection strings or internal errors
      expect(response.body.message).not.toContain('database');
      expect(response.body).not.toHaveProperty('stack');
    });
  });
});
