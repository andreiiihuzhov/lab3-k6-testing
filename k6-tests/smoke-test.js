import http from 'k6/http';
import { check, sleep } from 'k6';

// ── Smoke Test ────────────────────────────────────────
// Мінімальне навантаження: 1 користувач, 30 секунд.
// Перевіряє, що API взагалі працює і відповідає коректно.

export const options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<500'],   // 95% запитів < 500ms
    http_req_failed:   ['rate<0.01'],   // менше 1% помилок
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // 1. Health check
  const healthRes = http.get(`${BASE_URL}/api/health`);
  check(healthRes, {
    'health status is 200':    (r) => r.status === 200,
    'health body has status':  (r) => r.json().status === 'ok',
  });

  // 2. Get all users
  const usersRes = http.get(`${BASE_URL}/api/users`);
  check(usersRes, {
    'users status is 200':     (r) => r.status === 200,
    'users is an array':       (r) => Array.isArray(r.json()),
  });

  // 3. Get single user
  const userRes = http.get(`${BASE_URL}/api/users/1`);
  check(userRes, {
    'single user status 200':  (r) => r.status === 200,
    'user has username':       (r) => r.json().username !== undefined,
  });

  sleep(1);
}
