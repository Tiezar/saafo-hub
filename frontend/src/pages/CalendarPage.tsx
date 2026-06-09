import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft, ChevronRight, Plus, Clock, Repeat, Bell, X, Check, RotateCw,
  ChevronDown, ChevronUp, Settings, Pencil, Trash2, Calendar,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { DAYS_PT_SHORT, MONTHS_PT, getEventMeta, REMINDER_PRESETS } from '../lib/constants';
import { getCalendarDays, eventOccursOn, formatEventTime } from '../lib/utils';
import { EventIcon, AVAILABLE_EVENT_ICONS } from '../components/EventIcon';
import type { UserEventType } from '../types';
import './Calendar.css';
import CustomSelect from '../components/CustomSelect';


export default function CalendarPage() {
  const {
    calendarEvents, calendarMonth, setCalendarMonth,
    eventModalOpen, eventDraft, setEventDraft, draftSaving,
    openCreateEventWithData, openEditEvent, handleSaveEvent, handleDeleteEvent, closeEventModal,
    quickCreateEvent, fetchCalendarEvents, subjects, spaces, currentUser,
    eventTypes, handleCreateEventType, handleUpdateEventType, handleDeleteEventType,
    weeklyRoutines,
  } = useApp();

  const [tab, setTab] = useState<'month' | 'agenda'>('month');

  const [showRoutine, setShowRoutine] = useState(() => {
    return localStorage.getItem('calendar_show_routine') !== 'false';
  });

  const handleToggleRoutine = (val: boolean) => {
    setShowRoutine(val);
    localStorage.setItem('calendar_show_routine', String(val));
  };

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
    <div className="page" style={{ padding: 0 }}>
      {/* Quick Add Bar */}
      <form onSubmit={handleQuickSubmit} className="hairline-b" style={{ backgroundColor: 'var(--bg-surface)', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'row', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <label className="academic-label">Novo Evento</label>
            <input
              ref={quickTitleRef}
              type="text"
              className="academic-input"
              style={{ fontSize: 18, border: 'none', borderBottom: '1px solid var(--border-color)' }}
              placeholder="Título do evento ou compromisso..."
              value={quickTitle}
              onChange={e => setQuickTitle(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="academic-label" style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 0 }}>
                <Clock size={14} /> Data:
              </span>
              <input
                type="date"
                className="academic-input"
                style={{ width: 130, border: 'none', borderBottom: '1px solid var(--border-color)', padding: '4px 0', fontFamily: 'var(--font-label)', fontSize: 13 }}
                value={quickDate}
                onChange={e => setQuickDate(e.target.value)}
              />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-label)', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={quickAllDay}
                onChange={e => setQuickAllDay(e.target.checked)}
                style={{ accentColor: 'var(--color-primary)' }}
              />
              DIA TODO
            </label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {eventTypes.map(et => {
                const isSelected = quickType === et.id;
                return (
                  <button
                    key={et.id}
                    type="button"
                    onClick={() => setQuickType(et.id)}
                    className="chip-event"
                    style={{
                      borderColor: et.color,
                      color: et.color,
                      backgroundColor: isSelected ? `${et.color}15` : 'transparent',
                      opacity: isSelected ? 1 : 0.5,
                      borderStyle: 'solid',
                      borderWidth: '1px',
                    }}
                  >
                    {et.name}
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderLeft: '1px solid var(--border-color)', paddingLeft: 16 }}>
              <button
                type="button"
                onClick={handleMoreOptions}
                style={{
                  fontSize: 12,
                  fontFamily: 'var(--font-label)',
                  textTransform: 'uppercase',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  textDecoration: 'underline',
                  textUnderlineOffset: '4px',
                }}
              >
                Mais opções
              </button>
              <button
                type="submit"
                className="btn-oxblood"
                disabled={quickSaving || !quickTitle.trim()}
              >
                {quickSaving ? <RotateCw size={14} className="animate-spin" /> : <Plus size={14} />}
                Criar
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Toolbar & Navigation */}
      <div style={{ padding: '24px 24px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 300, color: 'var(--text-primary)', margin: 0 }}>
            {MONTHS_PT[month]} {year}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              onClick={() => setCalendarMonth(new Date(year, month - 1, 1))}
              style={{
                width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '50%', cursor: 'pointer', transition: 'background-color var(--transition)',
                color: 'var(--text-secondary)', border: 'none'
              }}
              onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--bg-surface)'}
              onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => setCalendarMonth(new Date(year, month + 1, 1))}
              style={{
                width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '50%', cursor: 'pointer', transition: 'background-color var(--transition)',
                color: 'var(--text-secondary)', border: 'none'
              }}
              onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--bg-surface)'}
              onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <ChevronRight size={20} />
            </button>
          </div>
          <button className="btn-outline-custom" onClick={() => setCalendarMonth(new Date())}>
            Hoje
          </button>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-label)', fontWeight: 600, marginRight: 8 }}>
            <input
              type="checkbox"
              checked={showRoutine}
              onChange={e => handleToggleRoutine(e.target.checked)}
              style={{ accentColor: 'var(--color-primary)' }}
            />
            MOSTRAR ROTINA
          </label>
          <button className="btn-outline-custom" onClick={() => setTypesModalOpen(true)} style={{ gap: 8 }}>
            <Settings size={14} /> Tipos de Evento
          </button>
          <div style={{ display: 'flex', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 3, backgroundColor: 'var(--bg-surface)' }}>
            <button
              onClick={() => setTab('month')}
              style={{
                padding: '6px 16px', borderRadius: 'var(--radius-sm)', fontSize: 13, cursor: 'pointer', transition: 'all 0.2s',
                fontFamily: 'var(--font-body)',
                backgroundColor: tab === 'month' ? 'var(--bg-card-high)' : 'transparent',
                color: tab === 'month' ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: 'none',
                fontWeight: tab === 'month' ? 600 : 500,
              }}
            >
              Mês
            </button>
            <button
              onClick={() => setTab('agenda')}
              style={{
                padding: '6px 16px', borderRadius: 'var(--radius-sm)', fontSize: 13, cursor: 'pointer', transition: 'all 0.2s',
                fontFamily: 'var(--font-body)',
                backgroundColor: tab === 'agenda' ? 'var(--bg-card-high)' : 'transparent',
                color: tab === 'agenda' ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: 'none',
                fontWeight: tab === 'agenda' ? 600 : 500,
              }}
            >
              Agenda
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid View Area */}
      <div style={{ padding: '0 24px 48px' }}>
        {tab === 'month' ? (
          <>
            <div className="cal-grid" style={{ borderBottom: 'none' }}>
              {DAYS_PT_SHORT.map(d => <div key={d} className="cal-header-cell">{d}</div>)}
            </div>
            <div className="cal-grid">
              {days.map((day, i) => {
                const isToday   = day.toDateString() === today.toDateString();
                const isCurrent = day.getMonth() === month;
                const dayEvts   = eventsForDay(day);
                const dayRoutineSlots = showRoutine
                  ? weeklyRoutines
                      .filter(r => r.days.includes(day.getDay()))
                      .flatMap(r => r.slots.map(s => ({
                        isRoutine: true,
                        id: `routine-${r.id}-${s.startTime}`,
                        title: `${r.label} (${s.startTime})`,
                        color: r.color,
                      })))
                  : [];
                
                const maxEventsToShow = 3;
                const displayedEvts = dayEvts.slice(0, maxEventsToShow);
                const remainingSlotsCount = maxEventsToShow - displayedEvts.length;
                const displayedRoutines = remainingSlotsCount > 0 ? dayRoutineSlots.slice(0, remainingSlotsCount) : [];
                const totalEventsCount = dayEvts.length + dayRoutineSlots.length;

                return (
                  <div key={i}
                    className={`cal-cell ${isCurrent ? '' : 'other-month'} ${isToday ? 'today' : ''}`}
                    onClick={() => handleDayClick(day)}>
                    <div className="cal-cell-number">{day.getDate()}</div>
                    <div className="calendar-events-list">
                      {displayedEvts.map((ev, ei) => {
                        const meta = getEventMeta(ev.type, eventTypes);
                        return (
                          <div key={ei} className="calendar-event-item"
                            style={{ background: `${meta.color}18`, color: meta.color, borderLeft: `2px solid ${meta.color}` }}
                            onClick={e => { e.stopPropagation(); openEditEvent(ev); }}>
                            {ev.title}
                          </div>
                        );
                      })}
                      {displayedRoutines.map((r) => (
                        <div key={r.id} className="calendar-event-item"
                          style={{
                            background: 'transparent',
                            color: r.color,
                            border: `1px dotted ${r.color}`,
                            fontStyle: 'italic',
                            opacity: 0.6,
                            cursor: 'default',
                          }}
                          onClick={e => e.stopPropagation()}>
                          {r.title}
                        </div>
                      ))}
                    </div>
                    {totalEventsCount > maxEventsToShow && (
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', paddingLeft: 4 }}>
                        +{totalEventsCount - maxEventsToShow} mais
                      </div>
                    )}
                  </div>
                );
              })}
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
          <AgendaView
            events={calendarEvents}
            today={today}
            subjects={subjects}
            openEditEvent={openEditEvent}
            eventTypes={eventTypes}
            showRoutine={showRoutine}
            weeklyRoutines={weeklyRoutines}
          />
        )}
      </div>

      {/* ── Event Modal ────────────────────────────────────────────────────── */}
      {eventModalOpen && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) closeEventModal(); }}>
          <div className="modal" style={{ maxWidth: 600, backgroundColor: 'var(--bg-base)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 0, overflow: 'hidden' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)', padding: '16px 24px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20 }}>{eventDraft.id ? 'Detalhes do Evento' : 'Novo Evento'}</h3>
              <button onClick={closeEventModal} className="btn-ghost btn-icon"><X size={18} /></button>
            </div>

            <div className="modal-body" style={{ padding: 24, overflowY: 'auto', maxHeight: '70vh' }}>
              <div className="swiss-grid">
                <div style={{ gridColumn: 'span 12', marginBottom: 20 }}>
                  <label className="academic-label">Título</label>
                  <input type="text" className="academic-input" style={{ fontSize: 20, fontWeight: 500 }} placeholder="Título do evento" autoFocus
                    value={eventDraft.title} onChange={e => setEventDraft(d => ({ ...d, title: e.target.value }))} />
                </div>

                <div style={{ gridColumn: 'span 6', marginBottom: 20 }}>
                  <label className="academic-label">{eventDraft.allDay ? 'Data' : 'Data de Início'}</label>
                  <input type={eventDraft.allDay ? 'date' : 'datetime-local'} className="academic-input" style={{ fontFamily: 'var(--font-label)', fontSize: 14 }}
                    value={eventDraft.allDay ? eventDraft.startAt.split('T')[0] : eventDraft.startAt}
                    onChange={e => {
                      const newStartAt = eventDraft.allDay ? e.target.value + 'T00:00' : e.target.value;
                      setEventDraft(d => {
                        const patch: any = { startAt: newStartAt };
                        if (d.endAt) {
                          const newDatePart = newStartAt.split('T')[0];
                          const oldTimePart = d.endAt.split('T')[1] || '10:00';
                          patch.endAt = `${newDatePart}T${oldTimePart}`;
                        }
                        return { ...d, ...patch };
                      });
                    }}
                    required />
                </div>

                <div style={{ gridColumn: 'span 6', marginBottom: 20, display: 'flex', alignItems: 'flex-end', paddingBottom: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-label)' }}>
                    <input type="checkbox" checked={eventDraft.allDay}
                      onChange={e => setEventDraft(d => ({ ...d, allDay: e.target.checked }))} />
                    DIA TODO
                  </label>
                </div>

                <div style={{ gridColumn: 'span 12', marginBottom: 24 }}>
                  <label className="academic-label">Tipo</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                    {eventTypes.map(et => {
                      const isSelected = eventDraft.type === et.id || eventDraft.type === et.key;
                      return (
                        <button key={et.id} type="button"
                          onClick={() => setEventDraft(d => ({ ...d, type: et.id }))}
                          className="chip-event"
                          style={{
                            borderColor: et.color,
                            color: et.color,
                            backgroundColor: isSelected ? `${et.color}15` : 'transparent',
                            opacity: isSelected ? 1 : 0.5,
                            borderStyle: 'solid',
                            borderWidth: '1px',
                          }}>
                          {et.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Advanced Toggle Button */}
                <div style={{ gridColumn: 'span 12', marginBottom: 20 }}>
                  <button type="button" onClick={() => setAdvancedOpen(o => !o)}
                    className="btn-outline-custom"
                    style={{ width: '100%', borderStyle: 'dashed' }}>
                    {advancedOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {advancedOpen ? 'Ocultar configurações avançadas' : 'Configurações avançadas (término, matéria, lembretes…)'}
                  </button>
                </div>

                {advancedOpen && (
                  <>
                    {!eventDraft.allDay && (
                      <div style={{ gridColumn: 'span 12', marginBottom: 20 }}>
                        <label className="academic-label">Horário de término (opcional)</label>
                        <input type="time" className="academic-input" style={{ fontFamily: 'var(--font-label)', fontSize: 14 }}
                          value={eventDraft.endAt ? (eventDraft.endAt.split('T')[1] || '') : ''}
                          onChange={e => {
                            const newEndTime = e.target.value;
                            setEventDraft(d => {
                              if (!newEndTime) return { ...d, endAt: '' };
                              const datePart = d.startAt.split('T')[0];
                              return { ...d, endAt: `${datePart}T${newEndTime}` };
                            });
                          }} />
                      </div>
                    )}
                    <div style={{ gridColumn: 'span 6', marginBottom: 20 }}>
                      <label className="academic-label">Área</label>
                      <CustomSelect
                        variant="academic"
                        value={eventDraft.spaceId || ''}
                        onChange={v => setEventDraft(d => ({ ...d, spaceId: v || undefined }))}
                        options={[
                          { value: '', label: 'Sem área' },
                          ...spaces.map(s => ({ value: s.id, label: s.name })),
                        ]}
                      />
                    </div>
                    <div style={{ gridColumn: 'span 6', marginBottom: 20 }}>
                      <label className="academic-label">Matéria</label>
                      <CustomSelect
                        variant="academic"
                        value={eventDraft.subjectId || ''}
                        onChange={v => setEventDraft(d => ({ ...d, subjectId: v || undefined }))}
                        options={[
                          { value: '', label: 'Sem matéria' },
                          ...subjects.map(s => ({ value: s.id, label: s.name })),
                        ]}
                      />
                    </div>
                    <div style={{ gridColumn: 'span 12', marginBottom: 20 }}>
                      <label className="academic-label">Anotações Marginais</label>
                      <textarea className="academic-input" style={{ minHeight: 80, resize: 'vertical' }}
                        placeholder="Detalhes, referências, links..."
                        value={eventDraft.notes || ''} onChange={e => setEventDraft(d => ({ ...d, notes: e.target.value }))} />
                    </div>

                    <div style={{ gridColumn: 'span 12', marginBottom: 20 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 8 }}>
                        <input type="checkbox" checked={eventDraft.recurrenceEnabled}
                          onChange={e => setEventDraft(d => ({ ...d, recurrenceEnabled: e.target.checked, recurrenceDays: [] }))} />
                        <Repeat size={14} /> <span style={{ fontSize: 13, fontWeight: 600 }}>Repetir semanalmente</span>
                      </label>
                      {eventDraft.recurrenceEnabled && (
                        <div style={{ marginTop: 12 }}>
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Termina em:</span>
                            <input type="date" className="academic-input" style={{ width: 150, fontFamily: 'var(--font-label)', fontSize: 13 }} value={eventDraft.recurrenceEndsAt}
                              onChange={e => setEventDraft(d => ({ ...d, recurrenceEndsAt: e.target.value }))} />
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{ gridColumn: 'span 12', marginBottom: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <label className="academic-label" style={{ margin: 0 }}><Bell size={12} style={{ marginRight: 4 }} />Lembretes</label>
                        <button type="button" onClick={addReminder}
                          style={{ fontSize: 12, color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                          + Adicionar
                        </button>
                      </div>
                      {eventDraft.reminders.map((r, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                          <CustomSelect
                            variant="academic"
                            style={{ flex: 2 }}
                            value={String(r.minutesBefore)}
                            onChange={v => updateReminder(i, { minutesBefore: Number(v) })}
                            options={REMINDER_PRESETS.map(p => ({ value: String(p.value), label: p.label }))}
                          />
                          <CustomSelect
                            variant="academic"
                            style={{ flex: 1 }}
                            value={r.method}
                            onChange={v => updateReminder(i, { method: v })}
                            options={[
                              { value: 'WHATSAPP', label: 'WhatsApp' },
                              { value: 'EMAIL', label: 'Email' },
                            ]}
                          />
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
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {eventDraft.id ? (
                <button type="button"
                  style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', fontFamily: 'var(--font-label)' }}
                  onClick={() => handleDeleteEvent(eventDraft.id!)}>
                  Excluir evento
                </button>
              ) : <div />}
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn-outline-custom" onClick={closeEventModal}>Cancelar</button>
                <button type="button" className="btn-oxblood" onClick={handleSaveEvent} disabled={draftSaving}>
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
          <div className="modal" style={{ maxWidth: 480, backgroundColor: 'var(--bg-base)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 0, overflow: 'hidden' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)', padding: '16px 24px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20 }}>Tipos de Evento</h3>
              <button onClick={() => setTypesModalOpen(false)} className="btn-ghost btn-icon"><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ padding: 24, overflowY: 'auto', maxHeight: '70vh' }}>
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
              <div style={{ padding: 16, borderRadius: 10, background: 'var(--bg-overlay)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, fontFamily: 'var(--font-label)', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                  {editingType ? 'Editar tipo' : 'Novo tipo'}
                </div>
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="academic-label">Nome</label>
                  <input type="text" className="academic-input" value={typeName}
                    onChange={e => setTypeName(e.target.value)} placeholder="Ex: Simulado, Apresentação..." maxLength={40} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="academic-label">Cor</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="color" value={typeColor} onChange={e => setTypeColor(e.target.value)}
                        style={{ width: 36, height: 36, padding: 2, borderRadius: 6, border: '1px solid var(--border-color)', cursor: 'pointer', background: 'transparent' }} />
                      <input type="text" className="academic-input" value={typeColor}
                        onChange={e => setTypeColor(e.target.value)} style={{ fontFamily: 'monospace', fontSize: 13, padding: '4px 0' }} />
                    </div>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="academic-label">Ícone selecionado</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}>
                      <EventIcon name={typeIcon} size={16} color={typeColor} />
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{typeIcon}</span>
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <label className="academic-label" style={{ marginBottom: 8 }}>Escolher ícone</label>
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
                <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end', alignItems: 'center' }}>
                  {editingType && (
                    <button type="button" onClick={() => { setEditingType(null); setTypeName(''); setTypeColor('#6366f1'); setTypeIcon('Calendar'); }}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}>
                      Cancelar edição
                    </button>
                  )}
                  <button type="button" className="btn-oxblood"
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

interface AgendaItem {
  id: string;
  title: string;
  timeLabel: string;
  sortTime: string;
  color: string;
  isRoutine: boolean;
  subjectName?: string;
  typeLabel: string;
  event?: any;
}

function AgendaView({
  events, today, subjects, openEditEvent, eventTypes, showRoutine, weeklyRoutines,
}: {
  events: ReturnType<typeof useApp>['calendarEvents'];
  today: Date;
  subjects: ReturnType<typeof useApp>['subjects'];
  openEditEvent: ReturnType<typeof useApp>['openEditEvent'];
  eventTypes: ReturnType<typeof useApp>['eventTypes'];
  showRoutine: boolean;
  weeklyRoutines: ReturnType<typeof useApp>['weeklyRoutines'];
}) {
  const agendaDays: { date: Date; items: AgendaItem[] }[] = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    const evts = events.filter(ev => eventOccursOn(ev, d));

    const realItems: AgendaItem[] = evts.map(ev => {
      const meta = getEventMeta(ev.type, eventTypes);
      const subj = subjects.find(s => s.id === ev.subjectId);
      const timeLabel = formatEventTime(ev);
      const sortTime = ev.allDay ? '00:00' : (ev.startAt.split('T')[1] || '00:00');
      return {
        id: ev.id,
        title: ev.title,
        timeLabel,
        sortTime,
        color: meta.color,
        isRoutine: false,
        subjectName: subj?.name,
        typeLabel: meta.label,
        event: ev,
      };
    });

    const routineItems: AgendaItem[] = showRoutine
      ? weeklyRoutines
          .filter(r => r.days.includes(d.getDay()))
          .flatMap(r => r.slots.map(s => {
            const timeLabel = `${s.startTime} – ${s.endTime}`;
            return {
              id: `routine-${r.id}-${s.startTime}`,
              title: r.label,
              timeLabel,
              sortTime: s.startTime,
              color: r.color,
              isRoutine: true,
              typeLabel: 'Rotina',
            };
          }))
      : [];

    const allItems = [...realItems, ...routineItems].sort((a, b) => a.sortTime.localeCompare(b.sortTime));
    if (allItems.length) agendaDays.push({ date: d, items: allItems });
  }

  if (!agendaDays.length) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-surface)' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Nenhum evento nos próximos 30 dias.</p>
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

  return (
    <div style={{ maxWidth: 768, margin: '0 auto', padding: '12px 0' }}>
      {agendaDays.map(({ date, items }) => {
        return (
          <div key={date.toDateString()} style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 12, borderBottom: '1px solid var(--border-color)', paddingBottom: 6 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 500, margin: 0, color: 'var(--text-primary)' }}>
                {getGroupLabel(date)}
              </h3>
              <span style={{ fontFamily: 'var(--font-label)', fontSize: 13, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {date.getDate()} {MONTHS_PT[date.getMonth()].slice(0, 3)}, {DAYS_PT_SHORT[date.getDay()]}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {items.map(item => {
                return (
                  <div key={item.id} onClick={item.isRoutine ? undefined : () => openEditEvent(item.event)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--border-subtle)',
                      cursor: item.isRoutine ? 'default' : 'pointer',
                      transition: 'background-color var(--transition)',
                      opacity: item.isRoutine ? 0.6 : 1,
                      fontStyle: item.isRoutine ? 'italic' : 'normal',
                    }}
                    className={item.isRoutine ? '' : 'agenda-event-row'}
                    onMouseOver={item.isRoutine ? undefined : e => e.currentTarget.style.backgroundColor = 'var(--bg-surface)'}
                    onMouseOut={item.isRoutine ? undefined : e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <div style={{ width: 80, fontFamily: 'var(--font-label)', fontSize: 13, color: 'var(--text-secondary)' }}>
                      {item.timeLabel}
                    </div>
                    <div style={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      border: item.isRoutine ? `1px dotted ${item.color}` : `2px solid ${item.color}`,
                      marginRight: 16,
                      flexShrink: 0,
                      backgroundColor: item.isRoutine ? 'transparent' : `${item.color}22`
                    }}></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>
                        {item.title}
                      </p>
                      {item.subjectName && (
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {item.subjectName}
                        </span>
                      )}
                    </div>
                    <span className="chip-event" style={{
                      borderColor: item.color,
                      color: item.color,
                      backgroundColor: item.isRoutine ? 'transparent' : `${item.color}12`,
                      borderStyle: item.isRoutine ? 'dotted' : 'solid',
                      borderWidth: '1px',
                      margin: 0
                    }}>
                      {item.typeLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
