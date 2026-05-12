import { Router } from "express";
import multer from "multer";
import { candidateController } from './controller';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.get("/", candidateController.list);
router.post("/", candidateController.create);
router.post("/upload-csv", upload.single("file"), candidateController.uploadCsv);
router.get("/csv-template", candidateController.downloadCsvTemplate);
router.get("/:id", candidateController.getById);
router.put("/:id", candidateController.update);
router.post("/:id/admit", candidateController.admit);

export default router;
