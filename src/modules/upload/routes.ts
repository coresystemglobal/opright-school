import { Router } from "express";
import multer from "multer";
import { uploadController } from "./controller";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.post("/videos/initiate", uploadController.createLargeVideoUpload);
router.get("/videos/part-url", uploadController.getLargeVideoUploadPartUrl);
router.post("/videos/complete", uploadController.completeLargeVideoUpload);
router.post("/videos/abort", uploadController.abortLargeVideoUpload);
router.post("/", upload.single("file"), uploadController.upload);
router.get("/signed-url", uploadController.getSignedUrl);
router.get("/signed-url/:key", uploadController.getSignedUrl);
router.delete("/", uploadController.delete);
router.delete("/:key", uploadController.delete);

export default router;
