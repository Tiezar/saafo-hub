import { useState, useEffect } from 'react';
import { Search, Trash2, RotateCw, Pencil, Check, X, Plus, BookOpen, Sparkles } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import CustomSelect from '../components/CustomSelect';
import { useIsMobile } from '../hooks/useIsMobile';
import { Button, Modal } from '../components/ui';

export default function MyCards() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const {
    cards, topics, subjects, currentUser,
    handleDeleteCard, handleUpdateCard, handleCreateCard, fetchAllCards,
    startStudySession, apiCall, showSuccess,
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
      setShowCreate(false);
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

  const dueCount     = cards.filter(c => new Date(c.nextReview) <= now).length;
  const newCount     = cards.filter(c => c.repetition === 0).length;
  const learnedCount = cards.filter(c => c.repetition > 0 && new Date(c.nextReview) > now).length;

  // ── Review badge helper ───────────────────────────────────────────────────
  function ReviewBadge({ nextReview }: { nextReview: string }) {
    const diff = Math.floor((new Date(nextReview).getTime() - now.getTime()) / 86400000);
    let label: string;
    let color: string;
    let bg: string;

    if (diff <= 0) {
      label = 'REVISAR HOJE';
      color = 'var(--color-primary)';
      bg    = 'rgba(163,59,58,.1)';
    } else if (diff <= 6) {
      label = `+${diff} DIAS`;
      color = 'var(--text-muted)';
      bg    = 'var(--bg-surface)';
    } else {
      label = `+${diff} DIAS`;
      color = 'var(--color-tertiary)';
      bg    = 'rgba(51,77,47,.12)';
    }

    return (
      <span style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.06em',
        color,
        background: bg,
        borderRadius: 6,
        padding: '3px 8px',
        whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="page">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 22,
      }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 30,
          color: 'var(--text-primary)',
          margin: 0,
          lineHeight: 1.15,
        }}>
          Meus cards
        </h1>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Button variant="secondary" style={{ width: 'auto' }} onClick={openCreate}>
            <Plus size={16} /> Novo Card
          </Button>
          {dueCount > 0 && (
            <Button
              variant="primary"
              style={{ width: 'auto' }}
              onClick={() => startStudySession(filterTopicId || undefined, !filterTopicId)}
            >
              <RotateCw size={15} />
              {filterTopicId ? 'Estudar Tópico' : `Estudar agora · ${dueCount}`}
            </Button>
          )}
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

      {/* ── Create form Modal ──────────────────────────────────────────────── */}
      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Novo Flashcard"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={submitCreate} loading={creating}
              disabled={creating || !createFront.trim() || !createBack.trim() || !createTopicId}>
              Criar Card
            </Button>
          </>
        }
      >
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

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
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
      </Modal>

      {/* ── Stat mini-cards ───────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)',
        gap: 14,
        marginBottom: 22,
      }}>
        {/* PENDENTE */}
        <div style={{
          background: 'var(--color-primary)',
          borderRadius: 11,
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase' }}>
            Pendente
          </span>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, color: '#fff', lineHeight: 1 }}>
            {dueCount}
          </span>
        </div>

        {/* NOVO */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 11,
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Novo
          </span>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, color: 'var(--color-warning)', lineHeight: 1 }}>
            {newCount}
          </span>
        </div>

        {/* APRENDIDO */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 11,
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          gridColumn: isMobile ? '1 / -1' : undefined,
        }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Aprendido
          </span>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, color: 'var(--color-tertiary)', lineHeight: 1 }}>
            {learnedCount}
          </span>
        </div>
      </div>

      {/* ── Filters ───────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, marginBottom: 22, alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 160px', minWidth: 160 }}>
          <Search size={15} style={{
            position: 'absolute', left: 11, top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)', pointerEvents: 'none',
          }} />
          <input
            type="text"
            className="form-input"
            placeholder="Pesquisar..."
            style={{ paddingLeft: 34 }}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Subject pills */}
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={() => setFilterSubjectId('')}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              border: filterSubjectId === '' ? 'none' : '1px solid var(--border-color)',
              background: filterSubjectId === '' ? 'var(--color-primary)' : 'var(--bg-card)',
              color: filterSubjectId === '' ? '#fff' : 'var(--text-secondary)',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Todas
          </button>
          {subjects.map(s => (
            <button
              key={s.id}
              onClick={() => setFilterSubjectId(s.id === filterSubjectId ? '' : s.id)}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                border: filterSubjectId === s.id ? 'none' : '1px solid var(--border-color)',
                background: filterSubjectId === s.id ? 'var(--color-primary)' : 'var(--bg-card)',
                color: filterSubjectId === s.id ? '#fff' : 'var(--text-secondary)',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {s.name}
            </button>
          ))}
        </div>

        {/* Topic select — only when a subject is selected */}
        {filterSubjectId && (
          <CustomSelect
            variant="form-input"
            style={{ flex: '0 1 180px' }}
            value={filterTopicId}
            onChange={setFilterTopicId}
            options={[
              { value: '', label: 'Todos os tópicos' },
              ...filterTopics.map(t => ({ value: t.id, label: t.name })),
            ]}
          />
        )}

        {filterTopicId && (
          <button
            onClick={async () => {
              const currentTopic = topics.find(t => t.id === filterTopicId);
              if (!currentTopic) return;
              const newStatus = currentTopic.isActive === false;
              await apiCall(`/areas/topics/${filterTopicId}/${newStatus ? 'resume' : 'pause'}`, { method: 'POST' });
              currentTopic.isActive = newStatus;
              fetchAllCards();
              showSuccess(`Tópico ${newStatus ? 'ativado' : 'pausado'} com sucesso!`);
            }}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              border: '1px solid var(--border-color)',
              background: 'var(--bg-card)',
              color: 'var(--text-secondary)',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {topics.find(t => t.id === filterTopicId)?.isActive !== false ? '⏸ Pausar Tópico' : '▶ Ativar Tópico'}
          </button>
        )}

        {/* Sort A–Z toggle */}
        <button
          onClick={() => setSortBy(s => s === 'az' ? 'review' : 'az')}
          style={{
            padding: '6px 14px',
            borderRadius: 20,
            border: sortBy === 'az' ? 'none' : '1px solid var(--border-color)',
            background: sortBy === 'az' ? 'var(--color-primary)' : 'var(--bg-card)',
            color: sortBy === 'az' ? '#fff' : 'var(--text-secondary)',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          A–Z
        </button>

        {/* Só pendentes pill */}
        <button
          onClick={() => setOnlyDue(d => !d)}
          style={{
            padding: '6px 14px',
            borderRadius: 20,
            border: onlyDue ? 'none' : '1px solid var(--border-color)',
            background: onlyDue ? 'var(--color-primary)' : 'var(--bg-card)',
            color: onlyDue ? '#fff' : 'var(--text-secondary)',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Só pendentes
        </button>
      </div>

      {/* ── Card grid ─────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
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
                <Button variant="primary" style={{ width: 'auto', padding: '10px 20px' }}
                  onClick={() => navigate('/materiais')}>
                  <BookOpen size={15} /> Ir para Matérias
                </Button>
                <Button variant="secondary" style={{ width: 'auto', padding: '10px 20px' }}
                  onClick={() => navigate('/ia')}>
                  <Sparkles size={15} /> Gerar com IA
                </Button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          gap: 14,
        }}>
          {filtered.map(c => (
            <div
              key={c.id}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: 11,
                padding: 18,
                display: 'flex',
                flexDirection: 'column',
                gap: 0,
              }}
            >
              {editingCardId === c.id ? (
                /* ── Inline edit form ── */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <textarea
                    className="form-input"
                    rows={3}
                    style={{ resize: 'vertical', fontFamily: 'var(--font-body)', fontSize: 14 }}
                    placeholder="Frente"
                    value={editFront}
                    onChange={e => setEditFront(e.target.value)}
                    autoFocus
                  />
                  <textarea
                    className="form-input"
                    rows={3}
                    style={{ resize: 'vertical', fontFamily: 'var(--font-body)', fontSize: 14 }}
                    placeholder="Verso"
                    value={editBack}
                    onChange={e => setEditBack(e.target.value)}
                  />
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => setEditingCardId(null)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}
                    >
                      <X size={14} /> Cancelar
                    </button>
                    <button
                      onClick={() => saveEdit(c.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600 }}
                    >
                      <Check size={14} /> Salvar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* ── Card top row: badge + action buttons ── */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <ReviewBadge nextReview={c.nextReview} />
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={async () => {
                          const newStatus = c.isActive === false;
                          await apiCall(`/areas/cards/${c.id}/${newStatus ? 'resume' : 'pause'}`, { method: 'POST' });
                          c.isActive = newStatus;
                          fetchAllCards();
                          showSuccess(`Card ${newStatus ? 'ativado' : 'pausado'}!`);
                        }}
                        title={c.isActive !== false ? "Pausar revisões deste card" : "Retomar revisões deste card"}
                        style={{
                          background: c.isActive !== false ? 'rgba(51,77,47,.08)' : 'rgba(163,59,58,.08)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 6,
                          padding: '5px 8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          color: c.isActive !== false ? 'var(--color-success)' : 'var(--color-danger)',
                          fontSize: 10,
                          fontWeight: 700
                        }}
                      >
                        {c.isActive !== false ? '⏸' : '▶'}
                      </button>
                      <button
                        onClick={() => startEdit(c.id, c.front, c.back)}
                        title="Editar"
                        style={{
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 6,
                          padding: '5px 8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => { if (window.confirm('Excluir este card?')) handleDeleteCard(c.id); }}
                        title="Excluir"
                        style={{
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 6,
                          padding: '5px 8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          color: 'var(--text-muted)',
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* ── Front (title) ── */}
                  <div style={{
                    fontSize: 15,
                    fontWeight: 600,
                    lineHeight: 1.3,
                    color: 'var(--text-primary)',
                    marginBottom: 8,
                  }}>
                    {c.front}
                  </div>

                  {/* ── Dashed separator ── */}
                  <div style={{
                    borderTop: '1px dashed var(--border-color)',
                    paddingTop: 8,
                  }}>
                    {/* ── Back (answer) ── */}
                    <div style={{
                      fontSize: 13,
                      fontWeight: 400,
                      lineHeight: 1.4,
                      color: 'var(--text-muted)',
                    }}>
                      {c.back}
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
