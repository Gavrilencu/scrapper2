'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Database, CalendarCheck, Mail, Activity } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState<{ connections: number; jobs: number; email: number; runs: number }>({
    connections: 0,
    jobs: 0,
    email: 0,
    runs: 0,
  });

  useEffect(() => {
    Promise.all([
      fetch('/api/connections').then((r) => r.json()).then((d) => (Array.isArray(d) ? d.length : 0)),
      fetch('/api/jobs').then((r) => r.json()).then((d) => (Array.isArray(d) ? d.length : 0)),
      fetch('/api/email-config').then((r) => r.json()).then((d) => (Array.isArray(d) ? d.length : 0)),
      fetch('/api/jobs/runs').then((r) => r.json()).then((d) => (Array.isArray(d) ? d.length : 0)),
    ]).then(([connections, jobs, email, runs]) => setStats({ connections, jobs, email, runs }));
  }, []);

  const cards = [
    { label: 'Conexiuni baze de date', value: stats.connections, href: '/connections', icon: Database, color: 'brand' },
    { label: 'Job-uri', value: stats.jobs, href: '/jobs', icon: CalendarCheck, color: 'emerald' },
    { label: 'Configurări email', value: stats.email, href: '/email', icon: Mail, color: 'amber' },
    { label: 'Rulări totale', value: stats.runs, href: '/runs', icon: Activity, color: 'violet' },
  ];

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
      <p className="text-slate-400 mb-8">Bine ai venit. Configurează conexiunile, job-urile și notificările.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map(({ label, value, href, icon: Icon, color }) => (
          <Link key={href} href={href} className="card hover:border-brand-500/50 transition-colors group">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-400 text-sm">{label}</p>
                <p className="text-2xl font-bold text-white mt-1">{value}</p>
              </div>
              <div className="p-2 rounded-lg bg-brand-500/20 text-brand-400 group-hover:scale-110 transition-transform">
                <Icon className="h-6 w-6" />
              </div>
            </div>
          </Link>
        ))}
      </div>
      <div className="card mt-8">
        <h2 className="text-lg font-semibold text-white mb-4">Pași rapizi</h2>
        <ol className="list-decimal list-inside space-y-2 text-slate-300">
          <li>Adaugă o <Link href="/connections" className="text-brand-400 hover:underline">conexiune Oracle</Link>.</li>
          <li>Opțional: configurează <Link href="/email" className="text-brand-400 hover:underline">SMTP/Exchange</Link> pentru notificări.</li>
          <li>Creează un <Link href="/jobs" className="text-brand-400 hover:underline">job</Link>, asociază URL-ul și baza de date.</li>
          <li>Rulează analiza paginii, selectează tabelele/valorile de extras și scripturile de inserare/verificare.</li>
          <li>Seteză programarea (cron) și activează job-ul.</li>
        </ol>
      </div>
    </div>
  );
}
