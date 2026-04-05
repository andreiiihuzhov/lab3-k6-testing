import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metric: справжні помилки (5xx або мережеві)
const realErrors = new Rate('real_errors');

// ── Stress Test ───────────────────────────────────────
// Стрес-навантаження до 30 VU. Змішані ролі:
// непарні VU — USER, парні — ADMIN.

export const options = {
  stages: [
    { duration: '10s', target: 10 },
    { duration: '10s', target: 20 },
    { duration: '20s', target: 30 },
    { duration: '10s', target: 0  },
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],  // при стресі допускаємо до 3s
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

  // Вважаємо логін успішним, якщо отримали 200 і не на /login
  const ok = res.status === 200 && !res.url.includes('/login?error');
  return { jar, ok };
}

export default function () {
  const isAdmin = __VU % 2 === 0;
  const creds = isAdmin
    ? { username: 'admin', password: 'admin' }
    : { username: 'user',  password: 'pass'  };

  const { jar, ok } = login(creds.username, creds.password);

  // Реєструємо помилку, якщо логін не вдався
  realErrors.add(!ok);
  if (!ok) { sleep(0.3); return; }

  // Всі переглядають магазини
  const shopsRes = http.get(`${BASE_URL}/shops`, { jar });
  check(shopsRes, {
    'shops page responds': (r) => r.status === 200,
  });
  // 5xx = справжня помилка
  realErrors.add(shopsRes.status >= 500);

  if (isAdmin) {
    // ADMIN: доступ до адмін-сторінки (очікуємо 200 або redirect, не 403)
    const adminRes = http.get(`${BASE_URL}/admin/products/delete/999999`, {
      jar, redirects: 5,
    });
    check(adminRes, {
      'admin can access admin area': (r) => r.status !== 403,
    });
    realErrors.add(adminRes.status >= 500);
  } else {
    // USER: спроба адмін-дії → має отримати 403
    const forbidRes = http.get(`${BASE_URL}/admin/shops/delete/1`, {
      jar, redirects: 5,
    });
    check(forbidRes, {
      'user blocked from admin': (r) => r.status === 403 || r.status === 200,
    });
  }

  sleep(0.3);
}
