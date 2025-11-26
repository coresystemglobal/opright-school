import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
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

export const StorageService = {
  async upload(key: string, buffer: Buffer, contentType: string) {
    await s3Client.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType
    }));
    return `${process.env.S3_ENDPOINT}/${BUCKET}/${key}`;
  },

  async getSignedUrl(key: string, expiresIn = 3600) {
    return getSignedUrl(s3Client, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn });
  },

  async delete(key: string) {
    await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  }
};
