import { Router } from "express";
import multer from "multer";
import { studentController } from './controller';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.get("/", studentController.list);
router.post("/", studentController.create);
router.post("/upload-csv", upload.single("file"), studentController.uploadCsv);
router.get("/csv-template", studentController.downloadCsvTemplate);
router.get("/:id", studentController.getById);
router.put("/:id", studentController.update);
router.delete("/:id", studentController.delete);

export default router;
