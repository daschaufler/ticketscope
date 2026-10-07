'use client';
import { ReactNode, useState } from 'react';

export function Card({ title, actions, children }: { title?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {(title || actions) && (
        <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
          <div className="flex items-center gap-2">{actions}</div>
        </header>
      )}
      {children}
    </section>
  );
}

export function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="flex items-center gap-2 text-xs text-slate-600">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900">
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="inline-flex rounded-lg border border-slate-300 bg-slate-100 p-0.5 text-xs">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-md px-3 py-1 font-medium ${value === o.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Button({ children, onClick, variant = 'secondary', disabled }: { children: ReactNode; onClick: () => void; variant?: 'primary' | 'secondary'; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${
        variant === 'primary' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  );
}

/** Collapsed summary with the total; details are grouped by reason, never one line per row. */
export function SkippedRows({ groups, warnings }: { groups: string[]; warnings: string[] }) {
  if (groups.length === 0 && warnings.length === 0) return null;
  const total = groups.reduce((a, g) => a + (parseInt(g, 10) || 0), 0);
  return (
    <details className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <summary className="cursor-pointer font-medium">
        {total} skipped ticket{total === 1 ? '' : 's'}
        {warnings.length > 0 ? ` · ${warnings.length} warning${warnings.length === 1 ? '' : 's'}` : ''}
      </summary>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {groups.map((g) => (
          <li key={g}>{g}</li>
        ))}
        {warnings.map((w) => (
          <li key={w}>{w}</li>
        ))}
      </ul>
    </details>
  );
}

export function DataTable({ rows, limit = 100 }: { rows: object[]; limit?: number }) {
  const [open, setOpen] = useState(false);
  if (rows.length === 0) return <p className="text-sm text-slate-500">No rows.</p>;
  const cols = Object.keys(rows[0]);
  const cell = (r: object, c: string) => String((r as Record<string, unknown>)[c] ?? '');
  const shown = rows.slice(0, limit);
  return (
    <details open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary className="cursor-pointer text-sm font-medium text-slate-700">Detail rows ({rows.length})</summary>
      <div className="mt-2 max-h-80 overflow-auto rounded-md border border-slate-200">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-slate-100 text-slate-600">
            <tr>
              {cols.map((c) => (
                <th key={c} className="px-2 py-1.5 font-medium">{c.replace(/_/g, ' ')}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r, i) => (
              <tr key={i} className="border-t border-slate-100">
                {cols.map((c) => (
                  <td key={c} className="whitespace-nowrap px-2 py-1">{cell(r, c)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > limit && <p className="mt-1 text-xs text-slate-500">Showing the first {limit} rows. Export CSV for all.</p>}
    </details>
  );
}
