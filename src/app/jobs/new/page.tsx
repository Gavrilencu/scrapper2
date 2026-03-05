'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Search, Loader2, Plus, Trash2 } from 'lucide-react';
import { SchedulePicker } from '@/components/SchedulePicker';

type Connection = { id: number; name: string };
type EmailConfig = { id: number; name: string };
type DetectedTable = {
  id: string;
  type: string;
  selector: string;
  headers: string[];
  rows: Record<string, string>[];
  preview: string;
};

export default function NewJobPage() {
  const router = useRouter();
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
  const [error, setError] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [detectedTables, setDetectedTables] = useState<DetectedTable[]>([]);
  const [selectedTableConfig, setSelectedTableConfig] = useState<Record<string, { source: string; target: string }[]>>({});

  useEffect(() => {
    fetch('/api/connections').then((r) => r.json()).then(setConnections);
    fetch('/api/email-config').then((r) => r.json()).then(setEmailConfigs);
  }, []);

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
      setSelectedTableConfig({});
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
    const tables = Object.entries(selectedTableConfig).map(([id, columns]) => {
      const t = detectedTables.find((d) => d.id === id);
      return {
        id,
        selector: t?.selector || `table`,
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
    if (!connection_id) {
      setError('Selectează o conexiune.');
      return;
    }
    const hasTables = Object.keys(selectedTableConfig).length > 0;
    const hasFields = customFields.some((f) => f.selector.trim() && f.variable.trim());
    const config = hasTables || hasFields ? buildExtractionConfig() : extraction_config;
    setSaving(true);
    try {
      const r = await fetch('/api/jobs', {
        method: 'POST',
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
          email_on_success: email_on_success,
          email_on_error: email_on_error,
          success_recipients: success_recipients || null,
          error_recipients: error_recipients || null,
          active,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Eroare');
      const jobId = data.id;
      await fetch('/api/scheduler/reload', { method: 'POST' });
      router.push(`/jobs/${jobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl">
      <Link href="/jobs" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6">
        <ArrowLeft className="h-4 w-4" /> Înapoi la job-uri
      </Link>
      <h1 className="text-3xl font-bold text-white mb-2">Job nou</h1>
      <p className="text-slate-400 mb-8">Configurează URL-ul, conexiunea, extragerea și scripturile.</p>

      <form onSubmit={submit} className="space-y-6">
        {error && <div className="card p-4 bg-red-500/10 border-red-500/30 text-red-400">{error}</div>}

        <div className="card space-y-4">
          <h2 className="text-lg font-semibold text-white">Detalii job</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Nume job</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: Scrape produse zilnic" required />
            </div>
            <div>
              <label className="label">Conexiune bază de date</label>
              <select className="input" value={connection_id} onChange={(e) => setConnectionId(e.target.value ? Number(e.target.value) : '')} required>
                <option value="">Selectează...</option>
                {connections.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">URL de scanat</label>
            <div className="flex gap-2">
              <input className="input flex-1" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
              <button type="button" onClick={analyzeUrl} disabled={analyzing} className="btn-secondary flex items-center gap-2">
                {analyzing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                {analyzing ? 'Analizez...' : 'Analizează'}
              </button>
            </div>
          </div>
          <div>
            <label className="label">Programare</label>
            <SchedulePicker value={cron_expression} onChange={setCronExpression} />
          </div>
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="rounded border-surface-border" />
              <span className="text-slate-300">Job activ</span>
            </label>
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="text-lg font-semibold text-white">XPath / CSS → variabile</h2>
          <p className="text-slate-400 text-sm">Definește selectoare (XPath sau CSS) și numele variabilei. În scripturi folosești {`{{nume_variabilă}}`}. Inserarea și verificarea rulează doar după ce datele sunt extrase în aceste variabile.</p>
          <div>
            <label className="label">Selector rânduri (opțional)</label>
            <input
              className="input font-mono text-sm"
              value={rowSelector}
              onChange={(e) => setRowSelector(e.target.value)}
              placeholder="ex: //table/tbody/tr sau table tbody tr"
            />
            <p className="text-xs text-slate-500 mt-1">Dacă completezi, se generează un rând per element găsit; selectoarele de mai jos sunt relative la fiecare rând.</p>
          </div>
          <div className="space-y-2">
            {customFields.map((f, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  className="input flex-1 font-mono text-sm"
                  placeholder="XPath sau CSS (ex: //span[@class='price'] sau .preț)"
                  value={f.selector}
                  onChange={(e) => {
                    const next = [...customFields];
                    next[i] = { ...next[i], selector: e.target.value };
                    setCustomFields(next);
                  }}
                />
                <input
                  className="input w-40 font-mono text-sm"
                  placeholder="Variabilă"
                  value={f.variable}
                  onChange={(e) => {
                    const next = [...customFields];
                    next[i] = { ...next[i], variable: e.target.value };
                    setCustomFields(next);
                  }}
                />
                <button type="button" onClick={() => setCustomFields(customFields.filter((_, j) => j !== i))} className="p-2 text-red-400 hover:bg-red-500/20 rounded">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setCustomFields([...customFields, { selector: '', variable: '' }])}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <Plus className="h-4 w-4" /> Adaugă câmp (XPath/CSS → variabilă)
            </button>
          </div>
        </div>

        {detectedTables.length > 0 && (
          <div className="card space-y-4">
            <h2 className="text-lg font-semibold text-white">Tabele detectate – selectează și mapează coloane</h2>
            <p className="text-slate-400 text-sm">Bifează tabelele de extras. Coloana „Target” este numele folosit în scripturi (ex: INSERT INTO t (col) VALUES ({`'{{nume_col}}'`})).</p>
            {detectedTables.map((t) => {
              const selected = !!selectedTableConfig[t.id];
              const columns = selectedTableConfig[t.id] || [];
              return (
                <div key={t.id} className="rounded-lg border border-surface-border p-4 bg-surface/50">
                  <label className="flex items-center gap-2 cursor-pointer mb-3">
                    <input type="checkbox" checked={selected} onChange={(e) => toggleTable(t, e.target.checked)} className="rounded border-surface-border" />
                    <span className="font-medium text-white">{t.id}</span>
                    <span className="text-slate-500 text-sm">({t.rows?.length || 0} rânduri)</span>
                  </label>
                  {selected && (
                    <div className="ml-6 space-y-2">
                      {t.headers.map((h) => (
                        <div key={h} className="flex items-center gap-3">
                          <span className="text-slate-400 w-40">{h}</span>
                          <input
                            className="input flex-1 max-w-xs"
                            placeholder="Nume coloană destinație"
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
          <h2 className="text-lg font-semibold text-white">Script verificare (înainte de inserare)</h2>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={use_before_insert} onChange={(e) => setUseBeforeInsert(e.target.checked)} className="rounded border-surface-border" />
            <span className="text-slate-300">Folosește script de verificare</span>
          </label>
          <p className="text-slate-400 text-sm">Când e activat: inserarea se face doar dacă scriptul returnează COUNT = 0. Când e dezactivat: se inserează mereu (scriptul de verificare e ignorat).</p>
          <textarea
            className="input font-mono text-sm min-h-[100px]"
            value={before_insert_script}
            onChange={(e) => setBeforeInsertScript(e.target.value)}
            placeholder="SELECT COUNT(*) AS COUNT FROM mytable WHERE col = '{{col}}'"
          />
        </div>

        <div className="card space-y-4">
          <h2 className="text-lg font-semibold text-white">Script inserare</h2>
          <p className="text-slate-400 text-sm">Folosește {`{{nume_coloană}}`} sau :nume_coloană pentru valorile extrase. Data/ora: {`{{now_yyyy_mm_dd}}`} (an-lună-zi), {`{{now_dd_mm_yyyy}}`} (zi.lună.an), {`{{now_dd_mm_yyyy_hh_mi_ss}}`} (zi.lună.an oră:min:sec), {`{{now_yyyy_mm_dd_hh_mi_ss}}`}, {`{{now_time}}`}.</p>
          <textarea
            className="input font-mono text-sm min-h-[120px]"
            value={insert_script}
            onChange={(e) => setInsertScript(e.target.value)}
            placeholder="INSERT INTO mytable (col1, data_inserare) VALUES ('{{col1}}', '{{now_yyyy_mm_dd_hh_mi_ss}}')"
          />
        </div>

        <div className="card space-y-4">
          <h2 className="text-lg font-semibold text-white">Notificări email</h2>
          <div>
            <label className="label">Profil email (SMTP/Exchange)</label>
            <select className="input" value={email_config_id} onChange={(e) => setEmailConfigId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">Fără notificări</option>
              {emailConfigs.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={email_on_success} onChange={(e) => setEmailOnSuccess(e.target.checked)} className="rounded border-surface-border" />
              <span className="text-slate-300">Email la succes</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={email_on_error} onChange={(e) => setEmailOnError(e.target.checked)} className="rounded border-surface-border" />
              <span className="text-slate-300">Email la eroare</span>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Destinatari succes (email-uri separate prin virgulă)</label>
              <input className="input" value={success_recipients} onChange={(e) => setSuccessRecipients(e.target.value)} placeholder="a@firma.ro, b@firma.ro" />
            </div>
            <div>
              <label className="label">Destinatari eroare</label>
              <input className="input" value={error_recipients} onChange={(e) => setErrorRecipients(e.target.value)} placeholder="admin@firma.ro" />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Se salvează...' : 'Creează job'}
          </button>
          <Link href="/jobs" className="btn-secondary">Anulare</Link>
        </div>
      </form>
    </div>
  );
}
