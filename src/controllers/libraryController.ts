import { BookStatus } from "@prisma/client";
import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../prisma/client";
import { LibraryService } from "../services/libraryService";

const service = new LibraryService(prisma);

const createBookSchema = z.object({
  title: z.string().min(1),
  author: z.string().min(1),
  isbn: z.string().min(1).optional(),
  genre: z.string().min(1).optional(),
  totalCopies: z.coerce.number().int().positive().optional(),
  available: z.coerce.number().int().min(0).optional(),
});

const borrowBookSchema = z.object({
  bookId: z.string().uuid(),
  borrowerId: z.string().uuid(),
  borrowerType: z.string().min(1),
  borrowDate: z.coerce.date().optional(),
  dueDate: z.coerce.date(),
  fine: z.coerce.number().nonnegative().optional(),
  status: z.nativeEnum(BookStatus).optional(),
});

const returnBookSchema = z.object({
  fine: z.coerce.number().nonnegative().optional(),
});

export const libraryController = {
  async createBook(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const data = createBookSchema.parse(req.body);
      const book = await service.createBook(req.tenantId, data);
      res.status(201).json(book);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async getBooks(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const filters = {
        title: typeof req.query.title === "string" ? req.query.title : undefined,
        author:
          typeof req.query.author === "string" ? req.query.author : undefined,
        isbn: typeof req.query.isbn === "string" ? req.query.isbn : undefined,
        genre:
          typeof req.query.genre === "string" ? req.query.genre : undefined,
        available:
          typeof req.query.available === "string"
            ? Number(req.query.available)
            : undefined,
      };

      const books = await service.getBooks(req.tenantId, filters);
      res.json(books);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async borrowBook(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const data = borrowBookSchema.parse(req.body);
      const transaction = await service.borrowBook(req.tenantId, data);
      res.status(201).json(transaction);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async returnBook(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const data = returnBookSchema.parse(req.body);
      const transaction = await service.returnBook(
        req.tenantId,
        req.params.id,
        data.fine ?? 0
      );
      res.json(transaction);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async getTransactions(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const filters = {
        bookId:
          typeof req.query.bookId === "string" ? req.query.bookId : undefined,
        borrowerId:
          typeof req.query.borrowerId === "string"
            ? req.query.borrowerId
            : undefined,
        status:
          typeof req.query.status === "string"
            ? (req.query.status as BookStatus)
            : undefined,
      };

      const transactions = await service.getTransactions(req.tenantId, filters);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async getStats(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const stats = await service.getStats(req.tenantId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
};
