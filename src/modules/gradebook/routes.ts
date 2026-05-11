import { Router } from 'express';
import multer from 'multer';
import { gradebookController } from './controller';
import { authMiddleware } from '../../middleware/auth';
import { tenantMiddleware } from '../../middleware/tenant';
import { apiLimiter, strictLimiter } from '../../middleware/rateLimiter';
import { authorize } from '../../middleware/authorize';
import { RESOURCES, ACTIONS } from '../../utils/permissions';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(authMiddleware, tenantMiddleware);

router.post('/assignments', apiLimiter, authorize(RESOURCES.GRADEBOOK, ACTIONS.CREATE), gradebookController.createAssignment);
router.get('/assignments', authorize(RESOURCES.GRADEBOOK, ACTIONS.READ), gradebookController.listAssignments);
router.post('/grades', apiLimiter, authorize(RESOURCES.GRADEBOOK, ACTIONS.CREATE), gradebookController.recordGrade);
router.post('/grades/bulk', strictLimiter, authorize(RESOURCES.GRADEBOOK, ACTIONS.CREATE), gradebookController.bulkRecordGrades);
router.post('/grades/upload-csv', upload.single('file'), authorize(RESOURCES.GRADEBOOK, ACTIONS.CREATE), gradebookController.uploadGradesCsv);
router.get('/grades/csv-template', authorize(RESOURCES.GRADEBOOK, ACTIONS.READ), gradebookController.downloadGradesCsvTemplate);
router.get('/grades/student/:studentId', authorize(RESOURCES.GRADEBOOK, ACTIONS.READ), gradebookController.getStudentGrades);
router.get('/grades/student/:studentId/subject/:subjectId/average', authorize(RESOURCES.GRADEBOOK, ACTIONS.READ), gradebookController.calculateSubjectAverage);
router.get('/report-card/:studentId/term/:termId', authorize(RESOURCES.GRADEBOOK, ACTIONS.READ), gradebookController.getStudentReportCard);
router.post('/examinations', apiLimiter, authorize(RESOURCES.GRADEBOOK, ACTIONS.CREATE), gradebookController.createExamination);
router.post('/exam-results', apiLimiter, authorize(RESOURCES.GRADEBOOK, ACTIONS.CREATE), gradebookController.recordExamResult);
router.post('/exam-results/upload-csv', upload.single('file'), authorize(RESOURCES.GRADEBOOK, ACTIONS.CREATE), gradebookController.uploadExamResultsCsv);
router.get('/exam-results/csv-template', authorize(RESOURCES.GRADEBOOK, ACTIONS.READ), gradebookController.downloadExamResultsCsvTemplate);
router.get('/exam-results', authorize(RESOURCES.GRADEBOOK, ACTIONS.READ), gradebookController.getExamResults);

export default router;
