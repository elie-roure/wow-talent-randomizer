import request from 'supertest';
import app from '../src/app';

describe('GET /api/meta', () => {
  it('exposes the game version the randomizer was calibrated for', async () => {
    const res = await request(app).get('/api/meta');
    expect(res.status).toBe(200);
    expect(res.body.supportedVersion).toEqual({ expansion: 'Midnight', patch: '12.1.5', maxLevel: 90 });
    expect(res.body.budgets).toEqual({ class: 34, spec: 34, hero: 13 });
  });
});

describe('GET /health', () => {
  it('should return 200 and status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('timestamp');
  });
});
