import type { UserEventType } from '../types';

export const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000';

// Static fallback metadata for legacy event type keys (EXAM, DEADLINE, etc.)
const FALLBACK_META: Record<string, { label: string; color: string; icon: string }> = {
  EXAM:          { label: 'Prova',            color: '#ef4444', icon: 'GraduationCap' },
  DEADLINE:      { label: 'Entrega',          color: '#f97316', icon: 'Flag'          },
  FIXED_BLOCK:   { label: 'Bloco Fixo',       color: '#3b82f6', icon: 'Layers'        },
  REMINDER:      { label: 'Lembrete',         color: '#8b5cf6', icon: 'Bell'          },
  STUDY_SESSION: { label: 'Sessão de Estudo', color: '#10b981', icon: 'BookOpen'      },
};

export function getEventMeta(type: string, userTypes?: UserEventType[]) {
  if (userTypes?.length) {
    const found = userTypes.find(t => t.id === type || t.key === type);
    if (found) return { label: found.name, color: found.color, icon: found.icon };
  }
  return FALLBACK_META[type] ?? { label: 'Evento', color: '#6366f1', icon: 'Calendar' };
}

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
