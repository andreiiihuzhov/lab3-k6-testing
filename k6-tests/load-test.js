import http from 'k6/http';
import { check, sleep } from 'k6';

// ── Load Test ─────────────────────────────────────────
// Типове навантаження: поступово збільшує до 10 VU.
// Сценарій: кілька користувачів одночасно переглядають
// магазини і товари (роль USER).

export const options = {
  stages: [
    { duration: '10s', target: 5  },   // ramp-up до 5 VU
    { duration: '10s', target: 10 },   // ramp-up до 10 VU
    { duration: '30s', target: 10 },   // тримаємо 10 VU
    { duration: '10s', target: 0  },   // ramp-down до 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<1500'],  // 95% запитів < 1.5s
    http_req_failed:   ['rate<0.05'],   // менше 5% помилок
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

// Отримати CSRF та увійти, повернути cookie-jar
function login(username, password) {
  const jar = http.cookieJar();
  const loginPage = http.get(`${BASE_URL}/login`, { jar });

  const csrfMatch = loginPage.body.match(/name="_csrf"\s+value="([^"]+)"/);
  const csrf = csrfMatch ? csrfMatch[1] : '';

  http.post(
    `${BASE_URL}/login`,
    { username, password, _csrf: csrf },
    { jar, redirects: 5 }
  );

  return jar;
}

export default function () {
  // Кожна ітерація = один користувач заходить і переглядає
  const jar = login('user', 'pass');

  // Переглянути головну сторінку
  const homeRes = http.get(`${BASE_URL}/shops`, { jar });
  check(homeRes, {
    'shops list loads': (r) => r.status === 200,
  });

  // Симулюємо перехід між сторінками
  sleep(0.5);

  // Повторний перегляд (наприклад, refresh)
  const shopsAgain = http.get(`${BASE_URL}/`, { jar });
  check(shopsAgain, {
    'home redirect works': (r) => r.status === 200,
  });

  sleep(0.5);
}
