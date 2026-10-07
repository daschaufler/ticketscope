'use client';
import { useMemo, useState } from 'react';
import { DateTime } from 'luxon';
import { analyzeFtr } from '@/lib/analysis-ftr';
import { analyzeResolution } from '@/lib/analysis-resolution';
import { analyzeCreated } from '@/lib/analysis-created';
import { analyzeTicketTypes } from '@/lib/analysis-ticket-types';
import { RawRow, Settings } from '@/lib/types';
import { SERIES_COLORS } from '@/lib/constants';
import { downloadCsv, formatHours, formatMinutes, formatPct } from '@/lib/utils';
import { LineChart, StackedBarChart } from './charts';
import { Button, Card, DataTable, Kpi, Segmented, Select, SkippedRows } from './ui';

interface ViewProps {
  rows: RawRow[];
  settings: Settings;
  now: DateTime;
}

const ALL = 'All';
const withAll = (list: string[]) => [ALL, ...list];

/* ───────────────────────── First Time Reply ───────────────────────── */

export function FtrView({ rows, settings, now }: ViewProps) {
  const r = useMemo(() => analyzeFtr(rows, settings, now), [rows, settings, now]);
  const [country, setCountry] = useState(ALL);
  const labels = r.weeks.map((w) => w.label);
  const countrySeries = country === ALL ? r.countrySeries : r.countrySeries.filter((s) => s.name === country);

  return (
    <div className="space-y-4">
      <SkippedRows groups={r.skipped} warnings={r.warnings} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Tickets analysed" value={String(r.ticketCount)} hint="rolling 12 weeks" />
        <Kpi label="SLA attainment" value={formatPct(r.overallAttainment)} hint={`reply within ${formatMinutes(r.slaMinutes)} of business time`} />
        <Kpi label="Countries" value={String(r.countries.length)} />
        <Kpi label="Regions" value={String(r.regionalSeries.length)} />
      </div>
      <Card title="SLA attainment by region (rolling 12 weeks)">
        <LineChart labels={labels} series={r.regionalSeries} yMax={100} format={(n) => `${Math.round(n)}%`} />
      </Card>
      <Card
        title="SLA attainment by country"
        actions={<Select label="Country" value={country} onChange={setCountry} options={withAll(r.countries)} />}
      >
        <LineChart labels={labels} series={countrySeries} yMax={100} format={(n) => `${Math.round(n)}%`} />
      </Card>
      <Card
        title="Aggregation per country and ISO week"
        actions={
          <>
            <Button onClick={() => downloadCsv('ftr-aggregation.csv', r.agg)}>Export aggregation</Button>
            <Button onClick={() => downloadCsv('ftr-detail.csv', r.detail)}>Export detail</Button>
          </>
        }
      >
        <DataTable rows={r.agg.filter((a) => country === ALL || a.country === country)} />
      </Card>
    </div>
  );
}

/* ───────────────────────── Resolution Time ───────────────────────── */

export function ResolutionView({ rows, settings, now }: ViewProps) {
  const [country, setCountry] = useState(ALL);
  const r = useMemo(() => analyzeResolution(rows, settings, now, country), [rows, settings, now, country]);
  const labels = r.weeks.map((w) => w.label);
  const block = (title: string, k: typeof r.rolling) => (
    <Card title={title}>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Closed" value={String(k.closed)} />
        <Kpi label="Median" value={formatHours(k.medianHours)} />
        <Kpi label="P90" value={formatHours(k.p90Hours)} />
        <Kpi label="Closed ≤ 24 h" value={formatPct(k.within24Pct)} />
        <Kpi label="Closed ≤ 48 h" value={formatPct(k.within48Pct)} />
        <Kpi label="Product escalation" value={formatPct(k.productPct)} />
        <Kpi label="Sales escalation" value={formatPct(k.salesPct)} />
      </div>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Select label="Country" value={country} onChange={setCountry} options={withAll(r.countries)} />
      </div>
      <SkippedRows groups={r.skipped} warnings={r.warnings} />
      {block('Rolling 12 weeks', r.rolling)}
      {block('Year to date', r.ytd)}
      <Card title="Currently open tickets">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi label="Open" value={String(r.open.total)} />
          <Kpi label="With product" value={String(r.open.product)} />
          <Kpi label="With sales" value={String(r.open.sales)} />
          <Kpi label="With support" value={String(r.open.support)} />
        </div>
      </Card>
      <Card title="Time to close per week">
        <LineChart
          labels={labels}
          series={[
            { name: 'Median (h)', color: SERIES_COLORS[0], values: r.weekly.map((w) => w.medianHours) },
            { name: 'P90 (h)', color: SERIES_COLORS[2], values: r.weekly.map((w) => w.p90Hours) },
          ]}
          format={(n) => `${n.toFixed(0)} h`}
        />
      </Card>
      <Card title="Closed tickets per week">
        <StackedBarChart
          labels={labels}
          series={[
            { name: '≤ 24 h', color: '#16a34a', values: r.weekly.map((w) => w.within24) },
            { name: '24–48 h', color: '#d97706', values: r.weekly.map((w) => w.within24to48) },
            { name: '> 48 h', color: '#dc2626', values: r.weekly.map((w) => w.over48) },
          ]}
        />
      </Card>
      <Card title="Closed tickets (rolling 12 weeks)" actions={<Button onClick={() => downloadCsv('resolution-detail.csv', r.detail)}>Export detail</Button>}>
        <DataTable rows={r.detail} />
      </Card>
    </div>
  );
}

