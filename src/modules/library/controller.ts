import { BookStatus } from "@prisma/client";
import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../../prisma/client";
import { LibraryService } from './service';
import { checkServiceAccess } from "../../utils/checkServiceAccess";
import {
  optionalNumberSchema,
  optionalStringSchema,
  optionalUuidSchema,
  uuidSchema,
} from "../../utils/validation";

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

const transactionIdParamSchema = z.object({
  id: uuidSchema,
});

const listBooksQuerySchema = z.object({
  title: optionalStringSchema,
  author: optionalStringSchema,
  isbn: optionalStringSchema,
  genre: optionalStringSchema,
  available: optionalNumberSchema,
});

const transactionsQuerySchema = z.object({
  bookId: optionalUuidSchema,
  borrowerId: optionalUuidSchema,
  status: z.nativeEnum(BookStatus).optional(),
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

      const filters = listBooksQuerySchema.parse(req.query);
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

      if (data.borrowerType === "student") {
        const access = await checkServiceAccess(prisma, req.tenantId, data.borrowerId, "LIBRARY");
        if (!access.allowed) {
          return res.status(403).json({ error: access.reason, revokedFees: access.revokedFees });
        }
      }

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
      const { id } = transactionIdParamSchema.parse(req.params);
      const transaction = await service.returnBook(
        req.tenantId,
        id,
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

      const filters = transactionsQuerySchema.parse(req.query);
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
