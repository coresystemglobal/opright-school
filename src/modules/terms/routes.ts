import { Router } from 'express';
import { termController } from './controller';
import { authMiddleware } from '../../middleware/auth';
import { tenantMiddleware } from '../../middleware/tenant';

const router = Router();

router.use(authMiddleware, tenantMiddleware);

router.post('/', termController.create);
router.get('/', termController.list);
router.get('/current', termController.getCurrent);
router.put('/:id', termController.update);
router.delete('/:id', termController.delete);

export default router;
