# Lab 3 — Тестування програмних рішень

Лабораторна робота 3 з дисципліни «Інженерія програмного забезпечення».  
Навантажувальне тестування RESTful веб-застосунку «Оргтехніка» (Java Spring Boot) за допомогою [Grafana k6](https://k6.io/).

> Проєкт, що тестується: [andreiiihuzhov/rgr-orgtechnics](https://github.com/andreiiihuzhov/rgr-orgtechnics)

## Опис тестів

Тестується Spring Boot застосунок з авторизацією (ролі USER та ADMIN).  
k6 логінується через Spring Security form-login, отримує сесійну cookie і виконує запити від імені конкретної ролі.

| # | Тест | Файл | Сценарій |
|---|------|------|----------|
| 1 | **Smoke Test** | `k6-tests/smoke-test.js` | 1 VU, 30s — базова доступність: логін, перегляд магазинів, перевірка блокування USER від /admin |
| 2 | **Load Test** | `k6-tests/load-test.js` | до 10 VU, 60s — типове навантаження: кілька USER одночасно переглядають сторінки |
| 3 | **Stress Test** | `k6-tests/stress-test.js` | до 30 VU, 50s — змішані ролі (USER + ADMIN), перевірка поведінки під стресом |

## Ендпоінти, що тестуються

| Метод | URL | Роль | Опис |
|-------|-----|------|------|
| GET | `/login` | Всі | Сторінка входу |
| POST | `/login` | Всі | Авторизація через форму |
| GET | `/shops` | USER, ADMIN | Список магазинів і товарів |
| GET | `/admin/products/delete/{id}` | ADMIN | Видалення товару |
| GET | `/admin/shops/delete/{id}` | ADMIN | Видалення магазину |

## Технології

![k6](https://img.shields.io/badge/k6-Grafana-purple)
![Java](https://img.shields.io/badge/Java-17-orange)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3-green)
![MySQL](https://img.shields.io/badge/MySQL-8-blue)

## Локальний запуск тестів

```bash
# Переконайся, що РГР-застосунок запущений на http://localhost:8080
# (MySQL повинна бути запущена з базою rgr_orgtechnics)

# Встановити k6: https://k6.io/docs/get-started/installation/

k6 run k6-tests/smoke-test.js
k6 run k6-tests/load-test.js
k6 run k6-tests/stress-test.js
```

## CI/CD

При кожному push у `main` GitHub Actions автоматично:
1. Піднімає MySQL у Docker service
2. Клонує та збирає РГР-застосунок
3. Запускає Spring Boot додаток
4. Встановлює k6 та прогоняє всі 3 тести

## Автор

Гужов Андрій — група KI-222
