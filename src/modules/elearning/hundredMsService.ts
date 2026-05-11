import jwt from 'jsonwebtoken';
import { config } from '../../config';

const HMS_API_BASE = 'https://api.100ms.live/v2';

type HmsRoom = { id: string; name: string };

type AppTokenOptions = {
  roomId: string;
  role: 'host' | 'guest'; // configure these roles in 100ms dashboard
  userId: string;
  expiryEpoch?: number;
};

export class HundredMsService {
  private get accessKey() {
    if (!config.hundredMs.appAccessKey) throw new Error('HUNDREDMS_APP_ACCESS_KEY is not configured');
    return config.hundredMs.appAccessKey;
  }

  private get appSecret() {
    if (!config.hundredMs.appSecret) throw new Error('HUNDREDMS_APP_SECRET is not configured');
    return config.hundredMs.appSecret;
  }

  private buildManagementToken(): string {
    const iat = Math.floor(Date.now() / 1000);
    return jwt.sign(
      {
        access_key: this.accessKey,
        type: 'management',
        version: '2',
        iat,
        exp: iat + 60 * 60, // 1h — only used for API calls
        jti: `mgmt-${Date.now()}`,
      },
      this.appSecret,
      { algorithm: 'HS256' }
    );
  }

  private async request<T>(path: string, method: 'GET' | 'POST', body?: unknown): Promise<T> {
    const res = await fetch(`${HMS_API_BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.buildManagementToken()}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`100ms API error ${res.status}: ${text}`);
    }

    return res.json() as Promise<T>;
  }

  async getOrCreateRoom(name: string): Promise<HmsRoom> {
    // 100ms room names must be lowercase alphanumeric + hyphens, max 100 chars
    const safeName = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 100);

    // Try to fetch existing room by name
    try {
      const res = await this.request<{ data: HmsRoom[] }>(`/rooms?name=${encodeURIComponent(safeName)}`, 'GET');
      if (res.data?.length) return res.data[0];
    } catch {
      // fall through to create
    }

    return this.request<HmsRoom>('/rooms', 'POST', { name: safeName });
  }

  buildAppToken(options: AppTokenOptions): string {
    const iat = Math.floor(Date.now() / 1000);
    const exp = options.expiryEpoch ?? iat + 60 * 60 * 4; // 4h default

    return jwt.sign(
      {
        access_key: this.accessKey,
        room_id: options.roomId,
        user_id: options.userId,
        role: options.role,
        type: 'app',
        version: '2',
        iat,
        exp,
        jti: `app-${options.userId}-${Date.now()}`,
      },
      this.appSecret,
      { algorithm: 'HS256' }
    );
  }
}
