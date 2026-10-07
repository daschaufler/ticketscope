import { describe, expect, it } from 'vitest';
import { DateTime } from 'luxon';
import { businessMinutes, analyzeFtr } from '@/lib/analysis-ftr';
import { analyzeResolution } from '@/lib/analysis-resolution';
import { analyzeCreated } from '@/lib/analysis-created';
import { analyzeTicketTypes } from '@/lib/analysis-ticket-types';
import { generateDemoData } from '@/lib/demo';
import { defaultSettings, DEFAULT_WORKING_HOURS } from '@/lib/constants';
import { parseDateTime, parseDurationMinutes } from '@/lib/csv';
import { percentile, rollingWeeks, weekKey } from '@/lib/utils';

const wh = DEFAULT_WORKING_HOURS; // Mon–Fri 09:00–18:00
const berlin = (s: string) => DateTime.fromISO(s, { zone: 'Europe/Berlin' });

describe('percentile', () => {
  it('interpolates linearly', () => {
    expect(percentile([1, 2, 3, 4], 50)).toBe(2.5);
    expect(percentile([10], 90)).toBe(10);
    expect(percentile([], 50)).toBeNull();
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 90)).toBeCloseTo(9.1);
  });
});

describe('businessMinutes', () => {
  it('counts only minutes inside working hours', () => {
    // Monday 17:00 → Tuesday 10:00 = 60 (Mon until 18:00) + 60 (Tue from 09:00)
    expect(businessMinutes(berlin('2026-03-02T17:00'), berlin('2026-03-03T10:00'), wh, new Set())).toBe(120);
  });
  it('skips weekends', () => {
    // Friday 17:00 → Monday 10:00 = 60 + 60
    expect(businessMinutes(berlin('2026-03-06T17:00'), berlin('2026-03-09T10:00'), wh, new Set())).toBe(120);
  });
  it('skips holidays', () => {
    const holidays = new Set(['2026-03-03']);
    expect(businessMinutes(berlin('2026-03-02T17:00'), berlin('2026-03-04T10:00'), wh, holidays)).toBe(120);
  });
  it('returns 0 for requests created and answered outside working hours', () => {
    expect(businessMinutes(berlin('2026-03-02T20:00'), berlin('2026-03-02T22:00'), wh, new Set())).toBe(0);
  });
  it('handles the DST change correctly (Berlin, 29 Mar 2026)', () => {
    // Saturday 28 Mar 17:00 → Monday 30 Mar 10:00: only 09:00–10:00 on Monday counts
    expect(businessMinutes(berlin('2026-03-28T17:00'), berlin('2026-03-30T10:00'), wh, new Set())).toBe(60);
  });
});

describe('csv parsing', () => {
  it('parses supported date formats in the source timezone', () => {
    expect(parseDateTime('2026-04-13 09:15', 'UTC')?.toISO()).toContain('2026-04-13T09:15');
    expect(parseDateTime('2026-04-13T09:15:00Z', 'UTC')?.hour).toBe(9);
    expect(parseDateTime('nonsense', 'UTC')).toBeNull();
    expect(parseDateTime('', 'UTC')).toBeNull();
  });
  it('converts durations to minutes', () => {
    expect(parseDurationMinutes('120000', 'ms')).toBe(2);
    expect(parseDurationMinutes('120', 'seconds')).toBe(2);
    expect(parseDurationMinutes('2', 'minutes')).toBe(2);
    expect(parseDurationMinutes('', 'ms')).toBeNull();
    expect(parseDurationMinutes('abc', 'ms')).toBeNull();
  });
});

describe('rolling weeks', () => {
  it('returns 12 complete weeks before the current one', () => {
    const now = DateTime.fromISO('2026-04-15T10:00', { zone: 'UTC' }); // Wednesday, W16
    const weeks = rollingWeeks(now, 12);
    expect(weeks).toHaveLength(12);
    expect(weeks[11].key).toBe('2026-W15');
    expect(weeks.map((w) => w.key)).not.toContain(weekKey(now));
  });
});

describe('analyses with demo data', () => {
  const now = DateTime.fromISO('2026-04-15T10:00', { zone: 'UTC' });
  const { sourceA, sourceB } = generateDemoData(now);
  const s = defaultSettings();

  it('FTR excludes the current week and reports skipped rows by reason', () => {
    const r = analyzeFtr(sourceA, s, now);
    expect(r.ticketCount).toBeGreaterThan(300);
    expect(r.detail.every((d) => d.week !== weekKey(now))).toBe(true);
    expect(r.skipped.some((x) => x.includes('country is empty'))).toBe(true);
    expect(r.skipped.some((x) => x.includes('current ISO week'))).toBe(true);
    expect(r.overallAttainment).toBeGreaterThanOrEqual(0);
    expect(r.overallAttainment).toBeLessThanOrEqual(100);
    expect(r.regionalSeries.length).toBe(3);
  });

  it('resolution returns KPIs, an open split and ordered percentiles', () => {
    const r = analyzeResolution(sourceB, s, now);
    expect(r.rolling.closed).toBeGreaterThan(100);
    expect(r.rolling.p90Hours!).toBeGreaterThanOrEqual(r.rolling.medianHours!);
    expect(r.open.total).toBe(r.open.product + r.open.sales + r.open.support);
    const germany = analyzeResolution(sourceB, s, now, 'Germany');
    expect(germany.rolling.closed).toBeLessThan(r.rolling.closed);
  });

  it('created splits internal vs external and sums up', () => {
    const r = analyzeCreated(sourceB, s, now);
    expect(r.totals.internal + r.totals.external).toBe(r.totals.total);
    expect(r.weekly.reduce((a, w) => a + w.total, 0)).toBe(r.totals.total);
    expect(r.totals.internal).toBeGreaterThan(0);
  });

  it('ticket types keep top-5 + Other consistent with the total', () => {
    const r = analyzeTicketTypes(sourceB, s, now);
    expect(r.trendNames.length).toBe(6);
    expect(r.trendNames[5]).toBe('Other');
    for (const w of r.weekly) {
      expect(Object.values(w.byType).reduce((a, b) => a + b, 0)).toBe(w.total);
    }
    expect(r.mix.reduce((a, m) => a + m.count, 0)).toBe(r.kpis.total);
    const filtered = analyzeTicketTypes(sourceB, s, now, 'All', 'Bug');
    expect(filtered.detail.every((d) => d.ticket_type === 'Bug')).toBe(true);
  });
});
