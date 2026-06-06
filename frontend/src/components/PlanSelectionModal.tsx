import React from 'react';
import { Clock, Star, X } from 'lucide-react';

interface Props {
  open: boolean;
  onTrial: () => void;
  onSubscribe: () => void;
}

export default function PlanSelectionModal({ open, onTrial, onSubscribe }: Props) {
  if (!open) return null;

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <h3>Como você quer começar?</h3>
          <button onClick={onTrial} className="btn-ghost btn-icon" title="Fechar"><X size={20} /></button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Trial option */}
          <button
            onClick={onTrial}
            style={{
              width: '100%', textAlign: 'left', padding: '20px', borderRadius: 12,
              border: '1.5px solid var(--border-color)', background: 'var(--bg-card, rgba(255,255,255,0.03))',
              cursor: 'pointer', color: 'inherit',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{ padding: 10, borderRadius: 10, background: 'rgba(255,209,102,0.1)', flexShrink: 0 }}>
                <Clock size={22} style={{ color: 'var(--color-warning)' }} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Teste grátis por 14 dias</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  Acesso completo a todos os recursos. Sem cartão necessário.
                  Ao final do período, escolha assinar ou sair.
                </div>
              </div>
            </div>
          </button>

          {/* Subscribe option */}
          <button
            onClick={onSubscribe}
            style={{
              width: '100%', textAlign: 'left', padding: '20px', borderRadius: 12,
              border: '1.5px solid var(--color-primary)', background: 'var(--bg-card)',
              cursor: 'pointer', color: 'inherit', position: 'relative', overflow: 'hidden',
            }}
          >
            <div style={{
              position: 'absolute', top: 10, right: 12,
              background: 'var(--color-primary)', color: '#fff',
              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
            }}>
              MELHOR OPÇÃO
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{ padding: 10, borderRadius: 6, background: 'var(--bg-card-high)', flexShrink: 0 }}>
                <Star size={22} style={{ color: 'var(--color-primary-text)' }} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>
                  Assinar agora{' '}
                  <span style={{ color: 'var(--color-primary-text)', fontFamily: 'var(--font-display)' }}>R$ 19/mês</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  100 cards/dia · 20 provas/semana · 3 estilos de questão.<br />
                  Cartão, PIX ou boleto. Cancele quando quiser.
                </div>
              </div>
            </div>
          </button>
        </div>

        <div className="modal-footer">
          <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', margin: 0, width: '100%' }}>
            Você pode assinar a qualquer momento durante ou após o período de teste.
          </p>
        </div>
      </div>
    </div>
  );
}
