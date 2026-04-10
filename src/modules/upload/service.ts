import { ValidationError } from "../../utils/errors";
import { StorageService } from "../../utils/storage";

export class UploadService {
  async uploadFile(tenantId: string, file: Express.Multer.File) {
    if (!tenantId) {
      throw new ValidationError("Tenant ID required");
    }

    const key = `${tenantId}/${Date.now()}-${file.originalname}`;
    const url = await StorageService.upload(key, file.buffer, file.mimetype);

    return { url, key };
  }

  async getSignedUrl(key: string) {
    const url = await StorageService.getSignedUrl(key);
    return { url };
  }

  async deleteFile(key: string) {
    await StorageService.delete(key);
    return { success: true };
  }
}
