# Mogg Analyzer

AI-анализ внешности — аналог [nivx.ru/mogg](https://nivx.ru/mogg). Загрузи селфи, получи разбор 15 параметров лица: симметрия, скулы, челюсть, hunter eyes и потенциал старения.

## Возможности

- **Могги** — одиночный AI-анализ лица (1 mogг)
- **Батл** — сравнение двух лиц (2 mogга)
- **15 параметров** — симметрия, скулы, челюсть, hunter eyes, phi ratio и др.
- **Ранги** — CHAD, HTN, MTN, LTN, SUB5
- **Оплата** — Robokassa (или тестовый режим без настройки)
- **История анализов** — отслеживай прогресс
- **Программа тренировок** — 6-недельный план за 250₽

## Быстрый старт

```bash
# Установка
npm run install:all

# Копируй env
copy .env.example .env

# Запуск (фронт + бэк)
npm run dev
```

Открой http://localhost:5173

## Настройка Robokassa

1. Зарегистрируйся на [robokassa.ru](https://robokassa.ru)
2. В `.env` укажи:
   ```
   ROBOKASSA_LOGIN=твой_логин
   ROBOKASSA_PASSWORD1=пароль_1
   ROBOKASSA_PASSWORD2=пароль_2
   ROBOKASSA_TEST=true
   ```
3. В личном кабинете Robokassa укажи Result URL:
   ```
   https://твой-домен.ru/api/payment/result
   ```

Пока Robokassa не настроена — оплата работает в тестовом режиме (mock-pay).

## Продакшн

```bash
npm run build
npm start
```

Сервер раздаёт API + собранный фронт на порту 3001.

## Технологии

- **Frontend**: React + Vite + MediaPipe Face Landmarker (478 точек)
- **Backend**: Express + SQLite + Robokassa
- **Анализ**: Реальные метрики из landmarks + взвешенный скоринг

## Тарифы

| Пакет | Цена |
|-------|------|
| 5 mogгов | 25₽ |
| 10 mogгов | 50₽ |
| 15 mogгов | 75₽ |
| 20 mogгов | 85₽ |
| 50 mogгов | 200₽ |
| 67 mogгов | 220₽ |
| Программа тренировок | 250₽ |
