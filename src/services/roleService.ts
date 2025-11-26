import { PrismaClient } from '@prisma/client';

export class RoleService {
  constructor(private prisma: PrismaClient) {}

  async createRole(tenantId: string, data: { name: string; description?: string; permissionIds: string[] }) {
    return this.prisma.role.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description,
        permissions: {
          create: data.permissionIds.map(permissionId => ({ permissionId }))
        }
      },
      include: { permissions: { include: { permission: true } } }
    });
  }

  async getRoles(tenantId: string) {
    return this.prisma.role.findMany({
      where: { tenantId },
      include: { permissions: { include: { permission: true } } }
    });
  }

  async getRole(tenantId: string, roleId: string) {
    return this.prisma.role.findFirst({
      where: { id: roleId, tenantId },
      include: { permissions: { include: { permission: true } } }
    });
  }

  async updateRole(tenantId: string, roleId: string, data: { name?: string; description?: string; permissionIds?: string[] }) {
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    
    if (data.permissionIds) {
      await this.prisma.rolePermission.deleteMany({ where: { roleId } });
      updateData.permissions = {
        create: data.permissionIds.map(permissionId => ({ permissionId }))
      };
    }

    return this.prisma.role.update({
      where: { id: roleId },
      data: updateData,
      include: { permissions: { include: { permission: true } } }
    });
  }

  async deleteRole(tenantId: string, roleId: string) {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, tenantId, isSystem: false }
    });
    if (!role) throw new Error('Role not found or cannot be deleted');
    
    return this.prisma.role.delete({ where: { id: roleId } });
  }

  async getPermissions() {
    return this.prisma.permission.findMany();
  }

  async assignRoleToUser(userId: string, roleId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { roleId }
    });
  }

  async checkPermission(userId: string, resource: string, action: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true }
            }
          }
        }
      }
    });

    if (!user?.role) return false;

    return user.role.permissions.some(rp => 
      rp.permission.resource === resource && rp.permission.action === action
    );
  }
}