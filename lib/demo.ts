import { DateTime } from 'luxon';
import Papa from 'papaparse';
import { DEFAULT_COLUMNS, DEFAULT_TIMEZONES } from './constants';
import { RawRow } from './types';

// Deterministic PRNG so the demo data looks the same on every load.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const COUNTRIES = Object.keys(DEFAULT_TIMEZONES);
const WEIGHTS = [18, 12, 10, 12, 16, 7, 8, 6, 5, 6];
const SUBJECTS = [
  'Cannot log in', 'Invoice missing', 'Export fails', 'Question about pricing', 'Import error',
  'Feature request', 'Integration not syncing', 'Slow dashboard', 'Update billing details', 'Data looks wrong',
];
const TYPES = [
  ['Question', 30], ['Bug', 22], ['Billing', 14], ['Feature request', 9], ['Integration', 8],
  ['Account access', 7], ['Data issue', 5], ['Onboarding', 3], ['Feedback', 2],
] as const;

function pick<T>(rnd: () => number, items: readonly (readonly [T, number])[]): T {
  const total = items.reduce((a, [, w]) => a + w, 0);
  let x = rnd() * total;
  for (const [item, w] of items) {
    x -= w;
    if (x <= 0) return item;
  }
  return items[0][0];
}

/** Generates invented tickets for the last ~15 weeks. Nothing here is real data. */
export function generateDemoData(now: DateTime = DateTime.utc(), count = 1100): { sourceA: RawRow[]; sourceB: RawRow[] } {
  const rnd = mulberry32(42);
  const c = DEFAULT_COLUMNS;
  const sourceA: RawRow[] = [];
  const sourceB: RawRow[] = [];
  const countryItems = COUNTRIES.map((n, i) => [n, WEIGHTS[i]] as const);
  const typeItems = TYPES.map(([n, w]) => [n, w] as const);

  for (let i = 0; i < count; i++) {
    const country = pick(rnd, countryItems);
    const daysAgo = rnd() * 15 * 7;
    let created = now.minus({ days: daysAgo }).startOf('day').plus({ hours: 6 + rnd() * 12, minutes: rnd() * 60 });
    if (created.weekday > 5 && rnd() < 0.8) created = created.minus({ days: created.weekday - 5 });
    const id = `T-${10000 + i}`;
    const name = `${SUBJECTS[Math.floor(rnd() * SUBJECTS.length)]} #${i + 1}`;
    const createdStr = created.toFormat('yyyy-MM-dd HH:mm');

    // First reply: log-normal-ish, a few minutes up to a day.
    const replyMin = Math.exp(3.4 + rnd() * 3.2) * (country === 'India' || country === 'Japan' ? 1.4 : 1);
    const country_ = rnd() < 0.015 ? '' : country;

    const closedFlag = rnd() < 0.86;
    const closeMin = Math.exp(5.6 + rnd() * 3.4);
    const closeAt = created.plus({ minutes: closeMin });
    const isClosed = closedFlag && closeAt < now;

    sourceA.push({
      [c.recordId]: id,
      [c.ticketName]: name,
      [c.createDate]: createdStr,
      [c.country]: country_,
      [c.firstReply]: rnd() < 0.03 ? '' : String(Math.round(replyMin * 60000)),
    });
    sourceB.push({
      [c.recordId]: id,
      [c.ticketName]: name,
      [c.createDate]: createdStr,
      [c.closeDate]: isClosed ? closeAt.toFormat('yyyy-MM-dd HH:mm') : '',
      [c.status]: isClosed ? 'Closed' : rnd() < 0.5 ? 'Open' : 'Waiting on customer',
      [c.timeToClose]: isClosed ? String(Math.round(closeMin * 60000)) : '',
      [c.country]: country_,
      [c.label]: rnd() < 0.15 ? 'Internal' : 'External',
      [c.ticketType]: pick(rnd, typeItems),
      [c.escalation]: rnd() < 0.08 ? `ENG-${100 + Math.floor(rnd() * 900)}` : '',
      [c.salesEscalation]: rnd() < 0.05 ? created.plus({ hours: 3 }).toFormat('yyyy-MM-dd HH:mm') : '',
    });
  }
  return { sourceA, sourceB };
}

export const toCsvText = (rows: RawRow[]): string => Papa.unparse(rows);
