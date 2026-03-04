'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Trash2, Edit, Play, Pause } from 'lucide-react';

type Job = {
  id: number;
  name: string;
  connection_id: number;
  connection_name: string;
  url: string;
  cron_expression: string;
  active: number;
};

export default function JobsPage() {
  const [list, setList] = useState<Job[]>([]);
  const [running, setRunning] = useState<number | null>(null);

  const load = () => fetch('/api/jobs').then((r) => r.json()).then(setList);

  useEffect(() => {
    load();
  }, []);

  const runNow = async (id: number) => {
    setRunning(id);
    try {
      const r = await fetch(`/api/jobs/${id}/run`, { method: 'POST' });
      const data = await r.json();
      if (data.success) alert(`Succes. Rânduri inserate: ${data.rowsInserted}`);
      else alert('Eroare: ' + (data.error || 'necunoscută'));
    } finally {
      setRunning(null);
      load();
    }
  };

  const remove = async (id: number) => {
    if (!confirm('Ștergi acest job și istoricul de rulări?')) return;
    await fetch(`/api/jobs/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Job-uri</h1>
          <p className="text-slate-400 mt-1">Planifică extragerea de date și inserarea în baza de date.</p>
        </div>
        <Link href="/jobs/new" className="btn-primary flex items-center gap-2">
          <Plus className="h-5 w-5" /> Job nou
        </Link>
      </div>
      <div className="card">
        {list.length === 0 ? (
          <p className="text-slate-400 text-center py-12">Niciun job. Creează unul și asociază un URL și o conexiune.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-slate-400 text-sm border-b border-surface-border">
                  <th className="pb-3 font-medium">Nume</th>
                  <th className="pb-3 font-medium">Conexiune</th>
                  <th className="pb-3 font-medium">URL</th>
                  <th className="pb-3 font-medium">Programare (cron)</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium w-40">Acțiuni</th>
                </tr>
              </thead>
              <tbody>
                {list.map((j) => (
                  <tr key={j.id} className="border-b border-surface-border/50 hover:bg-surface-light/30">
                    <td className="py-3 text-white font-medium">{j.name}</td>
                    <td className="py-3 text-slate-300">{j.connection_name || '-'}</td>
                    <td className="py-3 text-slate-300 max-w-xs truncate" title={j.url}>{j.url}</td>
                    <td className="py-3 text-slate-300 font-mono text-sm">{j.cron_expression}</td>
                    <td className="py-3">
                      <span className={j.active ? 'text-green-400' : 'text-slate-500'}>
                        {j.active ? 'Activ' : 'Oprit'}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => runNow(j.id)}
                          disabled={running !== null}
                          className="p-2 rounded-lg bg-surface-light text-slate-300 hover:bg-brand-500/20 hover:text-brand-400 disabled:opacity-50"
                          title="Rulează acum"
                        >
                          <Play className="h-4 w-4" />
                        </button>
                        <Link href={`/jobs/${j.id}`} className="p-2 rounded-lg bg-surface-light text-slate-300 hover:bg-brand-500/20 hover:text-brand-400" title="Editează">
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button onClick={() => remove(j.id)} className="p-2 rounded-lg bg-surface-light text-slate-300 hover:bg-red-500/20 hover:text-red-400" title="Șterge">
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
