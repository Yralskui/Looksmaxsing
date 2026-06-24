import * as yookassa from './yookassa.js';
import * as robokassa from './robokassa.js';

function useYooKassa() {
  return Boolean(process.env.YOOKASSA_SHOP_ID && process.env.YOOKASSA_SECRET_KEY);
}

export async function createPaymentUrl(userId, moggs, amount) {
  if (useYooKassa()) return yookassa.createPaymentUrl(userId, moggs, amount);
  return robokassa.createPaymentUrl(userId, moggs, amount);
}

export async function createTrainingPaymentUrl(userId, analysisId, amount) {
  if (useYooKassa()) return yookassa.createTrainingPaymentUrl(userId, analysisId, amount);
  return robokassa.createTrainingPaymentUrl(userId, analysisId, amount);
}

export function handleResultUrl(query) {
  return robokassa.handleResultUrl(query);
}

export async function handleWebhook(body) {
  return yookassa.handleWebhook(body);
}

export async function mockPay(invId) {
  if (useYooKassa()) return yookassa.mockPay(invId);
  return robokassa.mockPay(invId);
}

export async function fulfillByPaymentId(paymentId) {
  if (!useYooKassa()) return { ok: false, error: 'YooKassa not configured' };
  return yookassa.fulfillByPaymentId(paymentId);
}
