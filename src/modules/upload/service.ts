import { ValidationError } from "../../utils/errors";
import { StorageService } from "../../utils/storage";

export const UPLOAD_DOMAINS = [
  "gallery",
  "branding",
  "admissions",
  "students",
  "teachers",
  "lessons",
  "submissions",
  "live-classes",
  "certificates",
  "events",
  "inventory",
  "health",
  "library",
  "general",
] as const;

export type UploadDomain = (typeof UPLOAD_DOMAINS)[number];

const SCHOOL_ROOT = "schools";
const LARGE_VIDEO_PART_SIZE = 10 * 1024 * 1024;
const LARGE_VIDEO_MIN_PART_SIZE = 5 * 1024 * 1024;
const LARGE_VIDEO_MAX_PARTS = 10_000;
const uploadDomainSet = new Set<string>(UPLOAD_DOMAINS);

function sanitizeIdentifier(value: string, label: string) {
  if (/[\\/]/.test(value)) {
    throw new ValidationError(`Invalid ${label}`);
  }

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");

  if (!normalized || normalized === "." || normalized === "..") {
    throw new ValidationError(`Invalid ${label}`);
  }

  return normalized;
}

function buildFileName(fileName: string, timestamp: number) {
  const trimmed = fileName.trim();
  const match = trimmed.match(/\.([a-zA-Z0-9]+)$/);
  const extension = match ? `.${match[1].toLowerCase()}` : "";
  const baseName = match ? trimmed.slice(0, -extension.length) : trimmed;
  const slug = baseName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");

  return `${timestamp}_${slug || "file"}${extension}`;
}

function buildSchoolPrefix(tenantId: string) {
  const safeTenantId = sanitizeIdentifier(tenantId, "tenant ID");
  return `${SCHOOL_ROOT}/${safeTenantId}`;
}

function buildUploadKey(
  tenantId: string,
  domain: UploadDomain,
  entityId: string,
  fileName: string
) {
  const safeEntityId = sanitizeIdentifier(entityId, "entity ID");
  const now = new Date();
  const timestamp = now.getTime();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const safeFileName = buildFileName(fileName, timestamp);

  return `${buildSchoolPrefix(tenantId)}/${domain}/${safeEntityId}/${year}/${month}/${safeFileName}`;
}

function normalizeEtag(etag: string) {
  const trimmed = etag.trim();
  if (!trimmed) {
    throw new ValidationError("Invalid multipart upload part ETag");
  }

  return trimmed;
}

export class UploadService {
  async uploadFile(
    tenantId: string,
    file: Express.Multer.File,
    domain: UploadDomain,
    entityId: string
  ) {
    if (!tenantId) {
      throw new ValidationError("Tenant ID required");
    }

    if (!uploadDomainSet.has(domain)) {
      throw new ValidationError("Invalid upload domain");
    }

    const key = buildUploadKey(tenantId, domain, entityId, file.originalname);
    const url = await StorageService.upload(key, file.buffer, file.mimetype);

    return { url, key };
  }

  async createLargeVideoUpload(
    tenantId: string,
    payload: {
      domain: UploadDomain;
      entityId: string;
      fileName: string;
      contentType: string;
      fileSize?: number;
    }
  ) {
    if (!tenantId) {
      throw new ValidationError("Tenant ID required");
    }

    if (!uploadDomainSet.has(payload.domain)) {
      throw new ValidationError("Invalid upload domain");
    }

    if (!payload.contentType.toLowerCase().startsWith("video/")) {
      throw new ValidationError("Only video uploads are supported");
    }

    if (payload.fileSize !== undefined && payload.fileSize <= 0) {
      throw new ValidationError("Invalid file size");
    }

    const partCount =
      payload.fileSize !== undefined
        ? Math.ceil(payload.fileSize / LARGE_VIDEO_PART_SIZE)
        : undefined;

    if (partCount !== undefined && partCount > LARGE_VIDEO_MAX_PARTS) {
      throw new ValidationError("File is too large for multipart upload");
    }

    const key = buildUploadKey(tenantId, payload.domain, payload.entityId, payload.fileName);
    const multipartUpload = await StorageService.createMultipartUpload(key, payload.contentType);

    return {
      ...multipartUpload,
      partSize: LARGE_VIDEO_PART_SIZE,
      minimumPartSize: LARGE_VIDEO_MIN_PART_SIZE,
      maxParts: LARGE_VIDEO_MAX_PARTS,
      partCount,
    };
  }

  async getLargeVideoUploadPartUrl(
    tenantId: string,
    key: string,
    uploadId: string,
    partNumber: number
  ) {
    this.assertTenantOwnsKey(tenantId, key);

    if (!uploadId.trim()) {
      throw new ValidationError("Upload ID required");
    }

    if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > LARGE_VIDEO_MAX_PARTS) {
      throw new ValidationError("Invalid multipart upload part number");
    }

    const url = await StorageService.getMultipartUploadPartUrl(key, uploadId, partNumber);
    return { key, uploadId, partNumber, url };
  }

  async completeLargeVideoUpload(
    tenantId: string,
    payload: {
      key: string;
      uploadId: string;
      parts: Array<{ etag: string; partNumber: number }>;
    }
  ) {
    this.assertTenantOwnsKey(tenantId, payload.key);

    if (!payload.uploadId.trim()) {
      throw new ValidationError("Upload ID required");
    }

    const parts = payload.parts
      .map((part) => ({
        etag: normalizeEtag(part.etag),
        partNumber: part.partNumber,
      }))
      .sort((left, right) => left.partNumber - right.partNumber);

    if (
      parts.some(
        (part) =>
          !Number.isInteger(part.partNumber) ||
          part.partNumber < 1 ||
          part.partNumber > LARGE_VIDEO_MAX_PARTS
      )
    ) {
      throw new ValidationError("Invalid multipart upload parts");
    }

    const uniquePartNumbers = new Set(parts.map((part) => part.partNumber));
    if (uniquePartNumbers.size !== parts.length) {
      throw new ValidationError("Duplicate multipart upload part numbers are not allowed");
    }

    const url = await StorageService.completeMultipartUpload(payload.key, payload.uploadId, parts);
    return { key: payload.key, url };
  }

  async abortLargeVideoUpload(tenantId: string, key: string, uploadId: string) {
    this.assertTenantOwnsKey(tenantId, key);

    if (!uploadId.trim()) {
      throw new ValidationError("Upload ID required");
    }

    await StorageService.abortMultipartUpload(key, uploadId);
    return { success: true };
  }

  async getSignedUrl(tenantId: string, key: string) {
    this.assertTenantOwnsKey(tenantId, key);
    const url = await StorageService.getSignedUrl(key);
    return { url };
  }

  async deleteFile(tenantId: string, key: string) {
    this.assertTenantOwnsKey(tenantId, key);
    await StorageService.delete(key);
    return { success: true };
  }

  private assertTenantOwnsKey(tenantId: string, key: string) {
    if (!tenantId) {
      throw new ValidationError("Tenant ID required");
    }

    const expectedPrefix = `${buildSchoolPrefix(tenantId)}/`;
    if (!key.startsWith(expectedPrefix)) {
      throw new ValidationError("File key does not belong to this school");
    }
  }
}
