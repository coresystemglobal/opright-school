import { Router } from 'express';
import { ParentController } from '../controllers/parentController';

const router = Router();

router.get('/children', ParentController.getChildren);
router.get('/children/:studentId/attendance', ParentController.getChildAttendance);
router.get('/children/:studentId/grades', ParentController.getChildGrades);
router.get('/children/:studentId/payments', ParentController.getChildPayments);

export default router;
