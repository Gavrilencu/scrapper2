'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, UserPlus } from 'lucide-react';

export default function SettingsPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const addUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (password.length < 6) {
      setMessage({ type: 'error', text: 'Parola trebuie să aibă minim 6 caractere.' });
      return;
    }
    setLoading(true);
    try {
      const r = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
        credentials: 'include',
      });
      const data = await r.json();
      if (!r.ok) {
        setMessage({ type: 'error', text: data.error || 'Eroare' });
        return;
      }
      setMessage({ type: 'ok', text: 'Utilizator creat.' });
      setUsername('');
      setPassword('');
    } catch {
      setMessage({ type: 'error', text: 'Eroare de conexiune.' });
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/login';
  };

  return (
    <div className="p-8 max-w-2xl">
      <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6">
        <ArrowLeft className="h-4 w-4" /> Înapoi
      </Link>
      <h1 className="text-3xl font-bold text-white mb-2">Setări</h1>
      <p className="text-slate-400 mb-8">Gestionare utilizatori și sesiune.</p>

      <div className="card space-y-4 mb-8">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <UserPlus className="h-5 w-5" /> Adaugă utilizator
        </h2>
        <p className="text-slate-400 text-sm">Creează un cont nou (utilizator + parolă) pentru acces la aplicație.</p>
        <form onSubmit={addUser} className="space-y-4">
          {message && (
            <div className={`p-3 rounded-lg text-sm ${message.type === 'ok' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              {message.text}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Utilizator</label>
              <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} required />
            </div>
            <div>
              <label className="label">Parolă (min. 6 caractere)</label>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Se creează...' : 'Creează utilizator'}
          </button>
        </form>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-2">Sesiune</h2>
        <p className="text-slate-400 text-sm mb-4">Deconectează-te din aplicație. Va trebui să te autentifici din nou.</p>
        <button type="button" onClick={logout} className="btn-secondary">
          Deconectare
        </button>
      </div>
    </div>
  );
}