/* ───────────────────────── Tickets Created ───────────────────────── */

export function CreatedView({ rows, settings, now }: ViewProps) {
  const [country, setCountry] = useState(ALL);
  const r = useMemo(() => analyzeCreated(rows, settings, now, country), [rows, settings, now, country]);
  const labels = r.weeks.map((w) => w.label);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Select label="Country" value={country} onChange={setCountry} options={withAll(r.countries)} />
      </div>
      <SkippedRows groups={r.skipped} warnings={r.warnings} />
      <div className="grid grid-cols-3 gap-3">
        <Kpi label="Created" value={String(r.totals.total)} hint="rolling 12 weeks" />
        <Kpi label="External" value={String(r.totals.external)} />
        <Kpi label="Internal" value={String(r.totals.internal)} />
      </div>
      <Card title="Tickets created per week">
        <StackedBarChart
          labels={labels}
          series={[
            { name: 'External', color: SERIES_COLORS[0], values: r.weekly.map((w) => w.external) },
            { name: 'Internal', color: SERIES_COLORS[2], values: r.weekly.map((w) => w.internal) },
          ]}
        />
      </Card>
      <Card title="Detail" actions={<Button onClick={() => downloadCsv('tickets-created.csv', r.detail)}>Export detail</Button>}>
        <DataTable rows={r.detail} />
      </Card>
    </div>
  );
}

/* ───────────────────────── Ticket Types ───────────────────────── */

export function TypesView({ rows, settings, now }: ViewProps) {
  const [country, setCountry] = useState(ALL);
  const [mode, setMode] = useState<'volume' | 'share'>('volume');
  const [type, setType] = useState(ALL);
  const r = useMemo(() => analyzeTicketTypes(rows, settings, now, country, type), [rows, settings, now, country, type]);
  const labels = r.weeks.map((w) => w.label);
  const maxMix = Math.max(1, ...r.mix.map((m) => m.count));

  return (
    <div className="space-y-4">
      <SkippedRows groups={r.skipped} warnings={r.warnings} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi label="Tickets" value={String(r.kpis.total)} />
        <Kpi label="Top type" value={r.kpis.topType} />
        <Kpi label="Top-3 concentration" value={formatPct(r.kpis.top3Concentration)} />
        <Kpi label="Active types" value={String(r.kpis.activeTypes)} />
        <Kpi label="Other share" value={formatPct(r.kpis.otherShare)} />
      </div>
      <Card
        title="Ticket types per week (top 5 + Other)"
        actions={
          <>
            <Select label="Country" value={country} onChange={setCountry} options={withAll(r.countries)} />
            <Segmented value={mode} onChange={setMode} options={[{ value: 'volume', label: 'Volume' }, { value: 'share', label: 'Share' }]} />
          </>
        }
      >
        <StackedBarChart
          labels={labels}
          percent={mode === 'share'}
          series={r.trendNames.map((name, i) => ({
            name,
            color: SERIES_COLORS[i % SERIES_COLORS.length],
            values: r.weekly.map((w) => w.byType[name] ?? 0),
          }))}
        />
      </Card>
      <Card title="Rolling 12-week mix (top 8 + Other)">
        <ul className="space-y-1.5">
          {r.mix.map((m, i) => (
            <li key={m.name} className="flex items-center gap-3 text-sm">
              <span className="w-36 shrink-0 truncate text-slate-700">{m.name}</span>
              <span className="h-3 rounded bg-slate-100" style={{ width: '100%' }}>
                <span className="block h-3 rounded" style={{ width: `${(m.count / maxMix) * 100}%`, background: SERIES_COLORS[i % SERIES_COLORS.length] }} />
              </span>
              <span className="w-24 shrink-0 text-right text-xs text-slate-600">{m.count} · {formatPct(m.share)}</span>
            </li>
          ))}
        </ul>
      </Card>
      <Card
        title="Detail"
        actions={
          <>
            <Select label="Type" value={type} onChange={setType} options={withAll(r.types)} />
            <Button onClick={() => downloadCsv('ticket-types-weekly.csv', r.weeklyExport)}>Export weekly</Button>
            <Button onClick={() => downloadCsv('ticket-types-detail.csv', r.detail)}>Export detail</Button>
          </>
        }
      >
        <DataTable rows={r.detail} />
      </Card>
    </div>
  );
}
