import { useState } from 'react';
import type { SessionUser } from '../api';
import { login, register } from '../api';

type Mode = 'login' | 'register';

export default function AuthModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (user: SessionUser) => void;
}) {
  const [mode, setMode] = useState<Mode>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = mode === 'register'
        ? await register(email, password)
        : await login(email, password);
      onSuccess(user);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{mode === 'register' ? 'Регистрация' : 'Вход'}</h2>
        <p className="modal-sub">
          {mode === 'register'
            ? 'Создай аккаунт — mogги и история сохранятся'
            : 'Войди, чтобы вернуть баланс и историю'}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@mail.ru"
              required
              autoComplete="email"
            />
          </label>
          <label>
            Пароль
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="минимум 6 символов"
              required
              minLength={6}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            />
          </label>

          {error && <p className="modal-error">{error}</p>}

          <button className="modal-pay-btn" type="submit" disabled={loading}>
            {loading ? 'Подождите...' : mode === 'register' ? 'Зарегистрироваться' : 'Войти'}
          </button>
        </form>

        <button
          type="button"
          className="auth-switch"
          onClick={() => {
            setMode(mode === 'register' ? 'login' : 'register');
            setError(null);
          }}
        >
          {mode === 'register'
            ? 'Уже есть аккаунт? Войти'
            : 'Нет аккаунта? Зарегистрироваться'}
        </button>

        <button className="modal-close" onClick={onClose}>
          Позже
        </button>
      </div>
    </div>
  );
}
