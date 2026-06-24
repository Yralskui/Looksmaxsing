import { useState, useEffect } from 'react';
import type { TrainingProgram } from '../types';
import { purchaseTraining, mockPay, getTrainingProgram } from '../api';

export default function TrainingProgramModal({
  analysisId,
  alreadyPurchased,
  onClose,
  onPurchased,
}: {
  analysisId: string;
  alreadyPurchased: boolean;
  onClose: () => void;
  onPurchased: () => void;
}) {
  const [program, setProgram] = useState<TrainingProgram | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadProgram() {
    setLoading(true);
    setError(null);
    try {
      const data = await getTrainingProgram(analysisId);
      setProgram(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }

  async function handlePurchase() {
    setLoading(true);
    setError(null);
    try {
      const payment = await purchaseTraining(analysisId);
      if (payment.mock || !payment.url) {
        await mockPay(payment.invId);
      } else {
        window.location.href = payment.url;
        return;
      }
      onPurchased();
      await loadProgram();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка оплаты');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (alreadyPurchased && !program && !loading) loadProgram();
  }, [alreadyPurchased]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        {!program ? (
          <>
            <h2>Программа тренировок</h2>
            <p className="modal-sub">
              6-недельный план: скулы, шея, челюсть, подбородок, кожа, стиль — персонально под твой анализ
            </p>

            <div className="training-preview">
              <div className="training-preview-item">Неделя 1 — Сон, питание, кожа</div>
              <div className="training-preview-item">Неделя 2 — Челюсть и скулы (mewing, mastic)</div>
              <div className="training-preview-item">Неделя 3 — Шея, осанка, подбородок</div>
              <div className="training-preview-item">Неделя 4 — Глаза, брови, upper third</div>
              <div className="training-preview-item">Неделя 5-6 — Стиль + контроль прогресса</div>
            </div>

            {error && <p className="modal-error">{error}</p>}

            <button className="modal-pay-btn" onClick={handlePurchase} disabled={loading}>
              {loading ? 'Обработка...' : 'Купить программу · 200₽'}
            </button>
            <button className="modal-close" onClick={onClose}>Отмена</button>
          </>
        ) : (
          <>
            <h2>{program.title}</h2>
            <p className="modal-sub">{program.subtitle}</p>

            <div className="training-weeks">
              {program.weeks.map((w) => (
                <div key={w.week} className="training-week">
                  <h4>Неделя {w.week}: {w.title}</h4>
                  <ul className="tips-list">
                    {w.tasks.map((task, i) => (
                      <li key={i}>{task}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <p className="modal-note">{program.disclaimer}</p>
            <button className="modal-close" onClick={onClose}>Закрыть</button>
          </>
        )}
      </div>
    </div>
  );
}
