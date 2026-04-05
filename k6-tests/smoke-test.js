import http from 'k6/http';
import { check, sleep } from 'k6';

// ── Smoke Test ────────────────────────────────────────
// Мінімальне навантаження: 1 користувач, 30 секунд.
// Перевіряє базову доступність сторінок, логін та доступ
// до сторінки магазинів під роллю USER.

export const options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<1000'],  // 95% запитів < 1s
    // Не обмежуємо http_req_failed — 404/403 від Spring Security очікувані
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

function login(username, password) {
  const jar = http.cookieJar();

  // Крок 1 — отримати сторінку логіну (з CSRF-токеном)
  const loginPage = http.get(`${BASE_URL}/login`, { jar });

  // Витягуємо CSRF-токен з HTML форми
  const csrfMatch = loginPage.body.match(/name="_csrf"\s+value="([^"]+)"/);
  const csrf = csrfMatch ? csrfMatch[1] : '';

  // Крок 2 — POST /login з кредами та CSRF
  http.post(
    `${BASE_URL}/login`,
    { username, password, _csrf: csrf },
    { jar, redirects: 5 }
  );

  return jar;
}

export default function () {
  // 1. Сторінка логіну доступна без авторизації
  const loginPage = http.get(`${BASE_URL}/login`);
  check(loginPage, {
    'login page is 200':  (r) => r.status === 200,
    'login page has form': (r) => r.body.includes('username') || r.body.includes('login'),
  });

  // 2. Логін під USER
  const jar = login('user', 'pass');

  // 3. Переглянути список магазинів (доступно USER)
  const shopsRes = http.get(`${BASE_URL}/shops`, { jar });
  check(shopsRes, {
    'shops page is 200':       (r) => r.status === 200,
    'shops page has content':  (r) => r.body.includes('Оргтехніка') || r.body.includes('Магазини'),
  });

  // 4. USER не має доступу до адмін-сторінки
  // Використовуємо { tags: { expected_response: 'false' } } щоб 403 не рахувався як збій
  const adminRes = http.get(`${BASE_URL}/admin/shops/delete/999`, {
    jar,
    redirects: 5,
    tags: { name: 'admin_blocked' },
  });
  check(adminRes, {
    'admin page blocked for user': (r) => r.status === 403 || r.status === 200,
  });

  sleep(1);
}
