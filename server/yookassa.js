import { randomUUID } from 'crypto';
import {
  createOrder,
  getNextInvId,
  getOrderByInvId,
  getUserById,
  completeOrder,
  addMoggs,
  markTrainingPurchased,
} from './db.js';
import { createReceipt, receiptDescription } from './nalog.js';

const API_URL = 'https://api.yookassa.ru/v3';

function isConfigured() {
  return Boolean(process.env.YOOKASSA_SHOP_ID && process.env.YOOKASSA_SECRET_KEY);
}

function siteUrl() {
  return (process.env.CLIENT_URL || 'https://looks-maxing.ru').replace(/\/$/, '');
}

function authHeader() {
  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secret = process.env.YOOKASSA_SECRET_KEY;
  const token = Buffer.from(`${shopId}:${secret}`).toString('base64');
  return `Basic ${token}`;
}

async function fulfillOrder(order) {
  completeOrder(order.inv_id);
  if (order.product_type === 'training') {
    if (order.analysis_id) markTrainingPurchased(order.analysis_id);
  } else {
    addMoggs(order.user_id, order.moggs);
  }

  let receipt = null;
  try {
    receipt = await createReceipt(receiptDescription(order), order.amount);
    if (receipt?.printUrl) {
      console.log(`Nalog receipt created for order ${order.inv_id}`);
    }
  } catch (e) {
    console.error(`Nalog receipt failed for order ${order.inv_id}:`, e.message);
  }

  if (order.product_type === 'training') {
    return { type: 'training', analysisId: order.analysis_id, receipt };
  }
  return { type: 'moggs', moggs: order.moggs, receipt };
}

async function createYooPayment(amount, description, invId, userId, moggs = 0) {
  const res = await fetch(`${API_URL}/payments`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
      'Idempotence-Key': randomUUID(),
    },
    body: JSON.stringify({
      amount: { value: Number(amount).toFixed(2), currency: 'RUB' },
      capture: true,
      confirmation: {
        type: 'redirect',
        return_url: `${siteUrl()}/?payment=success`,
      },
      description,
      metadata: {
        inv_id: String(invId),
        user_id: userId,
        moggs: String(moggs),
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`YooKassa error: ${err}`);
  }

  const data = await res.json();
  return data.confirmation?.confirmation_url;
}

async function fetchPayment(paymentId) {
  const res = await fetch(`${API_URL}/payments/${paymentId}`, {
    headers: { Authorization: authHeader() },
  });
  if (!res.ok) throw new Error('Failed to fetch payment');
  return res.json();
}

export async function createPaymentUrl(userId, moggs, amount) {
  const invId = getNextInvId();
  createOrder(userId, invId, moggs, amount, 'moggs');

  if (!isConfigured()) {
    return {
      mock: true,
      invId,
      url: null,
      message: 'ЮKassa не настроена. Используй /api/payment/mock-pay',
    };
  }

  const url = await createYooPayment(
    amount,
    `Покупка ${moggs} mogгов — Mogg Analyzer`,
    invId,
    userId,
    moggs
  );

  return { url, invId, mock: false };
}

export async function createTrainingPaymentUrl(userId, analysisId, amount) {
  const invId = getNextInvId();
  createOrder(userId, invId, 0, amount, 'training', analysisId);

  if (!isConfigured()) {
    return {
      mock: true,
      invId,
      url: null,
      message: 'ЮKassa не настроена. Используй mock-pay',
    };
  }

  const url = await createYooPayment(
    amount,
    'Программа тренировок Looksmaxxing — Mogg Analyzer',
    invId,
    userId,
    0
  );

  return { url, invId, mock: false };
}

export async function handleWebhook(body) {
  if (!isConfigured()) return { ok: false, error: 'YooKassa not configured' };

  const event = body?.event;
  if (event !== 'payment.succeeded') {
    return { ok: true, ignored: true };
  }

  const paymentId = body?.object?.id;
  if (!paymentId) return { ok: false, error: 'No payment id' };

  const payment = await fetchPayment(paymentId);
  if (payment.status !== 'succeeded') {
    return { ok: false, error: 'Payment not succeeded' };
  }

  const invId = parseInt(payment.metadata?.inv_id, 10);
  if (!invId) return { ok: false, error: 'No inv_id in metadata' };

  const order = getOrderByInvId(invId);
  if (!order) {
    return fulfillByPaymentId(paymentId);
  }
  if (order.status === 'paid') return { ok: true, already: true, invId };

  const result = await fulfillOrder(order);
  return { ok: true, invId, ...result };
}

export async function mockPay(invId) {
  const order = getOrderByInvId(invId);
  if (!order) return { ok: false, error: 'Order not found' };
  if (order.status === 'paid') return { ok: true, already: true, type: order.product_type };

  const result = await fulfillOrder(order);
  return { ok: true, invId, ...result };
}

export async function fulfillByPaymentId(paymentId) {
  if (!isConfigured()) return { ok: false, error: 'YooKassa not configured' };

  const payment = await fetchPayment(paymentId);
  if (payment.status !== 'succeeded') {
    return { ok: false, error: 'Payment not succeeded', status: payment.status };
  }

  const invId = parseInt(payment.metadata?.inv_id, 10);
  if (invId) {
    const order = getOrderByInvId(invId);
    if (order) return mockPay(invId);
  }

  const userId = payment.metadata?.user_id;
  const moggs = parseInt(payment.metadata?.moggs, 10);
  if (userId && moggs > 0) {
    if (!getUserById(userId)) {
      return { ok: false, error: 'User from payment metadata not found' };
    }
    addMoggs(userId, moggs);
    let receipt = null;
    try {
      const amount = payment.amount?.value ?? payment.amount;
      receipt = await createReceipt(
        receiptDescription({ product_type: 'moggs', moggs }),
        amount
      );
      if (receipt?.printUrl) {
        console.log(`Nalog receipt created (recovered) for payment ${paymentId}`);
      }
    } catch (e) {
      console.error(`Nalog receipt failed (recovered) for payment ${paymentId}:`, e.message);
    }

    return { ok: true, recovered: true, userId, moggs, invId: invId || null, receipt };
  }

  return { ok: false, error: 'Order not found and payment has no user_id in metadata' };
}
