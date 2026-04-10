import { Router } from "express";
import { libraryController } from './controller';

const router = Router();

router.post("/books", libraryController.createBook);
router.get("/books", libraryController.getBooks);
router.post("/borrow", libraryController.borrowBook);
router.post("/return/:id", libraryController.returnBook);
router.get("/transactions", libraryController.getTransactions);
router.get("/stats", libraryController.getStats);

export default router;
