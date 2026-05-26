import { attachPrismaObservability } from '../../../src/observability/prisma-hooks';
import { createMetricsRegistry } from '../../../src/observability/metrics';
import { createLogger } from '../../../src/observability/logger';

describe('attachPrismaObservability', () => {
  it('attaches middleware to prisma client without throwing', () => {
    const fakePrisma = {
      $use: jest.fn(),
    } as any;
    const metrics = createMetricsRegistry('test');
    const log = createLogger('test');

    expect(() =>
      attachPrismaObservability(fakePrisma, log, metrics.dbQueryDuration, metrics.dbQueryErrors)
    ).not.toThrow();

    expect(fakePrisma.$use).toHaveBeenCalledTimes(1);
    expect(typeof fakePrisma.$use.mock.calls[0][0]).toBe('function');
  });

  it('middleware calls next() and returns its result', async () => {
    let capturedMiddleware: any;
    const fakePrisma = { $use: (fn: any) => { capturedMiddleware = fn; } } as any;
    const metrics = createMetricsRegistry('test2');
    const log = createLogger('test2');
    attachPrismaObservability(fakePrisma, log, metrics.dbQueryDuration, metrics.dbQueryErrors);

    const fakeNext = jest.fn().mockResolvedValue({ id: '1' });
    const params = { model: 'Student', action: 'findMany', args: {}, dataPath: [], runInTransaction: false };
    const result = await capturedMiddleware(params, fakeNext);

    expect(fakeNext).toHaveBeenCalledWith(params);
    expect(result).toEqual({ id: '1' });
  });
});
