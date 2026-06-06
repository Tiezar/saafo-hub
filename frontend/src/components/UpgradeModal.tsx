import React from 'react';
import { Star, RotateCw, CreditCard, X, Bot, ClipboardList, Lightbulb, MessageCircle, FileUp, CalendarDays, Timer, Layers } from 'lucide-react';
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
            <div style={{ fontSize: 48, fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--color-primary)', lineHeight: 1 }}>
              R$ 19<span style={{ fontSize: 18, fontWeight: 400 }}>/mês</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>PIX · Boleto · Cartão de Crédito</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {([
              { icon: <Bot size={15} color="var(--color-primary)" />, text: 'Até 100 flashcards gerados por IA por dia' },
              { icon: <FileUp size={15} color="var(--color-tertiary)" />, text: 'Geração via texto, PDF ou imagem (até 50 MB)' },
              { icon: <ClipboardList size={15} color="var(--color-success)" />, text: '20 provas por semana — 3 estilos de questão' },
              { icon: <Layers size={15} color="var(--color-success)" />, text: 'Estilos: Revisão Rápida, Aplicada e Vestibular' },
              { icon: <Lightbulb size={15} color="#f59e0b" />, text: 'Insights inteligentes automáticos' },
              { icon: <MessageCircle size={15} color="var(--color-success)" />, text: 'Lembretes via WhatsApp' },
              { icon: <CalendarDays size={15} color="var(--color-primary)" />, text: 'Calendário com recorrência e alertas' },
              { icon: <Timer size={15} color="var(--color-danger)" />, text: 'Pomodoro + todos os recursos básicos' },
            ] as const).map(({ icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14 }}>
                <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{icon}</span>
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
