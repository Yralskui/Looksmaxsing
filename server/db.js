import pkg from 'node-sqlite3-wasm';
const { Database } = pkg;
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { randomUUID } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, 'mogg.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    token TEXT UNIQUE NOT NULL,
    moggs INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    inv_id INTEGER UNIQUE NOT NULL,
    moggs INTEGER NOT NULL DEFAULT 0,
    amount REAL NOT NULL,
    product_type TEXT DEFAULT 'moggs',
    analysis_id TEXT,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS analyses (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    result_json TEXT NOT NULL,
    training_purchased INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

try { db.exec(`ALTER TABLE orders ADD COLUMN product_type TEXT DEFAULT 'moggs'`); } catch (_) {}
try { db.exec(`ALTER TABLE orders ADD COLUMN analysis_id TEXT`); } catch (_) {}
try { db.exec(`ALTER TABLE analyses ADD COLUMN training_purchased INTEGER DEFAULT 0`); } catch (_) {}
try { db.exec(`ALTER TABLE users ADD COLUMN email TEXT`); } catch (_) {}
try { db.exec(`ALTER TABLE users ADD COLUMN password_hash TEXT`); } catch (_) {}
try { db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL`); } catch (_) {}

function newSessionToken() {
  return randomUUID();
}

export function getUserByEmail(email) {
  return db.get('SELECT * FROM users WHERE email = ?', [email]);
}

export function registerUser(email, passwordHash, existingToken = null) {
  if (existingToken) {
    const anon = getUserByToken(existingToken);
    if (anon && !anon.email) {
      const token = newSessionToken();
      db.run(
        'UPDATE users SET email = ?, password_hash = ?, token = ? WHERE id = ?',
        [email, passwordHash, token, anon.id]
      );
      return db.get('SELECT * FROM users WHERE id = ?', [anon.id]);
    }
  }

  const id = randomUUID();
  const token = newSessionToken();
  db.run(
    'INSERT INTO users (id, token, email, password_hash, moggs) VALUES (?, ?, ?, ?, 0)',
    [id, token, email, passwordHash]
  );
  return db.get('SELECT * FROM users WHERE id = ?', [id]);
}

export function rotateUserToken(userId) {
  const token = newSessionToken();
  db.run('UPDATE users SET token = ? WHERE id = ?', [token, userId]);
  return db.get('SELECT * FROM users WHERE id = ?', [userId]);
}

export function userPublic(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    moggs: user.moggs,
    hasAccount: Boolean(user.email),
  };
}

export function getOrCreateUser(token) {
  let user = db.get('SELECT * FROM users WHERE token = ?', [token]);
  if (!user) {
    const id = randomUUID();
    db.run('INSERT INTO users (id, token, moggs) VALUES (?, ?, 0)', [id, token]);
    user = db.get('SELECT * FROM users WHERE id = ?', [id]);
  }
  return user;
}

export function getUserById(id) {
  return db.get('SELECT * FROM users WHERE id = ?', [id]);
}

export function getUserByToken(token) {
  return db.get('SELECT * FROM users WHERE token = ?', [token]);
}

export function deductMoggs(userId, amount) {
  const user = getUserById(userId);
  if (!user || user.moggs < amount) return false;
  db.run('UPDATE users SET moggs = moggs - ? WHERE id = ?', [amount, userId]);
  return true;
}

export function addMoggs(userId, amount) {
  db.run('UPDATE users SET moggs = moggs + ? WHERE id = ?', [amount, userId]);
}

export function createOrder(userId, invId, moggs, amount, productType = 'moggs', analysisId = null) {
  db.run(
    'INSERT INTO orders (user_id, inv_id, moggs, amount, product_type, analysis_id) VALUES (?, ?, ?, ?, ?, ?)',
    [userId, invId, moggs, amount, productType, analysisId]
  );
}

export function getOrderByInvId(invId) {
  return db.get('SELECT * FROM orders WHERE inv_id = ?', [invId]);
}

export function completeOrder(invId) {
  db.run("UPDATE orders SET status = 'paid' WHERE inv_id = ?", [invId]);
}

export function saveAnalysis(id, userId, type, result) {
  db.run(
    'INSERT INTO analyses (id, user_id, type, result_json) VALUES (?, ?, ?, ?)',
    [id, userId, type, JSON.stringify(result)]
  );
}

export function getAnalysisById(id, userId) {
  return db.get('SELECT * FROM analyses WHERE id = ? AND user_id = ?', [id, userId]);
}

export function markTrainingPurchased(analysisId) {
  db.run('UPDATE analyses SET training_purchased = 1 WHERE id = ?', [analysisId]);
}

export function getUserHistory(userId, limit = 20) {
  return db.all(
    `SELECT id, type, result_json, training_purchased, created_at
     FROM analyses WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
    [userId, limit]
  );
}

export function getRecentUsers(limit = 20) {
  return db.all(
    `SELECT id, email, moggs, created_at
     FROM users ORDER BY datetime(created_at) DESC LIMIT ?`,
    [limit]
  );
}

export function getNextInvId() {
  const row = db.get('SELECT COALESCE(MAX(inv_id), 0) + 1 as next FROM orders');
  return row.next;
}

export default db;
