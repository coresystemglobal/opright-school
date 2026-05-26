import { createMetricsRegistry } from '../../../src/observability/metrics';

describe('createMetricsRegistry', () => {
  it('exposes a /metrics-compatible registry', async () => {
    const { registry } = createMetricsRegistry('test-svc');
    const output = await registry.metrics();
    expect(typeof output).toBe('string');
    expect(output).toContain('http_request_duration_seconds');
    expect(output).toContain('http_requests_total');
  });

  it('httpRequestDuration accepts observe() calls', () => {
    const { httpRequestDuration } = createMetricsRegistry('test-svc2');
    expect(() =>
      httpRequestDuration.observe({ method: 'GET', route: '/test', status_code: '200' }, 0.05)
    ).not.toThrow();
  });

  it('dbQueryDuration accepts observe() calls', () => {
    const { dbQueryDuration } = createMetricsRegistry('test-svc3');
    expect(() =>
      dbQueryDuration.observe({ operation: 'findMany', model: 'Student', success: 'true' }, 0.01)
    ).not.toThrow();
  });
});
