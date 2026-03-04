'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NewEmailPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('587');
  const [secure, setSecure] = useState(false);
  const [user_name, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [from_address, setFromAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const r = await fetch('/api/email-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          host,
          port: parseInt(port, 10) || 587,
          secure,
          user_name,
          password,
          from_address,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Eroare');
      router.push('/email');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl">
      <Link href="/email" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6">
        <ArrowLeft className="h-4 w-4" /> Înapoi
      </Link>
      <h1 className="text-3xl font-bold text-white mb-2">Profil email nou</h1>
      <p className="text-slate-400 mb-8">SMTP sau Exchange (Outlook). Pentru Exchange folosește serverul SMTP al companiei.</p>
      <form onSubmit={submit} className="card space-y-4">
        {error && <div className="p-3 rounded-lg bg-red-500/20 text-red-400 text-sm">{error}</div>}
        <div>
          <label className="label">Nume profil</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: Exchange Firma" required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Host SMTP</label>
            <input className="input" value={host} onChange={(e) => setHost(e.target.value)} placeholder="smtp.office365.com sau smtp.gmail.com" required />
          </div>
          <div>
            <label className="label">Port</label>
            <input className="input" type="number" value={port} onChange={(e) => setPort(e.target.value)} placeholder="587" />
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={secure} onChange={(e) => setSecure(e.target.checked)} className="rounded border-surface-border" />
          <span className="text-slate-300">SSL/TLS (port 465)</span>
        </label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Utilizator</label>
            <input className="input" value={user_name} onChange={(e) => setUserName(e.target.value)} required />
          </div>
          <div>
            <label className="label">Parolă</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
        </div>
        <div>
          <label className="label">Adresă From</label>
          <input className="input" type="email" value={from_address} onChange={(e) => setFromAddress(e.target.value)} placeholder="noreply@firma.ro" required />
        </div>
        <div className="flex gap-3 pt-4">
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Se salvează...' : 'Salvează'}</button>
          <Link href="/email" className="btn-secondary">Anulare</Link>
        </div>
      </form>
    </div>
  );
}
