import { DateTime } from 'luxon';
import { ROLLING_WEEKS } from './constants';
import { prepareTickets } from './prepare';
import { RawRow, Settings } from './types';
import { rollingWeeks, weekKey } from './utils';

export const isInternal = (label: string): boolean => /internal/i.test(label);

/** Tickets created per ISO week (raw create date), split internal vs. external by the ticket label. */
export function analyzeCreated(rows: RawRow[], s: Settings, now: DateTime, country = 'All') {
  const { tickets: all, skip } = prepareTickets(rows, s, 'created');
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

  const weekly = weeks.map((w) => {
    const inWeek = list.filter((t) => weekKey(t.created) === w.key);
    const internal = inWeek.filter((t) => isInternal(t.label)).length;
    return { ...w, internal, external: inWeek.length - internal, total: inWeek.length };
  });
  const internal = weekly.reduce((a, w) => a + w.internal, 0);
  const total = weekly.reduce((a, w) => a + w.total, 0);

  return {
    weeks,
    weekly,
    totals: { total, internal, external: total - internal },
    countries: [...new Set(all.map((t) => t.country))].sort(),
    detail: list.map((t) => ({
      id: t.id,
      ticket: t.name,
      country: t.country,
      created: t.created.toFormat('yyyy-MM-dd HH:mm'),
      week: weekKey(t.created),
      label: t.label,
      origin: isInternal(t.label) ? 'Internal' : 'External',
    })),
    skipped: skip.groups(),
    warnings: [] as string[],
  };
}
