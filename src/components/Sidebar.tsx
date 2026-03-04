'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Database, Mail, CalendarCheck, LayoutDashboard, History, BookOpen, Settings, LogOut } from 'lucide-react';

const nav = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/connections', label: 'Conexiuni DB', icon: Database },
  { href: '/jobs', label: 'Job-uri', icon: CalendarCheck },
  { href: '/email', label: 'Configurare Email', icon: Mail },
  { href: '/runs', label: 'Istoric rulări', icon: History },
  { href: '/documentatie', label: 'Documentație', icon: BookOpen },
  { href: '/settings', label: 'Setări', icon: Settings },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="fixed left-0 top-0 z-30 h-full w-64 border-r border-surface-border bg-surface flex flex-col">
      <div className="p-6 border-b border-surface-border">
        <h1 className="text-xl font-bold text-white">Scrapper Pro</h1>
        <p className="text-xs text-slate-400 mt-0.5">Extragere date & planificare</p>
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const isActive = path === href || (href !== '/' && path.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive ? 'bg-brand-500/20 text-brand-400' : 'text-slate-400 hover:bg-surface-light hover:text-slate-200'
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-surface-border">
        <button
          type="button"
          onClick={async () => {
            await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
            window.location.href = '/login';
          }}
          className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-surface-light hover:text-slate-200 transition-colors"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          Deconectare
        </button>
      </div>
    </aside>
  );
}
