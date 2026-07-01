import React, { useEffect, useState } from 'react';
import {
  Clock, Plus, Trash2, Check, RotateCw, Calendar, ChevronDown, ChevronUp, AlertCircle, Sparkles
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import './Cronograma.css';

const DAYS_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Seg, Ter, Qua, Qui, Sex, Sáb, Dom

const getDayName = (day: number) => {
  switch (day) {
    case 1: return 'Segunda-feira';
    case 2: return 'Terça-feira';
    case 3: return 'Quarta-feira';
    case 4: return 'Quinta-feira';
    case 5: return 'Sexta-feira';
    case 6: return 'Sábado';
    case 0: return 'Domingo';
    default: return '';
  }
};

// Parses "HH:MM" to total minutes from midnight
const parseTime = (t: string): number => {
  if (!t) return -1;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

// Returns true if two time intervals overlap (half-open intervals [start, start+duration))
const intervalsOverlap = (
  start1: number, dur1: number,
  start2: number, dur2: number,
): boolean => {
  const end1 = start1 + dur1;
  const end2 = start2 + dur2;
  return start1 < end2 && start2 < end1;
};

interface AreaSchedule {
  userAreaId: string;
  areaName: string;
  isActive: boolean;
  examDate: string | null;
  items: any[];
}

export default function Cronograma() {
  const { apiCall, showError, showSuccess } = useApp();

  const [tab, setTab] = useState<'weekly' | 'timeline'>('weekly');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoGenerating, setAutoGenerating] = useState(false);
  const [showAutoConfirm, setShowAutoConfirm] = useState(false);
  const [autoSuggestion, setAutoSuggestion] = useState<Record<string, any[]> | null>(null);
  const [areaSchedules, setAreaSchedules] = useState<AreaSchedule[]>([]);
  const [weeks, setWeeks] = useState<any[]>([]);
  const [expandedWeeks, setExpandedWeeks] = useState<Record<number, boolean>>({ 1: true });

  const [examDates, setExamDates] = useState<Record<string, string>>({});
  const [localItems, setLocalItems] = useState<Record<string, any[]>>({});

  const [addingDay, setAddingDay] = useState<number | null>(null);
  const [newAreaId, setNewAreaId] = useState('');
  const [newActivityType, setNewActivityType] = useState('STUDY');
  const [newSubjectId, setNewSubjectId] = useState('');
  const [newStartTime, setNewStartTime] = useState('19:00');
  const [newDuration, setNewDuration] = useState(50);

  const loadData = async () => {
    setLoading(true);
    try {
      const unified: AreaSchedule[] = await apiCall('/areas/schedule/unified');
      if (unified) {
        setAreaSchedules(unified);

        const dates: Record<string, string> = {};
        const items: Record<string, any[]> = {};
        for (const area of unified) {
          dates[area.userAreaId] = area.examDate
            ? new Date(area.examDate).toISOString().slice(0, 10)
            : '';
          items[area.userAreaId] = area.items.map(it => ({ ...it, _areaId: area.userAreaId }));
        }
        setExamDates(dates);
        setLocalItems(items);

        if (unified.length > 0 && !newAreaId) {
          const active = unified.find(a => a.isActive) || unified[0];
          setNewAreaId(active.userAreaId);
        }
      }

      const prog = await apiCall('/areas/schedule/progression/unified');
      if (prog && prog.weeks) {
        setWeeks(prog.weeks);
      } else {
        setWeeks([]);
      }
    } catch {
      showError('Erro ao carregar dados do cronograma.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (newActivityType === 'SIMULADO') {
      setNewDuration(120);
    } else if (newActivityType === 'REDACO') {
      setNewDuration(60);
    } else {
      setNewDuration(50);
    }
  }, [newActivityType]);

  // All items merged across all areas (for conflict detection + rendering)
  const allItems = Object.values(localItems).flat();

  // ---------- Conflict detection ----------
  const findConflict = (
    day: number,
    startTime: string,
    duration: number,
    excludeId?: string,
  ): string | null => {
    const newStart = parseTime(startTime);
    if (newStart < 0) return null;

    for (const item of allItems) {
      if (item.id === excludeId) continue;
      if (item.dayOfWeek !== day) continue;
      if (!item.startTime) continue;

      const existingStart = parseTime(item.startTime);
      if (intervalsOverlap(newStart, duration, existingStart, item.duration)) {
        const label = item.activityType === 'SIMULADO'
          ? 'Prática: Simulado'
          : item.activityType === 'REDACO'
          ? 'Prática: Redação'
          : item.subject?.name || 'outro bloco';
        return label;
      }
    }
    return null;
  };

  // ---------- Save ALL areas in sequence ----------
  const handleSaveAll = async () => {
    // Pre-save validation: check all items for conflicts
    for (const item of allItems) {
      if (!item.startTime) {
        showError('Todos os blocos precisam de um horário de início.');
        return;
      }
      if (item.duration < 10) {
        showError('Duração mínima de um bloco é 10 minutos.');
        return;
      }
      const conflict = findConflict(item.dayOfWeek, item.startTime, item.duration, item.id);
      if (conflict) {
        showError(`Conflito detectado: ${getDayName(item.dayOfWeek)} às ${item.startTime} já contém "${conflict}".`);
        return;
      }
    }

    setSaving(true);
    try {
      for (const area of areaSchedules) {
        const items = localItems[area.userAreaId] || [];
        await apiCall('/areas/schedule/update', {
          method: 'POST',
          body: JSON.stringify({
            userAreaId: area.userAreaId,
            items: items.map(it => ({
              dayOfWeek: it.dayOfWeek,
              subjectId: it.subjectId || it.subject?.id || null,
              topicId: it.topicId || null,
              duration: Number(it.duration),
              priority: it.priority || 10,
              startTime: it.startTime,
              activityType: it.activityType || 'STUDY',
            })),
            examDate: examDates[area.userAreaId] || null,
          }),
        });
      }

      showSuccess('Cronograma salvo com sucesso!');
      await loadData();
    } catch {
      showError('Falha ao salvar o cronograma.');
    } finally {
      setSaving(false);
    }
  };

  // ---------- Auto-generate ----------
  const handleAutoGenerate = async () => {
    setAutoGenerating(true);
    try {
      const result = await apiCall('/areas/schedule/auto-generate', { method: 'POST', body: JSON.stringify({}) });
      if (!result || !result.areas) {
        showError('Não foi possível gerar o cronograma automático.');
        return;
      }
      // Build suggestion map
      const suggestion: Record<string, any[]> = {};
      for (const area of result.areas) {
        suggestion[area.userAreaId] = area.items;
      }
      setAutoSuggestion(suggestion);
      setShowAutoConfirm(true);
    } catch {
      showError('Erro ao gerar sugestão de cronograma.');
    } finally {
      setAutoGenerating(false);
    }
  };

  const applyAutoSuggestion = () => {
    if (!autoSuggestion) return;
    setLocalItems(autoSuggestion);
    setShowAutoConfirm(false);
    setAutoSuggestion(null);
    showSuccess('Sugestão aplicada! Revise os blocos e salve quando estiver pronto.');
  };

  const getSubjectsForArea = (areaId: string) => {
    const area = areaSchedules.find(a => a.userAreaId === areaId);
    if (!area) return [];
    const seen = new Set<string>();
    const subjects: any[] = [];
    for (const item of area.items) {
      if (item.subject && !seen.has(item.subject.id)) {
        seen.add(item.subject.id);
        subjects.push(item.subject);
      }
    }
    return subjects;
  };

  const handleAddSlotLocal = (day: number) => {
    const area = areaSchedules.find(a => a.userAreaId === newAreaId);
    if (!area) return;

    let subjectId: string | null = null;
    let subject: any = null;

    if (newActivityType === 'STUDY') {
      if (!newSubjectId) {
        showError('Selecione uma matéria.');
        return;
      }
      subjectId = newSubjectId;
      const sObj = getSubjectsForArea(newAreaId).find(s => s.id === newSubjectId);
      subject = sObj || null;
    }

    // Check for time conflicts before adding
    const conflict = findConflict(day, newStartTime, newDuration);
    if (conflict) {
      showError(`Conflito de horário: às ${newStartTime} já existe "${conflict}" agendado.`);
      return;
    }

    const newSlot = {
      id: `temp-${allItems.length + 1}`,
      _areaId: newAreaId,
      dayOfWeek: day,
      subjectId,
      subject,
      startTime: newStartTime,
      duration: newDuration,
      priority: 10,
      activityType: newActivityType,
    };

    setLocalItems(prev => ({
      ...prev,
      [newAreaId]: [...(prev[newAreaId] || []), newSlot],
    }));
    setAddingDay(null);
    setNewActivityType('STUDY');
  };

  const handleDeleteSlot = (areaId: string, id: string) => {
    setLocalItems(prev => ({
      ...prev,
      [areaId]: (prev[areaId] || []).filter(item => item.id !== id),
    }));
  };

  const handleUpdateSlot = (areaId: string, id: string, patch: Partial<any>) => {
    // If updating startTime or duration, check for conflicts
    const current = (localItems[areaId] || []).find(it => it.id === id);
    if (current && (patch.startTime !== undefined || patch.duration !== undefined)) {
      const testStart = patch.startTime ?? current.startTime;
      const testDuration = patch.duration ?? current.duration;
      const conflict = findConflict(current.dayOfWeek, testStart, testDuration, id);
      if (conflict) {
        showError(`Conflito de horário: às ${testStart} já existe "${conflict}" agendado.`);
        return;
      }
    }

    setLocalItems(prev => ({
      ...prev,
      [areaId]: (prev[areaId] || []).map(item => (item.id === id ? { ...item, ...patch } : item)),
    }));
  };

  const toggleWeek = (num: number) => {
    setExpandedWeeks(prev => ({ ...prev, [num]: !prev[num] }));
  };

  const getSlotColor = (slot: any) => {
    if (slot.activityType === 'SIMULADO') return '#ef4444';
    if (slot.activityType === 'REDACO') return '#10b981';
    return slot.subject?.color || '#4F46E5';
  };

  const getSlotTitle = (slot: any) => {
    if (slot.activityType === 'SIMULADO') return 'Prática: Simulado';
    if (slot.activityType === 'REDACO') return 'Prática: Redação';
    return slot.subject?.name || 'Matéria';
  };

  const getTimelineTitle = (item: any) => {
    if (item.activityType === 'SIMULADO') return 'Prática: Simulado';
    if (item.activityType === 'REDACO') return 'Prática: Redação';
    return item.subject?.name || 'Matéria';
  };

  const getTimelineDotColor = (item: any) => {
    if (item.activityType === 'SIMULADO') return '#ef4444';
    if (item.activityType === 'REDACO') return '#10b981';
    return item.subject?.color || '#4F46E5';
  };

  if (loading) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <RotateCw size={24} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
        <span style={{ marginLeft: 12, color: 'var(--text-secondary)' }}>Carregando cronograma...</span>
      </div>
    );
  }

  const getWeeksRemaining = () => {
    const now = new Date();
    const dayOfWeekToday = now.getDay();
    const startOfWeek = new Date(now);
    const diffToMonday = dayOfWeekToday === 0 ? -6 : 1 - dayOfWeekToday;
    startOfWeek.setDate(now.getDate() + diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);
    let maxWeeks = 0;
    for (const date of Object.values(examDates)) {
      if (!date) continue;
      const diffMs = new Date(date).getTime() - startOfWeek.getTime();
      const w = Math.max(0, Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000)));
      if (w > maxWeeks) maxWeeks = w;
    }
    return maxWeeks;
  };

  const weeksRemaining = getWeeksRemaining();
  const hasAnyExamDate = Object.values(examDates).some(d => !!d);

  return (
    <div className="page cronograma-container">
      {/* Header */}
      <div className="cronograma-header">
        <div className="cronograma-header-left">
          <h2 className="cronograma-title">Cronograma de Estudos</h2>
          <p className="cronograma-subtitle">
            Planejamento unificado de todas as suas áreas de foco até o dia da prova.
          </p>
        </div>

        {/* Exam dates per area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {areaSchedules.map(area => (
            <div key={area.userAreaId} className="cronograma-exam-card">
              <Calendar size={15} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <span className="cronograma-exam-label" style={{ fontSize: 10 }}>{area.areaName}</span>
                <input
                  type="date"
                  className="cronograma-exam-input"
                  value={examDates[area.userAreaId] || ''}
                  onChange={e => setExamDates(prev => ({ ...prev, [area.userAreaId]: e.target.value }))}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="cronograma-tabs-nav">
        <button
          className={`cronograma-tab-btn ${tab === 'weekly' ? 'active' : ''}`}
          onClick={() => setTab('weekly')}
        >
          Grade Semanal
        </button>
        <button
          className={`cronograma-tab-btn ${tab === 'timeline' ? 'active' : ''}`}
          onClick={() => setTab('timeline')}
        >
          Planejador de Tópicos
        </button>
      </div>

      {/* Tab Contents */}
      {tab === 'weekly' ? (
        <div>
          {/* Auto-generate toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button
              type="button"
              onClick={handleAutoGenerate}
              disabled={autoGenerating}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 20px',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: 13,
                fontWeight: 600,
                cursor: autoGenerating ? 'not-allowed' : 'pointer',
                opacity: autoGenerating ? 0.7 : 1,
                boxShadow: '0 2px 12px rgba(99,102,241,0.35)',
                transition: 'all 0.2s ease',
              }}
            >
              {autoGenerating
                ? <RotateCw size={15} className="animate-spin" />
                : <Sparkles size={15} />}
              {autoGenerating ? 'Gerando...' : 'Sugerir Cronograma'}
            </button>
          </div>

          <div className="cronograma-days-grid">
            {DAYS_ORDER.map(day => {
              const daySlots = allItems
                .filter(it => it.dayOfWeek === day)
                .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
              return (
                <div key={day} className="cronograma-day-col">
                  <div className="cronograma-day-header">
                    <span>{getDayName(day).split('-')[0]}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({daySlots.length})</span>
                  </div>

                  <div className="cronograma-slots-list">
                    {daySlots.map(slot => {
                      const areaId = slot._areaId;
                      const areaName = areaSchedules.find(a => a.userAreaId === areaId)?.areaName;
                      return (
                        <div
                          key={slot.id}
                          className="cronograma-slot-item"
                          style={{ borderLeftColor: getSlotColor(slot) }}
                        >
                          <div className="cronograma-slot-subject">{getSlotTitle(slot)}</div>
                          {areaSchedules.length > 1 && areaName && (
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2, fontStyle: 'italic' }}>
                              {areaName}
                            </div>
                          )}

                          <div className="cronograma-slot-meta">
                            <div className="cronograma-slot-input-group">
                              <Clock size={11} />
                              <input
                                type="time"
                                className="cronograma-slot-input"
                                value={slot.startTime || ''}
                                onChange={e => handleUpdateSlot(areaId, slot.id, { startTime: e.target.value })}
                              />
                            </div>
                            <div className="cronograma-slot-input-group">
                              <input
                                type="number"
                                className="cronograma-slot-input"
                                style={{ width: 45 }}
                                value={slot.duration}
                                onChange={e => handleUpdateSlot(areaId, slot.id, { duration: Number(e.target.value) })}
                                min={10}
                              />
                              <span>min</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            className="cronograma-slot-delete"
                            onClick={() => handleDeleteSlot(areaId, slot.id)}
                            title="Remover bloco"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {addingDay === day ? (
                    <div className="cronograma-add-form">
                      {areaSchedules.length > 1 && (
                        <select
                          className="academic-input"
                          style={{ fontSize: 12, padding: '4px 6px', height: 'auto', marginBottom: 4 }}
                          value={newAreaId}
                          onChange={e => { setNewAreaId(e.target.value); setNewSubjectId(''); }}
                        >
                          {areaSchedules.map(a => (
                            <option key={a.userAreaId} value={a.userAreaId}>{a.areaName}</option>
                          ))}
                        </select>
                      )}

                      <select
                        className="academic-input"
                        style={{ fontSize: 12, padding: '4px 6px', height: 'auto', marginBottom: 4 }}
                        value={newActivityType}
                        onChange={e => setNewActivityType(e.target.value)}
                      >
                        <option value="STUDY">Estudo de Matéria</option>
                        <option value="SIMULADO">Prática de Simulado</option>
                        <option value="REDACO">Prática de Redação</option>
                      </select>

                      {newActivityType === 'STUDY' && (
                        <select
                          className="academic-input"
                          style={{ fontSize: 12, padding: '4px 6px', height: 'auto', marginBottom: 4 }}
                          value={newSubjectId}
                          onChange={e => setNewSubjectId(e.target.value)}
                        >
                          {getSubjectsForArea(newAreaId).map(sub => (
                            <option key={sub.id} value={sub.id}>{sub.name}</option>
                          ))}
                        </select>
                      )}

                      <div style={{ display: 'flex', gap: 4 }}>
                        <input
                          type="time"
                          className="academic-input"
                          style={{ fontSize: 11, padding: '2px 4px', height: 'auto', flex: 1 }}
                          value={newStartTime}
                          onChange={e => setNewStartTime(e.target.value)}
                        />
                        <input
                          type="number"
                          className="academic-input"
                          style={{ fontSize: 11, padding: '2px 4px', height: 'auto', width: 50 }}
                          value={newDuration}
                          onChange={e => setNewDuration(Number(e.target.value))}
                          placeholder="Min"
                          min={10}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                        <button
                          type="button"
                          className="btn-oxblood"
                          style={{ padding: '4px 8px', fontSize: 11, flex: 1 }}
                          onClick={() => handleAddSlotLocal(day)}
                        >
                          Ok
                        </button>
                        <button
                          type="button"
                          className="btn-outline-custom"
                          style={{ padding: '4px 8px', fontSize: 11 }}
                          onClick={() => setAddingDay(null)}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="cronograma-add-btn"
                      onClick={() => {
                        setAddingDay(day);
                        setNewActivityType('STUDY');
                        setNewSubjectId('');
                        if (areaSchedules.length > 0) {
                          const active = areaSchedules.find(a => a.isActive) || areaSchedules[0];
                          setNewAreaId(active.userAreaId);
                        }
                      }}
                    >
                      <Plus size={12} />
                      Adicionar
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action row: auto-generate + save */}
          <div className="cronograma-save-row">
            <button
              type="button"
              className="btn-oxblood"
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 28px' }}
              onClick={handleSaveAll}
              disabled={saving}
            >
              {saving ? <RotateCw size={16} className="animate-spin" /> : <Check size={16} />}
              Salvar Cronograma
            </button>
          </div>
        </div>
      ) : (
        <div className="cronograma-timeline">
          {hasAnyExamDate ? (
            <div className="alert-custom" style={{ display: 'flex', alignItems: 'center', gap: 12, backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 8 }}>
              <AlertCircle size={18} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Planejamento calculado: <strong>{weeksRemaining} semanas</strong> de preparação (horizonte máximo entre todas as suas áreas).
              </div>
            </div>
          ) : (
            <div className="alert-custom" style={{ display: 'flex', alignItems: 'center', gap: 12, backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-md)', padding: '16px 20px', marginBottom: 8 }}>
              <AlertCircle size={20} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />
              <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>
                <strong>Data da Prova não definida!</strong> Defina a data da sua prova para cada área de foco para que o sistema calcule o cronograma de tópicos.
              </div>
            </div>
          )}

          {weeks.map(week => {
            const isOpen = !!expandedWeeks[week.weekNumber];
            return (
              <div key={week.weekNumber} className="cronograma-week-card">
                <div className="cronograma-week-header" onClick={() => toggleWeek(week.weekNumber)}>
                  <h3 className="cronograma-week-title">
                    {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    Semana {week.weekNumber}
                  </h3>
                  <span className="cronograma-week-date">
                    {week.startDate.split('-').reverse().slice(0, 2).join('/')} – {week.endDate.split('-').reverse().slice(0, 2).join('/')}
                  </span>
                </div>

                {isOpen && (
                  <div className="cronograma-week-body">
                    {week.items.length === 0 ? (
                      <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, textAlign: 'center', padding: '12px 0' }}>
                        Nenhum bloco agendado. Adicione blocos na aba "Grade Semanal".
                      </p>
                    ) : (
                      week.items.map((item: any, idx: number) => (
                        <div key={idx} className="cronograma-timeline-item">
                          <div className="cronograma-timeline-time">
                            <span>{getDayName(item.dayOfWeek).split('-')[0]}</span>
                            <span style={{ fontWeight: 600 }}>{item.startTime}</span>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({item.duration} min)</span>
                          </div>

                          <div
                            className="cronograma-timeline-dot"
                            style={{ backgroundColor: getTimelineDotColor(item) }}
                          />

                          <div className="cronograma-timeline-content">
                            <div className="cronograma-timeline-subject">{getTimelineTitle(item)}</div>
                            {areaSchedules.length > 1 && item.areaName && (
                              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 2 }}>
                                {item.areaName}
                              </div>
                            )}
                            {item.activityType === 'SIMULADO' ? (
                              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                                Treino prático de simulado e resolução de questões de exames anteriores.
                              </div>
                            ) : item.activityType === 'REDACO' ? (
                              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                                Escrita e produção prática de redação com correção textual.
                              </div>
                            ) : item.topics && item.topics.length > 0 ? (
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                                {item.topics.map((t: any) => (
                                  <span key={t.id} className="cronograma-timeline-topic">
                                    {t.name}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 2 }}>
                                Revisão Geral / Resolução de Exercícios
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

    {/* Auto-generate confirmation modal */}
    {showAutoConfirm && (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
      }}>
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '32px 36px',
          maxWidth: 480,
          width: '90%',
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Sparkles size={20} color="#fff" />
            </div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
              Cronograma Sugerido
            </h3>
          </div>

          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 8px' }}>
            O sistema gerou um cronograma equilibrado com base nas suas áreas de foco e prioridades do nivelamento.
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, margin: '0 0 24px' }}>
            ⚠️ Isso <strong>substituirá</strong> os blocos atuais da grade. Você ainda poderá editar antes de salvar.
          </p>

          {/* Preview: count items per area */}
          {autoSuggestion && Object.entries(autoSuggestion).map(([areaId, items]) => {
            const area = areaSchedules.find(a => a.userAreaId === areaId);
            if (!area || items.length === 0) return null;
            const studyCount = items.filter(it => it.activityType === 'STUDY').length;
            const practiceCount = items.filter(it => it.activityType !== 'STUDY').length;
            return (
              <div key={areaId} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 12px',
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: 6,
                fontSize: 13,
              }}>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{area.areaName}</span>
                <span style={{ color: 'var(--text-muted)' }}>
                  {studyCount} estudo{studyCount !== 1 ? 's' : ''}
                  {practiceCount > 0 ? ` · ${practiceCount} prática${practiceCount !== 1 ? 's' : ''}` : ''}
                </span>
              </div>
            );
          })}

          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button
              type="button"
              onClick={applyAutoSuggestion}
              style={{
                flex: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '10px 0',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Check size={16} />
              Aplicar Sugestão
            </button>
            <button
              type="button"
              onClick={() => { setShowAutoConfirm(false); setAutoSuggestion(null); }}
              style={{
                padding: '10px 20px',
                background: 'transparent',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
  );
}
