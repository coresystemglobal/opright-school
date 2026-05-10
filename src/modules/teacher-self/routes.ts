import { Router } from 'express';
import { teacherSelfController } from './controller';

const router = Router();

router.get('/profile', teacherSelfController.getProfile);
router.patch('/profile', teacherSelfController.updateProfile);
router.get('/timetable', teacherSelfController.getTimetable);
router.get('/classes', teacherSelfController.getClasses);
router.get('/subjects', teacherSelfController.getSubjects);

export default router;
