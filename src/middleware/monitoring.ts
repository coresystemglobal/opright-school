import { Request, Response, NextFunction } from "express";
import { appMetrics } from "../observability";

export function monitoringMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    // Normalize route path — prefer express route pattern over raw path
    // Prevents label cardinality explosion from dynamic IDs (e.g. /students/abc-123)
    const route = (req.route?.path
      ? `${req.baseUrl}${req.route.path}`
      : req.path) ?? 'unknown';

    const labels = {
      method: req.method,
      route,
      status_code: String(res.statusCode),
    };

    appMetrics.httpRequestDuration.observe(labels, duration);
    appMetrics.httpRequestTotal.inc(labels);
  });

  next();
}
