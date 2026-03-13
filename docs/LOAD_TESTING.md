# Load Testing Guide

## Overview
Load testing scripts using Autocannon to measure API performance under various conditions.

## Setup

```bash
# Install dependencies (already done)
npm install

# Set test token
export TEST_TOKEN="your-jwt-token-here"
export API_URL="http://localhost:3000"
```

## Test Types

### 1. Basic Load Test
Tests common endpoints with moderate load.

```bash
npm run load:basic
```

**What it tests:**
- GET /students
- GET /library/books
- GET /events/upcoming

**Parameters:**
- 10 concurrent connections
- 30 seconds per endpoint
- ~300 requests per endpoint

**Expected Results:**
- RPS: 50-200 req/s
- Latency: <100ms (avg)
- Error rate: <1%

---

### 2. Stress Test
Gradually increases load to find breaking point.

```bash
npm run load:stress
```

**Stages:**
1. Warm-up: 10 connections, 10s
2. Medium: 50 connections, 20s
3. High: 100 connections, 20s
4. Peak: 200 connections, 20s

**Stops if:** Error rate > 5%

**Expected Results:**
- Should handle 100 connections smoothly
- Latency increases with load
- Identifies bottlenecks

---

### 3. Spike Test
Simulates sudden traffic surge.

```bash
npm run load:spike
```

**Phases:**
1. Normal: 10 connections, 10s
2. **SPIKE**: 500 connections, 10s
3. Recovery: 10 connections, 10s

**Expected Results:**
- System recovers after spike
- No crashes or timeouts
- Latency returns to normal

---

## Interpreting Results

### Key Metrics

**RPS (Requests Per Second)**
- Good: >100 RPS
- Acceptable: 50-100 RPS
- Poor: <50 RPS

**Latency**
- Excellent: <50ms
- Good: 50-100ms
- Acceptable: 100-200ms
- Poor: >200ms

**P99 Latency**
- 99% of requests complete within this time
- Should be <500ms

**Error Rate**
- Excellent: 0%
- Acceptable: <1%
- Poor: >5%

### Sample Output

```
📊 Results for GET /library/books:
   Requests: 3000
   Throughput: 1.25 MB/s
   Latency: 45.23ms (avg)
   Errors: 0
   Timeouts: 0
   RPS: 98.50
```

---

## Performance Optimization

### If RPS is low:
1. Enable Redis caching
2. Add database indexes
3. Optimize queries (use `include` wisely)
4. Enable connection pooling

### If latency is high:
1. Check database query performance
2. Enable caching for read-heavy endpoints
3. Optimize N+1 queries
4. Use database query logging

### If errors occur:
1. Check database connection limits
2. Increase Node.js memory: `NODE_OPTIONS=--max-old-space-size=4096`
3. Review error logs
4. Check rate limiting

---

## Advanced Testing

### Custom Test

```javascript
const autocannon = require('autocannon');

autocannon({
  url: 'http://localhost:3000/your-endpoint',
  connections: 50,
  duration: 30,
  headers: {
    'Authorization': 'Bearer your-token'
  },
  method: 'POST',
  body: JSON.stringify({ data: 'test' })
}, (err, result) => {
  console.log(result);
});
```

### Test with Different Payloads

```javascript
const autocannon = require('autocannon');

autocannon({
  url: 'http://localhost:3000/students',
  connections: 10,
  duration: 30,
  requests: [
    {
      method: 'POST',
      path: '/students',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName: 'Test', lastName: 'User' })
    }
  ]
});
```

---

## CI/CD Integration

### GitHub Actions

```yaml
name: Load Test

on: [push]

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run dev &
      - run: sleep 10
      - run: npm run load:basic
```

---

## Benchmarks

### Target Performance (Single Instance)

| Endpoint | RPS | Latency (avg) | P99 |
|----------|-----|---------------|-----|
| GET /students | 150+ | <50ms | <100ms |
| GET /library/books | 200+ | <30ms | <80ms |
| POST /students | 100+ | <100ms | <200ms |
| GET /events/upcoming | 250+ | <20ms | <50ms |

### With Redis Caching

| Endpoint | RPS | Latency (avg) | P99 |
|----------|-----|---------------|-----|
| GET /library/books | 500+ | <10ms | <30ms |
| GET /events/upcoming | 600+ | <8ms | <25ms |

---

## Monitoring During Tests

### Watch Database Connections

```sql
SELECT count(*) FROM pg_stat_activity;
```

### Watch Redis

```bash
redis-cli INFO stats
```

### Watch Node.js Memory

```bash
node --expose-gc --trace-gc server.js
```

---

## Troubleshooting

### "ECONNREFUSED"
- Server not running
- Wrong URL/port

### "401 Unauthorized"
- Invalid or expired token
- Set TEST_TOKEN environment variable

### "Too many connections"
- Database connection limit reached
- Increase pool size in Prisma

### High latency
- Database queries slow
- Enable query logging: `prisma.log = ['query']`
- Check for N+1 queries

---

## Best Practices

1. **Test in staging** before production
2. **Start small** (10 connections) and increase
3. **Monitor resources** (CPU, memory, DB)
4. **Test realistic scenarios** (mix of read/write)
5. **Run multiple times** for consistency
6. **Test with cache** enabled and disabled
7. **Document results** for comparison

---

## Next Steps

1. Run basic load test
2. Identify bottlenecks
3. Optimize (caching, indexes, queries)
4. Re-test to verify improvements
5. Set up continuous monitoring
