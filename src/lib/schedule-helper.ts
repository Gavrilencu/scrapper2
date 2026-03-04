/**
 * Convertește între cron și setări prietenoase: zi, oră, minut, frecvență.
 * Cron: minut oră zi_lună lună zi_săptămână (0-6, 0=Duminică)
 */

export type SchedulePreset = {
  frequency: 'daily' | 'weekly' | 'hours';
  hour: number;
  minute: number;
  dayOfWeek: number[]; // 0=Dum, 1=Lun, ... 6=Sâm
  everyNHours?: number;
};

export function cronToPreset(cron: string): SchedulePreset {
  const parts = cron.trim().split(/\s+/);
  if (parts.length < 5) return { frequency: 'daily', hour: 9, minute: 0, dayOfWeek: [] };
  const minute = parseInt(parts[0], 10) || 0;
  const hourPart = parts[1];
  const hour = hourPart && hourPart !== '*' && !hourPart.startsWith('*') ? parseInt(hourPart, 10) : 9;
  const dayOfWeek = parts[4];

  if (dayOfWeek && dayOfWeek !== '*' && !dayOfWeek.startsWith('*')) {
    const days = dayOfWeek.split(',').map((d) => parseInt(d.trim(), 10)).filter((n) => !isNaN(n));
    return { frequency: 'weekly', hour, minute, dayOfWeek: days.length ? days : [1] };
  }
  if (hourPart?.startsWith('*/')) {
    const n = parseInt(hourPart.replace('*/', ''), 10);
    return { frequency: 'hours', hour: 0, minute: 0, dayOfWeek: [], everyNHours: isNaN(n) ? 1 : n };
  }
  if (hourPart === '*') return { frequency: 'hours', hour: 0, minute: 0, dayOfWeek: [], everyNHours: 1 };
  return { frequency: 'daily', hour, minute, dayOfWeek: [] };
}

export function presetToCron(p: SchedulePreset): string {
  if (p.frequency === 'hours' && p.everyNHours && p.everyNHours >= 1) {
    return `0 */${p.everyNHours} * * *`;
  }
  if (p.frequency === 'weekly' && p.dayOfWeek.length) {
    const dow = p.dayOfWeek.sort((a, b) => a - b).join(',');
    return `${p.minute} ${p.hour} * * ${dow}`;
  }
  return `${p.minute} ${p.hour} * * *`;
}

export const DAY_NAMES = ['Dum', 'Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm'];
