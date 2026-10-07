export type ReportType = 'ftr' | 'resolution' | 'created' | 'types';
export type DurationUnit = 'ms' | 'seconds' | 'minutes';

/** CSV header name for each field the app reads. Editable in the settings. */
export interface ColumnMap {
  recordId: string;
  ticketName: string;
  createDate: string;
  closeDate: string;
  status: string;
  timeToClose: string;
  firstReply: string;
  country: string;
  label: string;
  ticketType: string;
  escalation: string;
  salesEscalation: string;
}

export interface WorkingHours {
  start: string; // "HH:mm"
  end: string; // "HH:mm"
  days: number[]; // ISO weekdays, 1 = Monday … 7 = Sunday
}

export interface Settings {
  sourceTimezone: string;
  durationUnit: DurationUnit;
  slaMinutes: number;
  closedStatuses: string[];
  timezoneMap: Record<string, string>;
  regionMap: Record<string, string>;
  workingHours: Record<string, WorkingHours>;
  holidays: Record<string, string[]>; // ISO dates
  columns: ColumnMap;
}

export type RawRow = Record<string, string>;

export interface WeekInfo {
  key: string; // "2026-W14"
  label: string; // "30 Mar"
}

export interface Series {
  name: string;
  color: string;
  values: (number | null)[];
}
