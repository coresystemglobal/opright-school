import { Router } from 'express';
import { LibraryService } from '../services/libraryService';

const router = Router();

router.post('/books', async (req, res) => {
  try {
    const book = await LibraryService.createBook(req.tenantId!, req.body);
    res.json(book);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/books', async (req, res) => {
  try {
    const books = await LibraryService.getBooks(req.tenantId!, req.query);
    res.json(books);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/borrow', async (req, res) => {
  try {
    const transaction = await LibraryService.borrowBook(req.tenantId!, req.body);
    res.json(transaction);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/return/:id', async (req, res) => {
  try {
    const transaction = await LibraryService.returnBook(req.tenantId!, req.params.id, req.body.fine);
    res.json(transaction);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/transactions', async (req, res) => {
  try {
    const transactions = await LibraryService.getTransactions(req.tenantId!, req.query);
    res.json(transactions);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const stats = await LibraryService.getStats(req.tenantId!);
    res.json(stats);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
