import { DateTime } from 'luxon';
import Papa from 'papaparse';
import { ROLLING_WEEKS } from './constants';
import { WeekInfo } from './types';

/** Linear-interpolation percentile (same as Excel's PERCENTILE.INC). `sorted` must be ascending. */
export function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  if (sorted.length === 1) return sorted[0];
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export interface Stats {
  count: number;
  avg: number | null;
  median: number | null;
  p90: number | null;
  min: number | null;
  max: number | null;
}

export function stats(values: number[]): Stats {
  const s = [...values].sort((a, b) => a - b);
  const n = s.length;
  return {
    count: n,
    avg: n ? s.reduce((a, b) => a + b, 0) / n : null,
    median: percentile(s, 50),
    p90: percentile(s, 90),
    min: n ? s[0] : null,
    max: n ? s[n - 1] : null,
  };
}

export const weekKey = (d: DateTime): string => `${d.weekYear}-W${String(d.weekNumber).padStart(2, '0')}`;

/** The `n` complete ISO weeks before the week containing `now`, oldest first. */
export function rollingWeeks(now: DateTime, n = ROLLING_WEEKS): WeekInfo[] {
  const start = now.startOf('week');
  const out: WeekInfo[] = [];
  for (let i = n; i >= 1; i--) {
    const d = start.minus({ weeks: i });
    out.push({ key: weekKey(d), label: d.toFormat('dd LLL') });
  }
  return out;
}

export const round = (n: number, digits = 1): number => {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
};

export function formatMinutes(m: number | null): string {
  if (m == null) return '–';
  if (m < 60) return `${Math.round(m)} min`;
  return `${(m / 60).toFixed(1)} h`;
}

export const formatHours = (h: number | null): string => (h == null ? '–' : `${h.toFixed(1)} h`);
export const formatPct = (p: number | null): string => (p == null ? '–' : `${p.toFixed(0)}%`);
export const pct = (part: number, total: number): number | null => (total ? (part / total) * 100 : null);

export function downloadCsv(filename: string, rows: object[]): void {
  const csv = Papa.unparse(rows as Record<string, unknown>[]);
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Collects reasons why rows were left out and groups them into readable sentences. */
export class SkipCounter {
  private map = new Map<string, number>();
  add(reason: string, n = 1): void {
    this.map.set(reason, (this.map.get(reason) ?? 0) + n);
  }
  total(): number {
    return [...this.map.values()].reduce((a, b) => a + b, 0);
  }
  groups(): string[] {
    return [...this.map.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([reason, n]) => `${n} ticket${n === 1 ? '' : 's'} skipped because ${reason}`);
  }
}
