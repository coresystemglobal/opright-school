import { Router } from 'express';
import { roleController } from './controller';
import { authMiddleware, requireRole } from '../../middleware/auth';
import { authorize } from '../../middleware/authorize';

const router = Router();

router.use(authMiddleware);

// Read-only: any authenticated user can see permissions list
router.get('/permissions', roleController.getPermissions);

// RBAC management: admin only
router.post('/', requireRole('ADMIN'), authorize('roles', 'create'), roleController.createRole);
router.get('/', requireRole('ADMIN'), authorize('roles', 'read'), roleController.getRoles);
router.post('/assign', requireRole('ADMIN'), authorize('roles', 'update'), roleController.assignRole);
router.get('/:id', requireRole('ADMIN'), authorize('roles', 'read'), roleController.getRole);
router.put('/:id', requireRole('ADMIN'), authorize('roles', 'update'), roleController.updateRole);
router.delete('/:id', requireRole('ADMIN'), authorize('roles', 'delete'), roleController.deleteRole);

export default router;