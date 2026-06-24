import { useState, useEffect, useCallback } from 'react';
import './App.css';
import type { AnalysisResult, BattleResult, Package } from './types';
import { initUser, analyze, battle, getPackages, clearToken, getUser, type SessionUser } from './api';
import AuthModal from './components/AuthModal';
import {
  initFaceLandmarker,
  detectLandmarks,
  loadImageFromFile,
  imageToHash,
} from './faceAnalysis';
import ResultsPanel from './components/ResultsPanel';
import BattleResults from './components/BattleResults';
import PaymentModal from './components/PaymentModal';
import HistoryPanel from './components/HistoryPanel';
import OfferPage from './components/OfferPage';
import SiteFooter from './components/SiteFooter';
import { runAnalysisWithDelay, runBattleWithDelay } from './utils/analysisDelay';

type Tab = 'single' | 'battle';
type View = 'main' | 'history';

function UploadZone({
  label,
  preview,
  onFile,
}: {
  label: string;
  preview: string | null;
  onFile: (file: File) => void;
}) {
  const [drag, setDrag] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDrag(false);
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) onFile(file);
  }

  return (
    <div
      className={`upload-zone ${preview ? 'has-image' : ''} ${drag ? 'dragover' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
    >
      {preview ? (
        <img src={preview} alt={label} />
      ) : (
        <>
          <div className="upload-icon">📸</div>
          <h3>{label}</h3>
          <p>Перетащи или нажми для загрузки</p>
        </>
      )}
      <input
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
        }}
      />
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<View>('main');
  const [showOffer, setShowOffer] = useState(false);
  const [tab, setTab] = useState<Tab>('single');
  const [moggs, setMoggs] = useState(0);
  const [session, setSession] = useState<SessionUser | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [packages, setPackages] = useState<Package[]>([]);
  const [showPayment, setShowPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [preview1, setPreview1] = useState<string | null>(null);
  const [preview2, setPreview2] = useState<string | null>(null);
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadStep, setLoadStep] = useState('');
  const [loadSteps, setLoadSteps] = useState<string[]>([]);
  const [modelReady, setModelReady] = useState(false);

  const [singleResult, setSingleResult] = useState<AnalysisResult | null>(null);
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null);

  useEffect(() => {
    initUser()
      .then((u) => {
        setMoggs(u.moggs);
        setSession(u);
      })
      .catch(console.error);
    getPackages().then(setPackages).catch(console.error);

    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      getUser()
        .then((u) => {
          setMoggs(u.moggs);
          setSession(u);
        })
        .catch(console.error);
      params.delete('payment');
      const qs = params.toString();
      window.history.replaceState({}, '', qs ? `?${qs}` : window.location.pathname);
    }

    initFaceLandmarker((msg) => setLoadStep(msg))
      .then(() => setModelReady(true))
      .catch((e) => setError(e.message));
  }, []);

  const showError = useCallback((msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 4000);
  }, []);

  function handleFile1(file: File) {
    setFile1(file);
    setPreview1(URL.createObjectURL(file));
    setSingleResult(null);
  }

  function handleFile2(file: File) {
    setFile2(file);
    setPreview2(URL.createObjectURL(file));
    setBattleResult(null);
  }

  async function runSingleAnalysis() {
    if (!file1) return showError('Загрузи фото');
    if (!modelReady) return showError('Нейросеть ещё загружается...');
    if (moggs < 1) return setShowPayment(true);

    setLoading(true);
    setLoadSteps([]);
    try {
      const img = await loadImageFromFile(file1);
      const faces = await detectLandmarks(img);
      const hash = imageToHash(img);
      let result!: AnalysisResult;

      await runAnalysisWithDelay(
        (steps) => setLoadSteps(steps),
        async () => {
          result = (await analyze(faces[0], hash)) as AnalysisResult;
        }
      );

      setSingleResult(result);
      if (result.moggs !== undefined) setMoggs(result.moggs);
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Ошибка анализа');
    } finally {
      setLoading(false);
    }
  }

  async function runBattle() {
    if (!file1 || !file2) return showError('Загрузи оба фото');
    if (!modelReady) return showError('Нейросеть ещё загружается...');
    if (moggs < 2) return setShowPayment(true);

    setLoading(true);
    setLoadSteps([]);
    try {
      const img1 = await loadImageFromFile(file1);
      const img2 = await loadImageFromFile(file2);
      const faces1 = await detectLandmarks(img1);
      const faces2 = await detectLandmarks(img2);
      let result!: BattleResult;

      await runBattleWithDelay(
        (steps) => setLoadSteps(steps),
        async () => {
          result = (await battle(
            faces1[0],
            faces2[0],
            imageToHash(img1),
            imageToHash(img2)
          )) as BattleResult;
        }
      );

      setBattleResult(result);
      if (result.moggs !== undefined) setMoggs(result.moggs);
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Ошибка батла');
    } finally {
      setLoading(false);
    }
  }

  function handleAuthSuccess(user: SessionUser) {
    setSession(user);
    setMoggs(user.moggs);
  }

  async function handleLogout() {
    clearToken();
    const user = await initUser();
    setSession(user);
    setMoggs(user.moggs);
    setSingleResult(null);
    setBattleResult(null);
  }

  function reset() {
    setSingleResult(null);
    setBattleResult(null);
    setPreview1(null);
    setPreview2(null);
    setFile1(null);
    setFile2(null);
  }

  const hasResult = tab === 'single' ? !!singleResult : !!battleResult;

  if (view === 'history') {
    return (
      <div className="app">
        <HistoryPanel onBack={() => setView('main')} />
        <SiteFooter onOfferClick={() => setShowOffer(true)} />
        {showOffer && <OfferPage onClose={() => setShowOffer(false)} />}
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <h1>
          Mogg <span>Анализ</span>
        </h1>
        <p>
          AI-анализ внешности — симметрия, пропорции, потенциал.
          Детальный вердикт за секунды.
        </p>
      </header>

      <div className="top-bar">
        <div className="moggs-balance">
          <span>💎</span>
          <span className="count">{moggs}</span>
          <span>mogгов</span>
        </div>
        <div className="top-bar-actions">
          {session?.hasAccount ? (
            <div className="user-chip">
              <span className="user-email" title={session.email ?? ''}>
                {session.email}
              </span>
              <button className="auth-btn subtle" onClick={handleLogout}>
                Выйти
              </button>
            </div>
          ) : (
            <button className="auth-btn" onClick={() => setShowAuth(true)}>
              Войти
            </button>
          )}
          <button className="history-btn" onClick={() => setView('history')}>
            История
          </button>
          <button className="buy-btn" onClick={() => setShowPayment(true)}>
            + Купить
          </button>
        </div>
      </div>

      {!modelReady && !hasResult && (
        <div style={{ textAlign: 'center', padding: '12px', color: 'var(--text-muted)', fontSize: 13 }}>
          {loadStep || 'Загрузка нейросети...'}
        </div>
      )}

      {!hasResult && (
        <>
          <div className="tabs">
            <button
              className={`tab ${tab === 'single' ? 'active' : ''}`}
              onClick={() => setTab('single')}
            >
              Могги
            </button>
            <button
              className={`tab ${tab === 'battle' ? 'active' : ''}`}
              onClick={() => setTab('battle')}
            >
              Анализ Батл · 2 mogга
            </button>
          </div>

          {tab === 'single' ? (
            <>
              <UploadZone label="Загрузи селфи" preview={preview1} onFile={handleFile1} />
              <button
                className="analyze-btn"
                onClick={runSingleAnalysis}
                disabled={!file1 || loading || !modelReady}
              >
                Анализировать · 1 mogг
              </button>
            </>
          ) : (
            <>
              <div className="battle-uploads">
                <UploadZone label="Могг #1" preview={preview1} onFile={handleFile1} />
                <UploadZone label="Могг #2" preview={preview2} onFile={handleFile2} />
              </div>
              <div className="battle-vs">⚔️ VS ⚔️</div>
              <button
                className="analyze-btn"
                onClick={runBattle}
                disabled={!file1 || !file2 || loading || !modelReady}
              >
                Запустить батл · 2 mogга
              </button>
            </>
          )}
        </>
      )}

      {singleResult && tab === 'single' && (
        <ResultsPanel result={singleResult} photoUrl={preview1} onReset={reset} />
      )}

      {battleResult && tab === 'battle' && (
        <BattleResults result={battleResult} onReset={reset} />
      )}

      {loading && (
        <div className="loading-overlay">
          <div className="loader-ring" />
          <div className="loading-text">AI-анализ в процессе...</div>
          <div className="loading-steps">
            {loadSteps.map((s, i) => (
              <div key={i} className={i < loadSteps.length - 1 ? 'done' : ''}>
                {i < loadSteps.length - 1 ? '✓' : '○'} {s}
              </div>
            ))}
          </div>
        </div>
      )}

      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onSuccess={handleAuthSuccess}
        />
      )}

      {showPayment && (
        <PaymentModal
          packages={packages}
          onClose={() => setShowPayment(false)}
          onSuccess={(m) => { setMoggs(m); setShowPayment(false); }}
        />
      )}

      {error && <div className="error-toast">{error}</div>}

      <SiteFooter onOfferClick={() => setShowOffer(true)} />

      {showOffer && <OfferPage onClose={() => setShowOffer(false)} />}
    </div>
  );
}
