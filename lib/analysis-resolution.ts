import { DateTime } from 'luxon';
import { ROLLING_WEEKS } from './constants';
import { prepareTickets, Ticket } from './prepare';
import { RawRow, Settings } from './types';
import { pct, percentile, rollingWeeks, round, weekKey } from './utils';

export interface ResolutionKpis {
  closed: number;
  medianHours: number | null;
  p90Hours: number | null;
  within24Pct: number | null;
  within48Pct: number | null;
  productPct: number | null;
  salesPct: number | null;
}

function kpis(list: Ticket[]): ResolutionKpis {
  const hours = list.map((t) => (t.closeMinutes ?? 0) / 60).sort((a, b) => a - b);
  const n = list.length;
  return {
    closed: n,
    medianHours: percentile(hours, 50),
    p90Hours: percentile(hours, 90),
    within24Pct: pct(hours.filter((h) => h <= 24).length, n),
    within48Pct: pct(hours.filter((h) => h <= 48).length, n),
    productPct: pct(list.filter((t) => t.product).length, n),
    salesPct: pct(list.filter((t) => t.sales).length, n),
  };
}

/**
 * Resolution time KPIs. Uses the raw reporting data (no timezone
 * conversion). Closed tickets are grouped by the ISO week of their close
 * date; the current week is excluded. Open tickets are the current state.
 */
export function analyzeResolution(rows: RawRow[], s: Settings, now: DateTime, country = 'All') {
  const { tickets: all, skip } = prepareTickets(rows, s, 'resolution');
  const nowSrc = now.setZone(s.sourceTimezone);
  const weeks = rollingWeeks(nowSrc, ROLLING_WEEKS);
  const inWindow = new Set(weeks.map((w) => w.key));
  const currentKey = weekKey(nowSrc);

  const closedAll: Ticket[] = [];
  for (const t of all) {
    if (!t.isClosed) continue;
    if (!t.closed || t.closeMinutes == null) {
      skip.add('it is closed but has no close date or time to close');
      continue;
    }
    if (weekKey(t.closed) === currentKey) {
      skip.add('it was closed in the current ISO week');
      continue;
    }
    closedAll.push(t);
  }

  const match = (t: Ticket) => country === 'All' || t.country === country;
  const closed = closedAll.filter(match);
  const open = all.filter((t) => !t.isClosed && match(t));
  const rolling = closed.filter((t) => t.closed && inWindow.has(weekKey(t.closed)));
  const ytd = closed.filter((t) => t.closed && t.closed.year === nowSrc.year);

  const weekly = weeks.map((w) => {
    const list = rolling.filter((t) => t.closed && weekKey(t.closed) === w.key);
    const hours = list.map((t) => (t.closeMinutes ?? 0) / 60).sort((a, b) => a - b);
    return {
      ...w,
      closed: list.length,
      medianHours: percentile(hours, 50),
      p90Hours: percentile(hours, 90),
      within24: hours.filter((h) => h <= 24).length,
      within24to48: hours.filter((h) => h > 24 && h <= 48).length,
      over48: hours.filter((h) => h > 48).length,
    };
  });

  const openSplit = {
    total: open.length,
    product: open.filter((t) => t.product).length,
    sales: open.filter((t) => !t.product && t.sales).length,
    support: open.filter((t) => !t.product && !t.sales).length,
  };

  return {
    weeks,
    weekly,
    rolling: kpis(rolling),
    ytd: kpis(ytd),
    open: openSplit,
    countries: [...new Set(all.map((t) => t.country))].sort(),
    detail: rolling.map((t) => ({
      id: t.id,
      ticket: t.name,
      country: t.country,
      created: t.created.toFormat('yyyy-MM-dd HH:mm'),
      closed: t.closed?.toFormat('yyyy-MM-dd HH:mm') ?? '',
      hours_to_close: round((t.closeMinutes ?? 0) / 60),
      product_escalation: t.product,
      sales_escalation: t.sales,
    })),
    skipped: skip.groups(),
    warnings: [] as string[],
  };
}
