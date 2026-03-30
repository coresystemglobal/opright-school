import { Request, Response, NextFunction } from "express";
import prisma from "../prisma/client";

declare global {
  namespace Express { interface Request { tenantId?: string } }
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getTenantHint(req: Request) {
  const headerValue = req.headers['x-tenant-id'];
  if (Array.isArray(headerValue)) return headerValue[0]?.trim();
  return headerValue?.trim();
}

export async function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantHint = getTenantHint(req);
    const host = req.hostname;

    const tenant = tenantHint
      ? await prisma.tenant.findFirst({
          where: {
            OR: [
              ...(uuidPattern.test(tenantHint) ? [{ id: tenantHint }] : []),
              { subdomain: tenantHint.toLowerCase() },
              { domain: tenantHint.toLowerCase() },
            ],
          },
        })
      : await prisma.tenant.findFirst({
          where: {
            OR: [
              { domain: host },
              { subdomain: host.split(".")[0] }
            ]
          }
        });

    if (!tenant) return res.status(400).json({ error: "Tenant not found" });

    req.tenantId = tenant.id;
    next();
  } catch (err) {
    next(err);
  }
}
