# K6 Load Testing Guide

## Why K6?

✅ **Better than Autocannon:**
- Beautiful HTML reports
- Advanced metrics (P95, P99)
- Realistic user scenarios
- Better threshold management
- Cloud integration ready

## Quick Start

### Run K6 Tests

```bash
# Set your token
export TEST_TOKEN="your-jwt-token"

# Load test (gradual ramp-up)
npm run k6:load

# Stress test (find breaking point)
npm run k6:stress

# Spike test (sudden surge)
npm run k6:spike
```

## Test Comparison

### Autocannon (Current)
- ✅ Fast, simple
- ✅ Good for quick checks
- ❌ Basic metrics only
- ❌ No scenarios

### K6 (Recommended)
- ✅ Comprehensive metrics
- ✅ User scenarios
- ✅ Thresholds & SLOs
- ✅ Beautiful reports
- ✅ CI/CD ready

## K6 Test Output

```
     ✓ students status 200
     ✓ students response time < 500ms
     ✓ books status 200
     
     checks.........................: 98.50% ✓ 2955  ✗ 45
     data_received..................: 1.2 MB 40 kB/s
     data_sent......................: 890 kB 30 kB/s
     http_req_blocked...............: avg=1.2ms   p(95)=3.5ms
     http_req_duration..............: avg=245ms   p(95)=450ms p(99)=650ms
     http_reqs......................: 3000   100/s
     vus............................: 50     min=0 max=50
```

## Redis Setup

### Install Redis

```bash
# macOS
brew install redis

# Start Redis
brew services start redis

# Or run in foreground
redis-server
```

### Verify Redis

```bash
# Check if running
redis-cli ping
# Should return: PONG

# Check connection from app
node -e "const Redis = require('ioredis'); const r = new Redis(); r.ping().then(console.log)"
```

### Your .env already has:
```
REDIS_URL="redis://localhost:6379"
```

Just start Redis and caching will work automatically!

## Expected Performance Improvement

### Without Redis:
- RPS: 30-40
- Latency: 250-300ms

### With Redis:
- RPS: 150-300 (5-10x faster)
- Latency: 20-50ms (5x faster)

## Run Full Test Suite

```bash
# 1. Start Redis
brew services start redis

# 2. Start server
npm run dev

# 3. Run K6 load test (in another terminal)
npm run k6:load
```

## Recommendation

**Use both:**
- **Autocannon**: Quick checks during development
- **K6**: Comprehensive testing before deployment

Run K6 tests now for better insights!
