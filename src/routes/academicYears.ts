import { Router } from 'express';
import { academicYearController } from '../controllers/academicYearController';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenant';

const router = Router();

router.use(authMiddleware, tenantMiddleware);

router.post('/', academicYearController.create);
router.get('/', academicYearController.list);
router.get('/current', academicYearController.getCurrent);
router.put('/:id', academicYearController.update);
router.delete('/:id', academicYearController.delete);

export default router;
