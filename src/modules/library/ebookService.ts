import { EBookFileType, PrismaClient } from "@prisma/client";
import { StorageService } from "../../utils/storage";
import { CacheService } from "../../utils/cache";

type CreateEBookData = {
  title: string;
  author: string;
  description?: string;
  coverUrl?: string;
  genre?: string;
  isbn?: string;
  bookId?: string;
  isDownloadable?: boolean;
};

type EBookFilters = {
  genre?: string;
  author?: string;
  search?: string;
};

const READING_PROGRESS_TTL_DAYS = 7;
const SIGNED_URL_EXPIRY = 3600;
const UPLOAD_DOMAIN = "library" as const;

function fileTypeFromMime(mime: string): EBookFileType {
  if (mime === "application/pdf") return "PDF";
  if (mime === "application/epub+zip") return "EPUB";
  throw new Error("Unsupported file type. Only PDF and EPUB are allowed.");
}

export class EBookService {
  constructor(private prisma: PrismaClient) {}

  async create(
    tenantId: string,
    file: Express.Multer.File,
    data: CreateEBookData
  ) {
    const fileType = fileTypeFromMime(file.mimetype);
    const key = await this.uploadFile(tenantId, file);

    const ebook = await this.prisma.eBook.create({
      data: {
        tenantId,
        title: data.title,
        author: data.author,
        description: data.description,
        coverUrl: data.coverUrl,
        genre: data.genre,
        isbn: data.isbn,
        bookId: data.bookId || null,
        isDownloadable: data.isDownloadable ?? true,
        fileKey: key,
        fileSize: file.size,
        fileType,
      },
    });

    await CacheService.invalidate(tenantId, "ebooks");
    return ebook;
  }

  async list(tenantId: string, filters: EBookFilters = {}) {
    const cacheKey = JSON.stringify(filters);
    const cached = await CacheService.get(tenantId, "ebooks", cacheKey);
    if (cached) return cached;

    const where: any = { tenantId };
    if (filters.genre) where.genre = filters.genre;
    if (filters.author) where.author = { contains: filters.author, mode: "insensitive" };
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { author: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const ebooks = await this.prisma.eBook.findMany({
      where,
      include: { book: { select: { id: true, available: true, totalCopies: true } } },
      orderBy: { createdAt: "desc" },
    });

    await CacheService.set(tenantId, "ebooks", ebooks, 600, cacheKey);
    return ebooks;
  }

  async getById(tenantId: string, id: string) {
    const ebook = await this.prisma.eBook.findFirst({
      where: { id, tenantId },
      include: { book: { select: { id: true, title: true, available: true, totalCopies: true } } },
    });
    if (!ebook) throw new Error("E-book not found");
    return ebook;
  }

  async update(tenantId: string, id: string, data: Partial<CreateEBookData>) {
    await this.getById(tenantId, id);
    const ebook = await this.prisma.eBook.update({
      where: { id, tenantId },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.author !== undefined && { author: data.author }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.coverUrl !== undefined && { coverUrl: data.coverUrl }),
        ...(data.genre !== undefined && { genre: data.genre }),
        ...(data.isbn !== undefined && { isbn: data.isbn }),
        ...(data.bookId !== undefined && { bookId: data.bookId || null }),
        ...(data.isDownloadable !== undefined && { isDownloadable: data.isDownloadable }),
      },
    });
    await CacheService.invalidate(tenantId, "ebooks");
    return ebook;
  }

  async delete(tenantId: string, id: string) {
    const ebook = await this.getById(tenantId, id);
    await StorageService.delete(ebook.fileKey);
    await this.prisma.eBook.delete({ where: { id, tenantId } });
    await CacheService.invalidate(tenantId, "ebooks");
  }

  async replaceFile(tenantId: string, id: string, file: Express.Multer.File) {
    const ebook = await this.getById(tenantId, id);
    const fileType = fileTypeFromMime(file.mimetype);

    await StorageService.delete(ebook.fileKey);
    const newKey = await this.uploadFile(tenantId, file);

    const updated = await this.prisma.eBook.update({
      where: { id, tenantId },
      data: { fileKey: newKey, fileSize: file.size, fileType },
    });

    await CacheService.invalidate(tenantId, "ebooks");
    return updated;
  }

  async getReadUrl(tenantId: string, id: string) {
    const ebook = await this.getById(tenantId, id);
    const url = await StorageService.getSignedUrl(ebook.fileKey, SIGNED_URL_EXPIRY);
    return { url, fileType: ebook.fileType };
  }

  async getDownloadUrl(tenantId: string, id: string) {
    const ebook = await this.getById(tenantId, id);
    if (!ebook.isDownloadable) throw new Error("This e-book is not available for download");
    const url = await StorageService.getSignedUrl(ebook.fileKey, SIGNED_URL_EXPIRY);
    return { url, fileName: `${ebook.title}.${ebook.fileType.toLowerCase()}` };
  }

  async saveProgress(tenantId: string, ebookId: string, userId: string, currentPage: number, totalPages?: number) {
    await this.getById(tenantId, ebookId);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + READING_PROGRESS_TTL_DAYS);

    return this.prisma.readingProgress.upsert({
      where: { ebookId_userId: { ebookId, userId } },
      create: { tenantId, ebookId, userId, currentPage, totalPages, expiresAt },
      update: { currentPage, totalPages, expiresAt },
    });
  }

  async getProgress(tenantId: string, ebookId: string, userId: string) {
    const progress = await this.prisma.readingProgress.findUnique({
      where: { ebookId_userId: { ebookId, userId } },
    });
    if (!progress || progress.expiresAt < new Date()) return null;
    return progress;
  }

  async getGenres(tenantId: string) {
    const result = await this.prisma.eBook.findMany({
      where: { tenantId },
      select: { genre: true },
      distinct: ["genre"],
    });
    return result.map((r) => r.genre).filter(Boolean) as string[];
  }

  private async uploadFile(tenantId: string, file: Express.Multer.File) {
    const timestamp = Date.now();
    const ext = file.originalname.match(/\.([a-zA-Z0-9]+)$/)?.[1]?.toLowerCase() || "bin";
    const slug = file.originalname
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^[-_]+|[-_]+$/g, "");
    const key = `schools/${tenantId}/${UPLOAD_DOMAIN}/ebooks/${timestamp}_${slug}.${ext}`;
    await StorageService.upload(key, file.buffer, file.mimetype);
    return key;
  }
}
