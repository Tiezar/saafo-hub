import React, { useState, useCallback, useEffect } from 'react';
import { Sparkles, RotateCw, CheckCircle, Upload, FileText, Image as ImageIcon, Type, Trash2, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { API_URL } from '../lib/constants';

interface PreviewCard {
  front: string;
  back: string;
  selected: boolean;
}

const COUNT_OPTIONS = [5, 10, 15, 20] as const;

export default function AIGenerator() {
  const navigate = useNavigate();
  const { apiCall, visibleTopics, subjects, selectedTopic, fetchCardsForTopic, showSuccess, showError } = useApp();

  const [tab,         setTab]         = useState<'text' | 'file'>('text');
  const [aiText,      setAiText]      = useState('');
  const [aiTheme,     setAiTheme]     = useState('');
  const [aiTopicId,   setAiTopicId]   = useState('');
  const [aiCount,     setAiCount]     = useState<number>(10);
  const [aiFile,      setAiFile]      = useState<File | null>(null);
  const [aiDragOver,  setAiDragOver]  = useState(false);
  const [previewUrl,  setPreviewUrl]  = useState<string | null>(null);
  const [generating,  setGenerating]  = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [preview,     setPreview]     = useState<PreviewCard[] | null>(null);

  useEffect(() => {
    if (!aiFile?.type.startsWith('image/')) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(aiFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [aiFile]);

  const reset = () => {
    setAiText(''); setAiTheme(''); setAiFile(null); setPreview(null);
  };

  const handleText = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiText.trim() || !aiTopicId) return;
    setGenerating(true); setPreview(null);
    try {
      const res = await apiCall('/ai/generate', {
        method: 'POST',
        body: JSON.stringify({ text: aiText, topicId: aiTopicId, theme: aiTheme || undefined, count: aiCount }),
      }) as { front: string; back: string }[];
      setPreview(res.map(c => ({ ...c, selected: true })));
    } catch (e) { showError((e as Error).message); }
    finally { setGenerating(false); }
  }, [aiText, aiTheme, aiTopicId, aiCount, apiCall, showError]);

  const handleFile = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiFile || !aiTopicId) return;
    setGenerating(true); setPreview(null);
    try {
      const fd = new FormData();
      fd.append('file', aiFile);
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
      const res = await resp.json() as { front: string; back: string }[];
      setPreview(res.map(c => ({ ...c, selected: true })));
    } catch (e) { showError((e as Error).message); }
    finally { setGenerating(false); }
  }, [aiFile, aiTheme, aiTopicId, aiCount, showError]);

  const handleSave = useCallback(async () => {
    if (!preview || !aiTopicId) return;
    const selected = preview.filter(c => c.selected);
    if (!selected.length) { showError('Selecione pelo menos 1 card para salvar.'); return; }
    setSaving(true);
    try {
      const res = await apiCall('/ai/save', {
        method: 'POST',
        body: JSON.stringify({ topicId: aiTopicId, cards: selected.map(({ front, back }) => ({ front, back })) }),
      }) as unknown[];
      showSuccess(`${res.length} flashcard${res.length !== 1 ? 's' : ''} salvo${res.length !== 1 ? 's' : ''}!`);
      if (selectedTopic?.id === aiTopicId) fetchCardsForTopic(aiTopicId);
      reset();
    } catch (e) { showError((e as Error).message); }
    finally { setSaving(false); }
  }, [preview, aiTopicId, apiCall, showSuccess, showError, selectedTopic, fetchCardsForTopic]);

  const toggleCard = (i: number) =>
    setPreview(p => p ? p.map((c, idx) => idx === i ? { ...c, selected: !c.selected } : c) : p);

  const removeCard = (i: number) =>
    setPreview(p => p ? p.filter((_, idx) => idx !== i) : p);

  const selectedCount = preview?.filter(c => c.selected).length ?? 0;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Gerar com IA</h1>
          <p className="page-subtitle">Transforme resumos em flashcards com Gemini 2.5 Flash</p>
        </div>
      </div>

      {/* Config */}
      <div className="glass-card" style={{ marginBottom: 20 }}>
        <h3 className="card-title" style={{ marginBottom: 16 }}>Configuração</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Tópico de destino *</label>
            <select className="form-input" value={aiTopicId} onChange={e => setAiTopicId(e.target.value)}>
              <option value="">Selecione o tópico...</option>
              {visibleTopics.map(t => (
                <option key={t.id} value={t.id}>{subjects.find(s => s.id === t.subjectId)?.name} › {t.name}</option>
              ))}
            </select>
            {visibleTopics.length === 0 && (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                Nenhum tópico disponível. <a href="/materiais" style={{ color: 'var(--color-primary-light)' }}>Crie uma matéria em Materiais primeiro →</a>
              </p>
            )}
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Tema específico (opcional)</label>
            <input type="text" className="form-input" value={aiTheme} onChange={e => setAiTheme(e.target.value)}
              placeholder="Ex: Artigo 5º da CF, Osmose celular…" maxLength={200} />
          </div>
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Quantidade de flashcards</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {COUNT_OPTIONS.map(n => (
              <button key={n} type="button"
                onClick={() => setAiCount(n)}
                style={{
                  padding: '6px 18px', borderRadius: 8, border: '1px solid',
                  borderColor: aiCount === n ? 'var(--color-primary)' : 'var(--border-color)',
                  background: aiCount === n ? 'var(--color-primary)' : 'rgba(255,255,255,0.03)',
                  color: aiCount === n ? 'white' : 'var(--text-secondary)',
                  fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'var(--transition)',
                }}>
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 10, overflow: 'hidden' }}>
        {([
          { value: 'text', label: 'Texto Livre', icon: <Type size={15} /> },
          { value: 'file', label: 'Documento / Imagem', icon: <Upload size={15} /> },
        ] as const).map(t => (
          <button key={t.value} type="button"
            onClick={() => { setTab(t.value); setPreview(null); }}
            style={{
              flex: 1, padding: '12px 16px', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontSize: 14, fontWeight: 600,
              background: tab === t.value ? 'var(--color-primary)' : 'transparent',
              color: tab === t.value ? 'white' : 'var(--text-secondary)',
              transition: 'var(--transition)',
            }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'text' ? (
        <div className="glass-card">
          <form onSubmit={handleText}>
            <div className="form-group">
              <label className="form-label">Conteúdo de Estudo</label>
              <textarea className="form-input" rows={10} style={{ resize: 'vertical', fontFamily: 'var(--font-body)' }}
                value={aiText} onChange={e => setAiText(e.target.value)}
                placeholder={"Cole aqui seu resumo, anotações de aula, transcrição, ou qualquer texto de estudo.\n\nA IA vai extrair os conceitos mais importantes e transformar em flashcards prontos para revisão."}
                required />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{aiText.length.toLocaleString()} caracteres</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '12px 28px' }}
                disabled={generating || !aiTopicId || !aiText.trim()}>
                {generating
                  ? <><RotateCw size={16} className="animate-spin" /> Analisando com Gemini...</>
                  : <><Sparkles size={16} /> Gerar {aiCount} Flashcards</>}
              </button>
              {aiText && <button type="button" onClick={reset}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}>Limpar</button>}
            </div>
          </form>
        </div>
      ) : (
        <div className="glass-card">
          <form onSubmit={handleFile}>
            <div className="form-group">
              <label className="form-label">Arquivo (PDF, Imagem ou .txt)</label>
              <div
                className={`ai-dropzone${aiDragOver ? ' dragover' : ''}${aiFile ? ' has-file' : ''}`}
                onDragOver={e => { e.preventDefault(); setAiDragOver(true); }}
                onDragLeave={() => setAiDragOver(false)}
                onDrop={e => { e.preventDefault(); setAiDragOver(false); const f = e.dataTransfer.files[0]; if (f) setAiFile(f); }}
                onClick={() => document.getElementById('ai-file-input')?.click()}>
                {aiFile ? (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ marginBottom: 8 }}>
                      {aiFile.type.startsWith('image/')
                        ? <ImageIcon size={32} style={{ color: 'var(--color-primary-light)' }} />
                        : <FileText size={32} style={{ color: 'var(--color-primary-light)' }} />}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{aiFile.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                      {(aiFile.size / 1024 / 1024).toFixed(2)} MB · {aiFile.type}
                    </div>
                    <button type="button"
                      onClick={e => { e.stopPropagation(); setAiFile(null); }}
                      style={{ marginTop: 10, background: 'none', border: '1px solid var(--border-color)', borderRadius: 6, padding: '4px 12px', color: 'var(--color-danger)', cursor: 'pointer', fontSize: 12 }}>
                      Remover arquivo
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
            </div>

            {aiFile?.type.startsWith('image/') && (
              <div style={{ marginBottom: 20, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-color)', maxHeight: 240 }}>
                <img src={previewUrl ?? ''} alt="preview"
                  style={{ width: '100%', maxHeight: 240, objectFit: 'contain', background: 'var(--bg-deep)' }} />
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '12px 28px' }}
                disabled={generating || !aiFile || !aiTopicId}>
                {generating
                  ? <><RotateCw size={16} className="animate-spin" /> Processando arquivo...</>
                  : <><Sparkles size={16} /> Gerar {aiCount} Flashcards</>}
              </button>
              {aiFile && <button type="button" onClick={reset}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}>Limpar</button>}
            </div>
          </form>
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 18 }}>
                Prévia — {preview.length} cards gerados
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
                {selectedCount} selecionado{selectedCount !== 1 ? 's' : ''} · Clique para (des)selecionar
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button"
                onClick={() => setPreview(p => p?.map(c => ({ ...c, selected: true })) ?? p)}
                style={{ background: 'none', border: 'none', color: 'var(--color-primary-light)', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                Todos
              </button>
              <button type="button"
                onClick={() => setPreview(p => p?.map(c => ({ ...c, selected: false })) ?? p)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                Nenhum
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {preview.map((card, i) => (
              <div key={i}
                onClick={() => toggleCard(i)}
                style={{
                  display: 'grid', gridTemplateColumns: '32px 1fr 1fr 36px',
                  gap: 12, alignItems: 'start',
                  padding: '14px 16px',
                  borderRadius: 10,
                  border: `1px solid ${card.selected ? 'var(--color-primary)' : 'var(--border-color)'}`,
                  background: card.selected ? 'rgba(73,75,214,0.05)' : 'var(--bg-surface)',
                  cursor: 'pointer', transition: 'var(--transition)',
                  opacity: card.selected ? 1 : 0.5,
                }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 2,
                  border: `2px solid ${card.selected ? 'var(--color-primary)' : 'var(--border-color)'}`,
                  background: card.selected ? 'var(--color-primary)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {card.selected && <Check size={12} color="white" />}
                </div>

                <div>
                  <div style={{ fontSize: 10, fontFamily: 'var(--font-label)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 4 }}>Frente</div>
                  <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.45 }}>{card.front}</div>
                </div>

                <div>
                  <div style={{ fontSize: 10, fontFamily: 'var(--font-label)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-primary-light)', marginBottom: 4 }}>Verso</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{card.back}</div>
                </div>

                <button type="button"
                  onClick={e => { e.stopPropagation(); removeCard(i); }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, marginTop: 1, borderRadius: 4 }}
                  title="Remover">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button className="btn-primary" style={{ padding: '12px 28px', width: 'auto' }}
              onClick={handleSave} disabled={saving || selectedCount === 0}>
              {saving
                ? <><RotateCw size={16} className="animate-spin" /> Salvando...</>
                : <><CheckCircle size={16} /> Salvar {selectedCount} card{selectedCount !== 1 ? 's' : ''}</>}
            </button>
            <button type="button" onClick={reset}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}>
              Cancelar
            </button>
            <button type="button"
              onClick={() => navigate('/materiais')}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--color-primary-light)', fontWeight: 600, cursor: 'pointer', fontSize: 13, textDecoration: 'underline' }}>
              Abrir Matérias
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
