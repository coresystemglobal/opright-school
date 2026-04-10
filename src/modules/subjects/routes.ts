import { Router } from 'express';
import { subjectController } from './controller';
import { authMiddleware } from '../../middleware/auth';
import { tenantMiddleware } from '../../middleware/tenant';

const router = Router();

router.use(authMiddleware, tenantMiddleware);

router.post('/', subjectController.create);
router.get('/', subjectController.list);
router.get('/:id', subjectController.getById);
router.put('/:id', subjectController.update);
router.delete('/:id', subjectController.delete);
router.post('/:id/assign-teacher', subjectController.assignTeacher);

export default router;
