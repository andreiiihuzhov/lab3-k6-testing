import http from 'k6/http';
import { check, sleep } from 'k6';

// ── Load Test ─────────────────────────────────────────
// Імітує типове навантаження: поступово збільшує до 10
// віртуальних користувачів, тримає навантаження 30 секунд,
// потім плавно зменшує.

export const options = {
  stages: [
    { duration: '10s', target: 5  },   // ramp-up до 5 VU
    { duration: '10s', target: 10 },   // ramp-up до 10 VU
    { duration: '30s', target: 10 },   // тримаємо 10 VU
    { duration: '10s', target: 0  },   // ramp-down до 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<800'],   // 95% запитів < 800ms
    http_req_failed:   ['rate<0.05'],   // менше 5% помилок
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // Сценарій: створити користувача → отримати список → видалити

  // 1. POST — створити нового користувача
  const payload = JSON.stringify({
    username: `user_${Date.now()}`,
    email:    `user_${Date.now()}@test.com`,
  });

  const createRes = http.post(`${BASE_URL}/api/users`, payload, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(createRes, {
    'create user status 201':  (r) => r.status === 201,
    'create user has id':      (r) => r.json().id !== undefined,
  });

  // 2. GET — отримати список всіх користувачів
  const listRes = http.get(`${BASE_URL}/api/users`);
  check(listRes, {
    'list users status 200':   (r) => r.status === 200,
  });

  // 3. DELETE — видалити створеного користувача
  if (createRes.status === 201) {
    const userId = createRes.json().id;
    const deleteRes = http.del(`${BASE_URL}/api/users/${userId}`);
    check(deleteRes, {
      'delete user status 200': (r) => r.status === 200,
    });
  }

  sleep(0.5);
}
