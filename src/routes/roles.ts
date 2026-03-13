import { Router } from 'express';
import { roleController } from '../controllers/roleController';
import { authMiddleware } from '../middleware/auth';
import { authorize } from '../middleware/authorize';

const router = Router();

router.use(authMiddleware);

router.post('/', authorize('roles', 'create'), roleController.createRole);
router.get('/', authorize('roles', 'read'), roleController.getRoles);
router.get('/permissions', roleController.getPermissions);
router.get('/:id', authorize('roles', 'read'), roleController.getRole);
router.put('/:id', authorize('roles', 'update'), roleController.updateRole);
router.delete('/:id', authorize('roles', 'delete'), roleController.deleteRole);
router.post('/assign', authorize('roles', 'update'), roleController.assignRole);

export default router;