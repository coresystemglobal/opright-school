import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');
const TOKEN = __ENV.TEST_TOKEN || 'your-test-jwt-token';
const BASE_URL = __ENV.API_URL || 'http://localhost:3000';

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 10 },   // Stay at 10 users
    { duration: '30s', target: 50 },  // Ramp up to 50 users
    { duration: '1m', target: 50 },   // Stay at 50 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.05'],
    errors: ['rate<0.05'],
  },
};

const headers = {
  'Authorization': `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};

export default function () {
  // Test 1: GET /students
  let res = http.get(`${BASE_URL}/students`, { headers });
  check(res, {
    'students status 200': (r) => r.status === 200,
    'students response time < 500ms': (r) => r.timings.duration < 500,
  }) || errorRate.add(1);

  sleep(1);

  // Test 2: GET /library/books
  res = http.get(`${BASE_URL}/library/books`, { headers });
  check(res, {
    'books status 200': (r) => r.status === 200,
    'books response time < 500ms': (r) => r.timings.duration < 500,
  }) || errorRate.add(1);

  sleep(1);

  // Test 3: GET /events/upcoming
  res = http.get(`${BASE_URL}/events/upcoming`, { headers });
  check(res, {
    'events status 200': (r) => r.status === 200,
    'events response time < 500ms': (r) => r.timings.duration < 500,
  }) || errorRate.add(1);

  sleep(1);

  // Test 4: GET /transport/buses
  res = http.get(`${BASE_URL}/transport/buses`, { headers });
  check(res, {
    'buses status 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(1);
}
