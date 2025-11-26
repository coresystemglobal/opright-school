import http from 'k6/http';
import { check, sleep } from 'k6';

const TOKEN = __ENV.TEST_TOKEN || 'your-test-jwt-token';
const BASE_URL = __ENV.API_URL || 'http://localhost:3000';

export const options = {
  stages: [
    { duration: '1m', target: 50 },   // Ramp to 50 users
    { duration: '2m', target: 100 },  // Ramp to 100 users
    { duration: '2m', target: 200 },  // Ramp to 200 users
    { duration: '2m', target: 300 },  // Ramp to 300 users
    { duration: '1m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.1'],
  },
};

const headers = { 'Authorization': `Bearer ${TOKEN}` };

export default function () {
  const res = http.get(`${BASE_URL}/library/books`, { headers });
  check(res, { 'status 200': (r) => r.status === 200 });
  sleep(1);
}
