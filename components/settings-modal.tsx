'use client';
import { useState } from 'react';
import { COLUMN_LABELS, DEFAULT_WORKING_HOURS } from '@/lib/constants';
import { ColumnMap, DurationUnit, Settings } from '@/lib/types';
import { Button } from './ui';

interface Props {
  settings: Settings;
  knownCountries: string[];
  onSave: (s: Settings) => void;
  onReset: () => void;
  onClose: () => void;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const input = 'rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900';

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-slate-200 pt-4">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {hint && <p className="mb-2 text-xs text-slate-500">{hint}</p>}
      {children}
    </section>
  );
}

export function SettingsModal({ settings, knownCountries, onSave, onReset, onClose }: Props) {
  const [s, setS] = useState<Settings>(structuredClone(settings));
  const [newCountry, setNewCountry] = useState('');
  const countries = [...new Set([...Object.keys(s.timezoneMap), ...knownCountries])].sort();

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS((p) => ({ ...p, [k]: v }));
  const wh = (c: string) => s.workingHours[c] ?? DEFAULT_WORKING_HOURS;
  const setWh = (c: string, patch: Partial<typeof DEFAULT_WORKING_HOURS>) =>
    set('workingHours', { ...s.workingHours, [c]: { ...wh(c), ...patch } });
  const toggleDay = (c: string, d: number) => {
    const days = wh(c).days.includes(d) ? wh(c).days.filter((x) => x !== d) : [...wh(c).days, d].sort();
    setWh(c, { days });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="w-full max-w-4xl space-y-4 rounded-xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-900" aria-label="Close">✕</button>
        </div>

        <Section title="General" hint="Timestamps in your CSV are read in the source timezone. Duration columns are converted to minutes using the unit below.">
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex flex-col gap-1">Source timezone (IANA)
              <input className={input} value={s.sourceTimezone} onChange={(e) => set('sourceTimezone', e.target.value)} />
            </label>
            <label className="flex flex-col gap-1">Duration unit
              <select className={input} value={s.durationUnit} onChange={(e) => set('durationUnit', e.target.value as DurationUnit)}>
                <option value="ms">milliseconds</option>
                <option value="seconds">seconds</option>
                <option value="minutes">minutes</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">SLA threshold (business minutes)
              <input type="number" min={1} className={`${input} w-28`} value={s.slaMinutes} onChange={(e) => set('slaMinutes', Math.max(1, Number(e.target.value) || 1))} />
            </label>
            <label className="flex flex-col gap-1">Closed statuses (comma-separated)
              <input className={input} value={s.closedStatuses.join(', ')} onChange={(e) => set('closedStatuses', e.target.value.split(',').map((x) => x.trim()).filter(Boolean))} />
            </label>
          </div>
        </Section>

        <Section title="CSV column names" hint="The header text each field has in your export.">
          <div className="grid gap-2 md:grid-cols-2">
            {(Object.keys(COLUMN_LABELS) as (keyof ColumnMap)[]).map((k) => (
              <label key={k} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-600">{COLUMN_LABELS[k]}</span>
                <input className={`${input} w-56`} value={s.columns[k]} onChange={(e) => set('columns', { ...s.columns, [k]: e.target.value })} />
              </label>
            ))}
          </div>
        </Section>

        <Section title="Countries" hint="Timezone and region per country (first-reply times are converted to the country's local time). Unmapped countries fall back to the source timezone.">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-slate-500">
                <tr><th className="py-1">Country</th><th>Timezone</th><th>Region</th><th>Working hours</th><th>Days</th></tr>
              </thead>
              <tbody>
                {countries.map((c) => (
                  <tr key={c} className="border-t border-slate-100 align-top">
                    <td className="py-1 pr-2">{c}</td>
                    <td className="pr-2"><input className={`${input} w-44`} value={s.timezoneMap[c] ?? ''} placeholder="Europe/Berlin" onChange={(e) => set('timezoneMap', { ...s.timezoneMap, [c]: e.target.value })} /></td>
                    <td className="pr-2"><input className={`${input} w-28`} value={s.regionMap[c] ?? ''} placeholder="Region" onChange={(e) => set('regionMap', { ...s.regionMap, [c]: e.target.value })} /></td>
                    <td className="pr-2 whitespace-nowrap">
                      <input type="time" className={input} value={wh(c).start} onChange={(e) => setWh(c, { start: e.target.value })} />
                      {' – '}
                      <input type="time" className={input} value={wh(c).end} onChange={(e) => setWh(c, { end: e.target.value })} />
                    </td>
                    <td className="whitespace-nowrap">
                      {DAYS.map((d, i) => (
                        <label key={d} className="mr-1.5 text-xs"><input type="checkbox" checked={wh(c).days.includes(i + 1)} onChange={() => toggleDay(c, i + 1)} /> {d}</label>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-2 flex gap-2">
            <input className={input} placeholder="Add country…" value={newCountry} onChange={(e) => setNewCountry(e.target.value)} />
            <Button onClick={() => { const c = newCountry.trim(); if (c) { set('timezoneMap', { ...s.timezoneMap, [c]: s.sourceTimezone }); setNewCountry(''); } }}>Add</Button>
          </div>
        </Section>

        <Section title="Holidays" hint="ISO dates (YYYY-MM-DD), comma-separated, per country. They count as non-working days. The presets are only examples (New Year, Christmas) – please adjust.">
          <div className="space-y-2">
            {countries.map((c) => (
              <label key={c} className="flex items-start gap-3 text-sm">
                <span className="w-32 shrink-0 pt-1 text-slate-600">{c}</span>
                <textarea
                  className={`${input} h-14 w-full font-mono text-xs`}
                  value={(s.holidays[c] ?? []).join(', ')}
                  onChange={(e) => set('holidays', { ...s.holidays, [c]: e.target.value.split(/[,\s]+/).filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x)) })}
                />
              </label>
            ))}
          </div>
        </Section>

        <div className="flex justify-between border-t border-slate-200 pt-4">
          <Button onClick={() => { onReset(); onClose(); }}>Reset to defaults</Button>
          <div className="flex gap-2">
            <Button onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={() => { onSave(s); onClose(); }}>Save</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
