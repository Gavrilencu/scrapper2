'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function EditEmailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const [name, setName] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('587');
  const [secure, setSecure] = useState(false);
  const [user_name, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [from_address, setFromAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/email-config/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setName(d.name);
        setHost(d.host);
        setPort(String(d.port || 587));
        setSecure(!!d.secure);
        setUserName(d.user_name);
        setFromAddress(d.from_address);
        setPassword('');
      })
      .catch(() => setError('Nu s-a putut încărca'))
      .finally(() => setLoading(false));
  }, [id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name,
        host,
        port: parseInt(port, 10) || 587,
        secure,
        user_name,
        from_address,
      };
      if (password) body.password = password;
      const r = await fetch(`/api/email-config/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error((await r.json()).error || 'Eroare');
      router.push('/email');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-slate-400">Se încarcă...</div>;

  return (
    <div className="p-8 max-w-2xl">
      <Link href="/email" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6">
        <ArrowLeft className="h-4 w-4" /> Înapoi
      </Link>
      <h1 className="text-3xl font-bold text-white mb-2">Editează profil email</h1>
      <p className="text-slate-400 mb-8">Lasă parola goală pentru a o păstra.</p>
      <form onSubmit={submit} className="card space-y-4">
        {error && <div className="p-3 rounded-lg bg-red-500/20 text-red-400 text-sm">{error}</div>}
        <div>
          <label className="label">Nume</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Host SMTP</label>
            <input className="input" value={host} onChange={(e) => setHost(e.target.value)} required />
          </div>
          <div>
            <label className="label">Port</label>
            <input className="input" type="number" value={port} onChange={(e) => setPort(e.target.value)} />
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={secure} onChange={(e) => setSecure(e.target.checked)} className="rounded border-surface-border" />
          <span className="text-slate-300">SSL/TLS</span>
        </label>
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
        <div>
          <label className="label">From</label>
          <input className="input" type="email" value={from_address} onChange={(e) => setFromAddress(e.target.value)} required />
        </div>
        <div className="flex gap-3 pt-4">
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Se salvează...' : 'Salvează'}</button>
          <Link href="/email" className="btn-secondary">Anulare</Link>
        </div>
      </form>
    </div>
  );
}
