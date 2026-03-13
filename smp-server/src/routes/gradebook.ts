import { Router } from 'express';
import { gradebookController } from '../controllers/gradebookController';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenant';
import { apiLimiter, strictLimiter } from '../middleware/rateLimiter';

const router = Router();

router.use(authMiddleware, tenantMiddleware);

router.post('/assignments', apiLimiter, gradebookController.createAssignment);
router.get('/assignments', gradebookController.listAssignments);
router.post('/grades', apiLimiter, gradebookController.recordGrade);
router.post('/grades/bulk', strictLimiter, gradebookController.bulkRecordGrades);
router.get('/grades/student/:studentId', gradebookController.getStudentGrades);
router.get('/grades/student/:studentId/subject/:subjectId/average', gradebookController.calculateSubjectAverage);
router.get('/report-card/:studentId/term/:termId', gradebookController.getStudentReportCard);
router.post('/examinations', apiLimiter, gradebookController.createExamination);
router.post('/exam-results', apiLimiter, gradebookController.recordExamResult);
router.get('/exam-results', gradebookController.getExamResults);

export default router;
