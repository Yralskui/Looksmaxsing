import type { BattleResult } from '../types';

export default function BattleResults({
  result,
  onReset,
}: {
  result: BattleResult;
  onReset: () => void;
}) {
  return (
    <div className="results">
      <div className="battle-header">
        <div className={`battle-face ${result.winner === 1 ? 'winner' : ''}`}>
          <div className="label">Могг #1</div>
          <div className="score" style={{ color: result.result1.rankColor }}>
            {result.result1.score}
          </div>
          <div className="rank" style={{ color: result.result1.rankColor }}>
            {result.result1.rank}
          </div>
        </div>
        <div className="battle-center">VS</div>
        <div className={`battle-face ${result.winner === 2 ? 'winner' : ''}`}>
          <div className="label">Могг #2</div>
          <div className="score" style={{ color: result.result2.rankColor }}>
            {result.result2.score}
          </div>
          <div className="rank" style={{ color: result.result2.rankColor }}>
            {result.result2.rank}
          </div>
        </div>
      </div>

      <div className="verdict-card">
        <h3>Результат батла</h3>
        <p>{result.verdict}</p>
      </div>

      <div className="verdict-card">
        <h3>Сравнение по параметрам</h3>
        {result.comparisons.map((c) => (
          <div key={c.name} className="comparison-row">
            <span className={`score ${c.winner === 1 ? 'win' : ''}`}>{c.score1}</span>
            <span className="name">{c.name}</span>
            <span className={`score ${c.winner === 2 ? 'win' : ''}`}>{c.score2}</span>
          </div>
        ))}
      </div>

      <button className="reset-btn" onClick={onReset}>
        Новый батл
      </button>
    </div>
  );
}
