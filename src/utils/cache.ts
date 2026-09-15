import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Key format: smp:{tenantId}:{resource}:{id?}
const key = (tenantId: string, resource: string, id?: string) =>
  id ? `smp:${tenantId}:${resource}:${id}` : `smp:${tenantId}:${resource}`;

// The cache is an optimization, never a hard dependency. If Redis is down,
// over quota, or slow, every operation degrades gracefully (a miss / no-op)
// so requests still succeed instead of returning 500.
let cacheWarned = false;
function onCacheError(op: string, err: unknown) {
  if (!cacheWarned) {
    cacheWarned = true;
    console.warn(`[cache] disabled for now — ${op} failed:`, err instanceof Error ? err.message : err);
  }
}

export const CacheService = {
  async get<T>(tenantId: string, resource: string, id?: string): Promise<T | null> {
    try {
      return await redis.get<T>(key(tenantId, resource, id));
    } catch (err) {
      onCacheError('get', err);
      return null;
    }
  },

  async set(tenantId: string, resource: string, data: any, ttl = 300, id?: string) {
    try {
      await redis.set(key(tenantId, resource, id), data, { ex: ttl });
    } catch (err) {
      onCacheError('set', err);
    }
  },

  async del(tenantId: string, resource: string, id?: string) {
    try {
      await redis.del(key(tenantId, resource, id));
    } catch (err) {
      onCacheError('del', err);
    }
  },

  async invalidate(tenantId: string, resource: string) {
    try {
      const keys = await redis.keys(`smp:${tenantId}:${resource}*`);
      if (keys.length) await redis.del(...keys);
    } catch (err) {
      onCacheError('invalidate', err);
    }
  },

  async ping() {
    return redis.ping();
  },
};

export default redis;
