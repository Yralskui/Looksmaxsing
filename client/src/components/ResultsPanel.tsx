import { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import type { AnalysisResult, AnalysisReport } from '../types';
import TrainingProgramModal from './TrainingProgramModal';
import RadarChart from './RadarChart';
import StarRating from './StarRating';
import { RANK_LADDER, rankColor as getRankColor } from '../ranks';
import './ReportDashboard.css';

const RANK_COLORS = Object.fromEntries(RANK_LADDER.map((r) => [r.rank, r.color]));

function buildFallbackReport(result: AnalysisResult): AnalysisReport {
  const traits = result.metrics.map((m) => ({ key: m.key, name: m.name, score: m.score }));
  const rank = result.rank;
  return {
    traitScores: traits,
    proportions: [{ name: 'Длина лица к ширине', value: result.phiRatio, label: 'Хорошо', color: '#3b82f6' }],
    character: {
      text: result.detailedProfile?.split('\n\n')[0] || result.verdict,
      traits: [
        { name: 'Привлекательность', score: result.score },
        { name: 'Уверенность', score: Math.round(result.score * 0.95 * 10) / 10 },
      ],
    },
    harmonyChart: result.metrics.slice(0, 8).map((m) => ({ label: m.name.split(' ')[0], value: m.score })),
    agePotential: { score: result.metrics.find((m) => m.key === 'aging')?.score ?? 7, text: 'Потенциал старения на основе анализа.' },
    strongSides: result.advice.strengths.map((s) => `${s.name} (${s.score.toFixed(1)})`),
    recommendations: result.advice.tips,
    summary: result.verdict,
    scoreLabel: rank,
    stars: Math.round(result.score / 2 * 10) / 10,
  };
}

export default function ResultsPanel({
  result,
  photoUrl,
  onReset,
}: {
  result: AnalysisResult;
  photoUrl: string | null;
  onReset: () => void;
}) {
  const [showTraining, setShowTraining] = useState(false);
  const [trainingPurchased, setTrainingPurchased] = useState(!!result.trainingPurchased);
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const report = result.report ?? buildFallbackReport(result);
  const rankColor = RANK_COLORS[report.scoreLabel] ?? RANK_COLORS[result.rank] ?? getRankColor(result.rank);
  const activeRank = report.scoreLabel || result.rank;

  async function downloadReport() {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: '#0b0b0e',
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement('a');
      link.download = `mogg-analysis-${result.score}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {
      alert('Не удалось сохранить. Попробуй ещё раз.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="results-dashboard-wrap">
      <div className="results-actions-top">
        <button className="export-btn" onClick={downloadReport} disabled={exporting}>
          {exporting ? 'Сохранение...' : '⬇ Скачать результат'}
        </button>
      </div>

      <div className="report-card" ref={reportRef}>
        {/* HEADER */}
        <div className="report-header">
          <div>
            <h2 className="report-title">АНАЛИЗ ЛИЦА</h2>
            <p className="report-subtitle">ДЕТАЛЬНАЯ ОЦЕНКА ЧЕРТ</p>
          </div>
          <div className="report-brand">
            <span className="brand-logo">◆</span>
            <span>MOGG ANALYZER</span>
          </div>
        </div>

        {/* MAIN GRID */}
        <div className="report-grid">
          {/* LEFT — фото + общий балл */}
          <div className="report-col report-col-left">
            {photoUrl && (
              <div className="face-scan-photo">
                <img src={photoUrl} alt="Фото" className="face-scan-img" />
              </div>
            )}
            <div className="overall-score-block" style={{ '--rank-accent': rankColor } as React.CSSProperties}>
              <div className="overall-label">ОБЩАЯ ОЦЕНКА</div>
              <div className="overall-value" style={{ color: rankColor }}>
                {result.score.toFixed(1)}<span>/10</span>
              </div>
              <div className="rank-badge" style={{ background: `${rankColor}22`, color: rankColor, border: `1px solid ${rankColor}55` }}>
                {report.scoreLabel}
              </div>
              <div className="rank-ladder" aria-label="Шкала рангов">
                {RANK_LADDER.map((tier) => {
                  const active = tier.rank === activeRank;
                  return (
                    <div
                      key={tier.rank}
                      className={`rank-ladder-row${active ? ' active' : ''}`}
                      style={active ? { color: tier.color, borderColor: `${tier.color}66` } : undefined}
                      title={`${tier.label} — от ${tier.min}/10`}
                    >
                      <span className="rank-ladder-name">{tier.rank}</span>
                      {active && <span className="rank-ladder-you">ты здесь</span>}
                    </div>
                  );
                })}
              </div>
              <StarRating value={report.stars} color={rankColor} />
              <p className="overall-summary">{report.summary}</p>
            </div>
          </div>

          {/* MIDDLE — черты */}
          <div className="report-col report-col-mid">
            <div className="report-section">
              <h3>ОЦЕНКИ ПО ЧЕРТАМ <span>1–10</span></h3>
              <div className="trait-list">
                {report.traitScores.map((t) => (
                  <div key={t.key} className="trait-row">
                    <span className="trait-name">{t.name}</span>
                    <div className="trait-bar-wrap">
                      <div className="trait-bar" style={{ width: `${Math.min(100, t.score * 10)}%` }} />
                    </div>
                    <span className="trait-score">{t.score.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT — пропорции + характер + радар */}
          <div className="report-col report-col-right">
            <div className="report-section">
              <h3>ПРОПОРЦИИ ЛИЦА</h3>
              <div className="proportion-list">
                {report.proportions.map((p) => (
                  <div key={p.name} className="proportion-row">
                    <div className="proportion-info">
                      <span className="proportion-name">{p.name}</span>
                      <span className="proportion-value">{p.value.toFixed(2)}</span>
                    </div>
                    <span className="proportion-tag" style={{ color: p.color, borderColor: p.color }}>
                      {p.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="report-section">
              <h3>ХАРАКТЕР ПО ВНЕШНОСТИ</h3>
              <p className="character-text">{report.character.text}</p>
              <div className="character-traits">
                {report.character.traits.map((t) => (
                  <div key={t.name} className="char-trait-row">
                    <span>{t.name}</span>
                    <div className="trait-bar-wrap">
                      <div className="trait-bar" style={{ width: `${Math.min(100, t.score * 10)}%` }} />
                    </div>
                    <span className="trait-score">{t.score.toFixed(1)}/10</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="report-section">
              <h3>ГАРМОНИЯ ЛИЦА</h3>
              <RadarChart data={report.harmonyChart} />
            </div>
          </div>
        </div>

        {/* BOTTOM ROW */}
        <div className="report-bottom">
          <div className="report-section bottom-card">
            <h3>ВОЗРАСТНОЙ ПОТЕНЦИАЛ</h3>
            <div className="age-ring-wrap">
              <svg viewBox="0 0 100 100" className="age-ring">
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(168,85,247,0.15)" strokeWidth="6" />
                <circle
                  cx="50" cy="50" r="42"
                  fill="none"
                  stroke="#a855f7"
                  strokeWidth="6"
                  strokeDasharray={`${report.agePotential.score * 26.4} 264`}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                />
                <text x="50" y="54" textAnchor="middle" className="age-ring-text">
                  {report.agePotential.score.toFixed(1)}
                </text>
              </svg>
            </div>
            <p className="age-text">{report.agePotential.text}</p>
          </div>

          <div className="report-section bottom-card">
            <h3>СИЛЬНЫЕ СТОРОНЫ</h3>
            <ul className="bullet-list check-list">
              {report.strongSides.map((s, i) => (
                <li key={i}><span className="bullet-icon">✓</span>{s}</li>
              ))}
            </ul>
          </div>

          <div className="report-section bottom-card">
            <h3>РЕКОМЕНДАЦИИ</h3>
            <ul className="bullet-list bolt-list">
              {report.recommendations.map((r, i) => (
                <li key={i}><span className="bullet-icon">⚡</span>{r}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* HAIRCUTS */}
        {report.haircuts && (
          <div className="report-section haircuts-section">
            <h3>
              ПОДХОДЯЩИЕ СТРИЖКИ
              <span className="haircuts-shape-tag">
                {report.haircuts.icon} {report.haircuts.label}
                {report.faceShapeConfidence ? ` · ${report.faceShapeConfidence}%` : ''}
              </span>
            </h3>
            <p className="haircuts-goal">Цель: {report.haircuts.goal}</p>
            <div className="haircuts-grid">
              {report.haircuts.cuts.map((cut) => (
                <div key={cut.name} className="haircut-card">
                  <div className="haircut-name">{cut.name}</div>
                  <div className="haircut-desc">{cut.desc}</div>
                </div>
              ))}
            </div>
            <div className="haircuts-avoid">
              <span className="avoid-icon">✕</span>
              {report.haircuts.avoid}
            </div>
          </div>
        )}

        <div className="report-footer">
          <span>
            {result.rank} · Phi {result.phiRatio} ·{' '}
            {report.faceShape ? report.faceShape.charAt(0).toUpperCase() + report.faceShape.slice(1) : '—'}
          </span>
          <span>MOGG ANALYZER</span>
        </div>
      </div>

      <button className="training-btn" onClick={() => setShowTraining(true)}>
        {trainingPurchased ? 'Открыть программу тренировок' : 'Купить программу тренировок · 200₽'}
      </button>

      <button className="reset-btn" onClick={onReset}>Новый анализ</button>

      {showTraining && result.analysisId && (
        <TrainingProgramModal
          analysisId={result.analysisId}
          alreadyPurchased={trainingPurchased}
          onClose={() => setShowTraining(false)}
          onPurchased={() => setTrainingPurchased(true)}
        />
      )}
    </div>
  );
}
