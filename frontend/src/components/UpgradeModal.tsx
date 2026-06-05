import React from 'react';
import { Star, RotateCw, CreditCard, X } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

export default function UpgradeModal() {
  const { upgradeModalOpen, setUpgradeModalOpen, handleCheckout, checkoutLoading } = useApp();

  if (!upgradeModalOpen) return null;

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setUpgradeModalOpen(false); }}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Star size={18} style={{ color: '#f59e0b' }} /> Plano Estudante
          </h3>
          <button onClick={() => setUpgradeModalOpen(false)} className="btn-ghost btn-icon">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div style={{ textAlign: 'center', padding: '8px 0 20px' }}>
            <div style={{ fontSize: 48, fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--color-primary-light)', lineHeight: 1 }}>
              R$ 19<span style={{ fontSize: 18, fontWeight: 400 }}>/mês</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>PIX · Boleto · Cartão de Crédito</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              '🤖 Geração ilimitada de flashcards com IA',
              '📝 Sessão de Provas com IA (múltipla escolha)',
              '💡 Insights inteligentes automáticos',
              '📱 Lembretes via WhatsApp',
              '📄 Upload de documentos PDF e imagens',
              '🗓️ Calendário com recorrência e alertas',
              '🍅 Pomodoro + todos os recursos básicos',
            ].map(text => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14 }}>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-footer" style={{ flexDirection: 'column', gap: 12 }}>
          <button className="btn-primary" style={{ width: '100%', padding: '14px' }}
            onClick={handleCheckout} disabled={checkoutLoading}>
            {checkoutLoading
              ? <><RotateCw size={16} className="animate-spin" /> Aguarde...</>
              : <><CreditCard size={16} /> Assinar agora — R$ 19/mês</>}
          </button>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>
            Cancele quando quiser. Sem multas ou fidelidade.
          </p>
        </div>
      </div>
    </div>
  );
}
