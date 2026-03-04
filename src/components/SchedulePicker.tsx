'use client';

import { cronToPreset, presetToCron, DAY_NAMES, type SchedulePreset } from '@/lib/schedule-helper';

type Props = {
  value: string;
  onChange: (cron: string) => void;
};

export function SchedulePicker({ value, onChange }: Props) {
  const p = cronToPreset(value || '0 9 * * *');

  const setPreset = (updates: Partial<SchedulePreset>) => {
    const next = { ...p, ...updates };
    onChange(presetToCron(next));
  };

  const toggleDay = (d: number) => {
    const days = p.dayOfWeek.includes(d) ? p.dayOfWeek.filter((x) => x !== d) : [...p.dayOfWeek, d].sort((a, b) => a - b);
    setPreset({ dayOfWeek: days });
  };

  return (
    <div className="space-y-4 rounded-lg border border-surface-border bg-surface/50 p-4">
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-slate-400 text-sm">Frecvență:</span>
        <div className="flex gap-2">
          {(['daily', 'weekly', 'hours'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setPreset({ frequency: f, ...(f === 'weekly' && { dayOfWeek: p.dayOfWeek.length ? p.dayOfWeek : [1] }) })}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                p.frequency === f ? 'bg-brand-500 text-white' : 'bg-surface-light text-slate-400 hover:text-white'
              }`}
            >
              {f === 'daily' ? 'Zilnic' : f === 'weekly' ? 'Săptămânal' : 'La N ore'}
            </button>
          ))}
        </div>
      </div>
      {p.frequency === 'weekly' && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-400 text-sm">Zile:</span>
          {DAY_NAMES.map((name, i) => (
            <button
              key={i}
              type="button"
              onClick={() => toggleDay(i)}
              className={`rounded px-2 py-1 text-sm ${p.dayOfWeek.includes(i) ? 'bg-brand-500 text-white' : 'bg-surface-light text-slate-400 hover:text-white'}`}
            >
              {name}
            </button>
          ))}
        </div>
      )}
      {p.frequency === 'hours' && (
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-sm">La fiecare</span>
          <select
            className="input w-20"
            value={p.everyNHours ?? 1}
            onChange={(e) => setPreset({ everyNHours: parseInt(e.target.value, 10) })}
          >
            {[1, 2, 3, 4, 6, 8, 12].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <span className="text-slate-400 text-sm">ore</span>
        </div>
      )}
      {(p.frequency === 'daily' || p.frequency === 'weekly') && (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-sm">Ora:</span>
            <select
              className="input w-20"
              value={p.hour}
              onChange={(e) => setPreset({ hour: parseInt(e.target.value, 10) })}
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-sm">Minut:</span>
            <select
              className="input w-20"
              value={p.minute}
              onChange={(e) => setPreset({ minute: parseInt(e.target.value, 10) })}
            >
              {[0, 15, 30, 45].map((m) => (
                <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
              ))}
            </select>
          </div>
        </div>
      )}
      <p className="text-xs text-slate-500">Cron: {value || presetToCron(p)}</p>
    </div>
  );
}
