'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Trash2, Edit } from 'lucide-react';

type EmailConfig = {
  id: number;
  name: string;
  host: string;
  port: number;
  from_address: string;
  created_at: string;
};

export default function EmailPage() {
  const [list, setList] = useState<EmailConfig[]>([]);

  const load = () => fetch('/api/email-config').then((r) => r.json()).then(setList);

  useEffect(() => {
    load();
  }, []);

  const remove = async (id: number) => {
    if (!confirm('Ștergi această configurație email?')) return;
    await fetch(`/api/email-config/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Configurare Email</h1>
          <p className="text-slate-400 mt-1">SMTP / Exchange (Outlook) pentru notificări la succes sau eroare job.</p>
        </div>
        <Link href="/email/new" className="btn-primary flex items-center gap-2">
          <Plus className="h-5 w-5" /> Adaugă profil
        </Link>
      </div>
      <div className="card">
        {list.length === 0 ? (
          <p className="text-slate-400 text-center py-12">Nicio configurație email. Adaugă un profil SMTP/Exchange.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-slate-400 text-sm border-b border-surface-border">
                  <th className="pb-3 font-medium">Nume</th>
                  <th className="pb-3 font-medium">Host / Port</th>
                  <th className="pb-3 font-medium">From</th>
                  <th className="pb-3 font-medium w-32">Acțiuni</th>
                </tr>
              </thead>
              <tbody>
                {list.map((e) => (
                  <tr key={e.id} className="border-b border-surface-border/50 hover:bg-surface-light/30">
                    <td className="py-3 text-white font-medium">{e.name}</td>
                    <td className="py-3 text-slate-300">{e.host}:{e.port}</td>
                    <td className="py-3 text-slate-300">{e.from_address}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <Link href={`/email/${e.id}`} className="p-2 rounded-lg bg-surface-light text-slate-300 hover:bg-brand-500/20 hover:text-brand-400" title="Editează">
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button onClick={() => remove(e.id)} className="p-2 rounded-lg bg-surface-light text-slate-300 hover:bg-red-500/20 hover:text-red-400" title="Șterge">
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
