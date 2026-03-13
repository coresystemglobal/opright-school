import http from 'k6/http';
import { check } from 'k6';

const TOKEN = __ENV.TEST_TOKEN || 'your-test-jwt-token';
const BASE_URL = __ENV.API_URL || 'http://localhost:3000';

export const options = {
  stages: [
    { duration: '10s', target: 10 },   // Normal load
    { duration: '10s', target: 500 },  // SPIKE!
    { duration: '10s', target: 10 },   // Recovery
  ],
};

const headers = { 'Authorization': `Bearer ${TOKEN}` };

export default function () {
  const res = http.get(`${BASE_URL}/students`, { headers });
  check(res, { 'status 200': (r) => r.status === 200 });
}
