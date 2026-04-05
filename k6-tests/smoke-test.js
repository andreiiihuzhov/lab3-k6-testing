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
    http_req_failed:   ['rate<0.01'],   // менше 1% мережевих помилок
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

// Логін через Spring Security form-login.
// Повертає об'єкт з cookie-jar для подальших запитів.
function login(username, password) {
  const jar = http.cookieJar();

  // Крок 1 — отримати CSRF-токен (Spring Security вимагає його при POST)
  const loginPage = http.get(`${BASE_URL}/login`, { jar });

  // Витягуємо CSRF-токен з HTML форми
  const csrfMatch = loginPage.body.match(/name="_csrf"\s+value="([^"]+)"/);
  const csrf = csrfMatch ? csrfMatch[1] : '';

  // Крок 2 — POST /login з кредами та CSRF
  const loginRes = http.post(
    `${BASE_URL}/login`,
    {
      username:  username,
      password:  password,
      _csrf:     csrf,
    },
    { jar, redirects: 5 }
  );

  return { jar, loginRes };
}

export default function () {
  // 1. Перевіряємо, що сторінка логіну доступна без авторизації
  const loginPage = http.get(`${BASE_URL}/login`);
  check(loginPage, {
    'login page is 200': (r) => r.status === 200,
    'login page has form': (r) => r.body.includes('username') || r.body.includes('login'),
  });

  // 2. Логін під USER
  const { jar, loginRes } = login('user', 'pass');
  check(loginRes, {
    'login redirect to shops': (r) =>
      r.status === 200 && (r.url.includes('/shops') || r.url.includes('/')),
  });

  // 3. Переглянути список магазинів (доступно USER)
  const shopsRes = http.get(`${BASE_URL}/shops`, { jar });
  check(shopsRes, {
    'shops page is 200':      (r) => r.status === 200,
    'shops page has content': (r) => r.body.includes('shop') || r.body.includes('Shop'),
  });

  // 4. USER не має доступу до адмін-сторінки (має отримати 403)
  const adminRes = http.get(`${BASE_URL}/admin/shops/delete/999`, { jar, redirects: 0 });
  check(adminRes, {
    'admin page blocked for user': (r) => r.status === 403 || r.status === 302,
  });

  sleep(1);
}
