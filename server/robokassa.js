import { Robokassa } from '@dev-aces/robokassa';
import {
  createOrder,
  getNextInvId,
  getOrderByInvId,
  completeOrder,
  addMoggs,
  markTrainingPurchased,
} from './db.js';

let robokassa = null;

function getRobokassa() {
  if (!process.env.ROBOKASSA_LOGIN) return null;
  if (!robokassa) {
    robokassa = new Robokassa({
      merchantLogin: process.env.ROBOKASSA_LOGIN,
      password1: process.env.ROBOKASSA_PASSWORD1,
      password2: process.env.ROBOKASSA_PASSWORD2,
      isTest: process.env.ROBOKASSA_TEST === 'true',
      hashAlgorithm: 'md5',
    });
  }
  return robokassa;
}

function fulfillOrder(order) {
  completeOrder(order.inv_id);
  if (order.product_type === 'training') {
    if (order.analysis_id) markTrainingPurchased(order.analysis_id);
    return { type: 'training', analysisId: order.analysis_id };
  }
  addMoggs(order.user_id, order.moggs);
  return { type: 'moggs', moggs: order.moggs };
}

export function createPaymentUrl(userId, moggs, amount) {
  const rk = getRobokassa();
  const invId = getNextInvId();
  createOrder(userId, invId, moggs, amount, 'moggs');

  if (!rk) {
    return {
      mock: true,
      invId,
      url: null,
      message: 'Robokassa не настроена. Используй /api/payment/mock-pay',
    };
  }

  const url = rk.generatePaymentUrl({
    outSum: amount.toFixed(2),
    description: `Покупка ${moggs} mogгов — Mogg Analyzer`,
    invId,
    userParameters: {
      shp_user_id: userId,
      shp_moggs: String(moggs),
    },
    receipt: {
      items: [
        {
          sum: amount,
          name: `${moggs} mogгов (анализ внешности)`,
          quantity: 1,
          payment_method: 'full_payment',
          payment_object: 'service',
          tax: 'none',
        },
      ],
    },
  });

  return { url, invId, mock: false };
}

export function createTrainingPaymentUrl(userId, analysisId, amount) {
  const rk = getRobokassa();
  const invId = getNextInvId();
  createOrder(userId, invId, 0, amount, 'training', analysisId);

  if (!rk) {
    return {
      mock: true,
      invId,
      url: null,
      message: 'Robokassa не настроена. Используй mock-pay',
    };
  }

  const url = rk.generatePaymentUrl({
    outSum: amount.toFixed(2),
    description: 'Программа тренировок Looksmaxxing — Mogg Analyzer',
    invId,
    userParameters: {
      shp_user_id: userId,
      shp_type: 'training',
      shp_analysis_id: analysisId,
    },
    receipt: {
      items: [{
        sum: amount,
        name: '6-недельная программа тренировок',
        quantity: 1,
        payment_method: 'full_payment',
        payment_object: 'service',
        tax: 'none',
      }],
    },
  });

  return { url, invId, mock: false };
}

export function handleResultUrl(query) {
  const rk = getRobokassa();
  if (!rk) return { ok: false, error: 'Robokassa not configured' };

  const valid = rk.checkPayment(query);
  if (!valid) return { ok: false, error: 'Invalid signature' };

  const invId = parseInt(query.InvId || query.invId, 10);
  const order = getOrderByInvId(invId);
  if (!order) return { ok: false, error: 'Order not found' };
  if (order.status === 'paid') return { ok: true, already: true };

  const result = fulfillOrder(order);
  return { ok: true, invId, ...result };
}

export function mockPay(invId) {
  const order = getOrderByInvId(invId);
  if (!order) return { ok: false, error: 'Order not found' };
  if (order.status === 'paid') return { ok: true, already: true, type: order.product_type };

  const result = fulfillOrder(order);
  return { ok: true, invId, ...result };
}
