'use client';
import { useEffect, useMemo } from 'react';
import { DateTime } from 'luxon';
import { analyzeFtr } from '@/lib/analysis-ftr';
import { analyzeResolution } from '@/lib/analysis-resolution';
import { analyzeCreated } from '@/lib/analysis-created';
import { RawRow, Settings } from '@/lib/types';
import { SERIES_COLORS } from '@/lib/constants';
import { formatHours, formatPct, rollingWeeks } from '@/lib/utils';
import { LineChart, StackedBarChart } from './charts';
import { Kpi } from './ui';

interface Props {
  views: string[]; // "Global" and/or country names
  a: RawRow[] | null;
  b: RawRow[] | null;
  settings: Settings;
  now: DateTime;
  onDone: () => void;
}

function Page({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="print-page">
      <h2 className="mb-3 text-lg font-semibold text-slate-900">{title}</h2>
      {children}
    </section>
  );
}

function ViewPages({ view, a, b, settings, now }: { view: string } & Omit<Props, 'views' | 'onDone'>) {
  const country = view === 'Global' ? 'All' : view;
  const ftr = useMemo(() => (a ? analyzeFtr(a, settings, now) : null), [a, settings, now]);
  const created = useMemo(() => (b ? analyzeCreated(b, settings, now, country) : null), [b, settings, now, country]);
  const res = useMemo(() => (b ? analyzeResolution(b, settings, now, country) : null), [b, settings, now, country]);
  const labels = rollingWeeks(now.setZone(settings.sourceTimezone)).map((w) => w.label);

  return (
    <>
      <Page title={`${view} · Charts`}>
        <div className="grid grid-cols-2 gap-4">
          {ftr && (
            <div>
              <p className="mb-1 text-sm font-medium">{view === 'Global' ? 'SLA attainment by region' : 'SLA attainment'}</p>
              <LineChart
                labels={labels}
                yMax={100}
                format={(n) => `${Math.round(n)}%`}
                series={view === 'Global' ? ftr.regionalSeries : ftr.countrySeries.filter((s) => s.name === view)}
              />
            </div>
          )}
          {created && (
            <div>
              <p className="mb-1 text-sm font-medium">Tickets created</p>
              <StackedBarChart
                labels={labels}
                series={[
                  { name: 'External', color: SERIES_COLORS[0], values: created.weekly.map((w) => w.external) },
                  { name: 'Internal', color: SERIES_COLORS[2], values: created.weekly.map((w) => w.internal) },
                ]}
              />
            </div>
          )}
          {res && (
            <>
              <div>
                <p className="mb-1 text-sm font-medium">Time to close (median / P90)</p>
                <LineChart
                  labels={labels}
                  format={(n) => `${n.toFixed(0)} h`}
                  series={[
                    { name: 'Median (h)', color: SERIES_COLORS[0], values: res.weekly.map((w) => w.medianHours) },
                    { name: 'P90 (h)', color: SERIES_COLORS[2], values: res.weekly.map((w) => w.p90Hours) },
                  ]}
                />
              </div>
              <div>
                <p className="mb-1 text-sm font-medium">Closed tickets</p>
                <StackedBarChart
                  labels={labels}
                  series={[
                    { name: '≤ 24 h', color: '#16a34a', values: res.weekly.map((w) => w.within24) },
                    { name: '24–48 h', color: '#d97706', values: res.weekly.map((w) => w.within24to48) },
                    { name: '> 48 h', color: '#dc2626', values: res.weekly.map((w) => w.over48) },
                  ]}
                />
              </div>
            </>
          )}
        </div>
      </Page>
      <Page title={`${view} · KPIs`}>
        {created && (
          <div className="mb-4 grid grid-cols-3 gap-3">
            <Kpi label="Created (12 weeks)" value={String(created.totals.total)} />
            <Kpi label="External" value={String(created.totals.external)} />
            <Kpi label="Internal" value={String(created.totals.internal)} />
          </div>
        )}
        {res && (
          <div className="grid grid-cols-2 gap-6">
            {[['Rolling 12 weeks', res.rolling], ['Year to date', res.ytd]].map(([title, k]) => {
              const kp = k as typeof res.rolling;
              return (
                <div key={title as string}>
                  <p className="mb-2 text-sm font-medium">{title as string}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Kpi label="Closed" value={String(kp.closed)} />
                    <Kpi label="Median" value={formatHours(kp.medianHours)} />
                    <Kpi label="P90" value={formatHours(kp.p90Hours)} />
                    <Kpi label="≤ 24 h" value={formatPct(kp.within24Pct)} />
                    <Kpi label="≤ 48 h" value={formatPct(kp.within48Pct)} />
                    <Kpi label="Product esc." value={formatPct(kp.productPct)} />
                    <Kpi label="Sales esc." value={formatPct(kp.salesPct)} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Page>
    </>
  );
}

/** Renders the whole report and opens the browser print dialog (A4 landscape). */
export function PrintReport({ views, a, b, settings, now, onDone }: Props) {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 400);
    window.addEventListener('afterprint', onDone, { once: true });
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="print-root">
      <Page title="Ticketscope report">
        <p className="text-sm text-slate-700">Last complete ISO week: {rollingWeeks(now.setZone(settings.sourceTimezone)).at(-1)?.key}</p>
        <p className="text-sm text-slate-700">Range: rolling 12 weeks</p>
        <p className="text-sm text-slate-700">Views: {views.join(', ')}</p>
        <p className="text-sm text-slate-700">Created: {now.toFormat('yyyy-MM-dd')}</p>
      </Page>
      {views.map((v) => (
        <ViewPages key={v} view={v} a={a} b={b} settings={settings} now={now} />
      ))}
    </div>
  );
}
