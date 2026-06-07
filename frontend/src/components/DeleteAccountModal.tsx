import React, { useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export default function DeleteAccountModal({ open, onClose, onConfirm }: Props) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const confirmed = input.trim().toUpperCase() === 'APAGAR';

  const handleConfirm = async () => {
    if (!confirmed) return;
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setInput('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="modal" style={{ maxWidth: 440 }}>
        <div className="modal-header" style={{ borderBottom: '1px solid var(--color-danger)', paddingBottom: 16 }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--color-danger)', margin: 0 }}>
            <AlertTriangle size={20} />
            Apagar conta permanentemente
          </h3>
          <button onClick={handleClose} className="btn-ghost btn-icon" disabled={loading}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{
            background: 'rgba(var(--color-danger-rgb, 220 38 38) / 0.08)',
            border: '1px solid var(--color-danger)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            fontSize: 13,
            lineHeight: 1.6,
            color: 'var(--text-primary)',
          }}>
            <strong style={{ display: 'block', marginBottom: 8, color: 'var(--color-danger)' }}>
              Esta ação é irreversível.
            </strong>
            Tudo será apagado definitivamente — matérias, tópicos, flashcards, histórico de revisões,
            provas, sessões de estudo, calendário e dados da assinatura. Não há como desfazer.
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 8, fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Para confirmar, escreva <strong style={{ color: 'var(--text-primary)' }}>APAGAR</strong> abaixo:
            </label>
            <input
              className="input-notebook"
              type="text"
              placeholder="APAGAR"
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={loading}
              autoComplete="off"
              style={{
                borderColor: confirmed ? 'var(--color-danger)' : undefined,
                outline: confirmed ? '1px solid var(--color-danger)' : undefined,
              }}
            />
          </div>
        </div>

        <div className="modal-footer" style={{ gap: 10 }}>
          <button
            className="btn-outline-custom"
            onClick={handleClose}
            disabled={loading}
            style={{ flex: 1 }}
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!confirmed || loading}
            style={{
              flex: 1, padding: '10px 16px', borderRadius: 'var(--radius-md)',
              border: 'none', cursor: confirmed && !loading ? 'pointer' : 'not-allowed',
              background: confirmed ? 'var(--color-danger)' : 'var(--bg-surface)',
              color: confirmed ? '#fff' : 'var(--text-muted)',
              fontFamily: 'var(--font-label)', fontSize: 12,
              textTransform: 'uppercase', letterSpacing: '0.05em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'background 0.2s, color 0.2s',
              fontWeight: 600,
            }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                Apagando...
              </span>
            ) : (
              <>
                <Trash2 size={14} />
                Apagar minha conta
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
