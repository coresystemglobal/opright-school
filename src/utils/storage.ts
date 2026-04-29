import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION || 'us-west-000',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!
  }
});

const BUCKET = process.env.S3_BUCKET!;
const DEFAULT_SIGNED_URL_EXPIRY_SECONDS = 3600;

function getPublicUrl(key: string) {
  const endpoint = process.env.S3_PUBLIC_ENDPOINT || process.env.S3_ENDPOINT || "";
  return `${endpoint.replace(/\/+$/, "")}/${BUCKET}/${key}`;
}

export const StorageService = {
  async upload(key: string, buffer: Buffer, contentType: string) {
    await s3Client.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType
    }));
    return getPublicUrl(key);
  },

  getPublicUrl,

  async getSignedUrl(key: string, expiresIn = DEFAULT_SIGNED_URL_EXPIRY_SECONDS) {
    return getSignedUrl(s3Client, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn });
  },

  async createMultipartUpload(key: string, contentType: string) {
    const response = await s3Client.send(new CreateMultipartUploadCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
    }));

    if (!response.UploadId) {
      throw new Error("Unable to create multipart upload");
    }

    return {
      uploadId: response.UploadId,
      key,
      url: getPublicUrl(key),
    };
  },

  async getMultipartUploadPartUrl(
    key: string,
    uploadId: string,
    partNumber: number,
    expiresIn = DEFAULT_SIGNED_URL_EXPIRY_SECONDS
  ) {
    return getSignedUrl(
      s3Client,
      new UploadPartCommand({
        Bucket: BUCKET,
        Key: key,
        UploadId: uploadId,
        PartNumber: partNumber,
      }),
      { expiresIn }
    );
  },

  async completeMultipartUpload(
    key: string,
    uploadId: string,
    parts: Array<{ etag: string; partNumber: number }>
  ) {
    await s3Client.send(new CompleteMultipartUploadCommand({
      Bucket: BUCKET,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts
          .map((part) => ({
            ETag: part.etag,
            PartNumber: part.partNumber,
          }))
          .sort((left, right) => left.PartNumber - right.PartNumber),
      },
    }));

    return getPublicUrl(key);
  },

  async abortMultipartUpload(key: string, uploadId: string) {
    await s3Client.send(new AbortMultipartUploadCommand({
      Bucket: BUCKET,
      Key: key,
      UploadId: uploadId,
    }));
  },

  async delete(key: string) {
    await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  }
};
