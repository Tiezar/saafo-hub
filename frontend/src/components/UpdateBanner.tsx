import React, { useState } from 'react';
import { RefreshCw, X } from 'lucide-react';

interface Props {
  visible: boolean;
}

export default function UpdateBanner({ visible }: Props) {
  const [dismissed, setDismissed] = useState(false);

  if (!visible || dismissed) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 16,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      background: 'var(--bg-surface)',
      border: '1px solid var(--color-primary)',
      borderRadius: 'var(--radius)',
      padding: '10px 16px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
      fontSize: 13,
      whiteSpace: 'nowrap',
      minWidth: 0,
    }}>
      <RefreshCw size={15} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
      <span style={{ color: 'var(--text-primary)' }}>Nova versão disponível</span>
      <button
        onClick={() => window.location.reload()}
        style={{
          background: 'var(--color-primary)',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          padding: '4px 12px',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        Atualizar
      </button>
      <button
        onClick={() => setDismissed(true)}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          padding: 2,
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
        }}
        title="Ignorar"
      >
        <X size={14} />
      </button>
    </div>
  );
}
