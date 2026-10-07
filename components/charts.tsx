import { Series } from '@/lib/types';

const W = 640;
const H = 250;
const M = { top: 12, right: 12, bottom: 28, left: 40 };

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

function Legend({ items }: { items: { name: string; color: string }[] }) {
  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
      {items.map((i) => (
        <span key={i.name} className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: i.color }} />
          {i.name}
        </span>
      ))}
    </div>
  );
}

function Axes({ labels, max, format }: { labels: string[]; max: number; format: (n: number) => string }) {
  const iw = W - M.left - M.right;
  const ih = H - M.top - M.bottom;
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const step = Math.ceil(labels.length / 12);
  return (
    <>
      {ticks.map((t) => {
        const y = M.top + ih - t * ih;
        return (
          <g key={t}>
            <line x1={M.left} x2={W - M.right} y1={y} y2={y} stroke="#e2e8f0" />
            <text x={M.left - 6} y={y + 4} textAnchor="end" fontSize="11" fill="#64748b">
              {format(max * t)}
            </text>
          </g>
        );
      })}
      {labels.map((l, i) =>
        i % step === 0 ? (
          <text key={l + i} x={M.left + (iw / labels.length) * (i + 0.5)} y={H - 8} textAnchor="middle" fontSize="11" fill="#64748b">
            {l}
          </text>
        ) : null,
      )}
    </>
  );
}

interface LineProps {
  labels: string[];
  series: Series[];
  yMax?: number;
  format?: (n: number) => string;
  empty?: string;
}

export function LineChart({ labels, series, yMax, format = (n) => String(Math.round(n)), empty = 'No data' }: LineProps) {
  const all = series.flatMap((s) => s.values).filter((v): v is number => v != null);
  if (all.length === 0) return <p className="py-10 text-center text-sm text-slate-500">{empty}</p>;
  const max = yMax ?? niceMax(Math.max(...all));
  const iw = W - M.left - M.right;
  const ih = H - M.top - M.bottom;
  const x = (i: number) => M.left + (iw / labels.length) * (i + 0.5);
  const y = (v: number) => M.top + ih - (Math.min(v, max) / max) * ih;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img">
        <Axes labels={labels} max={max} format={format} />
        {series.map((s) => {
          const segments: string[] = [];
          let cur = '';
          s.values.forEach((v, i) => {
            if (v == null) {
              if (cur) segments.push(cur);
              cur = '';
            } else cur += `${cur ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
          });
          if (cur) segments.push(cur);
          return (
            <g key={s.name}>
              {segments.map((d, i) => (
                <path key={i} d={d} fill="none" stroke={s.color} strokeWidth="2" />
              ))}
              {s.values.map((v, i) =>
                v == null ? null : (
                  <circle key={i} cx={x(i)} cy={y(v)} r="3" fill={s.color}>
                    <title>{`${s.name} · ${labels[i]}: ${format(v)}`}</title>
                  </circle>
                ),
              )}
            </g>
          );
        })}
      </svg>
      <Legend items={series} />
    </div>
  );
}

interface BarProps {
  labels: string[];
  series: { name: string; color: string; values: number[] }[];
  percent?: boolean;
  empty?: string;
}

export function StackedBarChart({ labels, series, percent = false, empty = 'No data' }: BarProps) {
  const totals = labels.map((_, i) => series.reduce((a, s) => a + (s.values[i] ?? 0), 0));
  if (totals.every((t) => t === 0)) return <p className="py-10 text-center text-sm text-slate-500">{empty}</p>;
  const max = percent ? 100 : niceMax(Math.max(...totals));
  const iw = W - M.left - M.right;
  const ih = H - M.top - M.bottom;
  const bw = (iw / labels.length) * 0.7;
  const format = percent ? (n: number) => `${Math.round(n)}%` : (n: number) => String(Math.round(n));

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img">
        <Axes labels={labels} max={max} format={format} />
        {labels.map((l, i) => {
          let acc = 0;
          const cx = M.left + (iw / labels.length) * (i + 0.5);
          return (
            <g key={l + i}>
              {series.map((s) => {
                const raw = s.values[i] ?? 0;
                const v = percent ? (totals[i] ? (raw / totals[i]) * 100 : 0) : raw;
                const h = (v / max) * ih;
                const yTop = M.top + ih - ((acc + v) / max) * ih;
                acc += v;
                return h > 0 ? (
                  <rect key={s.name} x={cx - bw / 2} y={yTop} width={bw} height={h} fill={s.color}>
                    <title>{`${s.name} · ${l}: ${raw}${percent ? ` (${v.toFixed(0)}%)` : ''}`}</title>
                  </rect>
                ) : null;
              })}
            </g>
          );
        })}
      </svg>
      <Legend items={series} />
    </div>
  );
}
