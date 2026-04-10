import { Request, Response } from 'express';
import { z } from 'zod';
import { RoleService } from './service';
import prisma from '../../prisma/client';
import { idParamSchema } from '../../utils/validation';

const roleService = new RoleService(prisma);

const createRoleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  permissionIds: z.array(z.string().uuid())
});

const updateRoleSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  permissionIds: z.array(z.string().uuid()).optional()
});

const assignRoleSchema = z.object({
  userId: z.string().min(1),
  roleId: z.string().uuid(),
});

export const roleController = {
  async createRole(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });
      const data = createRoleSchema.parse(req.body);
      const role = await roleService.createRole(req.tenantId, data);
      res.status(201).json(role);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  async getRoles(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });
      const roles = await roleService.getRoles(req.tenantId);
      res.json(roles);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  async getRole(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });
      const { id } = idParamSchema.parse(req.params);
      const role = await roleService.getRole(req.tenantId, id);
      if (!role) return res.status(404).json({ error: 'Role not found' });
      res.json(role);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  async updateRole(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });
      const data = updateRoleSchema.parse(req.body);
      const { id } = idParamSchema.parse(req.params);
      const role = await roleService.updateRole(req.tenantId, id, data);
      res.json(role);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  async deleteRole(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });
      const { id } = idParamSchema.parse(req.params);
      await roleService.deleteRole(req.tenantId, id);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  async getPermissions(req: Request, res: Response) {
    try {
      const permissions = await roleService.getPermissions();
      res.json(permissions);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  async assignRole(req: Request, res: Response) {
    try {
      const { userId, roleId } = assignRoleSchema.parse(req.body);
      await roleService.assignRoleToUser(userId, roleId);
      res.json({ message: 'Role assigned successfully' });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
};
