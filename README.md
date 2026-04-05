# Lab 3 — Тестування програмних рішень

Лабораторна робота 3 з дисципліни «Інженерія програмного забезпечення».  
Демонстрація навантажувального тестування REST API за допомогою [Grafana k6](https://k6.io/).

## Опис проєкту

Простий REST API на Express.js для управління користувачами (CRUD), який тестується трьома видами k6-тестів:

| # | Тест | Файл | Опис |
|---|------|------|------|
| 1 | Smoke Test | `k6-tests/smoke-test.js` | Мінімальне навантаження (1 VU, 30s) — перевірка базової працездатності |
| 2 | Load Test | `k6-tests/load-test.js` | Типове навантаження (до 10 VU, 60s) — CRUD-сценарій |
| 3 | Stress Test | `k6-tests/stress-test.js` | Стрес-навантаження (до 30 VU, 50s) — пошук межі стабільності |

## API Endpoints

| Метод | URL | Опис |
|-------|-----|------|
| GET | `/api/health` | Перевірка стану сервера |
| GET | `/api/users` | Отримати всіх користувачів |
| GET | `/api/users/:id` | Отримати користувача за ID |
| POST | `/api/users` | Створити нового користувача |
| DELETE | `/api/users/:id` | Видалити користувача |

## Технології

![Node.js](https://img.shields.io/badge/Node.js-20-green)
![Express](https://img.shields.io/badge/Express-4.21-blue)
![k6](https://img.shields.io/badge/k6-Grafana-purple)
![Docker](https://img.shields.io/badge/Docker-latest-blue)

## Запуск локально

```bash
# Встановити залежності
npm install

# Запустити сервер
node server.js

# Запустити тести (в іншому терміналі)
k6 run k6-tests/smoke-test.js
k6 run k6-tests/load-test.js
k6 run k6-tests/stress-test.js
```

## CI/CD

Тести автоматично запускаються при кожному push у гілку `main` через GitHub Actions.

## Автор

Гужов Андрій — група KI-222
