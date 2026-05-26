import { createLogger } from '../../../src/observability/logger';

describe('createLogger', () => {
  it('returns a pino logger with the service name', () => {
    const logger = createLogger('test-service');
    expect(logger.bindings().name).toBe('test-service');
  });

  it('exposes child() for creating scoped loggers', () => {
    const logger = createLogger('test-service');
    const child = logger.child({ module: 'auth' });
    expect(typeof child.info).toBe('function');
  });
});
