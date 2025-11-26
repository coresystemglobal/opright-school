import { Router } from 'express';
import { attendanceController } from '../controllers/attendanceController';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenant';

const router = Router();

router.use(authMiddleware, tenantMiddleware);

router.post('/', attendanceController.markAttendance);
router.post('/bulk', attendanceController.bulkMarkAttendance);
router.get('/', attendanceController.getAttendance);
router.get('/stats/:studentId', attendanceController.getAttendanceStats);
router.get('/class/:classId/report', attendanceController.getClassAttendanceReport);

export default router;
