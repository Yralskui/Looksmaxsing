import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
  getOrCreateUser,
  getUserByToken,
  getUserById,
  getUserByEmail,
  registerUser,
  rotateUserToken,
  userPublic,
  deductMoggs,
  addMoggs,
  saveAnalysis,
  getUserHistory,
  getAnalysisById,
  getOrderByInvId,
  markTrainingPurchased,
  getRecentUsers,
} from './db.js';
import {
  normalizeEmail,
  isValidEmail,
  isValidPassword,
  hashPassword,
  verifyPassword,
} from './auth.js';
import {
  analyzeFromLandmarks,
  analyzeBattle,
  generateTrainingProgram,
  PACKAGES,
  TRAINING_PROGRAM_PRICE,
} from './analysis.js';
import {
  createPaymentUrl,
  createTrainingPaymentUrl,
  handleResultUrl,
  handleWebhook,
  mockPay,
  fulfillByPaymentId,
} from './payments.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

function canonicalSiteUrl() {
  return (process.env.CLIENT_URL || 'https://looks-maxing.ru').replace(/\/$/, '');
}

function canonicalHost() {
  try {
    return new URL(canonicalSiteUrl()).host;
  } catch {
    return 'looks-maxing.ru';
  }
}

// www → основной домен (работает после добавления www в Railway)
app.use((req, res, next) => {
  const host = (req.headers.host || '').split(':')[0].toLowerCase();
  const canonical = canonicalHost();
  if (host === `www.${canonical}`) {
    return res.redirect(301, `${canonicalSiteUrl()}${req.originalUrl}`);
  }
  next();
});

const clientOrigins = [process.env.CLIENT_URL, 'http://localhost:5173'].filter(Boolean);
if (process.env.CLIENT_URL) {
  try {
    const u = new URL(process.env.CLIENT_URL);
    if (!u.host.startsWith('www.')) {
      clientOrigins.push(`${u.protocol}//www.${u.host}`);
    }
  } catch (_) {}
}

app.use(cors({
  origin: clientOrigins.length ? clientOrigins : true,
}));
app.use(express.json({ limit: '10mb' }));

function authMiddleware(req, res, next) {
  const token = req.headers['x-user-token'];
  if (!token) return res.status(401).json({ error: 'Требуется токен' });
  const user = getUserByToken(token);
  if (!user) return res.status(401).json({ error: 'Сессия недействительна' });
  req.user = user;
  next();
}

function adminMiddleware(req, res, next) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return res.status(503).json({ error: 'ADMIN_SECRET не настроен' });
  if (req.headers['x-admin-secret'] !== secret) {
    return res.status(403).json({ error: 'Неверный admin secret' });
  }
  next();
}

app.get('/api/health', (_, res) => res.json({ ok: true }));

app.post('/api/auth/init', (req, res) => {
  const token = req.body.token || randomUUID();
  const user = getOrCreateUser(token);
  res.json({ token, ...userPublic(user) });
});

app.post('/api/auth/register', (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = req.body.password;

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Некорректный email' });
  }
  if (!isValidPassword(password)) {
    return res.status(400).json({ error: 'Пароль: от 6 до 128 символов' });
  }
  if (getUserByEmail(email)) {
    return res.status(409).json({ error: 'Этот email уже зарегистрирован' });
  }

  const existingToken = req.headers['x-user-token'];
  const passwordHash = hashPassword(password);
  const user = registerUser(email, passwordHash, existingToken);
  res.json({ token: user.token, ...userPublic(user) });
});

app.post('/api/auth/login', (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = req.body.password;

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Некорректный email' });
  }

  const user = getUserByEmail(email);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Неверный email или пароль' });
  }

  const updated = rotateUserToken(user.id);
  res.json({ token: updated.token, ...userPublic(updated) });
});

app.get('/api/auth/session', authMiddleware, (req, res) => {
  res.json(userPublic(req.user));
});

app.get('/api/user', authMiddleware, (req, res) => {
  res.json(userPublic(req.user));
});

app.get('/api/packages', (_, res) => {
  res.json(PACKAGES);
});

