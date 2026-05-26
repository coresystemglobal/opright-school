import request from 'supertest';
import app from '../../../src/app';

describe('Observability endpoints', () => {
  describe('GET /health', () => {
    it('returns a status field', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBeLessThanOrEqual(503);
      expect(res.body).toHaveProperty('status');
      expect(['ok', 'degraded']).toContain(res.body.status);
    });

    it('returns a cache field', async () => {
      const res = await request(app).get('/health');
      expect(res.body).toHaveProperty('cache');
      expect(['ok', 'unavailable', 'timeout']).toContain(res.body.cache);
    });

    it('returns a db field', async () => {
      const res = await request(app).get('/health');
      expect(res.body).toHaveProperty('db');
      expect(['ok', 'unavailable', 'timeout']).toContain(res.body.db);
    });
  });

  describe('GET /metrics', () => {
    it('returns 200 with prometheus text format', async () => {
      const res = await request(app).get('/metrics');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/plain/);
      expect(res.text).toContain('# HELP');
      expect(res.text).toContain('# TYPE');
    });

    it('includes http_requests_total after a request', async () => {
      await request(app).get('/health');

      const res = await request(app).get('/metrics');
      expect(res.text).toContain('http_requests_total');
    });
  });
});
