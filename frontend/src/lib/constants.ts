export const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000';

export const EVENT_TYPES = [
  { value: 'EXAM',          label: 'Prova',            color: '#ef4444', emoji: '📝' },
  { value: 'DEADLINE',      label: 'Entrega',           color: '#f97316', emoji: '⏰' },
  { value: 'FIXED_BLOCK',   label: 'Bloco Fixo',        color: '#3b82f6', emoji: '🔒' },
  { value: 'REMINDER',      label: 'Lembrete',          color: '#8b5cf6', emoji: '🔔' },
  { value: 'STUDY_SESSION', label: 'Sessão de Estudo',  color: '#10b981', emoji: '📚' },
] as const;

export const REMINDER_PRESETS = [
  { value: 15,    label: '15 min antes' },
  { value: 30,    label: '30 min antes' },
  { value: 60,    label: '1 hora antes' },
  { value: 120,   label: '2 horas antes' },
  { value: 480,   label: '8 horas antes' },
  { value: 1440,  label: '1 dia antes'  },
  { value: 2880,  label: '2 dias antes' },
  { value: 10080, label: '1 semana antes' },
] as const;

export const DAYS_PT_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

export function getEventMeta(type: string) {
  return EVENT_TYPES.find(e => e.value === type) ?? EVENT_TYPES[3];
}
