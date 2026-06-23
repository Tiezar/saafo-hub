import React, { useState, useEffect } from 'react';
import { Search, Trash2, RotateCw, Pencil, Check, X, Plus, BookOpen, Sparkles } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import CustomSelect from '../components/CustomSelect';
import { useIsMobile } from '../hooks/useIsMobile';

export default function MyCards() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const {
    cards, topics, subjects, currentUser,
    handleDeleteCard, handleUpdateCard, handleCreateCard, fetchAllCards,
    startStudySession,
  } = useApp();

  // ── Filters ───────────────────────────────────────────────────────────────
  const [search,          setSearch]          = useState('');
  const [filterSubjectId, setFilterSubjectId] = useState('');
  const [filterTopicId,   setFilterTopicId]   = useState('');
  const [onlyDue,         setOnlyDue]         = useState(false);
  const [sortBy,          setSortBy]          = useState<'review' | 'az'>('review');

  // Reset topic filter when subject changes
  useEffect(() => { setFilterTopicId(''); }, [filterSubjectId]);

  // ── Edit ─────────────────────────────────────────────────────────────────
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editFront,     setEditFront]     = useState('');
  const [editBack,      setEditBack]      = useState('');

  function startEdit(id: string, front: string, back: string) {
    setEditingCardId(id); setEditFront(front); setEditBack(back);
  }

  async function saveEdit(id: string) {
    if (!editFront.trim() || !editBack.trim()) return;
    await handleUpdateCard(id, editFront.trim(), editBack.trim());
    setEditingCardId(null);
  }

  // ── Create ────────────────────────────────────────────────────────────────
  const [showCreate,     setShowCreate]     = useState(false);
  const [createSubjectId, setCreateSubjectId] = useState('');
  const [createTopicId,  setCreateTopicId]  = useState('');
  const [createFront,    setCreateFront]    = useState('');
  const [createBack,     setCreateBack]     = useState('');
  const [creating,       setCreating]       = useState(false);

  // Reset topic when subject changes in create form
  useEffect(() => { setCreateTopicId(''); }, [createSubjectId]);

  function openCreate() {
    setCreateSubjectId(filterSubjectId);
    setCreateTopicId(filterTopicId);
    setCreateFront('');
    setCreateBack('');
    setShowCreate(true);
  }

  async function submitCreate() {
    if (!createFront.trim() || !createBack.trim() || !createTopicId) return;
    setCreating(true);
    try {
      await handleCreateCard(createFront.trim(), createBack.trim(), createTopicId);
      setCreateFront('');
      setCreateBack('');
    } finally { setCreating(false); }
  }

  useEffect(() => { fetchAllCards(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived lists ─────────────────────────────────────────────────────────
  const now = new Date();

  const filterTopics = filterSubjectId
    ? topics.filter(t => t.subjectId === filterSubjectId)
    : topics;

  const createTopics = createSubjectId
    ? topics.filter(t => t.subjectId === createSubjectId)
    : [];

  const filtered = cards
    .filter(c => {
      if (search) {
        const q = search.toLowerCase();
        if (!c.front.toLowerCase().includes(q) && !c.back.toLowerCase().includes(q)) return false;
      }
      if (filterSubjectId) {
        const topic = topics.find(t => t.id === c.topicId);
        if (!topic || topic.subjectId !== filterSubjectId) return false;
      }
      if (filterTopicId) {
        if (c.topicId !== filterTopicId) return false;
      }
      if (onlyDue && new Date(c.nextReview) > now) return false;
      return true;
    })
    .sort((a, b) =>
      sortBy === 'az'
        ? a.front.localeCompare(b.front)
        : new Date(a.nextReview).getTime() - new Date(b.nextReview).getTime()
    );

  const dueCount = cards.filter(c => new Date(c.nextReview) <= now).length;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Meus Flashcards</h1>
          <p className="page-subtitle">
            {cards.length} card{cards.length !== 1 ? 's' : ''} · {dueCount} pendente{dueCount !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-secondary" style={{ width: 'auto', padding: '10px 18px' }}
            onClick={openCreate}>
            <Plus size={16} /> Novo Card
          </button>
          <button className="btn-primary" style={{ width: 'auto', padding: '10px 18px' }}
            onClick={() => startStudySession(undefined, true)}
            disabled={dueCount === 0}>
            <RotateCw size={16} /> Estudar ({dueCount})
          </button>
        </div>
      </div>

      {/* ── WhatsApp reminder hint ────────────────────────────────────────── */}
      {dueCount > 0 && !currentUser?.phone && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'rgba(37,211,102,0.08)', border: '1px solid rgba(37,211,102,0.3)',
          borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 16,
          fontSize: 13, color: 'var(--text-secondary)',
        }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>💬</span>
          <span>
            Quer receber lembretes de revisão no WhatsApp?{' '}
            <Link to="/perfil" style={{ color: 'var(--color-success)', fontWeight: 600, textDecoration: 'none' }}>
              Adicione seu número no perfil →
            </Link>
          </span>
        </div>
      )}

      {/* ── Create form ───────────────────────────────────────────────────── */}
      {showCreate && (
        <div className="glass-card" style={{ padding: 24, marginBottom: 20, border: '1px solid rgba(73,75,214,0.4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Novo Flashcard</h3>
            <button onClick={() => setShowCreate(false)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <X size={18} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label className="form-label" style={{ marginBottom: 4 }}>Matéria *</label>
              <CustomSelect
                variant="form-input"
                value={createSubjectId}
                onChange={setCreateSubjectId}
                placeholder="Selecione a matéria..."
                options={subjects.map(s => ({ value: s.id, label: s.name }))}
              />
            </div>
            <div>
              <label className="form-label" style={{ marginBottom: 4 }}>Tópico *</label>
              <CustomSelect
                variant="form-input"
                value={createTopicId}
                onChange={setCreateTopicId}
                disabled={!createSubjectId}
                placeholder={createSubjectId ? 'Selecione o tópico...' : 'Selecione a matéria primeiro'}
                options={createTopics.map(t => ({ value: t.id, label: t.name }))}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label className="form-label" style={{ marginBottom: 4 }}>Frente (pergunta) *</label>
              <textarea
                className="form-input"
                rows={4}
                style={{ resize: 'vertical', fontFamily: 'var(--font-body)', fontSize: 14 }}
                placeholder="O que você quer memorizar?"
                value={createFront}
                onChange={e => setCreateFront(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label" style={{ marginBottom: 4 }}>Verso (resposta) *</label>
              <textarea
                className="form-input"
                rows={4}
                style={{ resize: 'vertical', fontFamily: 'var(--font-body)', fontSize: 14 }}
                placeholder="A resposta ou explicação..."
                value={createBack}
                onChange={e => setCreateBack(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn-secondary" style={{ width: 'auto', padding: '9px 20px' }}
              onClick={() => setShowCreate(false)}>
              Cancelar
            </button>
            <button className="btn-primary" style={{ width: 'auto', padding: '9px 20px' }}
              onClick={submitCreate}
              disabled={creating || !createFront.trim() || !createBack.trim() || !createTopicId}>
              {creating ? <><RotateCw size={14} className="animate-spin" /> Criando...</> : <><Plus size={14} /> Criar Card</>}
            </button>
          </div>
        </div>
      )}

      {/* ── Filters ───────────────────────────────────────────────────────── */}
      <div className="glass-card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 200px' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input type="text" className="form-input"
              placeholder="Pesquisar..."
              style={{ paddingLeft: 38 }}
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <CustomSelect
            variant="form-input"
            style={{ flex: '0 1 180px' }}
            value={filterSubjectId}
            onChange={setFilterSubjectId}
            options={[
              { value: '', label: 'Todas as matérias' },
              ...subjects.map(s => ({ value: s.id, label: s.name })),
            ]}
          />

          <CustomSelect
            variant="form-input"
            style={{ flex: '0 1 180px' }}
            value={filterTopicId}
            onChange={setFilterTopicId}
            disabled={!filterSubjectId}
            options={[
              { value: '', label: 'Todos os tópicos' },
              ...filterTopics.map(t => ({ value: t.id, label: t.name })),
            ]}
          />

          <CustomSelect
            variant="form-input"
            style={{ flex: '0 1 160px' }}
            value={sortBy}
            onChange={v => setSortBy(v as 'review' | 'az')}
            options={[
              { value: 'review', label: 'Próxima revisão' },
              { value: 'az', label: 'A–Z' },
            ]}
          />

          <button
            className={onlyDue ? 'btn-primary' : 'btn-secondary'}
            style={{ width: 'auto', padding: '0 16px', whiteSpace: 'nowrap' }}
            onClick={() => setOnlyDue(d => !d)}>
            Só pendentes
          </button>
        </div>
      </div>

      {/* ── Card list ─────────────────────────────────────────────────────── */}
      <div className="glass-card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 className="card-title" style={{ margin: 0 }}>
            {filtered.length} card{filtered.length !== 1 ? 's' : ''}
            {(search || filterSubjectId || filterTopicId || onlyDue) && ` de ${cards.length}`}
          </h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filtered.map(c => {
            const topic   = topics.find(t => t.id === c.topicId);
            const subject = topic ? subjects.find(s => s.id === topic.subjectId) : null;
            const isDue   = new Date(c.nextReview) <= now;

            return (
              <div key={c.id}
                style={{
                  padding: isMobile ? 18 : 22,
                  background: 'var(--bg-card)',
                  border: `1px solid ${editingCardId === c.id ? 'var(--color-primary)' : isDue ? 'var(--color-primary-light)' : 'var(--border-color)'}`,
                  boxShadow: 'var(--shadow-sm)',
                  borderRadius: 'var(--radius-md)',
                  transition: 'all 0.15s ease-in-out',
                  position: 'relative'
                }}>
                {editingCardId === c.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
                      <textarea className="form-input" rows={3}
                        style={{ resize: 'vertical', fontFamily: 'var(--font-body)', fontSize: 14 }}
                        placeholder="Frente" value={editFront}
                        onChange={e => setEditFront(e.target.value)} autoFocus />
                      <textarea className="form-input" rows={3}
                        style={{ resize: 'vertical', fontFamily: 'var(--font-body)', fontSize: 14 }}
                        placeholder="Verso" value={editBack}
                        onChange={e => setEditBack(e.target.value)} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button onClick={() => setEditingCardId(null)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                        <X size={14} /> Cancelar
                      </button>
                      <button onClick={() => saveEdit(c.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600 }}>
                        <Check size={14} /> Salvar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Header Row: Badges on the left, Actions on the right */}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      width: '100%',
                      gap: 12,
                      borderBottom: '1px solid var(--border-subtle)',
                      paddingBottom: 10
                    }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        {subject && (
                          <span className="badge"
                            style={{ 
                              background: `${subject.color ?? 'var(--color-primary)'}12`, 
                              color: subject.color ?? 'var(--color-primary-light)', 
                              border: `1px solid ${subject.color ?? 'var(--color-primary)'}33`, 
                              fontSize: 11, 
                              fontWeight: 600,
                              padding: '2px 8px' 
                            }}>
                            {subject.name}
                          </span>
                        )}
                        {topic && (
                          <span className="badge"
                            style={{ 
                              background: 'var(--bg-surface)', 
                              color: 'var(--text-secondary)', 
                              border: '1px solid var(--border-color)', 
                              fontSize: 11, 
                              padding: '2px 8px' 
                            }}>
                            {topic.name}
                          </span>
                        )}
                        {isDue ? (
                          <span style={{ 
                            fontSize: 11, 
                            color: 'var(--color-danger)', 
                            fontWeight: 700, 
                            backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                            padding: '2px 8px', 
                            borderRadius: '4px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}>
                            ● Pendente
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
                            • {(() => {
                                const reviewDate = new Date(c.nextReview);
                                const diff = Math.floor((reviewDate.getTime() - now.getTime()) / 86400000);
                                const time = reviewDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                                if (diff <= 0) return `Hoje às ${time}`;
                                if (diff === 1) return `Amanhã às ${time}`;
                                return `Em ${diff} dias às ${time}`;
                              })()}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button onClick={() => startEdit(c.id, c.front, c.back)}
                          title="Editar"
                          style={{ 
                            color: 'var(--text-secondary)', 
                            background: 'var(--bg-surface)', 
                            border: '1px solid var(--border-color)',
                            padding: '6px 10px', 
                            borderRadius: 6, 
                            cursor: 'pointer', 
                            display: 'flex', 
                            alignItems: 'center',
                            transition: 'all 0.15s ease'
                          }}>
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => { if (window.confirm('Excluir este card?')) handleDeleteCard(c.id); }}
                          title="Excluir"
                          style={{ 
                            color: 'var(--color-danger)', 
                            background: 'rgba(239, 68, 68, 0.05)', 
                            border: '1px solid rgba(239, 68, 68, 0.15)',
                            padding: '6px 10px', 
                            borderRadius: 6, 
                            cursor: 'pointer', 
                            display: 'flex', 
                            alignItems: 'center',
                            transition: 'all 0.15s ease'
                          }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Content Row: Spans full width of the card */}
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
                      gap: isMobile ? 16 : 24,
                      width: '100%'
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>Frente</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>{c.front}</div>
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: 4, 
                        borderTop: isMobile ? '1px solid var(--border-subtle)' : 'none', 
                        paddingTop: isMobile ? 16 : 0, 
                        borderLeft: !isMobile ? '1px solid var(--border-subtle)' : 'none', 
                        paddingLeft: !isMobile ? 24 : 0 
                      }}>
                        <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>Verso</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{c.back}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {!filtered.length && (
            <div style={{ textAlign: 'center', padding: '40px 24px' }}>
              {search || filterSubjectId || filterTopicId || onlyDue ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                  Nenhum card corresponde aos filtros.
                </p>
              ) : (
                <>
                  <BookOpen size={40} style={{ color: 'var(--color-primary)', opacity: 0.6, marginBottom: 14 }} />
                  <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>Você ainda não tem flashcards</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20, maxWidth: 340, margin: '0 auto 20px' }}>
                    Para criar cards, primeiro adicione uma <strong>Matéria</strong> e um <strong>Tópico</strong>,
                    depois use a IA para gerar ou crie manualmente.
                  </p>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button className="btn-primary" style={{ width: 'auto', padding: '10px 20px' }}
                      onClick={() => navigate('/materiais')}>
                      <BookOpen size={15} /> Ir para Matérias
                    </button>
                    <button className="btn-secondary" style={{ width: 'auto', padding: '10px 20px' }}
                      onClick={() => navigate('/ia')}>
                      <Sparkles size={15} /> Gerar com IA
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
