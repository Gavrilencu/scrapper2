'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

type Run = {
  id: number;
  job_id: number;
  started_at: string;
  finished_at: string | null;
  status: string;
  rows_inserted: number;
  error_message: string | null;
};

type Job = { id: number; name: string };

export default function RunsPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [jobs, setJobs] = useState<Record<number, string>>({});
  const [jobFilter, setJobFilter] = useState<string>('');

  useEffect(() => {
    fetch('/api/jobs/runs').then((r) => r.json()).then(setRuns);
    fetch('/api/jobs').then((r) => r.json()).then((list: Job[]) => {
      const map: Record<number, string> = {};
      list.forEach((j) => { map[j.id] = j.name; });
      setJobs(map);
    });
  }, []);

  const filtered = jobFilter
    ? runs.filter((r) => String(r.job_id) === jobFilter)
    : runs;

  const formatDate = (s: string | null) => s ? new Date(s).toLocaleString('ro-RO') : '-';

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Istoric rulări</h1>
          <p className="text-slate-400 mt-1">Toate execuțiile job-urilor.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-sm">Job:</span>
          <select
            className="input w-auto min-w-[200px]"
            value={jobFilter}
            onChange={(e) => setJobFilter(e.target.value)}
          >
            <option value="">Toate</option>
            {Object.entries(jobs).map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <p className="text-slate-400 text-center py-12">Nicio rulare înregistrată.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-slate-400 text-sm border-b border-surface-border">
                  <th className="pb-3 font-medium">Job</th>
                  <th className="pb-3 font-medium">Început</th>
                  <th className="pb-3 font-medium">Sfârșit</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Rânduri</th>
                  <th className="pb-3 font-medium">Eroare</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-surface-border/50 hover:bg-surface-light/30">
                    <td className="py-3 text-white font-medium">
                      <Link href={`/jobs/${r.job_id}`} className="hover:text-brand-400">{jobs[r.job_id] || r.job_id}</Link>
                    </td>
                    <td className="py-3 text-slate-300">{formatDate(r.started_at)}</td>
                    <td className="py-3 text-slate-300">{formatDate(r.finished_at)}</td>
                    <td className="py-3">
                      {r.status === 'success' && <span className="flex items-center gap-1 text-green-400"><CheckCircle className="h-4 w-4" /> Succes</span>}
                      {r.status === 'error' && <span className="flex items-center gap-1 text-red-400"><XCircle className="h-4 w-4" /> Eroare</span>}
                      {r.status === 'running' && <span className="flex items-center gap-1 text-amber-400"><Clock className="h-4 w-4" /> În curs</span>}
                    </td>
                    <td className="py-3 text-slate-300">{r.rows_inserted}</td>
                    <td className="py-3 text-slate-400 max-w-xs truncate" title={r.error_message || ''}>{r.error_message || '-'}</td>
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
