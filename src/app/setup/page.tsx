'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SetupPage() {
  const router = useRouter();
  useEffect(() => {
    fetch('/api/auth/needs-setup', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => { if (!d.needsSetup) router.replace('/'); });
  }, [router]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Parolele nu coincid.');
      return;
    }
    if (password.length < 6) {
      setError('Parola trebuie să aibă minim 6 caractere.');
      return;
    }
    setLoading(true);
    try {
      const r = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
        credentials: 'include',
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error || 'Eroare');
        return;
      }
      router.replace('/');
      router.refresh();
    } catch {
      setError('Eroare de conexiune');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4">
      <div className="w-full max-w-sm card">
        <h1 className="text-2xl font-bold text-white mb-1">Configurare inițială</h1>
        <p className="text-slate-400 text-sm mb-6">Aplicația rulează prima dată. Creează contul de administrator (utilizator și parolă).</p>
        <form onSubmit={submit} className="space-y-4">
          {error && <div className="p-3 rounded-lg bg-red-500/20 text-red-400 text-sm">{error}</div>}
          <div>
            <label className="label">Utilizator</label>
            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin" autoComplete="username" required />
          </div>
          <div>
            <label className="label">Parolă</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="min. 6 caractere" autoComplete="new-password" required />
          </div>
          <div>
            <label className="label">Confirmă parola</label>
            <input className="input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" required />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Se configurează...' : 'Configurează și intră'}
          </button>
        </form>
      </div>
    </div>
  );
}
