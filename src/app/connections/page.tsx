'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Trash2, Edit, CheckCircle, XCircle } from 'lucide-react';

type Connection = {
  id: number;
  name: string;
  type: string;
  host: string;
  port: number;
  service_name: string | null;
  user_name: string;
  created_at: string;
};

export default function ConnectionsPage() {
  const [list, setList] = useState<Connection[]>([]);
  const [testing, setTesting] = useState<number | null>(null);
  const [testResult, setTestResult] = useState<{ id: number; ok: boolean; error?: string } | null>(null);

  const load = () => fetch('/api/connections').then((r) => r.json()).then(setList);

  useEffect(() => {
    load();
  }, []);

  const test = async (id: number) => {
    setTesting(id);
    setTestResult(null);
    try {
      const r = await fetch(`/api/connections/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'test' }) });
      const data = await r.json();
      setTestResult({ id, ok: data.success === true, error: data.error });
    } finally {
      setTesting(null);
    }
  };

  const remove = async (id: number) => {
    if (!confirm('Ștergi această conexiune?')) return;
    await fetch(`/api/connections/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Conexiuni baze de date</h1>
          <p className="text-slate-400 mt-1">Configurează conexiuni Oracle (și altele) pentru job-uri.</p>
        </div>
        <Link href="/connections/new" className="btn-primary flex items-center gap-2">
          <Plus className="h-5 w-5" /> Adaugă conexiune
        </Link>
      </div>
      <div className="card">
        {list.length === 0 ? (
          <p className="text-slate-400 text-center py-12">Nicio conexiune. Adaugă una pentru a o asocia job-urilor.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-slate-400 text-sm border-b border-surface-border">
                  <th className="pb-3 font-medium">Nume</th>
                  <th className="pb-3 font-medium">Tip</th>
                  <th className="pb-3 font-medium">Host / Service</th>
                  <th className="pb-3 font-medium">User</th>
                  <th className="pb-3 font-medium w-48">Acțiuni</th>
                </tr>
              </thead>
              <tbody>
                {list.map((c) => (
                  <tr key={c.id} className="border-b border-surface-border/50 hover:bg-surface-light/30">
                    <td className="py-3 text-white font-medium">{c.name}</td>
                    <td className="py-3 text-slate-300">{c.type}</td>
                    <td className="py-3 text-slate-300">{c.host}:{c.port} / {c.service_name}</td>
                    <td className="py-3 text-slate-300">{c.user_name}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => test(c.id)}
                          disabled={testing !== null}
                          className="p-2 rounded-lg bg-surface-light text-slate-300 hover:bg-brand-500/20 hover:text-brand-400 disabled:opacity-50"
                          title="Testează conexiunea"
                        >
                          {testing === c.id ? (
                            <span className="text-sm">...</span>
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                        </button>
                        {testResult?.id === c.id && (
                          <span className="text-sm max-w-[200px] block" title={testResult.error}>
                            {testResult.ok ? (
                              <span className="text-green-400">Conectat</span>
                            ) : (
                              <span className="text-red-400 truncate block">{testResult.error || 'Eroare'}</span>
                            )}
                          </span>
                        )}
                        <Link href={`/connections/${c.id}`} className="p-2 rounded-lg bg-surface-light text-slate-300 hover:bg-brand-500/20 hover:text-brand-400" title="Editează">
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button onClick={() => remove(c.id)} className="p-2 rounded-lg bg-surface-light text-slate-300 hover:bg-red-500/20 hover:text-red-400" title="Șterge">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
