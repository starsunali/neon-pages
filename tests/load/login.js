// k6 load test scaffold for the login endpoint.
//   k6 run tests/load/login.js
// Assumes the app is running and seeded (demo / User@12345).

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // ramp up to 20 VUs
    { duration: '1m', target: 20 },   // hold
    { duration: '30s', target: 0 },   // ramp down
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
};

const BASE = __ENV.BASE || 'http://localhost/api/v1';

export default function () {
  const payload = JSON.stringify({
    username: 'demo',
    password: 'User@12345',
    captcha: 'ABCD',
  });

  const res = http.post(`${BASE}/auth/login`, payload, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(res, {
    'login status 200': (r) => r.status === 200,
    'has accessToken': (r) => JSON.parse(r.body).accessToken !== undefined,
  });

  sleep(1);
}