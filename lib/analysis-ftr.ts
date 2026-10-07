import { DateTime } from 'luxon';
import { DEFAULT_WORKING_HOURS, ROLLING_WEEKS } from './constants';
import { prepareTickets } from './prepare';
import { RawRow, Series, Settings, WorkingHours } from './types';
import { SERIES_COLORS } from './constants';
import { pct, round, rollingWeeks, stats, weekKey } from './utils';

/**
 * Minutes between `start` and `end` that fall inside working hours.
 * Weekends/non-working weekdays and listed holidays count as zero. Both
 * DateTimes must be in the zone the working hours refer to (DST-aware).
 */
export function businessMinutes(start: DateTime, end: DateTime, wh: WorkingHours, holidays: Set<string>): number {
  if (end <= start) return 0;
  const [sh, sm] = wh.start.split(':').map(Number);
  const [eh, em] = wh.end.split(':').map(Number);
  let total = 0;
  let day = start.startOf('day');
  const last = end.startOf('day');
  for (let guard = 0; day <= last && guard < 800; guard++) {
    if (wh.days.includes(day.weekday) && !holidays.has(day.toISODate() ?? '')) {
      const open = day.set({ hour: sh, minute: sm });
      const close = day.set({ hour: eh, minute: em });
      const from = start > open ? start : open;
      const to = end < close ? end : close;
      if (to > from) total += to.diff(from, 'minutes').minutes;
    }
    day = day.plus({ days: 1 }).startOf('day');
  }
  return total;
}

export interface FtrDetail {
  id: string;
  ticket: string;
  country: string;
  region: string;
  week: string;
  created_local: string;
  elapsed_minutes: number;
  business_minutes: number;
  within_sla: boolean;
}

export interface FtrAggRow {
  country: string;
  week: string;
  count: number;
  avg_minutes: number | null;
  median_minutes: number | null;
  p90_minutes: number | null;
  min_minutes: number | null;
  max_minutes: number | null;
  sla_attainment_pct: number | null;
}

export function analyzeFtr(rows: RawRow[], s: Settings, now: DateTime) {
  const { tickets, skip } = prepareTickets(rows, s, 'ftr');
  const weeks = rollingWeeks(now.setZone(s.sourceTimezone), ROLLING_WEEKS);
  const inWindow = new Set(weeks.map((w) => w.key));
  const unmapped = new Set<string>();
  const detail: FtrDetail[] = [];

  for (const t of tickets) {
    let tz = s.timezoneMap[t.country];
    if (!tz) {
      unmapped.add(t.country);
      tz = s.sourceTimezone;
    }
    const local = t.created.setZone(tz);
    const wk = weekKey(local);
    if (wk === weekKey(now.setZone(tz))) {
      skip.add('it belongs to the current ISO week');
      continue;
    }
    if (!inWindow.has(wk)) continue;

    const wh = s.workingHours[t.country] ?? DEFAULT_WORKING_HOURS;
    const holidays = new Set(s.holidays[t.country] ?? []);
    const elapsed = t.firstReplyMinutes ?? 0;
    const biz = businessMinutes(local, local.plus({ minutes: elapsed }), wh, holidays);
    detail.push({
      id: t.id,
      ticket: t.name,
      country: t.country,
      region: s.regionMap[t.country] ?? 'Other',
      week: wk,
      created_local: local.toFormat('yyyy-MM-dd HH:mm'),
      elapsed_minutes: round(elapsed),
      business_minutes: round(biz),
      within_sla: biz <= s.slaMinutes,
    });
  }

  const countries = [...new Set(detail.map((d) => d.country))].sort();
  const regions = [...new Set(detail.map((d) => d.region))].sort();

  const agg: FtrAggRow[] = [];
  for (const country of countries) {
    for (const w of weeks) {
      const list = detail.filter((d) => d.country === country && d.week === w.key);
      if (!list.length) continue;
      const st = stats(list.map((d) => d.business_minutes));
      agg.push({
        country,
        week: w.key,
        count: st.count,
        avg_minutes: st.avg == null ? null : round(st.avg),
        median_minutes: st.median == null ? null : round(st.median),
        p90_minutes: st.p90 == null ? null : round(st.p90),
        min_minutes: st.min,
        max_minutes: st.max,
        sla_attainment_pct: pct(list.filter((d) => d.within_sla).length, list.length),
      });
    }
  }

  const attainmentSeries = (pick: (d: FtrDetail) => string, names: string[]): Series[] =>
    names.map((name, i) => ({
      name,
      color: SERIES_COLORS[i % SERIES_COLORS.length],
      values: weeks.map((w) => {
        const list = detail.filter((d) => pick(d) === name && d.week === w.key);
        return list.length ? pct(list.filter((d) => d.within_sla).length, list.length) : null;
      }),
    }));

  const warnings = [...unmapped].map((c) => `Country "${c}" has no timezone mapping – the source timezone was used.`);

  return {
    weeks,
    agg,
    detail,
    countries,
    regionalSeries: attainmentSeries((d) => d.region, regions),
    countrySeries: attainmentSeries((d) => d.country, countries),
    skipped: skip.groups(),
    warnings,
    slaMinutes: s.slaMinutes,
    overallAttainment: pct(detail.filter((d) => d.within_sla).length, detail.length),
    ticketCount: detail.length,
  };
}
