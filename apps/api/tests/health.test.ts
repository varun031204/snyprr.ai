import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';

describe('Health & Root Routes', () => {
  it('GET /health should return 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('service', 'tradebeast-backend-api');
    expect(res.body).toHaveProperty('timestamp');
  });

  it('GET /non-existent-route should return 404', async () => {
    const res = await request(app).get('/api/invalid-endpoint-path');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error', 'Not Found');
  });
});
