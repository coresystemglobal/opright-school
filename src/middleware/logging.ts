import { pinoHttp } from 'pino-http';
import { logger } from '../observability';

export const loggingMiddleware = pinoHttp({
  logger: logger.child({ module: 'http' }),
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie'],
    censor: '[REDACTED]',
  },
  customProps(req) {
    return {
      tenantId: (req as any).tenantId,
      userId: (req as any).user?.userId,
    };
  },
  customLogLevel(_req, res) {
    if (res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  serializers: {
    req(req) {
      return {
        method: req.method,
        url: req.url,
      };
    },
    res(res) {
      return {
        statusCode: res.statusCode,
      };
    },
  },
});
