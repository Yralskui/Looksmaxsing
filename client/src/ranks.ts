/** Пирамида looksmaxxing-рангов (сверху вниз — от лучшего к худшему) */
export const RANK_LADDER = [
  { rank: 'TRUE ADAM', label: 'Абсолютный пик', color: '#a5f3fc', min: 9.2 },
  { rank: 'CHAD', label: 'Высший эшелон', color: '#ffd700', min: 8.5 },
  { rank: 'HTN', label: 'Высокий потенциал', color: '#22c55e', min: 7.5 },
  { rank: 'MTN', label: 'Средний уровень', color: '#3b82f6', min: 6.0 },
  { rank: 'LTN', label: 'Ниже среднего', color: '#f97316', min: 4.5 },
  { rank: 'SUB5', label: 'Sub-5', color: '#ef4444', min: 3.0 },
  { rank: 'SUB3', label: 'Sub-3', color: '#991b1b', min: 0 },
] as const;

export const RANK_COLORS: Record<string, string> = Object.fromEntries(
  RANK_LADDER.map((r) => [r.rank, r.color])
);

export function rankColor(rank: string): string {
  return RANK_COLORS[rank] ?? '#888';
}
