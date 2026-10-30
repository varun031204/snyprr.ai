/**
 * Static/security checks: frontend AI client must not call Gemini directly.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(__dirname, 'geminiService.ts'), 'utf8');

vi.mock('./httpClient', () => ({
  httpPost: vi.fn(),
  httpGet: vi.fn(),
}));

vi.mock('../market/priceService', () => ({
  getLivePriceContext: vi.fn(async () => '\nLIVE: BTC=1'),
}));

import { httpPost, httpGet } from './httpClient';
import {
  analyzeTraderSetup,
  sendChatMessage,
  sendCopilotMessage,
  sendVoiceCopilotMessage,
  getAIQuota,
} from './geminiService';

describe('geminiService security migration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('source does not reference Gemini browser key or Google Generative Language API', () => {
    expect(source).not.toMatch(/VITE_GEMINI_API_KEY/);
    expect(source).not.toMatch(/generativelanguage\.googleapis\.com/);
    expect(source).not.toMatch(/import\.meta\.env.*GEMINI/i);
    expect(source).toMatch(/\/api\/ai\//);
    expect(source).toMatch(/from '\.\/httpClient'/);
  });

  it('analyzeTraderSetup posts to backend /api/ai/analyze', async () => {
    vi.mocked(httpPost).mockResolvedValue({
      analysis: {
        overview: 'o',
        riskReward: 'r',
        sentiment: 's',
        verdict: 'NEUTRAL',
        keyPoints: [],
      },
      rateLimit: { limit: 10, remaining: 9, resetAt: '2099-01-01T00:00:00.000Z' },
    });

    await analyzeTraderSetup({
      id: '1',
      instrument: 'BTCUSDT',
      direction: 'LONG',
    } as never);

    expect(httpPost).toHaveBeenCalledWith(
      '/api/ai/analyze',
      expect.objectContaining({
        prediction: expect.objectContaining({ instrument: 'BTCUSDT', direction: 'LONG' }),
      }),
    );
  });

  it('chat/copilot/voice/quota hit backend paths only', async () => {
    vi.mocked(httpPost).mockResolvedValue({
      response: 'ok',
      rateLimit: { limit: 10, remaining: 9, resetAt: '2099-01-01T00:00:00.000Z' },
    });
    vi.mocked(httpGet).mockResolvedValue({
      rateLimit: { limit: 10, remaining: 9, resetAt: '2099-01-01T00:00:00.000Z' },
    });

    await sendChatMessage([{ role: 'user', parts: [{ text: 'hi' }] }], null);
    await sendCopilotMessage([{ role: 'user', parts: [{ text: 'hi' }] }]);
    await sendVoiceCopilotMessage('hi', []);
    await getAIQuota();

    expect(vi.mocked(httpPost).mock.calls.map((c) => c[0])).toEqual([
      '/api/ai/chat',
      '/api/ai/copilot',
      '/api/ai/voice',
    ]);
    expect(httpGet).toHaveBeenCalledWith('/api/ai/quota');
  });
});
