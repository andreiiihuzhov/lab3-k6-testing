import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metric: рахуємо лише справжні помилки (не 404)
const errorRate = new Rate('real_errors');

// ── Stress Test ───────────────────────────────────────
// Поступово підвищує навантаження до 30 VU, щоб знайти
// межу стабільної роботи API. Перевіряє поведінку системи
// під екстремальним навантаженням.

export const options = {
  stages: [
    { duration: '10s', target: 10 },   // нормальне навантаження
    { duration: '10s', target: 20 },   // підвищене навантаження
    { duration: '20s', target: 30 },   // стрес-навантаження
    { duration: '10s', target: 0  },   // відновлення
  ],
  thresholds: {
    http_req_duration: ['p(95)<1500'],  // 95% запитів < 1.5s
    real_errors:       ['rate<0.05'],   // менше 5% справжніх помилок
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // Сценарій: інтенсивні змішані запити до API

  // 1. Health check (легкий запит)
  const healthRes = http.get(`${BASE_URL}/api/health`);
  check(healthRes, {
    'health endpoint responds': (r) => r.status === 200,
  });

  // 2. POST — створити користувача
  const payload = JSON.stringify({
    username: `stress_${__VU}_${__ITER}`,
    email:    `stress_${__VU}_${__ITER}@test.com`,
  });

  const createRes = http.post(`${BASE_URL}/api/users`, payload, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(createRes, {
    'create returns 201': (r) => r.status === 201,
  });

  // 3. GET — отримати конкретного користувача
  if (createRes.status === 201) {
    const userId = createRes.json().id;
    const getRes = http.get(`${BASE_URL}/api/users/${userId}`);
    check(getRes, {
      'get user returns 200':      (r) => r.status === 200,
      'get user correct username': (r) => r.json().username === `stress_${__VU}_${__ITER}`,
    });
  }

  // 4. GET — отримати неіснуючого користувача (перевірка 404)
  const notFoundRes = http.get(`${BASE_URL}/api/users/999999`);
  check(notFoundRes, {
    '404 for missing user': (r) => r.status === 404,
  });

  // Рахуємо реальні помилки (не 404 і не 2xx)
  errorRate.add(
    healthRes.status !== 200 ||
    (createRes.status !== 201 && createRes.status !== 200)
  );

  sleep(0.3);
}
