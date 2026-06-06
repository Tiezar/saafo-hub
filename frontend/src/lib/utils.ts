import type { CalendarEvent, EventDraft } from '../types';

export function getCalendarDays(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  const days: Date[] = [];
  for (let d = first.getDay(); d > 0; d--)
    days.push(new Date(year, month, 1 - d));
  for (let d = 1; d <= last.getDate(); d++)
    days.push(new Date(year, month, d));
  while (days.length % 7 !== 0) {
    const last = days[days.length - 1];
    days.push(new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1));
  }
  return days;
}

export function eventOccursOn(event: CalendarEvent, date: Date): boolean {
  const eventStart = new Date(event.startAt);
  const dateOnly   = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const startOnly  = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate());
  if (event.recurrenceDays.length === 0) return dateOnly.getTime() === startOnly.getTime();
  if (dateOnly < startOnly) return false;
  if (event.recurrenceEndsAt && dateOnly > new Date(event.recurrenceEndsAt)) return false;
  return event.recurrenceDays.includes(date.getDay());
}

export function toDatetimeLocal(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function toDateLocal(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
}

export function formatEventTime(event: CalendarEvent): string {
  if (event.allDay) return 'Dia todo';
  const t = new Date(event.startAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (!event.endAt) return t;
  const te = new Date(event.endAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${t} – ${te}`;
}

export function blankDraft(date?: Date): EventDraft {
  const d = date ?? new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  const dateStr = `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T09:00`;
  return {
    id: null, title: '', type: 'REMINDER',
    startAt: dateStr, endAt: '', allDay: false,
    spaceId: '', subjectId: '', notes: '',
    recurrenceEnabled: false, recurrenceDays: [], recurrenceEndsAt: '',
    reminders: [],
  };
}
