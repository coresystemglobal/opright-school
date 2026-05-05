import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { StorageService } from '../../src/utils/storage';
import { UploadService } from '../../src/modules/upload/service';

jest.mock('../../src/utils/storage', () => ({
  StorageService: {
    upload: jest.fn(),
    getSignedUrl: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockedStorage = StorageService as jest.Mocked<typeof StorageService>;

function createFile(name: string): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: name,
    encoding: '7bit',
    mimetype: 'application/octet-stream',
    size: 4,
    buffer: Buffer.from('test'),
    stream: undefined as never,
    destination: '',
    filename: '',
    path: '',
  };
}

describe('UploadService', () => {
  const service = new UploadService();

  beforeEach(() => {
    jest.useFakeTimers();
    mockedStorage.upload.mockReset();
    mockedStorage.getSignedUrl.mockReset();
    mockedStorage.delete.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('builds a branding/shared key using the school-scoped scheme', async () => {
    const now = new Date('2026-04-24T12:34:56.789Z');
    jest.setSystemTime(now);
    mockedStorage.upload.mockResolvedValue('https://storage.example/logo.png');

    const result = await service.uploadFile(
      'tenant-123',
      createFile('School Logo Final.PNG'),
      'branding',
      'shared'
    );

    const expectedKey = `schools/tenant-123/branding/shared/2026/04/${now.getTime()}_school-logo-final.png`;
    expect(mockedStorage.upload).toHaveBeenCalledWith(
      expectedKey,
      expect.any(Buffer),
      'application/octet-stream'
    );
    expect(result).toEqual({
      key: expectedKey,
      url: 'https://storage.example/logo.png',
    });
  });

  it('builds a gallery/shared key using UTC year and month segments', async () => {
    const now = new Date('2026-11-05T01:02:03.004Z');
    jest.setSystemTime(now);
    mockedStorage.upload.mockResolvedValue('https://storage.example/gallery.jpg');

    const result = await service.uploadFile(
      'tenant-123',
      createFile('Sports Day 2026!!.JPG'),
      'gallery',
      'shared'
    );

    expect(result.key).toBe(
      `schools/tenant-123/gallery/shared/2026/11/${now.getTime()}_sports-day-2026.jpg`
    );
  });

  it('rejects an invalid upload domain', async () => {
    await expect(
      service.uploadFile('tenant-123', createFile('file.pdf'), 'invalid' as never, 'shared')
    ).rejects.toMatchObject({ message: 'Invalid upload domain' });
  });

  it('rejects traversal-style entity ids', async () => {
    await expect(
      service.uploadFile('tenant-123', createFile('file.pdf'), 'gallery', '../shared')
    ).rejects.toMatchObject({ message: 'Invalid entity ID' });
  });

  it('returns a signed URL only for keys owned by the current school', async () => {
    const key = 'schools/tenant-123/gallery/shared/2026/04/123_photo.jpg';
    mockedStorage.getSignedUrl.mockResolvedValue('https://signed.example/file');

    await expect(service.getSignedUrl('tenant-123', key)).resolves.toEqual({
      url: 'https://signed.example/file',
    });
    await expect(service.getSignedUrl('tenant-999', key)).rejects.toMatchObject({
      message: 'File key does not belong to this school',
    });
  });

  it('deletes files only when the key belongs to the current school', async () => {
    const key = 'schools/tenant-123/gallery/shared/2026/04/123_photo.jpg';
    mockedStorage.delete.mockResolvedValue(undefined);

    await expect(service.deleteFile('tenant-123', key)).resolves.toEqual({ success: true });
    await expect(service.deleteFile('tenant-999', key)).rejects.toMatchObject({
      message: 'File key does not belong to this school',
    });
  });
});
