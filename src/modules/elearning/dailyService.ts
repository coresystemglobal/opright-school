import { config } from '../../config';

const DAILY_API_BASE = 'https://api.daily.co/v1';

type DailyRoom = {
  id: string;
  name: string;
  url: string;
  privacy: string;
};

type DailyToken = {
  token: string;
};

type CreateRoomOptions = {
  name: string;
  expiryEpoch?: number; // unix timestamp
};

type CreateTokenOptions = {
  roomName: string;
  userName: string;
  isOwner?: boolean; // teachers get owner privileges
  expiryEpoch?: number;
};

export class DailyService {
  private get apiKey() {
    if (!config.daily.apiKey) throw new Error('DAILY_API_KEY is not configured');
    return config.daily.apiKey;
  }

  private async request<T>(path: string, method: 'GET' | 'POST' | 'DELETE', body?: unknown): Promise<T> {
    const res = await fetch(`${DAILY_API_BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Daily.co API error ${res.status}: ${text}`);
    }

    return res.json() as Promise<T>;
  }

  async createRoom(options: CreateRoomOptions): Promise<DailyRoom> {
    return this.request<DailyRoom>('/rooms', 'POST', {
      name: options.name,
      privacy: 'private',
      properties: {
        ...(options.expiryEpoch ? { exp: options.expiryEpoch } : {}),
        enable_recording: 'cloud',
        enable_chat: true,
        enable_knocking: true,
      },
    });
  }

  async getOrCreateRoom(name: string, expiryEpoch?: number): Promise<DailyRoom> {
    // Try to fetch existing room first to avoid duplicates
    try {
      return await this.request<DailyRoom>(`/rooms/${name}`, 'GET');
    } catch {
      return this.createRoom({ name, expiryEpoch });
    }
  }

  async createToken(options: CreateTokenOptions): Promise<string> {
    const data = await this.request<DailyToken>('/meeting-tokens', 'POST', {
      properties: {
        room_name: options.roomName,
        user_name: options.userName,
        is_owner: options.isOwner ?? false,
        ...(options.expiryEpoch ? { exp: options.expiryEpoch } : {}),
      },
    });
    return data.token;
  }
}
