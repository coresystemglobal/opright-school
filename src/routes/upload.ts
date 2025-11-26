import { Router } from 'express';
import multer from 'multer';
import { StorageService } from '../utils/storage';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const key = `${req.tenantId}/${Date.now()}-${req.file.originalname}`;
    const url = await StorageService.upload(key, req.file.buffer, req.file.mimetype);
    
    res.json({ url, key });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/signed-url/:key', async (req, res) => {
  try {
    const url = await StorageService.getSignedUrl(req.params.key);
    res.json({ url });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:key', async (req, res) => {
  try {
    await StorageService.delete(req.params.key);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
