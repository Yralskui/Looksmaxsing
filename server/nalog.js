import { randomUUID } from 'crypto';

const API_BASE = 'https://lknpd.nalog.ru/api/v1';

let cachedToken = null;
let tokenExpiresAt = 0;
let cachedRefreshToken = null;

function isConfigured() {
  return Boolean(process.env.NALOG_INN && process.env.NALOG_PASSWORD);
}

function deviceId() {
  if (!process.env.NALOG_DEVICE_ID) {
    process.env.NALOG_DEVICE_ID = randomUUID();
  }
  return process.env.NALOG_DEVICE_ID;
}

function moscowIsoNow() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}.000+03:00`;
}

async function apiPost(path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    throw new Error(`Nalog API ${path}: ${text}`);
  }
  return data;
}

async function login() {
  const data = await apiPost('/auth/lkfl', {
    username: process.env.NALOG_INN,
    password: process.env.NALOG_PASSWORD,
    deviceInfo: {
      sourceDeviceId: deviceId(),
      sourceType: 'WEB',
      appVersion: '1.0.0',
      metaDetails: { userAgent: 'MoggAnalyzer/1.0' },
    },
  });

  cachedToken = data.token;
  cachedRefreshToken = data.refreshToken;
  tokenExpiresAt = Date.now() + (data.tokenExpireIn || 3600) * 1000 - 60_000;
  return cachedToken;
}

async function refreshToken() {
  if (!cachedRefreshToken) return login();

  try {
    const data = await apiPost('/auth/token', {
      deviceInfo: {
        appVersion: '1.0.0',
        sourceDeviceId: deviceId(),
        sourceType: 'WEB',
        metaDetails: { userAgent: 'MoggAnalyzer/1.0' },
      },
      refreshToken: cachedRefreshToken,
    });

    cachedToken = data.token;
    cachedRefreshToken = data.refreshToken || cachedRefreshToken;
    tokenExpiresAt = Date.now() + (data.tokenExpireIn || 3600) * 1000 - 60_000;
    return cachedToken;
  } catch {
    return login();
  }
}

async function getToken() {
  if (!isConfigured()) return null;
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;
  if (cachedRefreshToken) return refreshToken();
  return login();
}

export async function createReceipt(serviceName, amount) {
  if (!isConfigured()) return null;

  const token = await getToken();
  const time = moscowIsoNow();
  const sum = Number(amount).toFixed(2);

  const data = await apiPost(
    '/income',
    {
      operationTime: time,
      requestTime: time,
      paymentType: 'WIRE',
      ignoreMaxTotalIncomeRestriction: false,
      services: [
        {
          name: serviceName.slice(0, 128),
          amount: sum,
          quantity: 1,
        },
      ],
      totalAmount: sum,
      client: {
        contactPhone: null,
        displayName: null,
        incomeType: 'FROM_INDIVIDUAL',
        inn: null,
      },
    },
    token
  );

  const receiptId = data.approvedReceiptUuid;
  const printUrl = receiptId
    ? `https://lknpd.nalog.ru/api/v1/receipt/${process.env.NALOG_INN}/${receiptId}/print`
    : null;

  return { receiptId, printUrl };
}

export function receiptDescription(order) {
  if (order.product_type === 'training') {
    return 'Программа тренировок — Mogg Analyzer';
  }
  return `Покупка ${order.moggs} mogгов — анализ внешности`;
}
