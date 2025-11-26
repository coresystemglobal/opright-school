import { Router } from 'express';
import { timetableController } from '../controllers/timetableController';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenant';

const router = Router();

router.use(authMiddleware, tenantMiddleware);

router.post('/', timetableController.create);
router.get('/class/:classId', timetableController.listByClass);
router.get('/teacher/:teacherId', timetableController.listByTeacher);
router.put('/:id', timetableController.update);
router.delete('/:id', timetableController.delete);

export default router;
