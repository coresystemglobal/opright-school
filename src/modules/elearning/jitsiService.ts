import jwt from 'jsonwebtoken';
import { config } from '../../config';

type JitsiTokenOptions = {
  roomName: string;
  userName: string;
  userEmail?: string;
  isModerator?: boolean;
  expiryEpoch?: number;
};

export class JitsiService {
  private get appId() {
    if (!config.jitsi.appId) throw new Error('JITSI_APP_ID is not configured');
    return config.jitsi.appId;
  }

  private get appSecret() {
    if (!config.jitsi.appSecret) throw new Error('JITSI_APP_SECRET is not configured');
    return config.jitsi.appSecret;
  }

  private get baseUrl() {
    if (!config.jitsi.baseUrl) throw new Error('JITSI_BASE_URL is not configured');
    return config.jitsi.baseUrl;
  }

  private get domain() {
    return new URL(this.baseUrl).hostname;
  }

  generateToken(options: JitsiTokenOptions): string {
    const exp = options.expiryEpoch ?? Math.floor(Date.now() / 1000) + 60 * 60 * 4; // 4h default

    return jwt.sign(
      {
        context: {
          user: {
            name: options.userName,
            ...(options.userEmail ? { email: options.userEmail } : {}),
          },
        },
        aud: 'jitsi',
        iss: this.appId,
        sub: this.domain,
        room: options.roomName,
        moderator: options.isModerator ?? false,
        exp,
      },
      this.appSecret
    );
  }

  buildRoomUrl(roomName: string, token: string): string {
    return `${this.baseUrl}/${encodeURIComponent(roomName)}?jwt=${token}`;
  }
}
