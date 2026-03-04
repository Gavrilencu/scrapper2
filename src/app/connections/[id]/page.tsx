'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plug } from 'lucide-react';

export default function EditConnectionPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const [name, setName] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('1521');
  const [service_name, setServiceName] = useState('');
  const [user_name, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testMessage, setTestMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/connections/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setName(d.name);
        setHost(d.host);
        setPort(String(d.port || 1521));
        setServiceName(d.service_name || '');
        setUserName(d.user_name);
        setPassword('');
      })
      .catch(() => setError('Nu s-a putut încărca'))
      .finally(() => setLoading(false));
  }, [id]);

  const testConnection = async () => {
    setTestMessage(null);
    setTesting(true);
    try {
      if (password) {
        const r = await fetch('/api/connections/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            host,
            port: parseInt(port, 10) || 1521,
            service_name,
            user_name,
            password,
          }),
        });
        const data = await r.json();
        setTestMessage(data.success ? { ok: true, text: 'Conexiune reușită.' } : { ok: false, text: data.error || 'Eroare' });
      } else {
        const r = await fetch(`/api/connections/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'test' }),
        });
        const data = await r.json();
        setTestMessage(data.success ? { ok: true, text: 'Conexiune reușită.' } : { ok: false, text: data.error || 'Eroare' });
      }
    } catch {
      setTestMessage({ ok: false, text: 'Eroare la testare.' });
    } finally {
      setTesting(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name,
        type: 'oracle',
        host,
        port: parseInt(port, 10) || 1521,
        service_name,
        user_name,
      };
      if (password) body.password = password;
      const r = await fetch(`/api/connections/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error((await r.json()).error || 'Eroare');
      router.push('/connections');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-slate-400">Se încarcă...</div>;

  return (
    <div className="p-8 max-w-2xl">
      <Link href="/connections" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6">
        <ArrowLeft className="h-4 w-4" /> Înapoi la conexiuni
      </Link>
      <h1 className="text-3xl font-bold text-white mb-2">Editează conexiune</h1>
      <p className="text-slate-400 mb-8">Lasă parola goală pentru a o păstra neschimbată.</p>
      <form onSubmit={submit} className="card space-y-4">
        {error && <div className="p-3 rounded-lg bg-red-500/20 text-red-400 text-sm">{error}</div>}
        <div>
          <label className="label">Nume conexiune</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Host</label>
            <input className="input" value={host} onChange={(e) => setHost(e.target.value)} required />
          </div>
          <div>
            <label className="label">Port</label>
            <input className="input" type="number" value={port} onChange={(e) => setPort(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Service name</label>
          <input className="input" value={service_name} onChange={(e) => setServiceName(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Utilizator</label>
            <input className="input" value={user_name} onChange={(e) => setUserName(e.target.value)} required />
          </div>
          <div>
            <label className="label">Parolă (gol = neschimbat)</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        </div>
        {testMessage && (
          <div className={`p-3 rounded-lg text-sm ${testMessage.ok ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {testMessage.text}
          </div>
        )}
        <div className="flex flex-wrap gap-3 pt-4">
          <button type="button" onClick={testConnection} disabled={testing} className="btn-secondary flex items-center gap-2">
            <Plug className="h-4 w-4" />
            {testing ? 'Testez...' : 'Testează conexiunea'}
          </button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Se salvează...' : 'Salvează'}
          </button>
          <Link href="/connections" className="btn-secondary">Anulare</Link>
        </div>
      </form>
    </div>
  );
}
