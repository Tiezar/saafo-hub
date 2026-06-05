import React, { useState } from 'react';
import { Plus, Trash2, HelpCircle, RotateCw } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

export default function Materials() {
  const {
    visibleSubjects, visibleTopics, topics, cards, subjects, spaces, activeSpaceId,
    selectedSubject, setSelectedSubject, selectedTopic, setSelectedTopic,
    handleCreateSubject, handleDeleteSubject,
    handleCreateTopic, handleDeleteTopic,
    handleCreateCard, handleDeleteCard,
    startStudySession,
  } = useApp();

  const [subjectName,  setSubjectName]  = useState('');
  const [subjectColor, setSubjectColor] = useState('#494bd6');
  const [topicName,    setTopicName]    = useState('');
  const [cardFront,    setCardFront]    = useState('');
  const [cardBack,     setCardBack]     = useState('');

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
        <button className="btn-primary" onClick={startStudySession}>
          <RotateCw size={16} /> Estudar Pendentes
        </button>
      </div>

      <div className="grid-2">
        {/* Left — Subjects */}
        <div>
          <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
            <h3 className="card-title" style={{ marginBottom: 16 }}>
              Nova Matéria
              {activeSpaceId && (
                <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--color-primary-light)', marginLeft: 8 }}>
                  → {spaces.find(s => s.id === activeSpaceId)?.name}
                </span>
              )}
            </h3>
            <form onSubmit={submitSubject} style={{ display: 'flex', gap: 12 }}>
              <input type="text" className="form-input" placeholder="Nome da matéria"
                value={subjectName} onChange={e => setSubjectName(e.target.value)} />
              <input type="color"
                style={{ width: 44, height: 44, border: 'none', borderRadius: 4, cursor: 'pointer', background: 'transparent' }}
                value={subjectColor} onChange={e => setSubjectColor(e.target.value)} />
              <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '0 20px' }}>
                <Plus size={18} />
              </button>
            </form>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {visibleSubjects.map(sub => (
              <div key={sub.id} className="subject-card"
                style={{
                  '--subject-color': sub.color,
                  border: selectedSubject?.id === sub.id ? '1px solid var(--color-primary)' : '1px solid var(--border-color)',
                  background: selectedSubject?.id === sub.id ? 'rgba(73,75,214,0.06)' : 'var(--bg-card)',
                  cursor: 'pointer',
                } as React.CSSProperties}
                onClick={() => { setSelectedSubject(sub); setSelectedTopic(null); }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="subject-name">{sub.name}</div>
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
                    onClick={e => { e.stopPropagation(); handleDeleteSubject(sub.id); }}
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
                        onClick={e => { e.stopPropagation(); handleDeleteTopic(t.id); }}
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
                    <input type="text" className="form-input" placeholder="Frente (Pergunta)"
                      value={cardFront} onChange={e => setCardFront(e.target.value)} />
                    <input type="text" className="form-input" placeholder="Verso (Resposta)"
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
                          border: '1px solid var(--border-color)', borderRadius: 8,
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }}>
                        <div style={{ flexGrow: 1, minWidth: 0, paddingRight: 16 }}>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{c.front}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{c.back}</div>
                        </div>
                        <button onClick={() => handleDeleteCard(c.id)}
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                          <Trash2 size={14} />
                        </button>
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
