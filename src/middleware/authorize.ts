import { Request, Response, NextFunction } from 'express';
import { RoleService } from "../modules/roles/service";
import prisma from '../prisma/client';

const roleService = new RoleService(prisma);

export function authorize(resource: string, action: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const hasPermission = await roleService.checkPermission(
        req.user.userId,
        resource,
        action
      );

      if (!hasPermission) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      next();
    } catch (error) {
      res.status(500).json({ error: 'Authorization check failed' });
    }
  };
}
