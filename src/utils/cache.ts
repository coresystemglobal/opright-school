import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Key format: smp:{tenantId}:{resource}:{id?}
const key = (tenantId: string, resource: string, id?: string) =>
  id ? `smp:${tenantId}:${resource}:${id}` : `smp:${tenantId}:${resource}`;

export const CacheService = {
  async get<T>(tenantId: string, resource: string, id?: string): Promise<T | null> {
    return redis.get<T>(key(tenantId, resource, id));
  },

  async set(tenantId: string, resource: string, data: any, ttl = 300, id?: string) {
    await redis.set(key(tenantId, resource, id), data, { ex: ttl });
  },

  async del(tenantId: string, resource: string, id?: string) {
    await redis.del(key(tenantId, resource, id));
  },

  async invalidate(tenantId: string, resource: string) {
    const keys = await redis.keys(`smp:${tenantId}:${resource}*`);
    if (keys.length) await redis.del(...keys);
  },

  async ping() {
    return redis.ping();
  },
};

export default redis;
