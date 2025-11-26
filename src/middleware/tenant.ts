import { Request, Response, NextFunction } from "express";
import prisma from "../prisma/client";

declare global {
  namespace Express { interface Request { tenantId?: string } }
}

export async function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const host = req.hostname; // greenwood.yoursaas.com
    // Try lookup by custom domain first
    const tenant = await prisma.tenant.findFirst({
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