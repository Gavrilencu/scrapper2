'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error || 'Eroare la autentificare');
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
        <h1 className="text-2xl font-bold text-white mb-1">Scrapper Pro</h1>
        <p className="text-slate-400 text-sm mb-6">Autentificare</p>
        <form onSubmit={submit} className="space-y-4">
          {error && <div className="p-3 rounded-lg bg-red-500/20 text-red-400 text-sm">{error}</div>}
          <div>
            <label className="label">Utilizator</label>
            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
          </div>
          <div>
            <label className="label">Parolă</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Se verifică...' : 'Conectare'}
          </button>
        </form>
      </div>
    </div>
  );
}
