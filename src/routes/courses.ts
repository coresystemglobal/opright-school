import { Router } from 'express';
import { CourseController } from '../controllers/courseController';

const router = Router();

router.post('/', CourseController.createCourse);
router.get('/', CourseController.getCourses);
router.get('/:id', CourseController.getCourse);
router.put('/:id', CourseController.updateCourse);
router.delete('/:id', CourseController.deleteCourse);
router.post('/:id/enroll', CourseController.enrollStudent);
router.get('/enrollments/:studentId', CourseController.getEnrollments);
router.post('/progress', CourseController.updateProgress);

export default router;
