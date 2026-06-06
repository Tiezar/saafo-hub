import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft, ChevronRight, Plus, Clock, Repeat, Bell, X, Check, RotateCw,
  ChevronDown, ChevronUp, Settings, Pencil, Trash2,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { DAYS_PT_SHORT, MONTHS_PT, getEventMeta, REMINDER_PRESETS } from '../lib/constants';
import { getCalendarDays, eventOccursOn, formatEventTime, blankDraft } from '../lib/utils';
import { EventIcon, AVAILABLE_EVENT_ICONS } from '../components/EventIcon';
import type { UserEventType } from '../types';
import './Calendar.css';


export default function CalendarPage() {
  const {
    calendarEvents, calendarMonth, setCalendarMonth,
    eventModalOpen, eventDraft, setEventDraft, draftSaving,
    openCreateEventWithData, openEditEvent, handleSaveEvent, handleDeleteEvent, closeEventModal,
    quickCreateEvent, fetchCalendarEvents, subjects, spaces, currentUser,
    eventTypes, handleCreateEventType, handleUpdateEventType, handleDeleteEventType,
  } = useApp();

  const [tab, setTab] = useState<'month' | 'agenda'>('month');

  // Quick-add state
  const [quickTitle,  setQuickTitle]  = useState('');
  const [quickType,   setQuickType]   = useState('');
  const [quickDate,   setQuickDate]   = useState(() => new Date().toISOString().slice(0, 10));
  const [quickAllDay, setQuickAllDay] = useState(true);
  const [quickSaving, setQuickSaving] = useState(false);
  const quickTitleRef = useRef<HTMLInputElement>(null);

  // Modal advanced section
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Event types management modal
  const [typesModalOpen, setTypesModalOpen] = useState(false);
  const [editingType,    setEditingType]    = useState<UserEventType | null>(null);
  const [typeName,  setTypeName]  = useState('');
  const [typeColor, setTypeColor] = useState('#6366f1');
  const [typeIcon,  setTypeIcon]  = useState('Calendar');
  const [typesSaving, setTypesSaving] = useState(false);

  const year  = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();

  useEffect(() => {
    fetchCalendarEvents(year, month + 1);
  }, [year, month]); // eslint-disable-line react-hooks/exhaustive-deps

  // Set default quickType when eventTypes loads
  useEffect(() => {
    if (eventTypes.length && !quickType) setQuickType(eventTypes[0].id);
  }, [eventTypes]); // eslint-disable-line react-hooks/exhaustive-deps

  const days  = getCalendarDays(year, month);
  const today = new Date();

  const eventsForDay = (date: Date) => calendarEvents.filter(ev => eventOccursOn(ev, date));

  const toDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

  const handleDayClick = (date: Date) => {
    setQuickDate(toDateStr(date));
    quickTitleRef.current?.focus();
  };

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    setQuickSaving(true);
    const startAt = quickAllDay ? `${quickDate}T00:00` : `${quickDate}T09:00`;
    await quickCreateEvent(quickTitle.trim(), quickType, startAt, quickAllDay);
    setQuickTitle('');
    setQuickSaving(false);
  };

  const handleMoreOptions = () => {
    const startAt = quickAllDay ? `${quickDate}T00:00` : `${quickDate}T09:00`;
    openCreateEventWithData({ title: quickTitle, type: quickType, startAt, allDay: quickAllDay });
    setAdvancedOpen(false);
  };

  const addReminder = () => setEventDraft(d => ({ ...d, reminders: [...d.reminders, { minutesBefore: 60, method: 'WHATSAPP' }] }));
  const removeReminder = (i: number) => setEventDraft(d => ({ ...d, reminders: d.reminders.filter((_, idx) => idx !== i) }));
  const updateReminder = (i: number, patch: Partial<{ minutesBefore: number; method: string }>) =>
    setEventDraft(d => ({ ...d, reminders: d.reminders.map((r, idx) => idx === i ? { ...r, ...patch } : r) }));

  // ── Type management modal helpers ─────────────────────────────────────────
  function openNewType() {
    setEditingType(null); setTypeName(''); setTypeColor('#6366f1'); setTypeIcon('Calendar');
    setTypesModalOpen(true);
  }
  function openEditType(t: UserEventType) {
    setEditingType(t); setTypeName(t.name); setTypeColor(t.color); setTypeIcon(t.icon);
    setTypesModalOpen(true);
  }
  async function saveType() {
    if (!typeName.trim()) return;
    setTypesSaving(true);
    try {
      if (editingType) {
        await handleUpdateEventType(editingType.id, { name: typeName.trim(), color: typeColor, icon: typeIcon });
      } else {
        await handleCreateEventType(typeName.trim(), typeColor, typeIcon);
      }
      setTypesModalOpen(false);
    } finally { setTypesSaving(false); }
  }
  async function removeType(id: string) {
    if (!window.confirm('Excluir este tipo de evento?')) return;
    await handleDeleteEventType(id);
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Calendário</h1>
          <p className="page-subtitle">Organize provas, entregas e blocos de estudo</p>
        </div>
        <button className="btn-secondary" style={{ width: 'auto', padding: '8px 14px' }}
          onClick={() => setTypesModalOpen(true)}>
          <Settings size={15} /> Tipos de evento
        </button>
      </div>

      {/* Quick-add bar */}
      <form onSubmit={handleQuickSubmit} className="glass-card" style={{ marginBottom: 20, padding: '14px 16px' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input ref={quickTitleRef} type="text" className="form-input"
            placeholder="Título do evento..."
            value={quickTitle} onChange={e => setQuickTitle(e.target.value)}
            style={{ flex: '1 1 200px', minWidth: 0 }} />
          <input type="date" className="form-input" value={quickDate}
            onChange={e => setQuickDate(e.target.value)} style={{ width: 160 }} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <input type="checkbox" checked={quickAllDay} onChange={e => setQuickAllDay(e.target.checked)} />
            Dia todo
          </label>
          <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '8px 18px' }}
            disabled={quickSaving || !quickTitle.trim()}>
            {quickSaving ? <RotateCw size={14} className="animate-spin" /> : <Plus size={14} />}
            Criar
          </button>
          <button type="button"
            onClick={handleMoreOptions}
            style={{ background: 'none', border: 'none', color: 'var(--color-primary-light)', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Mais opções →
          </button>
        </div>

        {/* Type chips */}
        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
          {eventTypes.map(et => (
            <button key={et.id} type="button"
              onClick={() => setQuickType(et.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '4px 12px', borderRadius: 20, border: `1px solid ${et.color}44`,
                cursor: 'pointer', fontSize: 11, fontWeight: 600,
                background: quickType === et.id ? `${et.color}22` : 'transparent',
                color: quickType === et.id ? et.color : 'var(--text-secondary)',
              }}>
              <EventIcon name={et.icon} size={11} color={quickType === et.id ? et.color : 'var(--text-muted)'} />
              {et.name}
            </button>
          ))}
        </div>
      </form>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setCalendarMonth(new Date(year, month - 1, 1))}
            style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px 10px' }}>
            <ChevronLeft size={16} />
          </button>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, margin: 0 }}>
            {MONTHS_PT[month]} {year}
          </h2>
          <button onClick={() => setCalendarMonth(new Date(year, month + 1, 1))}
            style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px 10px' }}>
            <ChevronRight size={16} />
          </button>
          <button onClick={() => setCalendarMonth(new Date())}
            style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px 10px', fontSize: 12 }}>
            Hoje
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['month', 'agenda'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{
                padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border-color)',
                cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: tab === t ? 'var(--color-primary)' : 'transparent',
                color: tab === t ? 'white' : 'var(--text-secondary)',
              }}>
              {t === 'month' ? 'Mês' : 'Agenda'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'month' ? (
        <>
          <div className="calendar-container">
            <div className="calendar-grid-header">
              {DAYS_PT_SHORT.map(d => <div key={d} className="calendar-grid-header-day">{d}</div>)}
            </div>
            <div className="calendar-grid-body">
              {days.map((day, i) => {
                const isToday   = day.toDateString() === today.toDateString();
                const isCurrent = day.getMonth() === month;
                const dayEvts   = eventsForDay(day);
                return (
                  <div key={i}
                    className={`calendar-day-cell ${isCurrent ? 'current-month' : 'other-month'} ${isToday ? 'today' : ''}`}
                    onClick={() => handleDayClick(day)}>
                    <div className="calendar-day-cell-number">{day.getDate()}</div>
                    <div className="calendar-events-list">
                      {dayEvts.slice(0, 3).map((ev, ei) => {
                        const meta = getEventMeta(ev.type, eventTypes);
                        return (
                          <div key={ei} className="calendar-event-item"
                            style={{ background: `${meta.color}22`, color: meta.color, borderLeft: `2px solid ${meta.color}` }}
                            onClick={e => { e.stopPropagation(); openEditEvent(ev); }}>
                            {ev.title}
                          </div>
                        );
                      })}
                    </div>
                    {dayEvts.length > 3 && <div style={{ fontSize: 10, color: 'var(--text-muted)', paddingLeft: 4 }}>+{dayEvts.length - 3} mais</div>}
                  </div>
                );
              })}
            </div>
          </div>
          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
            {eventTypes.map(et => (
              <div key={et.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                <EventIcon name={et.icon} size={12} color={et.color} />
                {et.name}
              </div>
            ))}
          </div>
        </>
      ) : (
        <AgendaView events={calendarEvents} today={today} subjects={subjects} openEditEvent={openEditEvent} eventTypes={eventTypes} />
      )}

      {/* ── Event Modal ────────────────────────────────────────────────────── */}
      {eventModalOpen && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) closeEventModal(); }}>
          <div className="modal" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3>{eventDraft.id ? 'Editar Evento' : 'Novo Evento'}</h3>
              <button onClick={closeEventModal} className="btn-ghost btn-icon"><X size={18} /></button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <div className="form-group">
                <label className="form-label">Título *</label>
                <input type="text" className="form-input" placeholder="Nome do evento" autoFocus
                  value={eventDraft.title} onChange={e => setEventDraft(d => ({ ...d, title: e.target.value }))} />
              </div>

              <div className="form-group">
                <label className="form-label">Tipo</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {eventTypes.map(et => (
                    <button key={et.id} type="button"
                      onClick={() => setEventDraft(d => ({ ...d, type: et.id }))}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '6px 14px', borderRadius: 20, border: `1px solid ${et.color}44`,
                        cursor: 'pointer', fontSize: 12, fontWeight: 600,
                        background: eventDraft.type === et.id || eventDraft.type === et.key ? `${et.color}22` : 'transparent',
                        color: eventDraft.type === et.id || eventDraft.type === et.key ? et.color : 'var(--text-secondary)',
                      }}>
                      <EventIcon name={et.icon} size={12} color={eventDraft.type === et.id || eventDraft.type === et.key ? et.color : 'var(--text-muted)'} />
                      {et.name}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'end' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">{eventDraft.allDay ? 'Data' : 'Data e Horário'}</label>
                  <input type={eventDraft.allDay ? 'date' : 'datetime-local'} className="form-input"
                    value={eventDraft.allDay ? eventDraft.startAt.split('T')[0] : eventDraft.startAt}
                    onChange={e => setEventDraft(d => ({ ...d, startAt: eventDraft.allDay ? e.target.value + 'T00:00' : e.target.value }))}
                    required />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={eventDraft.allDay}
                      onChange={e => setEventDraft(d => ({ ...d, allDay: e.target.checked }))} />
                    Dia todo
                  </label>
                </div>
              </div>

              <button type="button" onClick={() => setAdvancedOpen(o => !o)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center',
                  background: 'none', border: '1px dashed var(--border-color)', borderRadius: 8,
                  color: 'var(--text-muted)', cursor: 'pointer', padding: '8px', fontSize: 13,
                  marginBottom: advancedOpen ? 16 : 0, width: '100%',
                }}>
                {advancedOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {advancedOpen ? 'Ocultar configurações avançadas' : 'Configurações avançadas (término, matéria, lembretes…)'}
              </button>

              {advancedOpen && (
                <>
                  {!eventDraft.allDay && (
                    <div className="form-group">
                      <label className="form-label">Horário de término (opcional)</label>
                      <input type="datetime-local" className="form-input" value={eventDraft.endAt}
                        onChange={e => setEventDraft(d => ({ ...d, endAt: e.target.value }))} />
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Área (opcional)</label>
                      <select className="form-input" value={eventDraft.spaceId}
                        onChange={e => setEventDraft(d => ({ ...d, spaceId: e.target.value }))}>
                        <option value="">Sem área</option>
                        {spaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Matéria (opcional)</label>
                      <select className="form-input" value={eventDraft.subjectId}
                        onChange={e => setEventDraft(d => ({ ...d, subjectId: e.target.value }))}>
                        <option value="">Sem matéria</option>
                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Notas (opcional)</label>
                    <textarea className="form-input" rows={2} style={{ resize: 'vertical' }}
                      value={eventDraft.notes} onChange={e => setEventDraft(d => ({ ...d, notes: e.target.value }))}
                      placeholder="Observações..." />
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 8 }}>
                      <input type="checkbox" checked={eventDraft.recurrenceEnabled}
                        onChange={e => setEventDraft(d => ({ ...d, recurrenceEnabled: e.target.checked, recurrenceDays: [] }))} />
                      <Repeat size={14} /> <span style={{ fontSize: 13, fontWeight: 600 }}>Repetir semanalmente</span>
                    </label>
                    {eventDraft.recurrenceEnabled && (
                      <div>
                        <div className="calendar-recurrence-row">
                          {DAYS_PT_SHORT.map((day, idx) => (
                            <button key={idx} type="button"
                              onClick={() => setEventDraft(d => ({
                                ...d,
                                recurrenceDays: d.recurrenceDays.includes(idx)
                                  ? d.recurrenceDays.filter(x => x !== idx)
                                  : [...d.recurrenceDays, idx],
                              }))}
                              className={`calendar-recurrence-dot ${eventDraft.recurrenceDays.includes(idx) ? 'active' : ''}`}>
                              {day.charAt(0)}
                            </button>
                          ))}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Termina em:</span>
                          <input type="date" className="form-input" style={{ flex: 1 }} value={eventDraft.recurrenceEndsAt}
                            onChange={e => setEventDraft(d => ({ ...d, recurrenceEndsAt: e.target.value }))} />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="form-group">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <label className="form-label" style={{ margin: 0 }}><Bell size={12} style={{ marginRight: 4 }} />Lembretes</label>
                      <button type="button" onClick={addReminder}
                        style={{ fontSize: 12, color: 'var(--color-primary-light)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                        + Adicionar
                      </button>
                    </div>
                    {eventDraft.reminders.map((r, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                        <select className="form-input" style={{ flex: 2 }} value={r.minutesBefore}
                          onChange={e => updateReminder(i, { minutesBefore: Number(e.target.value) })}>
                          {REMINDER_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                        </select>
                        <select className="form-input" style={{ flex: 1 }} value={r.method}
                          onChange={e => updateReminder(i, { method: e.target.value })}>
                          <option value="WHATSAPP">WhatsApp</option>
                          <option value="EMAIL">Email</option>
                        </select>
                        <button type="button" onClick={() => removeReminder(i)}
                          style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}>
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                    {!currentUser?.phone && eventDraft.reminders.some(r => r.method === 'WHATSAPP') && (
                      <p style={{ fontSize: 12, color: 'var(--color-warning)', marginTop: 4 }}>
                        Adicione seu WhatsApp no perfil para receber lembretes.
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="modal-footer">
              {eventDraft.id && (
                <button type="button"
                  style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
                  onClick={() => handleDeleteEvent(eventDraft.id!)}>
                  Excluir evento
                </button>
              )}
              <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                <button type="button" className="btn-secondary" style={{ width: 'auto', padding: '8px 20px' }}
                  onClick={closeEventModal}>Cancelar</button>
                <button type="button" className="btn-primary" style={{ width: 'auto', padding: '8px 20px' }}
                  onClick={handleSaveEvent} disabled={draftSaving}>
                  {draftSaving ? <RotateCw size={14} className="animate-spin" /> : <Check size={14} />}
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Event Types Management Modal ──────────────────────────────────── */}
      {typesModalOpen && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setTypesModalOpen(false); }}>
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3>Tipos de Evento</h3>
              <button onClick={() => setTypesModalOpen(false)} className="btn-ghost btn-icon"><X size={18} /></button>
            </div>
            <div className="modal-body">
              {/* List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {eventTypes.map(et => (
                  <div key={et.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                    borderRadius: 8, background: 'var(--bg-surface)', border: '1px solid var(--border-color)',
                  }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: `${et.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <EventIcon name={et.icon} size={16} color={et.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{et.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{et.isSystem ? 'Padrão' : 'Personalizado'}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => openEditType(et)} title="Editar"
                        style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 7, borderRadius: 6, display: 'flex', alignItems: 'center' }}>
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => removeType(et.id)} title="Excluir"
                        style={{ background: 'rgba(255,180,171,0.08)', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: 7, borderRadius: 6, display: 'flex', alignItems: 'center' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Form: create or edit */}
              <div style={{ padding: 16, borderRadius: 10, background: 'var(--bg-overlay)', border: '1px solid var(--color-primary)40' }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>
                  {editingType ? 'Editar tipo' : 'Novo tipo'}
                </div>
                <div className="form-group">
                  <label className="form-label">Nome</label>
                  <input type="text" className="form-input" value={typeName}
                    onChange={e => setTypeName(e.target.value)} placeholder="Ex: Simulado, Apresentação..." maxLength={40} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Cor</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="color" value={typeColor} onChange={e => setTypeColor(e.target.value)}
                        style={{ width: 36, height: 36, padding: 2, borderRadius: 6, border: '1px solid var(--border-color)', cursor: 'pointer', background: 'transparent' }} />
                      <input type="text" className="form-input" value={typeColor}
                        onChange={e => setTypeColor(e.target.value)} style={{ fontFamily: 'monospace', fontSize: 13 }} />
                    </div>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Ícone selecionado</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}>
                      <EventIcon name={typeIcon} size={16} color={typeColor} />
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{typeIcon}</span>
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <label className="form-label">Escolher ícone</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 6 }}>
                    {AVAILABLE_EVENT_ICONS.map(name => (
                      <button key={name} type="button" title={name}
                        onClick={() => setTypeIcon(name)}
                        style={{
                          padding: 8, borderRadius: 7, border: `1px solid ${typeIcon === name ? typeColor : 'var(--border-subtle)'}`,
                          background: typeIcon === name ? `${typeColor}20` : 'transparent',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                        <EventIcon name={name} size={16} color={typeIcon === name ? typeColor : 'var(--text-muted)'} />
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
                  {editingType && (
                    <button type="button" onClick={() => { setEditingType(null); setTypeName(''); setTypeColor('#6366f1'); setTypeIcon('Calendar'); }}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}>
                      Cancelar edição
                    </button>
                  )}
                  <button type="button" className="btn-primary" style={{ width: 'auto', padding: '9px 20px' }}
                    onClick={saveType} disabled={typesSaving || !typeName.trim()}>
                    {typesSaving ? <RotateCw size={14} className="animate-spin" /> : <Check size={14} />}
                    {editingType ? 'Salvar' : 'Criar tipo'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AgendaView({
  events, today, subjects, openEditEvent, eventTypes,
}: {
  events: ReturnType<typeof useApp>['calendarEvents'];
  today: Date;
  subjects: ReturnType<typeof useApp>['subjects'];
  openEditEvent: ReturnType<typeof useApp>['openEditEvent'];
  eventTypes: ReturnType<typeof useApp>['eventTypes'];
}) {
  const agendaDays: { date: Date; events: typeof events }[] = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    const evts = events.filter(ev => eventOccursOn(ev, d));
    if (evts.length) agendaDays.push({ date: d, events: evts });
  }

  if (!agendaDays.length) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '48px 0' }}>
        <p style={{ color: 'var(--text-muted)' }}>Nenhum evento nos próximos 30 dias.</p>
      </div>
    );
  }

  const getGroupLabel = (date: Date) => {
    const diff = Math.floor((date.getTime() - today.getTime()) / 86400000);
    if (diff === 0) return 'Hoje';
    if (diff === 1) return 'Amanhã';
    if (diff <= 7)  return 'Esta semana';
    return 'Próximas semanas';
  };

  let lastGroup = '';

  return (
    <div>
      {agendaDays.map(({ date, events: dayEvts }) => {
        const group = getGroupLabel(date);
        const showGroupLabel = group !== lastGroup;
        lastGroup = group;
        return (
          <React.Fragment key={date.toDateString()}>
            {showGroupLabel && (
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8, marginTop: 4 }}>
                {group}
              </div>
            )}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 8, flexShrink: 0,
                  background: date.toDateString() === today.toDateString() ? 'var(--color-primary)' : 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1 }}>{date.getDate()}</div>
                  <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.7 }}>{DAYS_PT_SHORT[date.getDay()]}</div>
                </div>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{MONTHS_PT[date.getMonth()]}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 52 }}>
                {dayEvts.map(ev => {
                  const meta = getEventMeta(ev.type, eventTypes);
                  const subj = subjects.find(s => s.id === ev.subjectId);
                  return (
                    <div key={ev.id} onClick={() => openEditEvent(ev)}
                      style={{
                        padding: '12px 16px', background: 'var(--bg-surface)',
                        border: '1px solid var(--border-color)', borderLeft: `4px solid ${meta.color}`,
                        borderRadius: '0 8px 8px 0', cursor: 'pointer', transition: 'var(--transition)',
                      }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
                            <EventIcon name={meta.icon} size={14} color={meta.color} />
                            {ev.title}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Clock size={10} /> {formatEventTime(ev)}
                            {ev.recurrenceDays.length > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Repeat size={10} /> recorrente</span>}
                            {subj && <span>· {subj.name}</span>}
                          </div>
                        </div>
                        <span style={{ fontSize: 10, color: meta.color, fontWeight: 700, background: `${meta.color}22`, padding: '2px 8px', borderRadius: 10 }}>
                          {meta.label}
                        </span>
                      </div>
                      {ev.notes && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{ev.notes}</p>}
                      {ev.reminders.filter(r => !r.sent).length > 0 && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Bell size={10} /> {ev.reminders.filter(r => !r.sent).length} lembrete(s) ativo(s)
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}
