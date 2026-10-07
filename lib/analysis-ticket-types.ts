import { DateTime } from 'luxon';
import { ROLLING_WEEKS } from './constants';
import { prepareTickets } from './prepare';
import { RawRow, Settings } from './types';
import { pct, rollingWeeks, weekKey } from './utils';

const OTHER = 'Other';

function topTypes(counts: Map<string, number>, n: number): string[] {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([k]) => k);
}

/** Ticket type mix: weekly trend (top 5 + Other) and rolling 12-week mix (top 8 + Other). */
export function analyzeTicketTypes(rows: RawRow[], s: Settings, now: DateTime, country = 'All', typeFilter = 'All') {
  const { tickets: all, skip } = prepareTickets(rows, s, 'types');
  const nowSrc = now.setZone(s.sourceTimezone);
  const weeks = rollingWeeks(nowSrc, ROLLING_WEEKS);
  const inWindow = new Set(weeks.map((w) => w.key));
  const currentKey = weekKey(nowSrc);

  const usable = all.filter((t) => {
    if (weekKey(t.created) === currentKey) {
      skip.add('it belongs to the current ISO week');
      return false;
    }
    return true;
  });
  const list = usable.filter((t) => (country === 'All' || t.country === country) && inWindow.has(weekKey(t.created)));

  const counts = new Map<string, number>();
  list.forEach((t) => counts.set(t.type, (counts.get(t.type) ?? 0) + 1));
  const total = list.length;

  const trendTypes = topTypes(counts, 5);
  const mixTypes = topTypes(counts, 8);
  const bucket = (type: string, keep: string[]) => (keep.includes(type) ? type : OTHER);

  const trendNames = [...trendTypes, ...(counts.size > trendTypes.length ? [OTHER] : [])];
  const weekly = weeks.map((w) => {
    const inWeek = list.filter((t) => weekKey(t.created) === w.key);
    const byType: Record<string, number> = Object.fromEntries(trendNames.map((n) => [n, 0]));
    inWeek.forEach((t) => (byType[bucket(t.type, trendTypes)] += 1));
    return { ...w, total: inWeek.length, byType };
  });

  const mixNames = [...mixTypes, ...(counts.size > mixTypes.length ? [OTHER] : [])];
  const mixCounts = new Map<string, number>(mixNames.map((n) => [n, 0]));
  list.forEach((t) => mixCounts.set(bucket(t.type, mixTypes), (mixCounts.get(bucket(t.type, mixTypes)) ?? 0) + 1));
  const mix = mixNames.map((name) => ({ name, count: mixCounts.get(name) ?? 0, share: pct(mixCounts.get(name) ?? 0, total) }));

  const top3 = [...counts.values()].sort((a, b) => b - a).slice(0, 3).reduce((a, b) => a + b, 0);
  const otherCount = weekly.reduce((a, w) => a + (w.byType[OTHER] ?? 0), 0);

  return {
    weeks,
    weekly,
    trendNames,
    mix,
    kpis: {
      total,
      topType: trendTypes[0] ?? '–',
      top3Concentration: pct(top3, total),
      activeTypes: counts.size,
      otherShare: pct(otherCount, total),
    },
    types: [...new Set(usable.map((t) => t.type))].sort(),
    countries: [...new Set(all.map((t) => t.country))].sort(),
    detail: list
      .filter((t) => typeFilter === 'All' || t.type === typeFilter)
      .map((t) => ({
        id: t.id,
        ticket: t.name,
        country: t.country,
        created: t.created.toFormat('yyyy-MM-dd HH:mm'),
        week: weekKey(t.created),
        ticket_type: t.type,
      })),
    weeklyExport: weekly.map((w) => ({ week: w.key, total: w.total, ...w.byType })),
    skipped: skip.groups(),
    warnings: [] as string[],
  };
}
