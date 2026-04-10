import { BookStatus, PrismaClient } from "@prisma/client";
import { CacheService } from "../../utils/cache";
import { NotificationService } from "../../services/notificationService";

type CreateBookData = {
  title: string;
  author: string;
  isbn?: string;
  genre?: string;
  totalCopies?: number;
  available?: number;
};

type BookFilters = {
  title?: string;
  author?: string;
  isbn?: string;
  genre?: string;
  available?: number;
};

type BorrowBookData = {
  bookId: string;
  borrowerId: string;
  borrowerType: string;
  borrowDate?: Date;
  dueDate: Date;
  fine?: number;
  status?: BookStatus;
};

type TransactionFilters = {
  bookId?: string;
  borrowerId?: string;
  status?: BookStatus;
};

export class LibraryService {
  constructor(private prisma: PrismaClient) {}

  async createBook(tenantId: string, data: CreateBookData) {
    const book = await this.prisma.book.create({
      data: { ...data, tenantId },
    });

    await CacheService.invalidate(tenantId, "books");
    return book;
  }

  async getBooks(tenantId: string, filters: BookFilters = {}) {
    const cacheKey = JSON.stringify(filters);
    const cached = await CacheService.get(tenantId, "books", cacheKey);
    if (cached) return cached;

    const books = await this.prisma.book.findMany({
      where: { tenantId, ...filters },
      orderBy: { createdAt: "desc" },
    });

    await CacheService.set(tenantId, "books", books, 600, cacheKey);
    return books;
  }

  async borrowBook(tenantId: string, data: BorrowBookData) {
    const book = await this.prisma.book.findFirst({
      where: { id: data.bookId, tenantId },
    });

    if (!book || book.available < 1) {
      throw new Error("Book not available");
    }

    const [transaction] = await this.prisma.$transaction([
      this.prisma.bookTransaction.create({
        data: { ...data, tenantId },
      }),
      this.prisma.book.update({
        where: { id: data.bookId, tenantId },
        data: { available: { decrement: 1 } },
      }),
    ]);

    await Promise.all([
      CacheService.invalidate(tenantId, "books"),
      CacheService.invalidate(tenantId, "library:stats"),
      NotificationService.notify(
        tenantId,
        data.borrowerId,
        `Book "${book.title}" borrowed. Due: ${data.dueDate.toISOString()}`,
        "library"
      ),
    ]);

    return transaction;
  }

  async returnBook(tenantId: string, transactionId: string, fine = 0) {
    const transaction = await this.prisma.bookTransaction.findFirst({
      where: { id: transactionId, tenantId },
    });

    if (!transaction) {
      throw new Error("Transaction not found");
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.bookTransaction.update({
        where: { id: transactionId, tenantId },
        data: {
          returnDate: new Date(),
          status: BookStatus.RETURNED,
          fine,
        },
      }),
      this.prisma.book.update({
        where: { id: transaction.bookId, tenantId },
        data: { available: { increment: 1 } },
      }),
    ]);

    await Promise.all([
      CacheService.invalidate(tenantId, "books"),
      CacheService.invalidate(tenantId, "library:stats"),
    ]);

    return updated;
  }

  async getTransactions(tenantId: string, filters: TransactionFilters = {}) {
    return this.prisma.bookTransaction.findMany({
      where: { tenantId, ...filters },
      include: { book: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async getStats(tenantId: string) {
    const cached = await CacheService.get(tenantId, "library:stats");
    if (cached) return cached;

    const [total, borrowed, returned, lost] = await Promise.all([
      this.prisma.bookTransaction.count({ where: { tenantId } }),
      this.prisma.bookTransaction.count({
        where: { tenantId, status: BookStatus.BORROWED },
      }),
      this.prisma.bookTransaction.count({
        where: { tenantId, status: BookStatus.RETURNED },
      }),
      this.prisma.bookTransaction.count({
        where: { tenantId, status: BookStatus.LOST },
      }),
    ]);

    const stats = { total, borrowed, returned, lost };
    await CacheService.set(tenantId, "library:stats", stats, 300);
    return stats;
  }
}
