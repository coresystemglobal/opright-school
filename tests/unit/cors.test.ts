import { describe, expect, jest, test } from '@jest/globals';
import { buildCorsOptions, resolveCorsOrigins } from '../../src/utils/cors';

describe('CORS helpers', () => {
  test('falls back to APP_URL and local dev origins when CORS_ORIGIN is unset', () => {
    const origins = resolveCorsOrigins({
      APP_URL: 'https://app.schoolos.ng/dashboard',
      NODE_ENV: 'production',
    } as NodeJS.ProcessEnv);

    expect(origins.has('https://app.schoolos.ng')).toBe(true);
    expect(origins.has('http://localhost:5173')).toBe(true);
  });

  test('allows tenant-hosted subdomains without an explicit CORS_ORIGIN override', () => {
    const options = buildCorsOptions({
      APP_URL: 'https://app.schoolos.ng',
      NODE_ENV: 'production',
    } as NodeJS.ProcessEnv);

    const callback = jest.fn();
    (options.origin as Function)('https://greenwood.schoolos.ng', callback);

    expect(callback).toHaveBeenCalledWith(null, true);
  });

  test('rejects unknown origins', () => {
    const options = buildCorsOptions({
      APP_URL: 'https://app.schoolos.ng',
      NODE_ENV: 'production',
    } as NodeJS.ProcessEnv);

    const callback = jest.fn();
    (options.origin as Function)('https://evil.example.com', callback);

    expect(callback.mock.calls[0]?.[0]).toBeInstanceOf(Error);
  });
});