app.post('/api/analyze', authMiddleware, (req, res) => {
  const cost = 1;
  if (req.user.moggs < cost) {
    return res.status(402).json({ error: 'Недостаточно mogгов', moggs: req.user.moggs });
  }

  const { landmarks, imageHash } = req.body;
  if (!landmarks || !Array.isArray(landmarks)) {
    return res.status(400).json({ error: 'Нужны landmarks лица' });
  }

  if (!deductMoggs(req.user.id, cost)) {
    return res.status(402).json({ error: 'Недостаточно mogгов' });
  }

  const result = analyzeFromLandmarks(landmarks, imageHash || randomUUID());
  const analysisId = randomUUID();
  saveAnalysis(analysisId, req.user.id, 'single', result);

  const updated = getUserByToken(req.headers['x-user-token']);
  res.json({ ...result, analysisId, moggs: updated.moggs });
});

app.post('/api/battle', authMiddleware, (req, res) => {
  const cost = 2;
  if (req.user.moggs < cost) {
    return res.status(402).json({ error: 'Недостаточно mogгов (нужно 2)', moggs: req.user.moggs });
  }

  const { landmarks1, landmarks2, imageHash1, imageHash2 } = req.body;
  if (!landmarks1 || !landmarks2) {
    return res.status(400).json({ error: 'Нужны landmarks двух лиц' });
  }

  if (!deductMoggs(req.user.id, cost)) {
    return res.status(402).json({ error: 'Недостаточно mogгов' });
  }

  const result1 = analyzeFromLandmarks(landmarks1, imageHash1 || 'face1');
  const result2 = analyzeFromLandmarks(landmarks2, imageHash2 || 'face2');
  const battle = analyzeBattle(result1, result2);

  const analysisId = randomUUID();
  saveAnalysis(analysisId, req.user.id, 'battle', battle);

  const updated = getUserByToken(req.headers['x-user-token']);
  res.json({ ...battle, analysisId, moggs: updated.moggs });
});

app.post('/api/payment/create', authMiddleware, async (req, res) => {
  const { moggs } = req.body;
  const pkg = PACKAGES.find((p) => p.moggs === moggs);
  if (!pkg) return res.status(400).json({ error: 'Неверный пакет' });

  try {
    const payment = await createPaymentUrl(req.user.id, pkg.moggs, pkg.price);
    res.json(payment);
  } catch (e) {
    console.error('Payment create error:', e);
    res.status(500).json({ error: 'Ошибка создания платежа' });
  }
});

app.post('/api/payment/result', (req, res) => {
  const result = handleResultUrl({ ...req.query, ...req.body });
  if (result.ok) {
    res.send(`OK${result.invId}`);
  } else {
    res.status(400).send('bad sign');
  }
});

app.get('/api/payment/result', (req, res) => {
  const result = handleResultUrl(req.query);
  if (result.ok) {
    res.send(`OK${result.invId}`);
  } else {
    res.status(400).send('bad sign');
  }
});

app.post('/api/payment/webhook', async (req, res) => {
  try {
    const result = await handleWebhook(req.body);
    if (result.ok) {
      res.status(200).json({ status: 'ok' });
    } else {
      res.status(400).json(result);
    }
  } catch (e) {
    console.error('Webhook error:', e);
    res.status(500).json({ error: 'Webhook failed' });
  }
});

app.post('/api/payment/mock-pay', authMiddleware, async (req, res) => {
  const { invId } = req.body;
  try {
    const result = await mockPay(invId);
    if (!result.ok) return res.status(400).json(result);

    const updated = getUserByToken(req.headers['x-user-token']);
    res.json({ ...result, moggs: updated.moggs });
  } catch (e) {
    console.error('Mock pay error:', e);
    res.status(500).json({ error: 'Ошибка оплаты' });
  }
});

// Ручное начисление (только для владельца, нужен ADMIN_SECRET в Railway)
app.get('/api/admin/order/:invId', adminMiddleware, (req, res) => {
  const invId = parseInt(req.params.invId, 10);
  const order = getOrderByInvId(invId);
  if (!order) return res.status(404).json({ error: 'Заказ не найден' });
  const user = getUserById(order.user_id);
  res.json({
    order: {
      invId: order.inv_id,
      status: order.status,
      moggs: order.moggs,
      amount: order.amount,
      productType: order.product_type,
      analysisId: order.analysis_id,
      createdAt: order.created_at,
    },
    user: user ? { id: user.id, moggs: user.moggs } : null,
  });
});

