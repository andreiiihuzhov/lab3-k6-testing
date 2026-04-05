import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metric: рахуємо лише справжні помилки (не 403 — вони очікувані)
const realErrors = new Rate('real_errors');

// ── Stress Test ───────────────────────────────────────
// Стрес-навантаження до 30 VU. Змішаний сценарій:
// частина VU — звичайні USER, частина — ADMIN.
// Перевіряє поведінку під екстремальним навантаженням.

export const options = {
  stages: [
    { duration: '10s', target: 10 },   // нормальне навантаження
    { duration: '10s', target: 20 },   // підвищене
    { duration: '20s', target: 30 },   // стрес
    { duration: '10s', target: 0  },   // відновлення
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // 95% запитів < 2s при стресі
    real_errors:       ['rate<0.05'],   // менше 5% справжніх помилок
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

function login(username, password) {
  const jar = http.cookieJar();
  const loginPage = http.get(`${BASE_URL}/login`, { jar });

  const csrfMatch = loginPage.body.match(/name="_csrf"\s+value="([^"]+)"/);
  const csrf = csrfMatch ? csrfMatch[1] : '';

  const res = http.post(
    `${BASE_URL}/login`,
    { username, password, _csrf: csrf },
    { jar, redirects: 5 }
  );

  return { jar, ok: res.status === 200 };
}

export default function () {
  // Непарні VU — USER, парні — ADMIN
  const isAdmin = __VU % 2 === 0;
  const creds = isAdmin
    ? { username: 'admin', password: 'admin' }
    : { username: 'user',  password: 'pass'  };

  const { jar, ok } = login(creds.username, creds.password);

  // Реєструємо помилку, якщо логін не вдався
  realErrors.add(!ok);

  if (!ok) { sleep(0.3); return; }

  // Всі — переглядають магазини
  const shopsRes = http.get(`${BASE_URL}/shops`, { jar });
  check(shopsRes, {
    'shops page responds': (r) => r.status === 200,
  });
  realErrors.add(shopsRes.status !== 200);

  if (isAdmin) {
    // ADMIN: перевіряємо доступ до адмін-функції
    // (видалення неіснуючого ID — Spring поверне redirect або помилку, але не 403)
    const adminRes = http.get(`${BASE_URL}/admin/products/delete/999999`, {
      jar,
      redirects: 5,
    });
    check(adminRes, {
      'admin action not 403': (r) => r.status !== 403,
    });
  } else {
    // USER: спроба адмін-дії — має отримати 403
    const forbidRes = http.get(`${BASE_URL}/admin/shops/delete/1`, {
      jar,
      redirects: 0,
    });
    check(forbidRes, {
      'user blocked from admin': (r) => r.status === 403 || r.status === 302,
    });
  }

  sleep(0.3);
}
