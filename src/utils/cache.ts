import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export const CacheService = {
  async get(key: string): Promise<any | null> {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  },

  async set(key: string, data: any, ttl = 3600) {
    await redis.setex(key, ttl, JSON.stringify(data));
  },

  async del(key: string) {
    await redis.del(key);
  },

  async clear() {
    await redis.flushdb();
  }
};
