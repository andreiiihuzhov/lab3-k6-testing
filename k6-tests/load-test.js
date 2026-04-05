import http from 'k6/http';
import { check, sleep } from 'k6';

// ── Load Test ─────────────────────────────────────────
// Типове навантаження: поступово збільшує до 10 VU.
// Сценарій: кілька USER одночасно переглядають магазини.

export const options = {
  stages: [
    { duration: '10s', target: 5  },   // ramp-up до 5 VU
    { duration: '10s', target: 10 },   // ramp-up до 10 VU
    { duration: '30s', target: 10 },   // тримаємо 10 VU
    { duration: '10s', target: 0  },   // ramp-down до 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // 95% запитів < 2s
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

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
  const jar = login('user', 'pass');

  // Переглядаємо список магазинів
  const shopsRes = http.get(`${BASE_URL}/shops`, { jar });
  check(shopsRes, {
    'shops list loads':    (r) => r.status === 200,
    'shops has content':   (r) => r.body.includes('Оргтехніка') || r.body.length > 500,
  });

  sleep(0.5);

  // Повторний перегляд (root redirect)
  const homeRes = http.get(`${BASE_URL}/`, { jar });
  check(homeRes, {
    'home redirects ok': (r) => r.status === 200,
  });

  sleep(0.5);
}
