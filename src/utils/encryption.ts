import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex').slice(0, 64), 'hex');

export const EncryptionService = {
  encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  },

  decrypt(encryptedData: string): string {
    const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  },

  // Returns true when a value has the `iv:authTag:ciphertext` (all hex) shape
  // produced by encrypt(). Legacy plaintext rows do not match.
  isEncrypted(value: string): boolean {
    return /^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/i.test(value) && value.split(':').length === 3;
  },

  // Decrypts encrypted values but passes legacy/plaintext values through
  // unchanged, so a row written before encryption was applied never throws.
  safeDecrypt(value: string): string {
    if (!EncryptionService.isEncrypted(value)) return value;
    try {
      return EncryptionService.decrypt(value);
    } catch {
      return value;
    }
  }
};
