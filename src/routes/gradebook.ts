import { Router } from 'express';
import { gradebookController } from '../controllers/gradebookController';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenant';

const router = Router();

router.use(authMiddleware, tenantMiddleware);

router.post('/assignments', gradebookController.createAssignment);
router.get('/assignments', gradebookController.listAssignments);
router.post('/grades', gradebookController.recordGrade);
router.post('/grades/bulk', gradebookController.bulkRecordGrades);
router.get('/grades/student/:studentId', gradebookController.getStudentGrades);
router.get('/grades/student/:studentId/subject/:subjectId/average', gradebookController.calculateSubjectAverage);
router.get('/report-card/:studentId/term/:termId', gradebookController.getStudentReportCard);
router.post('/examinations', gradebookController.createExamination);
router.post('/exam-results', gradebookController.recordExamResult);
router.get('/exam-results', gradebookController.getExamResults);

export default router;
