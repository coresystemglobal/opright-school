import { Router } from 'express';
import { studentSelfController } from './controller';

const router = Router();

router.get('/profile', studentSelfController.getProfile);
router.get('/timetable', studentSelfController.getTimetable);
router.get('/grades', studentSelfController.getGrades);
router.get('/attendance', studentSelfController.getAttendance);
router.get('/fees', studentSelfController.getFees);
router.get('/report-card', studentSelfController.getReportCard);

export default router;
