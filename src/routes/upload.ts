import { Router, NextFunction } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { StorageService } from '../utils/storage';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const keyParamSchema = z.object({
  key: z.string().min(1),
});

router.post('/', upload.single('file'), async (req, res, next: NextFunction) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const key = `${req.tenantId}/${Date.now()}-${req.file.originalname}`;
    const url = await StorageService.upload(key, req.file.buffer, req.file.mimetype);
    
    res.json({ url, key });
  } catch (error) {
    next(error);
  }
});

router.get('/signed-url/:key', async (req, res, next: NextFunction) => {
  try {
    const { key } = keyParamSchema.parse(req.params);
    const url = await StorageService.getSignedUrl(key);
    res.json({ url });
  } catch (error) {
    next(error);
  }
});

router.delete('/:key', async (req, res, next: NextFunction) => {
  try {
    const { key } = keyParamSchema.parse(req.params);
    await StorageService.delete(key);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
