import { Router } from 'express';
import multer from 'multer';
import { attendanceController } from './controller';
import { authMiddleware } from '../../middleware/auth';
import { tenantMiddleware } from '../../middleware/tenant';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(authMiddleware, tenantMiddleware);

router.post('/', attendanceController.markAttendance);
router.post('/bulk', attendanceController.bulkMarkAttendance);
router.post('/upload-csv', upload.single('file'), attendanceController.uploadCsv);
router.get('/csv-template', attendanceController.downloadCsvTemplate);
router.get('/', attendanceController.getAttendance);
router.get('/stats/:studentId', attendanceController.getAttendanceStats);
router.get('/class/:classId/report', attendanceController.getClassAttendanceReport);

export default router;
