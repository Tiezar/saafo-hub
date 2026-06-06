import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Sparkles, RotateCw, CheckCircle, Upload, FileText,
  Image as ImageIcon, Type, Trash2, Check, X, Pencil,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { API_URL } from '../lib/constants';
import './AIGenerator.css';


interface PreviewCard { front: string; back: string; selected: boolean }

const COUNT_OPTIONS = [5, 10, 15, 20] as const;

function StepBadge({ n, done }: { n: number; done?: boolean }) {
  return (
    <div style={{
      width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
      background: done ? 'var(--color-success)' : 'var(--color-primary)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, fontWeight: 800, color: 'white',
    }}>
      {done ? <Check size={13} /> : n}
    </div>
  );
}

function wordCount(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function wordHint(n: number): { text: string; color: string } | null {
  if (n === 0) return null;
  if (n < 80)  return { color: 'var(--color-danger)',  text: `${n} palavras — muito pouco, adicione mais conteúdo` };
  if (n < 250) return { color: 'var(--color-warning)', text: `${n} palavras — suficiente para até 10 cards` };
  return          { color: 'var(--color-success)', text: `${n} palavras — ótimo, conteúdo rico` };
}

export default function AIGenerator() {
  const { apiCall, visibleTopics, subjects, selectedTopic, fetchCardsForTopic, showError, showSuccess, handleQuickSetup } = useApp();

  // ── Inline setup (when user has no topics yet) ────────────────────────────
  const [showSetup,      setShowSetup]      = useState(false);
  const [setupSubject,   setSetupSubject]   = useState('');
  const [setupTopic,     setSetupTopic]     = useState('');
  const [setupLoading,   setSetupLoading]   = useState(false);

  const submitQuickSetup = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupSubject.trim() || !setupTopic.trim()) return;
    setSetupLoading(true);
    try {
      await handleQuickSetup(setupSubject.trim(), setupTopic.trim());
      setShowSetup(false);
      setSetupSubject('');
      setSetupTopic('');
    } finally { setSetupLoading(false); }
  }, [setupSubject, setupTopic, handleQuickSetup]);

  // ── Destination ───────────────────────────────────────────────────────────
  const [filterSubjectId, setFilterSubjectId] = useState('');
  const [aiTopicId,   setAiTopicId]   = useState('');
  const [aiCount,     setAiCount]     = useState<number>(10);

  // Reset topic when subject changes
  useEffect(() => { setAiTopicId(''); }, [filterSubjectId]);

  const cascadeTopics = filterSubjectId
    ? visibleTopics.filter(t => t.subjectId === filterSubjectId)
    : visibleTopics;

  // ── Content ───────────────────────────────────────────────────────────────
  const [inputMode,  setInputMode]  = useState<'text' | 'file'>('text');
  const [aiText,     setAiText]     = useState('');
  const [aiTheme,    setAiTheme]    = useState('');
  const [aiFile,     setAiFile]     = useState<File | null>(null);
  const [aiDragOver, setAiDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!aiFile?.type.startsWith('image/')) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(aiFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [aiFile]);

  const wc   = wordCount(aiText);
  const hint = wordHint(wc);

  // ── Generation ────────────────────────────────────────────────────────────
  const [generating, setGenerating] = useState(false);
  const [genStep,    setGenStep]    = useState('');
  const [preview,    setPreview]    = useState<PreviewCard[] | null>(null);
  const [saving,     setSaving]     = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const generate = useCallback(async () => {
    if (!aiTopicId) return;
    if (inputMode === 'text' && !aiText.trim()) return;
    if (inputMode === 'file' && !aiFile) return;

    setGenerating(true); setPreview(null); setGenStep('Analisando conteúdo...');
    const stepTimeout = setTimeout(() => setGenStep('Extraindo conceitos-chave...'), 2000);
    const stepTimeout2 = setTimeout(() => setGenStep('Montando flashcards...'), 5000);

    try {
      let res: { front: string; back: string }[];
      if (inputMode === 'text') {
        res = await apiCall('/ai/generate', {
          method: 'POST',
          body: JSON.stringify({ text: aiText, topicId: aiTopicId, theme: aiTheme || undefined, count: aiCount }),
        }) as typeof res;
      } else {
        const fd = new FormData();
        fd.append('file', aiFile!);
        fd.append('topicId', aiTopicId);
        if (aiTheme.trim()) fd.append('theme', aiTheme.trim());
        fd.append('count', String(aiCount));
        const token = localStorage.getItem('token');
        const resp = await fetch(`${API_URL}/ai/generate-file`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: fd,
        });
        if (!resp.ok) { const err = await resp.json().catch(() => ({})); throw new Error((err as any).message || 'Erro ao gerar flashcards'); }
        res = await resp.json() as typeof res;
      }
      setPreview(res.map(c => ({ ...c, selected: true })));
      setTimeout(() => previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    } catch (e) { showError((e as Error).message); }
    finally {
      clearTimeout(stepTimeout); clearTimeout(stepTimeout2);
      setGenerating(false); setGenStep('');
    }
  }, [inputMode, aiText, aiFile, aiTopicId, aiTheme, aiCount, apiCall, showError]);

  // ── Preview editing ───────────────────────────────────────────────────────
  const [editIdx,   setEditIdx]   = useState<number | null>(null);
  const [editFront, setEditFront] = useState('');
  const [editBack,  setEditBack]  = useState('');

  function openEdit(i: number) {
    setEditIdx(i); setEditFront(preview![i].front); setEditBack(preview![i].back);
  }
  function saveEdit(i: number) {
    if (!editFront.trim() || !editBack.trim()) return;
    setPreview(p => p ? p.map((c, idx) => idx === i ? { ...c, front: editFront.trim(), back: editBack.trim() } : c) : p);
    setEditIdx(null);
  }
  const toggleCard  = (i: number) => setPreview(p => p?.map((c, idx) => idx === i ? { ...c, selected: !c.selected } : c) ?? p);
  const removeCard  = (i: number) => { setPreview(p => p?.filter((_, idx) => idx !== i) ?? p); if (editIdx === i) setEditIdx(null); };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!preview || !aiTopicId) return;
    const sel = preview.filter(c => c.selected);
    if (!sel.length) { showError('Selecione pelo menos 1 card para salvar.'); return; }
    setSaving(true);
    try {
      const res = await apiCall('/ai/save', {
        method: 'POST',
        body: JSON.stringify({ topicId: aiTopicId, cards: sel.map(({ front, back }) => ({ front, back })) }),
      }) as unknown[];
      showSuccess(`${res.length} flashcard${res.length !== 1 ? 's' : ''} salvo${res.length !== 1 ? 's' : ''}!`);
      if (selectedTopic?.id === aiTopicId) fetchCardsForTopic(aiTopicId);
      setPreview(null); // keep content for "gerar mais"
      setEditIdx(null);
    } catch (e) { showError((e as Error).message); }
    finally { setSaving(false); }
  }, [preview, aiTopicId, apiCall, showSuccess, showError, selectedTopic, fetchCardsForTopic]);

  const selectedCount = preview?.filter(c => c.selected).length ?? 0;
  const step1Done = !!aiTopicId;
  const step2Done = step1Done && (inputMode === 'text' ? aiText.trim().length > 0 : !!aiFile);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Gerar Flashcards com IA</h1>
          <p className="page-subtitle">Transforme qualquer conteúdo em cards de revisão com Gemini 2.5 Flash</p>
        </div>
      </div>

      {/* ── Step 1: Destino ─────────────────────────────────────────────── */}
      <div className="glass-card" style={{ marginBottom: 16, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <StepBadge n={1} done={step1Done} />
          <span style={{ fontWeight: 700, fontSize: 15 }}>Onde salvar os cards?</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'end' }}>
          <div>
            <label className="form-label">Matéria *</label>
            <select className="form-input" value={filterSubjectId}
              onChange={e => setFilterSubjectId(e.target.value)}>
              <option value="">Selecione a matéria...</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div>
            <label className="form-label">Tópico *</label>
            <select className="form-input" value={aiTopicId}
              onChange={e => setAiTopicId(e.target.value)}
              disabled={!filterSubjectId}>
              <option value="">
                {filterSubjectId ? 'Selecione o tópico...' : 'Selecione a matéria primeiro'}
              </option>
              {cascadeTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          <div>
            <label className="form-label">Quantidade</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {COUNT_OPTIONS.map(n => (
                <button key={n} type="button" onClick={() => setAiCount(n)}
                  style={{
                    padding: '8px 14px', borderRadius: 8, border: '1px solid',
                    borderColor: aiCount === n ? 'var(--color-primary)' : 'var(--border-color)',
                    background: aiCount === n ? 'var(--color-primary)' : 'rgba(255,255,255,0.03)',
                    color: aiCount === n ? 'white' : 'var(--text-secondary)',
                    fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'var(--transition)',
                  }}>
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        {visibleTopics.length === 0 && (
          <div style={{ marginTop: 16, borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
            {!showSetup ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Nenhum tópico ainda.
                </span>
                <button
                  className="btn-ghost btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
                  onClick={() => setShowSetup(true)}
                >
                  <Sparkles size={13} /> Criar matéria e tópico agora
                </button>
              </div>
            ) : (
              <form onSubmit={submitQuickSetup} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                  Crie uma matéria e um tópico para começar:
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Matéria</label>
                    <input
                      className="form-input"
                      style={{ padding: '8px 12px', fontSize: 13 }}
                      placeholder="Ex: Direito Civil"
                      value={setupSubject}
                      onChange={e => setSetupSubject(e.target.value)}
                      autoFocus
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Tópico</label>
                    <input
                      className="form-input"
                      style={{ padding: '8px 12px', fontSize: 13 }}
                      placeholder="Ex: Contratos"
                      value={setupTopic}
                      onChange={e => setSetupTopic(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" className="btn-primary btn-sm" disabled={setupLoading}
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {setupLoading ? <RotateCw size={13} className="animate-spin" /> : <Check size={13} />}
                    Criar e continuar
                  </button>
                  <button type="button" className="btn-ghost btn-sm" onClick={() => setShowSetup(false)}>
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* ── Step 2: Conteúdo ─────────────────────────────────────────────── */}
      <div className="glass-card" style={{ marginBottom: 16, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <StepBadge n={2} done={step2Done} />
            <span style={{ fontWeight: 700, fontSize: 15 }}>Conteúdo para estudar</span>
          </div>

          {/* Text / File toggle */}
          <div style={{ display: 'flex', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 8, overflow: 'hidden' }}>
            {([
              { value: 'text', icon: <Type size={14} />, label: 'Texto' },
              { value: 'file', icon: <Upload size={14} />, label: 'Arquivo' },
            ] as const).map(m => (
              <button key={m.value} type="button"
                onClick={() => { setInputMode(m.value); setPreview(null); }}
                style={{
                  padding: '7px 14px', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600,
                  background: inputMode === m.value ? 'var(--color-primary)' : 'transparent',
                  color: inputMode === m.value ? 'white' : 'var(--text-secondary)',
                  transition: 'var(--transition)',
                }}>
                {m.icon} {m.label}
              </button>
            ))}
          </div>
        </div>

        {inputMode === 'text' ? (
          <>
            <div className="form-group">
              <textarea className="form-input" rows={10}
                style={{ resize: 'vertical', fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.6 }}
                value={aiText} onChange={e => setAiText(e.target.value)}
                placeholder={"Cole aqui seu resumo, anotações de aula, transcrição ou qualquer texto de estudo.\n\nA IA vai extrair os conceitos mais importantes e criar flashcards prontos para revisão."} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, alignItems: 'center' }}>
                {hint
                  ? <span style={{ fontSize: 12, color: hint.color, fontWeight: 600 }}>{hint.text}</span>
                  : <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Cole seu conteúdo acima</span>
                }
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  {aiText && (
                    <button type="button" onClick={() => setAiText('')}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12 }}>
                      Limpar
                    </button>
                  )}
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{aiText.length.toLocaleString()} chars</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="form-group">
            <div
              className={`ai-dropzone${aiDragOver ? ' dragover' : ''}${aiFile ? ' has-file' : ''}`}
              onDragOver={e => { e.preventDefault(); setAiDragOver(true); }}
              onDragLeave={() => setAiDragOver(false)}
              onDrop={e => { e.preventDefault(); setAiDragOver(false); const f = e.dataTransfer.files[0]; if (f) setAiFile(f); }}
              onClick={() => document.getElementById('ai-file-input')?.click()}>
              {aiFile ? (
                <div style={{ textAlign: 'center' }}>
                  {aiFile.type.startsWith('image/')
                    ? <ImageIcon size={32} style={{ color: 'var(--color-primary-light)', marginBottom: 8 }} />
                    : <FileText size={32} style={{ color: 'var(--color-primary-light)', marginBottom: 8 }} />}
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{aiFile.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    {(aiFile.size / 1024 / 1024).toFixed(2)} MB · {aiFile.type}
                  </div>
                  <button type="button"
                    onClick={e => { e.stopPropagation(); setAiFile(null); }}
                    style={{ marginTop: 10, background: 'none', border: '1px solid var(--border-color)', borderRadius: 6, padding: '4px 12px', color: 'var(--color-danger)', cursor: 'pointer', fontSize: 12 }}>
                    Remover
                  </button>
                </div>
              ) : (
                <div style={{ textAlign: 'center', pointerEvents: 'none' }}>
                  <Upload size={32} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
                  <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Arraste o arquivo aqui</p>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>ou clique para selecionar</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>PDF · JPG · PNG · WEBP · TXT — máx. 50 MB</p>
                </div>
              )}
            </div>
            <input id="ai-file-input" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.heic,.txt"
              style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) setAiFile(f); e.target.value = ''; }} />

            {aiFile?.type.startsWith('image/') && previewUrl && (
              <div style={{ marginTop: 12, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-color)', maxHeight: 220 }}>
                <img src={previewUrl} alt="preview" style={{ width: '100%', maxHeight: 220, objectFit: 'contain', background: 'var(--bg-deep)' }} />
              </div>
            )}
          </div>
        )}

        {/* Focus hint */}
        <div style={{ marginTop: inputMode === 'text' ? 0 : 12 }}>
          <label className="form-label" style={{ marginBottom: 4 }}>
            Foque nisso <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(opcional)</span>
          </label>
          <input type="text" className="form-input" value={aiTheme} onChange={e => setAiTheme(e.target.value)}
            placeholder="Ex: foque nas causas, datas importantes, conceitos principais..."
            maxLength={200} />
        </div>

        {/* Generate button */}
        <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <button type="button" className="btn-primary" style={{ width: 'auto', padding: '12px 32px', fontSize: 15 }}
            onClick={generate}
            disabled={generating || !aiTopicId || (inputMode === 'text' ? !aiText.trim() : !aiFile)}>
            {generating
              ? <><RotateCw size={16} className="animate-spin" /> {genStep || 'Gerando...'}</>
              : <><Sparkles size={16} /> Gerar {aiCount} Flashcards</>}
          </button>

          {!aiTopicId && (
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              ← Selecione um tópico primeiro
            </span>
          )}
        </div>
      </div>

      {/* ── Step 3: Preview ──────────────────────────────────────────────── */}
      {preview && (
        <div ref={previewRef}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <StepBadge n={3} />
            <span style={{ fontWeight: 700, fontSize: 15 }}>
              Revise e edite antes de salvar
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 4 }}>
              {selectedCount} de {preview.length} selecionado{selectedCount !== 1 ? 's' : ''}
            </span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
              <button type="button"
                onClick={() => setPreview(p => p?.map(c => ({ ...c, selected: true })) ?? p)}
                style={{ background: 'none', border: 'none', color: 'var(--color-primary-light)', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                Selecionar todos
              </button>
              <button type="button"
                onClick={() => setPreview(p => p?.map(c => ({ ...c, selected: false })) ?? p)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                Desmarcar todos
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {preview.map((card, i) => (
              <div key={i} className="glass-card"
                style={{
                  padding: '16px 18px',
                  border: `1px solid ${editIdx === i ? 'var(--color-primary)' : card.selected ? 'rgba(73,75,214,0.35)' : 'var(--border-color)'}`,
                  background: card.selected ? 'rgba(73,75,214,0.04)' : 'var(--bg-surface)',
                  opacity: card.selected ? 1 : 0.55,
                  transition: 'var(--transition)',
                }}>
                {editIdx === i ? (
                  // ── Inline edit mode ────────────────────────────────────
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 }}>Frente</div>
                        <textarea className="form-input" rows={3}
                          style={{ resize: 'vertical', fontFamily: 'var(--font-body)', fontSize: 14 }}
                          value={editFront} onChange={e => setEditFront(e.target.value)} autoFocus />
                      </div>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-primary-light)', marginBottom: 6 }}>Verso</div>
                        <textarea className="form-input" rows={3}
                          style={{ resize: 'vertical', fontFamily: 'var(--font-body)', fontSize: 14 }}
                          value={editBack} onChange={e => setEditBack(e.target.value)} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                      <button onClick={() => setEditIdx(null)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <X size={14} /> Cancelar
                      </button>
                      <button onClick={() => saveEdit(i)}
                        style={{ background: 'none', border: 'none', color: 'var(--color-primary-light)', fontWeight: 700, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Check size={14} /> Salvar edição
                      </button>
                    </div>
                  </div>
                ) : (
                  // ── Display mode ────────────────────────────────────────
                  <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 1fr auto', gap: 14, alignItems: 'start' }}>
                    {/* Checkbox */}
                    <div onClick={() => toggleCard(i)} style={{ cursor: 'pointer', paddingTop: 2 }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: 6,
                        border: `2px solid ${card.selected ? 'var(--color-primary)' : 'var(--border-color)'}`,
                        background: card.selected ? 'var(--color-primary)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {card.selected && <Check size={12} color="white" />}
                      </div>
                    </div>

                    {/* Front */}
                    <div onClick={() => toggleCard(i)} style={{ cursor: 'pointer' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 5 }}>Frente</div>
                      <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.5 }}>{card.front}</div>
                    </div>

                    {/* Back */}
                    <div onClick={() => toggleCard(i)} style={{ cursor: 'pointer' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-primary-light)', marginBottom: 5 }}>Verso</div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{card.back}</div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 4, paddingTop: 2 }}>
                      <button type="button" title="Editar" onClick={() => openEdit(i)}
                        style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 7, borderRadius: 7, display: 'flex', alignItems: 'center' }}>
                        <Pencil size={14} />
                      </button>
                      <button type="button" title="Remover" onClick={e => { e.stopPropagation(); removeCard(i); }}
                        style={{ background: 'rgba(255,180,171,0.08)', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: 7, borderRadius: 7, display: 'flex', alignItems: 'center' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Save bar */}
          <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn-primary" style={{ width: 'auto', padding: '11px 28px' }}
              onClick={handleSave} disabled={saving || selectedCount === 0}>
              {saving
                ? <><RotateCw size={15} className="animate-spin" /> Salvando...</>
                : <><CheckCircle size={15} /> Salvar {selectedCount} card{selectedCount !== 1 ? 's' : ''}</>}
            </button>

            <button type="button" onClick={generate} disabled={generating}
              style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: 8, padding: '10px 18px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={14} /> Gerar mais {aiCount}
            </button>

            <button type="button" onClick={() => { setPreview(null); setEditIdx(null); }}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, marginLeft: 'auto' }}>
              Descartar prévia
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