app.post('/api/admin/fulfill-order', adminMiddleware, async (req, res) => {
  const invId = parseInt(req.body.invId, 10);
  if (!invId) return res.status(400).json({ error: 'Нужен invId' });
  try {
    const result = await mockPay(invId);
    if (!result.ok) return res.status(400).json(result);
    const order = getOrderByInvId(invId);
    const user = order ? getUserById(order.user_id) : null;
    res.json({ ...result, userMoggs: user?.moggs });
  } catch (e) {
    console.error('Admin fulfill error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/admin/fulfill-payment', adminMiddleware, async (req, res) => {
  const { paymentId } = req.body;
  if (!paymentId) return res.status(400).json({ error: 'Нужен paymentId из ЮKassa' });
  try {
    const result = await fulfillByPaymentId(paymentId);
    if (!result.ok) return res.status(400).json(result);
    const order = result.invId ? getOrderByInvId(result.invId) : null;
    const user = order ? getUserById(order.user_id) : null;
    res.json({ ...result, userMoggs: user?.moggs });
  } catch (e) {
    console.error('Admin fulfill payment error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/admin/users', adminMiddleware, (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
  res.json({ users: getRecentUsers(limit) });
});

app.post('/api/admin/add-moggs', adminMiddleware, (req, res) => {
  const { userId, email, moggs, analysisId } = req.body;
  if (!userId && !email) return res.status(400).json({ error: 'Нужен userId или email' });

  let user = userId ? getUserById(userId) : null;
  if (!user && email) {
    user = getUserByEmail(normalizeEmail(email));
  }
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  if (analysisId) {
    markTrainingPurchased(analysisId);
    const updated = getUserById(user.id);
    return res.json({ ok: true, type: 'training', analysisId, moggs: updated.moggs, userId: user.id, email: user.email });
  }

  const amount = parseInt(moggs, 10);
  if (!amount || amount < 1) return res.status(400).json({ error: 'Нужно moggs > 0' });

  addMoggs(user.id, amount);
  const updated = getUserById(user.id);
  res.json({ ok: true, type: 'moggs', added: amount, moggs: updated.moggs, userId: user.id, email: user.email });
});

app.get('/api/history', authMiddleware, (req, res) => {
  const rows = getUserHistory(req.user.id);
  const history = rows.map((row) => {
    const result = JSON.parse(row.result_json);
    const score = row.type === 'battle'
      ? Math.max(result.result1?.score ?? 0, result.result2?.score ?? 0)
      : result.score;
    const rank = row.type === 'battle'
      ? (result.winner === 1 ? result.result1?.rank : result.result2?.rank)
      : result.rank;
    return {
      id: row.id,
      type: row.type,
      score,
      rank,
      trainingPurchased: !!row.training_purchased,
      createdAt: row.created_at,
    };
  });
  res.json(history);
});

app.get('/api/training/:analysisId', authMiddleware, (req, res) => {
  const analysis = getAnalysisById(req.params.analysisId, req.user.id);
  if (!analysis) return res.status(404).json({ error: 'Анализ не найден' });
  if (!analysis.training_purchased) {
    return res.status(402).json({ error: 'Программа не куплена', price: TRAINING_PROGRAM_PRICE });
  }

  const result = JSON.parse(analysis.result_json);
  const base = result.result1 || result;
  const metricsObj = {};
  for (const m of base.metrics) metricsObj[m.key] = m.score;

  const program = generateTrainingProgram(metricsObj, {
    rank: base.rank,
    label: base.rankLabel,
  });
  res.json(program);
});

app.post('/api/payment/training', authMiddleware, async (req, res) => {
  const { analysisId } = req.body;
  const analysis = getAnalysisById(analysisId, req.user.id);
  if (!analysis) return res.status(404).json({ error: 'Анализ не найден' });
  if (analysis.training_purchased) {
    return res.status(400).json({ error: 'Программа уже куплена' });
  }

  try {
    const payment = await createTrainingPaymentUrl(
      req.user.id,
      analysisId,
      TRAINING_PROGRAM_PRICE
    );
    res.json(payment);
  } catch (e) {
    console.error('Training payment error:', e);
    res.status(500).json({ error: 'Ошибка создания платежа' });
  }
});

const clientDist = join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(join(clientDist, 'index.html'), (err) => {
    if (err) next();
  });
});

app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

app.listen(PORT, () => {
  console.log(`Mogg Analyzer API: http://localhost:${PORT}`);
});
