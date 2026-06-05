import React, { useState, useEffect } from 'react';
import { Search, Trash2, RotateCw, Pencil, Check, X } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

export default function MyCards() {
  const {
    cards, topics, subjects,
    handleDeleteCard, handleUpdateCard, fetchAllCards,
    startStudySession,
  } = useApp();

  const [search,        setSearch]        = useState('');
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editFront,     setEditFront]     = useState('');
  const [editBack,      setEditBack]      = useState('');

  useEffect(() => { fetchAllCards(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function startEdit(id: string, front: string, back: string) {
    setEditingCardId(id); setEditFront(front); setEditBack(back);
  }

  async function saveEdit(id: string) {
    if (!editFront.trim() || !editBack.trim()) return;
    await handleUpdateCard(id, editFront.trim(), editBack.trim());
    setEditingCardId(null);
  }

  const filtered = cards.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.front.toLowerCase().includes(q) || c.back.toLowerCase().includes(q);
  });

  const now = new Date();

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Meus Flashcards</h1>
          <p className="page-subtitle">Visualize, busque e gerencie todos os seus flashcards</p>
        </div>
        <button className="btn-primary" onClick={startStudySession}>
          <RotateCw size={16} /> Estudar Pendentes
        </button>
      </div>

      <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input type="text" className="form-input"
            placeholder="Pesquisar nos seus cards (pergunta ou resposta)..."
            style={{ paddingLeft: 42 }}
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="glass-card" style={{ padding: 24 }}>
        <h3 className="card-title" style={{ marginBottom: 20 }}>
          Meus Flashcards ({filtered.length}{search ? ` de ${cards.length}` : ''})
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(c => {
            const topic   = topics.find(t => t.id === c.topicId);
            const subject = topic ? subjects.find(s => s.id === topic.subjectId) : null;
            const isDue   = new Date(c.nextReview) <= now;

            return (
              <div key={c.id}
                style={{
                  padding: 16, background: 'rgba(255,255,255,0.02)',
                  border: `1px solid ${editingCardId === c.id ? 'var(--color-primary)' : isDue ? 'rgba(192,193,255,0.25)' : 'var(--border-color)'}`,
                  borderRadius: 10,
                }}>
                {editingCardId === c.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <input className="form-input" value={editFront} onChange={e => setEditFront(e.target.value)}
                      placeholder="Frente" autoFocus />
                    <input className="form-input" value={editBack} onChange={e => setEditBack(e.target.value)}
                      placeholder="Verso" />
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button onClick={() => setEditingCardId(null)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                        <X size={15} /> Cancelar
                      </button>
                      <button onClick={() => saveEdit(c.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--color-primary-light)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600 }}>
                        <Check size={15} /> Salvar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                    <div style={{ flexGrow: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                        {subject && (
                          <span className="badge"
                            style={{ background: `${subject.color ?? 'var(--color-primary)'}22`, color: subject.color ?? 'var(--color-primary-light)', border: `1px solid ${subject.color ?? 'var(--color-primary)'}44`, fontSize: 11, padding: '3px 8px' }}>
                            {subject.name}
                          </span>
                        )}
                        {topic && (
                          <span className="badge"
                            style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', fontSize: 11, padding: '3px 8px' }}>
                            {topic.name}
                          </span>
                        )}
                        {isDue && (
                          <span className="badge"
                            style={{ background: 'rgba(192,193,255,0.1)', color: 'var(--color-primary-light)', border: '1px solid rgba(192,193,255,0.3)', fontSize: 11, padding: '3px 8px' }}>
                            Pendente
                          </span>
                        )}
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          Próxima revisão: {new Date(c.nextReview).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{c.front}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{c.back}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => startEdit(c.id, c.front, c.back)}
                        style={{ color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: 8, borderRadius: 8, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => handleDeleteCard(c.id)}
                        style={{ color: 'var(--color-danger)', background: 'rgba(255,180,171,0.08)', padding: 8, borderRadius: 8, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {!filtered.length && (
            <p style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', padding: '32px 0' }}>
              {search ? 'Nenhum card corresponde à sua pesquisa.' : 'Você ainda não tem nenhum flashcard criado.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
