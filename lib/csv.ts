import Papa from 'papaparse';
import { DateTime } from 'luxon';
import { ColumnMap, DurationUnit, RawRow } from './types';
import { COLUMN_LABELS } from './constants';

export interface ParsedCsv {
  headers: string[];
  rows: RawRow[];
}

export function parseCsvText(text: string): ParsedCsv {
  const result = Papa.parse<RawRow>(text.replace(/^﻿/, ''), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  return { headers: result.meta.fields ?? [], rows: result.data };
}

export function parseCsvFile(file: File): Promise<ParsedCsv> {
  return file.text().then(parseCsvText);
}

/** Returns the readable names of required fields whose CSV header is missing. */
export function missingColumns(headers: string[], columns: ColumnMap, required: (keyof ColumnMap)[]): string[] {
  const set = new Set(headers);
  return required.filter((k) => !set.has(columns[k])).map((k) => `${COLUMN_LABELS[k]} ("${columns[k]}")`);
}

const FORMATS = ['yyyy-MM-dd HH:mm:ss', 'yyyy-MM-dd HH:mm', 'yyyy-MM-dd'];

/** Parses ISO or "yyyy-MM-dd HH:mm[:ss]" timestamps in the given source timezone. */
export function parseDateTime(value: string | undefined, zone: string): DateTime | null {
  const s = value?.trim();
  if (!s) return null;
  const iso = DateTime.fromISO(s, { zone });
  if (iso.isValid) return iso;
  for (const f of FORMATS) {
    const d = DateTime.fromFormat(s, f, { zone });
    if (d.isValid) return d;
  }
  return null;
}

/** Parses a duration cell into minutes. Returns null for empty or non-numeric values. */
export function parseDurationMinutes(value: string | undefined, unit: DurationUnit): number | null {
  const s = value?.trim();
  if (!s) return null;
  const cleaned = s.replace(/[^0-9.\-]/g, '');
  if (!/\d/.test(cleaned)) return null; // "abc" must not become 0 minutes
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return unit === 'ms' ? n / 60000 : unit === 'seconds' ? n / 60 : n;
}
