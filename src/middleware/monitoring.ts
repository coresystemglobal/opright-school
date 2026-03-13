import { Request, Response, NextFunction } from "express";

interface TenantMetrics {
  requestCount: number;
  errorCount: number;
  avgResponseTime: number;
}

const tenantMetrics = new Map<string, TenantMetrics>();

export function monitoringMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const tenantId = req.tenantId;
    
    if (tenantId) {
      const metrics = tenantMetrics.get(tenantId) || { 
        requestCount: 0, 
        errorCount: 0, 
        avgResponseTime: 0 
      };
      
      metrics.requestCount++;
      if (res.statusCode >= 400) metrics.errorCount++;
      metrics.avgResponseTime = (metrics.avgResponseTime + duration) / 2;
      
      tenantMetrics.set(tenantId, metrics);
      
      // Alert for noisy tenants
      if (metrics.requestCount > 1000) {
        console.warn(`High request volume for tenant ${tenantId}: ${metrics.requestCount}`);
      }
    }
  });
  
  next();
}

export function getMetrics(tenantId: string) {
  return tenantMetrics.get(tenantId);
}