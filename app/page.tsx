'use client';
import { useCallback, useMemo, useState } from 'react';
import { DateTime } from 'luxon';
import { UploadPanel, Source } from '@/components/upload-panel';
import { CreatedView, FtrView, ResolutionView, TypesView } from '@/components/report-views';
import { SettingsModal } from '@/components/settings-modal';
import { PrintReport } from '@/components/print-report';
import { Button, Segmented } from '@/components/ui';
import { parseCsvFile, missingColumns } from '@/lib/csv';
import { generateDemoData, toCsvText } from '@/lib/demo';
import { useSettings } from '@/lib/use-settings';
import { DEFAULT_COLUMNS } from '@/lib/constants';
import { ColumnMap, ReportType } from '@/lib/types';

const REQUIRED: Record<ReportType, (keyof ColumnMap)[]> = {
  ftr: ['recordId', 'ticketName', 'createDate', 'country', 'firstReply'],
  resolution: ['recordId', 'ticketName', 'timeToClose', 'closeDate', 'status', 'createDate', 'country'],
  created: ['recordId', 'ticketName', 'createDate', 'country', 'label'],
  types: ['recordId', 'ticketName', 'createDate', 'country', 'ticketType'],
};

const REPORTS: { value: ReportType; label: string }[] = [
  { value: 'ftr', label: 'First Time Reply' },
  { value: 'resolution', label: 'Resolution Time' },
  { value: 'created', label: 'Tickets Created' },
  { value: 'types', label: 'Ticket Types' },
];

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Home() {
  const [settings, setSettings, resetSettings] = useSettings();
  const [now] = useState(() => DateTime.now());
  const [a, setA] = useState<Source | null>(null);
  const [b, setB] = useState<Source | null>(null);
  const [demo, setDemo] = useState(false);
  const [report, setReport] = useState<ReportType>('ftr');
  const [showSettings, setShowSettings] = useState(false);
  const [pdfViews, setPdfViews] = useState<string[]>(['Global']);
  const [printing, setPrinting] = useState(false);
  const [showPdf, setShowPdf] = useState(false);

  const onFile = useCallback(async (slot: 'a' | 'b', file: File) => {
    const parsed = await parseCsvFile(file);
    const src = { name: file.name, ...parsed };
    if (slot === 'a') setA(src);
    else setB(src);
    setDemo(false);
  }, []);

  const loadDemo = () => {
    const { sourceA, sourceB } = generateDemoData(now.toUTC());
    const hdrs = (rows: Record<string, string>[]) => Object.keys(rows[0]);
    setSettings({ ...settings, sourceTimezone: 'UTC', durationUnit: 'ms', columns: { ...DEFAULT_COLUMNS } });
    setA({ name: 'demo-first-reply.csv', rows: sourceA, headers: hdrs(sourceA) });
    setB({ name: 'demo-tickets.csv', rows: sourceB, headers: hdrs(sourceB) });
    setDemo(true);
  };

  const downloadDemo = () => {
    const { sourceA, sourceB } = generateDemoData(now.toUTC());
    download('demo-first-reply.csv', toCsvText(sourceA));
    download('demo-tickets.csv', toCsvText(sourceB));
  };

  const source = report === 'ftr' ? a : b;
  const missing = source ? missingColumns(source.headers, settings.columns, REQUIRED[report]) : [];
  const countries = useMemo(() => {
    const col = settings.columns.country;
    const set = new Set<string>();
    [a, b].forEach((s) => s?.rows.forEach((r) => r[col]?.trim() && set.add(r[col].trim())));
    return [...set].sort();
  }, [a, b, settings.columns.country]);

  const views = { ftr: FtrView, resolution: ResolutionView, created: CreatedView, types: TypesView };
  const View = views[report];

  if (printing) {
    return <PrintReport views={pdfViews} a={a?.rows ?? null} b={b?.rows ?? null} settings={settings} now={now} onDone={() => setPrinting(false)} />;
  }

  return (
    <main className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-baseline gap-3">
          <h1 className="text-xl font-bold">Ticketscope</h1>
          <span className="text-sm text-slate-500">Support ticket analytics from CSV exports · runs fully in your browser</span>
        </div>
        <Button onClick={() => setShowSettings(true)}>Settings</Button>
      </header>

      <UploadPanel a={a} b={b} onFile={onFile} onDemo={loadDemo} onDownloadDemo={downloadDemo} onClear={() => { setA(null); setB(null); setDemo(false); }} demo={demo} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Segmented value={report} onChange={setReport} options={REPORTS} />
        <Button onClick={() => setShowPdf((v) => !v)} disabled={!a && !b}>Create PDF report</Button>
      </div>

      {showPdf && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
          <p className="mb-2 font-medium">Views to include (A4 landscape, opens the print dialog – save as PDF)</p>
          <div className="mb-3 flex flex-wrap gap-3">
            {['Global', ...countries].map((v) => (
              <label key={v} className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={pdfViews.includes(v)}
                  disabled={v === 'Global'}
                  onChange={(e) => setPdfViews((p) => (e.target.checked ? [...p, v] : p.filter((x) => x !== v)))}
                />
                {v}
              </label>
            ))}
          </div>
          <Button variant="primary" onClick={() => setPrinting(true)}>Generate PDF</Button>
        </div>
      )}

      {!source && <p className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-600">{report === 'ftr' ? 'Load Source A' : 'Load Source B'} or click “Load demo data” to explore the app.</p>}
      {source && missing.length > 0 && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Missing columns in {source.name}: {missing.join(', ')}. Adjust the column names in Settings.
        </p>
      )}
      {source && missing.length === 0 && <View rows={source.rows} settings={settings} now={now} />}

      {showSettings && (
        <SettingsModal settings={settings} knownCountries={countries} onSave={setSettings} onReset={resetSettings} onClose={() => setShowSettings(false)} />
      )}
    </main>
  );
}
