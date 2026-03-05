'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Search, Loader2, Play, Plus, Trash2 } from 'lucide-react';
import { SchedulePicker } from '@/components/SchedulePicker';

type Connection = { id: number; name: string };
type EmailConfig = { id: number; name: string };
type DetectedTable = { id: string; type: string; selector: string; headers: string[]; rows: Record<string, string>[]; preview: string };

export default function EditJobPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [emailConfigs, setEmailConfigs] = useState<EmailConfig[]>([]);
  const [name, setName] = useState('');
  const [connection_id, setConnectionId] = useState<number | ''>('');
  const [email_config_id, setEmailConfigId] = useState<number | ''>('');
  const [url, setUrl] = useState('');
  const [cron_expression, setCronExpression] = useState('0 * * * *');
  const [extraction_config, setExtractionConfig] = useState<{
    tables?: { id: string; selector: string; columns: { source: string; target: string }[]; type: string }[];
    fields?: { selector: string; variable: string }[];
    rowSelector?: string;
  } | null>(null);
  const [customFields, setCustomFields] = useState<{ selector: string; variable: string }[]>([]);
  const [rowSelector, setRowSelector] = useState('');
  const [insert_script, setInsertScript] = useState('');
  const [before_insert_script, setBeforeInsertScript] = useState('');
  const [use_before_insert, setUseBeforeInsert] = useState(true);
  const [email_on_success, setEmailOnSuccess] = useState(true);
  const [email_on_error, setEmailOnError] = useState(true);
  const [success_recipients, setSuccessRecipients] = useState('');
  const [error_recipients, setErrorRecipients] = useState('');
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [detectedTables, setDetectedTables] = useState<DetectedTable[]>([]);
  const [selectedTableConfig, setSelectedTableConfig] = useState<Record<string, { source: string; target: string }[]>>({});

  useEffect(() => {
    fetch('/api/connections').then((r) => r.json()).then(setConnections);
    fetch('/api/email-config').then((r) => r.json()).then(setEmailConfigs);
  }, []);

  useEffect(() => {
    fetch(`/api/jobs/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setName(d.name);
        setConnectionId(d.connection_id);
        setEmailConfigId(d.email_config_id || '');
        setUrl(d.url);
        setCronExpression(d.cron_expression || '0 * * * *');
        setExtractionConfig(d.extraction_config ? (typeof d.extraction_config === 'string' ? JSON.parse(d.extraction_config) : d.extraction_config) : null);
        setInsertScript(d.insert_script || '');
        setBeforeInsertScript(d.before_insert_script || '');
        setUseBeforeInsert(d.use_before_insert !== 0);
        setEmailOnSuccess(!!d.email_on_success);
        setEmailOnError(!!d.email_on_error);
        setSuccessRecipients(d.success_recipients || '');
        setErrorRecipients(d.error_recipients || '');
        setActive(!!d.active);
        if (d.extraction_config) {
          const cfg = typeof d.extraction_config === 'string' ? JSON.parse(d.extraction_config) : d.extraction_config;
          const sel: Record<string, { source: string; target: string }[]> = {};
          (cfg.tables || []).forEach((t: { id: string; columns: { source: string; target: string }[] }) => {
            sel[t.id] = t.columns || [];
          });
          setSelectedTableConfig(sel);
          setCustomFields(cfg.fields || []);
          setRowSelector(cfg.rowSelector || '');
        }
      })
      .catch(() => setError('Nu s-a putut încărca job-ul'))
      .finally(() => setLoading(false));
  }, [id]);

  const analyzeUrl = async () => {
    if (!url.trim()) {
      setError('Introdu URL-ul de analizat.');
      return;
    }
    setError('');
    setAnalyzing(true);
    try {
      const r = await fetch('/api/scrape/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Eroare analiză');
      setDetectedTables(data.tables || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setDetectedTables([]);
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleTable = (t: DetectedTable, selected: boolean) => {
    if (selected) {
      const cols = t.headers.map((h) => ({ source: h, target: h }));
      setSelectedTableConfig((prev) => ({ ...prev, [t.id]: cols }));
    } else {
      setSelectedTableConfig((prev) => {
        const next = { ...prev };
        delete next[t.id];
        return next;
      });
    }
  };

  const setColumnTarget = (tableId: string, source: string, target: string) => {
    setSelectedTableConfig((prev) => {
      const arr = prev[tableId] ? [...prev[tableId]] : [];
      const i = arr.findIndex((c) => c.source === source);
      if (i >= 0) arr[i] = { ...arr[i], target };
      else arr.push({ source, target });
      return { ...prev, [tableId]: arr };
    });
  };

  const buildExtractionConfig = () => {
    const tables = Object.entries(selectedTableConfig).map(([tid, columns]) => {
      const t = detectedTables.find((d) => d.id === tid);
      return {
        id: tid,
        selector: t?.selector || 'table',
        type: t?.type || 'html_table',
        columns: columns.filter((c) => c.source),
      };
    });
    const fields = customFields.filter((f) => f.selector.trim() && f.variable.trim());
    return {
      tables: tables.length ? tables : undefined,
      fields: fields.length ? fields : undefined,
      rowSelector: rowSelector.trim() || undefined,
    };
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const hasTables = Object.keys(selectedTableConfig).length > 0;
    const hasFields = customFields.some((f) => f.selector.trim() && f.variable.trim());
    const config = hasTables || hasFields ? buildExtractionConfig() : extraction_config;
    setSaving(true);
    try {
      const r = await fetch(`/api/jobs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          connection_id,
          email_config_id: email_config_id || null,
          url,
          cron_expression,
          extraction_config: config,
          insert_script: insert_script || null,
          before_insert_script: before_insert_script || null,
          use_before_insert,
          email_on_success,
          email_on_error,
          success_recipients: success_recipients || null,
          error_recipients: error_recipients || null,
          active,
        }),
      });
      if (!r.ok) throw new Error((await r.json()).error || 'Eroare');
      await fetch('/api/scheduler/reload', { method: 'POST' });
      router.push('/jobs');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const runNow = async () => {
    setRunning(true);
    setError('');
    try {
      const r = await fetch(`/api/jobs/${id}/run`, { method: 'POST' });
      const data = await r.json();
      if (data.success) alert(`Succes. Rânduri inserate: ${data.rowsInserted}`);
      else setError(data.error || 'Eroare la rulare');
    } finally {
      setRunning(false);
    }
  };

  if (loading) return <div className="p-8 text-slate-400">Se încarcă...</div>;

  return (
    <div className="p-8 max-w-4xl">
      <Link href="/jobs" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6">
        <ArrowLeft className="h-4 w-4" /> Înapoi la job-uri
      </Link>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Editează job</h1>
          <p className="text-slate-400 mt-1">Modifică configurația și salvează.</p>
        </div>
        <button type="button" onClick={runNow} disabled={running} className="btn-primary flex items-center gap-2">
          {running ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
          {running ? 'Rulează...' : 'Rulează acum'}
        </button>
      </div>

      <form onSubmit={submit} className="space-y-6">
        {error && <div className="card p-4 bg-red-500/10 border-red-500/30 text-red-400">{error}</div>}

        <div className="card space-y-4">
          <h2 className="text-lg font-semibold text-white">Detalii job</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Nume job</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="label">Conexiune</label>
              <select className="input" value={connection_id} onChange={(e) => setConnectionId(e.target.value ? Number(e.target.value) : '')} required>
                <option value="">Selectează...</option>
                {connections.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">URL</label>
            <div className="flex gap-2">
              <input className="input flex-1" value={url} onChange={(e) => setUrl(e.target.value)} />
              <button type="button" onClick={analyzeUrl} disabled={analyzing} className="btn-secondary flex items-center gap-2">
                {analyzing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                Analizează
              </button>
            </div>
          </div>
          <div>
            <label className="label">Programare</label>
            <SchedulePicker value={cron_expression} onChange={setCronExpression} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="rounded border-surface-border" />
            <span className="text-slate-300">Activ</span>
          </label>
        </div>

        <div className="card space-y-4">
          <h2 className="text-lg font-semibold text-white">XPath / CSS → variabile</h2>
          <p className="text-slate-400 text-sm">Selectoare (XPath sau CSS) și nume variabilă. Folosești {`{{nume}}`} în scripturi. Inserarea/verificarea rulează după extragere.</p>
          <div>
            <label className="label">Selector rânduri (opțional)</label>
            <input className="input font-mono text-sm" value={rowSelector} onChange={(e) => setRowSelector(e.target.value)} placeholder="ex: //table/tbody/tr" />
          </div>
          <div className="space-y-2">
            {customFields.map((f, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input className="input flex-1 font-mono text-sm" placeholder="XPath sau CSS" value={f.selector} onChange={(e) => { const n = [...customFields]; n[i] = { ...n[i], selector: e.target.value }; setCustomFields(n); }} />
                <input className="input w-40 font-mono text-sm" placeholder="Variabilă" value={f.variable} onChange={(e) => { const n = [...customFields]; n[i] = { ...n[i], variable: e.target.value }; setCustomFields(n); }} />
                <button type="button" onClick={() => setCustomFields(customFields.filter((_, j) => j !== i))} className="p-2 text-red-400 hover:bg-red-500/20 rounded"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            <button type="button" onClick={() => setCustomFields([...customFields, { selector: '', variable: '' }])} className="btn-secondary flex items-center gap-2 text-sm">
              <Plus className="h-4 w-4" /> Adaugă câmp
            </button>
          </div>
        </div>

        {detectedTables.length > 0 && (
          <div className="card space-y-4">
            <h2 className="text-lg font-semibold text-white">Tabele detectate</h2>
            {detectedTables.map((t) => {
              const selected = !!selectedTableConfig[t.id];
              const columns = selectedTableConfig[t.id] || [];
              return (
                <div key={t.id} className="rounded-lg border border-surface-border p-4 bg-surface/50">
                  <label className="flex items-center gap-2 cursor-pointer mb-3">
                    <input type="checkbox" checked={selected} onChange={(e) => toggleTable(t, e.target.checked)} className="rounded border-surface-border" />
                    <span className="font-medium text-white">{t.id}</span>
                  </label>
                  {selected && (
                    <div className="ml-6 space-y-2">
                      {t.headers.map((h) => (
                        <div key={h} className="flex items-center gap-3">
                          <span className="text-slate-400 w-40">{h}</span>
                          <input
                            className="input flex-1 max-w-xs"
                            value={columns.find((c) => c.source === h)?.target ?? h}
                            onChange={(e) => setColumnTarget(t.id, h, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="card space-y-4">
          <h2 className="text-lg font-semibold text-white">Script verificare</h2>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={use_before_insert} onChange={(e) => setUseBeforeInsert(e.target.checked)} className="rounded border-surface-border" />
            <span className="text-slate-300">Folosește script de verificare</span>
          </label>
          <p className="text-slate-400 text-sm">Activ: inserează doar dacă COUNT = 0. Dezactivat: inserează mereu.</p>
          <textarea className="input font-mono text-sm min-h-[100px]" value={before_insert_script} onChange={(e) => setBeforeInsertScript(e.target.value)} placeholder="SELECT COUNT(*) AS COUNT FROM ..." />
        </div>

        <div className="card space-y-4">
          <h2 className="text-lg font-semibold text-white">Script inserare</h2>
          <p className="text-slate-400 text-sm">Variabile: {`{{nume_coloană}}`}. Data/ora: {`{{now_yyyy_mm_dd}}`}, {`{{now_dd_mm_yyyy}}`}, {`{{now_dd_mm_yyyy_hh_mi_ss}}`}, {`{{now_yyyy_mm_dd_hh_mi_ss}}`}, {`{{now_time}}`}.</p>
          <textarea className="input font-mono text-sm min-h-[120px]" value={insert_script} onChange={(e) => setInsertScript(e.target.value)} placeholder="INSERT INTO ..." />
        </div>

        <div className="card space-y-4">
          <h2 className="text-lg font-semibold text-white">Email</h2>
          <div>
            <label className="label">Profil email</label>
            <select className="input" value={email_config_id} onChange={(e) => setEmailConfigId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">Fără</option>
              {emailConfigs.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={email_on_success} onChange={(e) => setEmailOnSuccess(e.target.checked)} className="rounded border-surface-border" /><span className="text-slate-300">Email la succes</span></label>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={email_on_error} onChange={(e) => setEmailOnError(e.target.checked)} className="rounded border-surface-border" /><span className="text-slate-300">Email la eroare</span></label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Destinatari succes</label>
              <input className="input" value={success_recipients} onChange={(e) => setSuccessRecipients(e.target.value)} />
            </div>
            <div>
              <label className="label">Destinatari eroare</label>
              <input className="input" value={error_recipients} onChange={(e) => setErrorRecipients(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Se salvează...' : 'Salvează'}</button>
          <Link href="/jobs" className="btn-secondary">Anulare</Link>
        </div>
      </form>
    </div>
  );
}
