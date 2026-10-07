import { DateTime } from 'luxon';
import { parseDateTime, parseDurationMinutes } from './csv';
import { RawRow, ReportType, Settings } from './types';
import { SkipCounter } from './utils';

export interface Ticket {
  id: string;
  name: string;
  country: string;
  created: DateTime; // in the source timezone
  closed: DateTime | null;
  status: string;
  isClosed: boolean;
  closeMinutes: number | null;
  firstReplyMinutes: number | null;
  label: string;
  type: string;
  product: boolean; // escalated to product/engineering
  sales: boolean; // escalated to sales
}

/**
 * Turns raw CSV rows into typed tickets. Rows that can't be used are not
 * dropped silently: every reason is counted in the returned SkipCounter.
 */
export function prepareTickets(rows: RawRow[], s: Settings, report: ReportType): { tickets: Ticket[]; skip: SkipCounter } {
  const c = s.columns;
  const skip = new SkipCounter();
  const closedStatuses = new Set(s.closedStatuses.map((x) => x.trim().toLowerCase()));
  const tickets: Ticket[] = [];

  for (const r of rows) {
    const country = (r[c.country] ?? '').trim();
    if (!country) {
      skip.add('country is empty');
      continue;
    }
    const created = parseDateTime(r[c.createDate], s.sourceTimezone);
    if (!created) {
      skip.add('the create date is missing or invalid');
      continue;
    }
    const firstReplyMinutes = parseDurationMinutes(r[c.firstReply], s.durationUnit);
    if (report === 'ftr' && firstReplyMinutes == null) {
      skip.add('the time to first reply is missing or invalid');
      continue;
    }
    const status = (r[c.status] ?? '').trim();
    tickets.push({
      id: (r[c.recordId] ?? '').trim(),
      name: (r[c.ticketName] ?? '').trim(),
      country,
      created,
      closed: parseDateTime(r[c.closeDate], s.sourceTimezone),
      status,
      isClosed: closedStatuses.has(status.toLowerCase()),
      closeMinutes: parseDurationMinutes(r[c.timeToClose], s.durationUnit),
      firstReplyMinutes,
      label: (r[c.label] ?? '').trim(),
      type: (r[c.ticketType] ?? '').trim() || 'Unspecified',
      product: Boolean((r[c.escalation] ?? '').trim()),
      sales: Boolean((r[c.salesEscalation] ?? '').trim()),
    });
  }
  return { tickets, skip };
}
