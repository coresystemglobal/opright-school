import { Router } from "express";
import multer from "multer";
import { libraryController } from "./controller";
import { ebookController } from "./ebookController";
import { authMiddleware } from "../../middleware/auth";
import { authorize } from "../../middleware/authorize";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["application/pdf", "application/epub+zip"];
    cb(null, allowed.includes(file.mimetype));
  },
});

router.use(authMiddleware);

// ── Physical library ──────────────────────────────────────────────────────
router.post("/books", authorize("library", "create"), libraryController.createBook);
router.get("/books", authorize("library", "read"), libraryController.getBooks);
router.post("/borrow", authorize("library", "create"), libraryController.borrowBook);
router.post("/return/:id", authorize("library", "update"), libraryController.returnBook);
router.get("/transactions", authorize("library", "read"), libraryController.getTransactions);
router.get("/stats", authorize("library", "read"), libraryController.getStats);

// ── E-Library ────────────────────────────────────────────────────────────
router.get("/ebooks", authorize("library", "read"), ebookController.list);
router.get("/ebooks/genres", authorize("library", "read"), ebookController.getGenres);
router.get("/ebooks/:id", authorize("library", "read"), ebookController.getById);
router.get("/ebooks/:id/read", authorize("library", "read"), ebookController.getReadUrl);
router.get("/ebooks/:id/download", authorize("library", "read"), ebookController.getDownloadUrl);
router.get("/ebooks/:id/progress", authorize("library", "read"), ebookController.getProgress);
router.post("/ebooks/:id/progress", authorize("library", "update"), ebookController.saveProgress);

// Admin/Teacher only
router.post("/ebooks", authorize("library", "create"), upload.single("file"), ebookController.create);
router.put("/ebooks/:id", authorize("library", "update"), ebookController.update);
router.put("/ebooks/:id/file", authorize("library", "update"), upload.single("file"), ebookController.replaceFile);
router.delete("/ebooks/:id", authorize("library", "delete"), ebookController.delete);

export default router;
