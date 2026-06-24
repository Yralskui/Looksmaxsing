const TOKEN_KEY = 'mogg_user_token';

export type SessionUser = {
  id: string;
  email: string | null;
  moggs: number;
  hasAccount: boolean;
};

export function getToken(): string {
  let token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      token = crypto.randomUUID();
    } else {
      token = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    }
    localStorage.setItem(TOKEN_KEY, token);
  }
  return token;
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function api<T>(
  path: string,
  options: RequestInit & { skipAuth?: boolean; _retry?: boolean } = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (!options.skipAuth) {
    headers['X-User-Token'] = getToken();
  }

  const res = await fetch(`/api${path}`, { ...options, headers });
  const data = await res.json();

  if (
    res.status === 401 &&
    !options.skipAuth &&
    !options._retry &&
    path !== '/auth/init' &&
    path !== '/auth/login' &&
    path !== '/auth/register'
  ) {
    clearToken();
    await initUser();
    return api<T>(path, { ...options, _retry: true });
  }

  if (!res.ok) throw new Error(data.error || 'Ошибка запроса');
  return data;
}

export async function initUser() {
  const data = await api<SessionUser & { token: string }>('/auth/init', {
    method: 'POST',
    body: JSON.stringify({ token: getToken() }),
    skipAuth: true,
  });
  setToken(data.token);
  return data;
}

export async function register(email: string, password: string) {
  const data = await api<SessionUser & { token: string }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setToken(data.token);
  return data;
}

export async function login(email: string, password: string) {
  const data = await api<SessionUser & { token: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setToken(data.token);
  return data;
}

export async function getSession() {
  return api<SessionUser>('/auth/session');
}

export async function getUser() {
  return api<SessionUser>('/user');
}

export async function analyze(landmarks: unknown[], imageHash: string) {
  return api('/analyze', {
    method: 'POST',
    body: JSON.stringify({ landmarks, imageHash }),
  });
}

export async function battle(
  landmarks1: unknown[],
  landmarks2: unknown[],
  imageHash1: string,
  imageHash2: string
) {
  return api('/battle', {
    method: 'POST',
    body: JSON.stringify({ landmarks1, landmarks2, imageHash1, imageHash2 }),
  });
}

export async function getPackages() {
  return api<import('./types').Package[]>('/packages');
}

export async function createPayment(moggs: number) {
  return api<{ url: string | null; invId: number; mock: boolean; message?: string }>(
    '/payment/create',
    { method: 'POST', body: JSON.stringify({ moggs }) }
  );
}

export async function mockPay(invId: number) {
  return api<{ moggs?: number; type?: string; analysisId?: string }>('/payment/mock-pay', {
    method: 'POST',
    body: JSON.stringify({ invId }),
  });
}

export async function getHistory() {
  return api<import('./types').HistoryItem[]>('/history');
}

export async function purchaseTraining(analysisId: string) {
  return api<{ url: string | null; invId: number; mock: boolean }>('/payment/training', {
    method: 'POST',
    body: JSON.stringify({ analysisId }),
  });
}

export async function getTrainingProgram(analysisId: string) {
  return api<import('./types').TrainingProgram>(`/training/${analysisId}`);
}
