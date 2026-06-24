import { useEffect, useState } from 'react';
import type { HistoryItem } from '../types';
import { getHistory } from '../api';
import { rankColor } from '../ranks';

function formatDate(iso: string) {
  const d = new Date(iso + 'Z');
  return d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function HistoryPanel({ onBack }: { onBack: () => void }) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHistory()
      .then(setHistory)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="history-empty">Загрузка истории...</div>;
  }

  if (history.length === 0) {
    return (
      <div className="history-panel">
        <h3>История анализов</h3>
        <div className="history-empty">
          Пока нет анализов. Сделай первый — и отслеживай прогресс здесь.
        </div>
        <button className="reset-btn" onClick={onBack}>Назад</button>
      </div>
    );
  }

  const scores = history
    .filter((h) => h.type === 'single')
    .map((h) => h.score)
    .reverse();

  const trend = scores.length >= 2
    ? scores[scores.length - 1] - scores[0]
    : 0;

  return (
    <div className="history-panel">
      <h3>История анализов</h3>

      {scores.length >= 2 && (
        <div className="history-trend">
          <span>Прогресс: </span>
          <span className={trend >= 0 ? 'trend-up' : 'trend-down'}>
            {trend >= 0 ? '+' : ''}{trend.toFixed(1)} за {scores.length} анализов
          </span>
        </div>
      )}

      <div className="history-chart">
        {history
          .filter((h) => h.type === 'single')
          .slice(0, 10)
          .reverse()
          .map((item) => (
            <div key={item.id} className="history-bar-wrap">
              <div
                className="history-bar"
                style={{
                  height: `${item.score * 10}%`,
                  background: rankColor(item.rank),
                }}
              />
              <span className="history-bar-label">{item.score}</span>
            </div>
          ))}
      </div>

      <div className="history-list">
        {history.map((item) => (
          <div key={item.id} className="history-item">
            <div className="history-item-left">
              <span className="history-type">
                {item.type === 'battle' ? '⚔️ Батл' : '📸 Анализ'}
              </span>
              <span className="history-date">{formatDate(item.createdAt)}</span>
            </div>
            <div className="history-item-right">
              <span className="history-score" style={{ color: rankColor(item.rank) }}>
                {item.score}/10
              </span>
              <span className="history-rank" style={{ color: rankColor(item.rank) }}>
                {item.rank}
              </span>
            </div>
          </div>
        ))}
      </div>

      <button className="reset-btn" onClick={onBack}>Назад</button>
    </div>
  );
}
