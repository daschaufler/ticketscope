import { ColumnMap, Settings, WorkingHours } from './types';

export const DEFAULT_COLUMNS: ColumnMap = {
  recordId: 'Record ID',
  ticketName: 'Ticket name',
  createDate: 'Create date',
  closeDate: 'Close date',
  status: 'Ticket status',
  timeToClose: 'Time to close',
  firstReply: 'Time to first agent email reply',
  country: 'Country',
  label: 'Ticket label',
  ticketType: 'Ticket type',
  escalation: 'Escalation ticket',
  salesEscalation: 'Sales escalation date',
};

/** Human-readable field names, used in validation messages and the settings. */
export const COLUMN_LABELS: Record<keyof ColumnMap, string> = {
  recordId: 'Record ID',
  ticketName: 'Ticket name',
  createDate: 'Create date',
  closeDate: 'Close date',
  status: 'Ticket status',
  timeToClose: 'Time to close',
  firstReply: 'Time to first reply',
  country: 'Country',
  label: 'Ticket label (internal / external)',
  ticketType: 'Ticket type',
  escalation: 'Product escalation (e.g. issue key)',
  salesEscalation: 'Sales escalation date',
};

export const DEFAULT_TIMEZONES: Record<string, string> = {
  Germany: 'Europe/Berlin',
  France: 'Europe/Paris',
  Spain: 'Europe/Madrid',
  'United Kingdom': 'Europe/London',
  'United States': 'America/New_York',
  Canada: 'America/Toronto',
  Brazil: 'America/Sao_Paulo',
  Japan: 'Asia/Tokyo',
  Australia: 'Australia/Sydney',
  India: 'Asia/Kolkata',
};

export const DEFAULT_REGIONS: Record<string, string> = {
  Germany: 'Europe',
  France: 'Europe',
  Spain: 'Europe',
  'United Kingdom': 'Europe',
  'United States': 'Americas',
  Canada: 'Americas',
  Brazil: 'Americas',
  Japan: 'Asia-Pacific',
  Australia: 'Asia-Pacific',
  India: 'Asia-Pacific',
};

export const DEFAULT_WORKING_HOURS: WorkingHours = { start: '09:00', end: '18:00', days: [1, 2, 3, 4, 5] };

/** Example holiday presets (New Year, Christmas) – edit per country in the settings. */
export function defaultHolidays(year = new Date().getFullYear()): Record<string, string[]> {
  const dates = [year - 1, year, year + 1].flatMap((y) => [`${y}-01-01`, `${y}-12-25`]);
  return Object.fromEntries(Object.keys(DEFAULT_TIMEZONES).map((c) => [c, dates]));
}

export function defaultSettings(): Settings {
  return {
    sourceTimezone: 'UTC',
    durationUnit: 'ms',
    slaMinutes: 90,
    closedStatuses: ['Closed'],
    timezoneMap: { ...DEFAULT_TIMEZONES },
    regionMap: { ...DEFAULT_REGIONS },
    workingHours: Object.fromEntries(Object.keys(DEFAULT_TIMEZONES).map((c) => [c, { ...DEFAULT_WORKING_HOURS }])),
    holidays: defaultHolidays(),
    columns: { ...DEFAULT_COLUMNS },
  };
}

export const ROLLING_WEEKS = 12;

export const SERIES_COLORS = [
  '#2563eb', '#16a34a', '#d97706', '#9333ea', '#dc2626', '#0891b2', '#db2777', '#65a30d', '#6b7280',
];
