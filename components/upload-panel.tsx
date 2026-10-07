'use client';
import { useRef } from 'react';
import { RawRow } from '@/lib/types';
import { Button, Card } from './ui';

export interface Source {
  name: string;
  rows: RawRow[];
  headers: string[];
}

interface Props {
  a: Source | null;
  b: Source | null;
  onFile: (slot: 'a' | 'b', file: File) => void;
  onDemo: () => void;
  onDownloadDemo: () => void;
  onClear: () => void;
  demo: boolean;
}

function Slot({ title, hint, source, onPick }: { title: string; hint: string; source: Source | null; onPick: (f: File) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex-1 rounded-lg border border-dashed border-slate-300 p-3">
      <p className="text-sm font-medium text-slate-800">{title}</p>
      <p className="mb-2 text-xs text-slate-500">{hint}</p>
      <input ref={ref} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])} />
      <div className="flex items-center gap-3">
        <Button onClick={() => ref.current?.click()}>Choose CSV</Button>
        <span className="truncate text-xs text-slate-600">{source ? `${source.name} · ${source.rows.length} rows` : 'No file loaded'}</span>
      </div>
    </div>
  );
}

export function UploadPanel({ a, b, onFile, onDemo, onDownloadDemo, onClear, demo }: Props) {
  return (
    <Card
      title="Data sources"
      actions={
        <>
          <Button onClick={onDemo} variant="primary">Load demo data</Button>
          <Button onClick={onDownloadDemo}>Download demo CSVs</Button>
          {(a || b) && <Button onClick={onClear}>Clear</Button>}
        </>
      }
    >
      <div className="flex flex-col gap-3 md:flex-row">
        <Slot title="Source A · First Time Reply" hint="Ticket id, name, create date, country, time to first reply" source={a} onPick={(f) => onFile('a', f)} />
        <Slot title="Source B · Resolution, Created, Types" hint="Ticket id, name, create/close date, status, time to close, country, label, type" source={b} onPick={(f) => onFile('b', f)} />
      </div>
      <p className="mt-2 text-xs text-slate-500">
        {demo ? 'Showing invented demo data. ' : ''}Files are parsed in your browser and never uploaded. Column names are configurable in Settings.
      </p>
    </Card>
  );
}
