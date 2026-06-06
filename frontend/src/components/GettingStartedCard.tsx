import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, Rocket, ChevronRight } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

const STORAGE_KEY = 'onboarding_dismissed';

interface Step {
  label: string;
  done: boolean;
  href: string | null;
}

export default function GettingStartedCard() {
  const { subjects, topics, cards, showSuccess } = useApp();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(STORAGE_KEY) === '1');
  const [autoHidden, setAutoHidden] = useState(false);

  const steps: Step[] = [
    { label: 'Conta criada',              done: true,                href: null },
    { label: 'Criar primeira matéria',    done: subjects.length > 0, href: '/materiais' },
    { label: 'Adicionar um tópico',       done: topics.length > 0,   href: '/materiais' },
    { label: 'Gerar flashcards com IA',   done: cards.length > 0,    href: '/ia' },
  ];

  const completedCount = steps.filter(s => s.done).length;
  const allDone = completedCount === steps.length;
  const activeIndex = steps.findIndex(s => !s.done);

  // Auto-dismiss when all steps complete
  useEffect(() => {
    if (allDone && !dismissed) {
      showSuccess('Primeiros passos concluídos! Bem-vindo ao SAAFO.');
      localStorage.setItem(STORAGE_KEY, '1');
      setAutoHidden(true);
    }
  }, [allDone, dismissed, showSuccess]);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setDismissed(true);
  };

  if (dismissed || autoHidden) return null;

  return (
    <div className="glass-card" style={{ padding: 24, marginBottom: 24, position: 'relative' }}>
      {/* Dismiss */}
      <button
        onClick={dismiss}
        className="btn-ghost btn-icon"
        style={{ position: 'absolute', top: 12, right: 12 }}
        title="Fechar"
      >
        <X size={16} />
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: 'var(--grad-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Rocket size={18} color="#fff" />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Primeiros passos</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{completedCount} de {steps.length} concluídos</div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, background: 'var(--border-color)', borderRadius: 4, marginBottom: 16, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${(completedCount / steps.length) * 100}%`,
          background: 'var(--grad-primary)',
          borderRadius: 4,
          transition: 'width 0.4s ease',
        }} />
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {steps.map((step, i) => {
          const isActive = i === activeIndex;
          const isFuture = !step.done && i > activeIndex;

          return (
            <div key={step.label} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: isActive ? '8px 10px' : '4px 10px',
              borderRadius: 8,
              background: isActive ? 'rgba(99,102,241,0.08)' : 'transparent',
              border: isActive ? '1px solid rgba(99,102,241,0.2)' : '1px solid transparent',
              transition: 'all 0.2s',
            }}>
              {/* Icon */}
              <div style={{
                width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: step.done
                  ? 'rgba(47,217,244,0.15)'
                  : isActive
                  ? 'var(--color-primary)'
                  : 'var(--border-color)',
              }}>
                {step.done
                  ? <Check size={11} color="var(--color-success)" />
                  : <span style={{ fontSize: 10, fontWeight: 700, color: isActive ? '#fff' : 'var(--text-muted)' }}>{i + 1}</span>
                }
              </div>

              {/* Label */}
              <span style={{
                fontSize: 13,
                flex: 1,
                color: step.done ? 'var(--text-muted)' : isFuture ? 'var(--text-muted)' : 'var(--text-primary)',
                fontWeight: isActive ? 600 : 400,
                textDecoration: step.done ? 'line-through' : 'none',
              }}>
                {step.label}
              </span>

              {/* CTA */}
              {isActive && step.href && (
                <button
                  className="btn-ghost btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, padding: '4px 10px', flexShrink: 0 }}
                  onClick={() => navigate(step.href!)}
                >
                  Ir <ChevronRight size={12} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
