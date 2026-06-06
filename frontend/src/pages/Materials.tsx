import React, { useState } from 'react';
import { Plus, Trash2, HelpCircle, RotateCw, Pencil, Check, X } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import './Materials.css';


export default function Materials() {
  const {
    visibleSubjects, visibleTopics, topics, cards, subjects, spaces, activeSpaceId,
    selectedSubject, setSelectedSubject, selectedTopic, setSelectedTopic,
    handleCreateSubject, handleDeleteSubject,
    handleCreateTopic, handleDeleteTopic,
    handleCreateCard, handleDeleteCard, handleUpdateCard,
    startStudySession,
  } = useApp();

  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [subjectName,  setSubjectName]  = useState('');
  const [subjectColor, setSubjectColor] = useState('#494bd6');
  const [topicName,    setTopicName]    = useState('');
  const [cardFront,    setCardFront]    = useState('');
  const [cardBack,     setCardBack]     = useState('');

  const [editingCardId, setEditingCardId]   = useState<string | null>(null);
  const [editFront,     setEditFront]       = useState('');
  const [editBack,      setEditBack]        = useState('');

  function startEditCard(id: string, front: string, back: string) {
    setEditingCardId(id); setEditFront(front); setEditBack(back);
  }

  async function saveEditCard(id: string) {
    if (!editFront.trim() || !editBack.trim()) return;
    await handleUpdateCard(id, editFront.trim(), editBack.trim());
    setEditingCardId(null);
  }

  async function submitSubject(e: React.FormEvent) {
    e.preventDefault();
    if (!subjectName.trim()) return;
    await handleCreateSubject(subjectName.trim(), subjectColor);
    setSubjectName('');
  }

  async function submitTopic(e: React.FormEvent) {
    e.preventDefault();
    if (!topicName.trim()) return;
    await handleCreateTopic(topicName.trim());
    setTopicName('');
  }

  async function submitCard(e: React.FormEvent) {
    e.preventDefault();
    if (!cardFront.trim() || !cardBack.trim()) return;
    await handleCreateCard(cardFront.trim(), cardBack.trim());
    setCardFront(''); setCardBack('');
  }

  const selectedTopicCards = selectedTopic
    ? cards.filter(c => c.topicId === selectedTopic.id)
    : [];

  const now = new Date();
  const duePerTopic = (topicId: string) =>
    cards.filter(c => c.topicId === topicId && new Date(c.nextReview) <= now).length;
  const duePerSubject = (subjectId: string) =>
    topics.filter(t => t.subjectId === subjectId).reduce((acc, t) => acc + duePerTopic(t.id), 0);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Estrutura de Estudos</h1>
          <p className="page-subtitle">Navegue por Matérias, Tópicos e Flashcards</p>
        </div>
      </div>

      <div className="materials-grid">
        {/* Left — Subjects */}
        <div>
          <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 className="card-title" style={{ margin: 0 }}>
                Matérias
                {activeSpaceId && (
                  <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--color-primary)', marginLeft: 8 }}>
                    · {spaces.find(s => s.id === activeSpaceId)?.name}
                  </span>
                )}
              </h3>
              <button className="btn-secondary" style={{ width: 'auto', padding: '6px 14px', fontSize: 13 }}
                onClick={() => setShowSubjectForm(f => !f)}>
                <Plus size={14} /> Nova Matéria
              </button>
            </div>
            {showSubjectForm && (
              <form onSubmit={async e => { await submitSubject(e); setShowSubjectForm(false); }}
                style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <input type="text" className="form-input" placeholder="Nome da matéria" autoFocus
                  value={subjectName} onChange={e => setSubjectName(e.target.value)} />
                <input type="color"
                  style={{ width: 44, height: 44, border: 'none', borderRadius: 4, cursor: 'pointer', background: 'transparent' }}
                  value={subjectColor} onChange={e => setSubjectColor(e.target.value)} />
                <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '0 20px' }}>
                  <Plus size={18} />
                </button>
              </form>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {visibleSubjects.map(sub => (
              <div key={sub.id} className={`materials-card ${selectedSubject?.id === sub.id ? 'selected' : ''}`}
                style={{
                  '--subject-color': sub.color,
                } as React.CSSProperties}
                onClick={() => { setSelectedSubject(sub); setSelectedTopic(null); }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="materials-card-title">{sub.name}</div>
                      {duePerSubject(sub.id) > 0 && (
                        <span className="badge-due">{duePerSubject(sub.id)}</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {topics.filter(t => t.subjectId === sub.id).length} tópicos
                      {sub.spaceId && spaces.find(s => s.id === sub.spaceId) && (
                        <span style={{ marginLeft: 8, color: 'var(--text-muted)' }}>
                          · {spaces.find(s => s.id === sub.spaceId)?.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); if (window.confirm(`Excluir a matéria "${sub.name}" e todos os seus tópicos e cards?`)) handleDeleteSubject(sub.id); }}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            {!visibleSubjects.length && (
              <p style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>
                Nenhuma matéria{activeSpaceId ? ' nesta área' : ''} ainda.
              </p>
            )}
          </div>
        </div>

        {/* Right — Topics + Cards */}
        <div>
          {selectedSubject ? (
            <div className="glass-card" style={{ padding: 24 }}>
              <h3 className="card-title" style={{ marginBottom: 20 }}>
                Tópicos — {selectedSubject.name}
              </h3>

              <form onSubmit={submitTopic} style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                <input type="text" className="form-input" placeholder="Nome do tópico"
                  value={topicName} onChange={e => setTopicName(e.target.value)} />
                <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '0 20px' }}>
                  <Plus size={18} />
                </button>
              </form>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                {visibleTopics.filter(t => t.subjectId === selectedSubject.id).map(t => {
                  const due = duePerTopic(t.id);
                  return (
                    <span key={t.id}
                      style={{
                        padding: '8px 14px', borderRadius: 20, cursor: 'pointer',
                        border: selectedTopic?.id === t.id ? '1px solid var(--color-primary)' : '1px solid var(--border-color)',
                        background: selectedTopic?.id === t.id ? 'var(--color-primary)' : 'rgba(255,255,255,0.03)',
                        color: 'var(--text-primary)', fontSize: 13, fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}
                      onClick={() => setSelectedTopic(t)}>
                      {t.name}
                      {due > 0 && (
                        <span
                          className="badge-due"
                          title={`${due} card${due !== 1 ? 's' : ''} pendente${due !== 1 ? 's' : ''}`}
                          onClick={e => { e.stopPropagation(); startStudySession(t.id); }}>
                          {due}
                        </span>
                      )}
                      <button
                        className="topic-chip-delete"
                        onClick={e => { e.stopPropagation(); if (window.confirm(`Excluir o tópico "${t.name}" e todos os seus cards?`)) handleDeleteTopic(t.id); }}
                        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', lineHeight: 1 }}>
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>

              {selectedTopic ? (
                <div>
                  <h4 style={{ marginBottom: 12, fontSize: 16 }}>Cards — {selectedTopic.name}</h4>
                  <form onSubmit={submitCard}
                    style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24, border: '1px dashed var(--border-color)', padding: 16, borderRadius: 8 }}>
                    <textarea className="form-input" placeholder="Frente (Pergunta)" rows={2}
                      style={{ resize: 'vertical' }}
                      value={cardFront} onChange={e => setCardFront(e.target.value)} />
                    <textarea className="form-input" placeholder="Verso (Resposta)" rows={2}
                      style={{ resize: 'vertical' }}
                      value={cardBack} onChange={e => setCardBack(e.target.value)} />
                    <button type="submit" className="btn-primary"
                      style={{ alignSelf: 'flex-end', width: 'auto', padding: '8px 16px' }}>
                      Salvar Card
                    </button>
                  </form>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedTopicCards.map(c => (
                      <div key={c.id}
                        style={{
                          padding: 12, background: 'rgba(255,255,255,0.02)',
                          border: editingCardId === c.id ? '1px solid var(--color-primary)' : '1px solid var(--border-color)',
                          borderRadius: 8,
                        }}>
                        {editingCardId === c.id ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <input className="form-input" value={editFront} onChange={e => setEditFront(e.target.value)}
                              placeholder="Frente" style={{ fontSize: 13 }} autoFocus />
                            <input className="form-input" value={editBack} onChange={e => setEditBack(e.target.value)}
                              placeholder="Verso" style={{ fontSize: 13 }} />
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                              <button onClick={() => setEditingCardId(null)}
                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                <X size={16} />
                              </button>
                              <button onClick={() => saveEditCard(c.id)}
                                style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer' }}>
                                <Check size={16} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ flexGrow: 1, minWidth: 0, paddingRight: 16 }}>
                              <div style={{ fontWeight: 600, fontSize: 14 }}>{c.front}</div>
                              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{c.back}</div>
                            </div>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button onClick={() => startEditCard(c.id, c.front, c.back)}
                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                <Pencil size={14} />
                              </button>
                              <button onClick={() => { if (window.confirm('Excluir este card?')) handleDeleteCard(c.id); }}
                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {!selectedTopicCards.length && (
                      <p style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', padding: '16px 0' }}>
                        Nenhum card neste tópico.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Selecione um tópico acima.</p>
              )}
            </div>
          ) : (
            <div className="glass-card"
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 240, color: 'var(--text-muted)' }}>
              <HelpCircle size={32} style={{ marginBottom: 12 }} />
              Selecione uma matéria ao lado
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
