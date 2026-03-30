import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express { 
    interface Request { 
      user?: { userId: string; tenantId: string; role: string; roleId?: string | null };
      tenantId?: string;
    } 
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization?.split(" ")[1];
  if (!auth) return res.status(401).json({ error: "Unauthorized" });
  
  try {
    const payload = jwt.verify(auth, process.env.JWT_SECRET!) as any;
    if (payload.tenantId !== req.tenantId) return res.status(403).json({ error: "Wrong tenant" });
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}
