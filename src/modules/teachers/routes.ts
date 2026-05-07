import { Router } from "express";
import multer from "multer";
import { teacherController } from './controller';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.get("/", teacherController.list);
router.post("/", teacherController.create);
router.post("/upload-csv", upload.single("file"), teacherController.uploadCsv);
router.get("/csv-template", teacherController.downloadCsvTemplate);
router.get("/:id", teacherController.getById);
router.put("/:id", teacherController.update);
router.delete("/:id", teacherController.delete);

export default router;
