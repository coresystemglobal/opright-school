import { Router } from 'express';
import multer from 'multer';
import { subjectController } from './controller';
import { authMiddleware } from '../../middleware/auth';
import { tenantMiddleware } from '../../middleware/tenant';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(authMiddleware, tenantMiddleware);

router.post('/', subjectController.create);
router.get('/', subjectController.list);
router.post('/upload-csv', upload.single('file'), subjectController.uploadCsv);
router.get('/csv-template', subjectController.downloadCsvTemplate);
router.get('/:id', subjectController.getById);
router.put('/:id', subjectController.update);
router.delete('/:id', subjectController.delete);
router.post('/:id/assign-teacher', subjectController.assignTeacher);

export default router;
