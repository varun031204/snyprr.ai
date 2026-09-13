import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';

describe('Auth & RBAC Middleware', () => {
  it('GET /api/signals should return 401 without Bearer token', async () => {
    const res = await request(app).get('/api/signals');
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error', 'Unauthorized');
    expect(res.body.message).toContain('Missing or malformed Authorization header');
  });

  it('GET /api/profiles/me should return 401 with invalid Bearer token', async () => {
    const res = await request(app)
      .get('/api/profiles/me')
      .set('Authorization', 'Bearer invalid_mock_token');
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error', 'Unauthorized');
  });

  it('POST /api/signals should return 401 when unauthenticated', async () => {
    const res = await request(app)
      .post('/api/signals')
      .send({
        trader_id: '00000000-0000-0000-0000-000000000000',
        direction: 'LONG',
        stop_loss_price: 100,
      });
    expect(res.status).toBe(401);
  });
});
