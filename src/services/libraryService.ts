import prisma from '../prisma/client';
import { NotificationService } from './notificationService';
import { CacheService } from '../utils/cache';

export const LibraryService = {
  async createBook(tenantId: string, data: any) {
    return prisma.book.create({ data: { ...data, tenantId } });
  },

  async getBooks(tenantId: string, filters?: any) {
    const cacheKey = `books:${tenantId}:${JSON.stringify(filters)}`;
    const cached = await CacheService.get(cacheKey);
    if (cached) return cached;
    
    const books = await prisma.book.findMany({ where: { tenantId, ...filters } });
    await CacheService.set(cacheKey, books, 600);
    return books;
  },

  async borrowBook(tenantId: string, data: any) {
    const book = await prisma.book.findUnique({ where: { id: data.bookId } });
    if (!book || book.available < 1) throw new Error('Book not available');

    const [transaction] = await prisma.$transaction([
      prisma.bookTransaction.create({ data: { ...data, tenantId } }),
      prisma.book.update({ where: { id: data.bookId }, data: { available: { decrement: 1 } } })
    ]);
    
    await NotificationService.notify(tenantId, data.borrowerId, `Book "${book.title}" borrowed. Due: ${data.dueDate}`, 'library');
    return transaction;
  },

  async returnBook(tenantId: string, transactionId: string, fine = 0) {
    const transaction = await prisma.bookTransaction.findUnique({ where: { id: transactionId } });
    if (!transaction) throw new Error('Transaction not found');

    const [updated] = await prisma.$transaction([
      prisma.bookTransaction.update({
        where: { id: transactionId },
        data: { returnDate: new Date(), status: 'RETURNED', fine }
      }),
      prisma.book.update({ where: { id: transaction.bookId }, data: { available: { increment: 1 } } })
    ]);
    return updated;
  },

  async getTransactions(tenantId: string, filters?: any) {
    return prisma.bookTransaction.findMany({
      where: { tenantId, ...filters },
      include: { book: true }
    });
  },

  async getStats(tenantId: string) {
    const cacheKey = `library:stats:${tenantId}`;
    const cached = await CacheService.get(cacheKey);
    if (cached) return cached;
    
    const [total, borrowed, returned, lost] = await Promise.all([
      prisma.bookTransaction.count({ where: { tenantId } }),
      prisma.bookTransaction.count({ where: { tenantId, status: 'BORROWED' } }),
      prisma.bookTransaction.count({ where: { tenantId, status: 'RETURNED' } }),
      prisma.bookTransaction.count({ where: { tenantId, status: 'LOST' } })
    ]);
    const stats = { total, borrowed, returned, lost };
    await CacheService.set(cacheKey, stats, 300);
    return stats;
  }
};
