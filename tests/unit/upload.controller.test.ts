import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const uploadFileMock = jest.fn<(...args: any[]) => Promise<{ url: string; key: string }>>();
const getSignedUrlMock = jest.fn<(...args: any[]) => Promise<{ url: string }>>();
const deleteFileMock = jest.fn<(...args: any[]) => Promise<{ success: boolean }>>();

jest.mock('../../src/modules/upload/service', () => ({
  UPLOAD_DOMAINS: [
    'gallery',
    'branding',
    'admissions',
    'students',
    'teachers',
    'lessons',
    'submissions',
    'live-classes',
    'certificates',
    'events',
    'inventory',
    'health',
    'library',
    'general',
  ],
  UploadService: jest.fn().mockImplementation(() => ({
    uploadFile: uploadFileMock,
    getSignedUrl: getSignedUrlMock,
    deleteFile: deleteFileMock,
  })),
}));

import { uploadController } from '../../src/modules/upload/controller';

describe('uploadController', () => {
  beforeEach(() => {
    uploadFileMock.mockReset();
    getSignedUrlMock.mockReset();
    deleteFileMock.mockReset();
  });

  function createResponse() {
    return {
      json: jest.fn(),
    };
  }

  it('forwards valid upload requests with domain and entityId', async () => {
    const req = {
      tenantId: 'tenant-123',
      file: { originalname: 'logo.png' },
      body: { domain: 'branding', entityId: 'shared' },
    };
    const res = createResponse();
    const next = jest.fn();

    uploadFileMock.mockResolvedValue({ url: 'https://storage.example/logo.png', key: 'key' });

    await uploadController.upload(req as any, res as any, next);

    expect(uploadFileMock).toHaveBeenCalledWith('tenant-123', req.file, 'branding', 'shared');
    expect(res.json).toHaveBeenCalledWith({ url: 'https://storage.example/logo.png', key: 'key' });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects upload requests without a file', async () => {
    const req = {
      tenantId: 'tenant-123',
      body: { domain: 'branding', entityId: 'shared' },
    };
    const res = createResponse();
    const next = jest.fn();

    await uploadController.upload(req as any, res as any, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'No file uploaded' }));
  });

  it('rejects upload requests without domain and entityId', async () => {
    const req = {
      tenantId: 'tenant-123',
      file: { originalname: 'logo.png' },
      body: {},
    };
    const res = createResponse();
    const next = jest.fn();

    await uploadController.upload(req as any, res as any, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ name: 'ZodError' }));
  });

  it('accepts key from the query string for signed url requests', async () => {
    const req = {
      tenantId: 'tenant-123',
      query: { key: 'schools/tenant-123/gallery/shared/2026/04/file.jpg' },
      params: {},
    };
    const res = createResponse();
    const next = jest.fn();

    getSignedUrlMock.mockResolvedValue({ url: 'https://signed.example/file' });

    await uploadController.getSignedUrl(req as any, res as any, next);

    expect(getSignedUrlMock).toHaveBeenCalledWith(
      'tenant-123',
      'schools/tenant-123/gallery/shared/2026/04/file.jpg'
    );
    expect(res.json).toHaveBeenCalledWith({ url: 'https://signed.example/file' });
  });

  it('accepts key from the query string for delete requests', async () => {
    const req = {
      tenantId: 'tenant-123',
      query: { key: 'schools/tenant-123/gallery/shared/2026/04/file.jpg' },
      params: {},
    };
    const res = createResponse();
    const next = jest.fn();

    deleteFileMock.mockResolvedValue({ success: true });

    await uploadController.delete(req as any, res as any, next);

    expect(deleteFileMock).toHaveBeenCalledWith(
      'tenant-123',
      'schools/tenant-123/gallery/shared/2026/04/file.jpg'
    );
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });
});
