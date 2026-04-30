import { Router } from "express";
import multer from "multer";
import { libraryController } from "./controller";
import { ebookController } from "./ebookController";
import { requireRole } from "../../middleware/auth";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["application/pdf", "application/epub+zip"];
    cb(null, allowed.includes(file.mimetype));
  },
});

// ── Physical library (existing) ── restricted to ADMIN/TEACHER/STAFF ─────
router.post("/books", requireRole("ADMIN", "TEACHER", "STAFF"), libraryController.createBook);
router.get("/books", libraryController.getBooks);
router.post("/borrow", requireRole("ADMIN", "TEACHER", "STAFF"), libraryController.borrowBook);
router.post("/return/:id", requireRole("ADMIN", "TEACHER", "STAFF"), libraryController.returnBook);
router.get("/transactions", requireRole("ADMIN", "TEACHER", "STAFF"), libraryController.getTransactions);
router.get("/stats", libraryController.getStats);

// ── E-Library ────────────────────────────────────────────────────────────
router.get("/ebooks", ebookController.list);
router.get("/ebooks/genres", ebookController.getGenres);
router.get("/ebooks/:id", ebookController.getById);
router.get("/ebooks/:id/read", ebookController.getReadUrl);
router.get("/ebooks/:id/download", ebookController.getDownloadUrl);
router.get("/ebooks/:id/progress", ebookController.getProgress);
router.post("/ebooks/:id/progress", ebookController.saveProgress);

// Admin/Teacher only
router.post("/ebooks", requireRole("ADMIN", "TEACHER"), upload.single("file"), ebookController.create);
router.put("/ebooks/:id", requireRole("ADMIN", "TEACHER"), ebookController.update);
router.put("/ebooks/:id/file", requireRole("ADMIN", "TEACHER"), upload.single("file"), ebookController.replaceFile);
router.delete("/ebooks/:id", requireRole("ADMIN", "TEACHER"), ebookController.delete);

export default router;
