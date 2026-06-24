import type { HarmonyPoint } from '../types';

export default function RadarChart({ data }: { data: HarmonyPoint[] }) {
  const size = 180;
  const center = size / 2;
  const maxR = 70;
  const n = data.length;
  const angleStep = (2 * Math.PI) / n;

  function point(i: number, value: number) {
    const angle = angleStep * i - Math.PI / 2;
    const r = (value / 10) * maxR;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  }

  const polygon = data
    .map((d, i) => {
      const p = point(i, d.value);
      return `${p.x},${p.y}`;
    })
    .join(' ');

  const gridLevels = [2, 4, 6, 8, 10];

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="radar-chart">
      {gridLevels.map((level) => (
        <polygon
          key={level}
          points={data
            .map((_, i) => {
              const p = point(i, level);
              return `${p.x},${p.y}`;
            })
            .join(' ')}
          fill="none"
          stroke="rgba(168,85,247,0.15)"
          strokeWidth="1"
        />
      ))}
      {data.map((_, i) => {
        const p = point(i, 10);
        return (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={p.x}
            y2={p.y}
            stroke="rgba(168,85,247,0.12)"
            strokeWidth="1"
          />
        );
      })}
      <polygon
        points={polygon}
        fill="rgba(168,85,247,0.25)"
        stroke="#a855f7"
        strokeWidth="2"
      />
      {data.map((d, i) => {
        const p = point(i, d.value);
        const labelP = point(i, 11.5);
        return (
          <g key={d.label}>
            <circle cx={p.x} cy={p.y} r="3" fill="#a855f7" />
            <text
              x={labelP.x}
              y={labelP.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="radar-label"
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
