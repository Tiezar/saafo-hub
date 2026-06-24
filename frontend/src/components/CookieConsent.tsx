import React, { useEffect, useState } from 'react';
import { useCookieConsent } from '../hooks/useCookieConsent';
import './CookieConsent.css';

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  id: string;
}

function Toggle({ checked, onChange, disabled = false, id }: ToggleProps) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={`cc-toggle${checked ? ' cc-toggle-on' : ''}`}
      onClick={() => !disabled && onChange(!checked)}
      type="button"
    />
  );
}

export default function CookieConsent() {
  const { hasConsented, preferences, acceptAll, rejectAll, saveCustom } = useCookieConsent();

  /* managing pode abrir mesmo após consentir (via evento global) */
  const [managing, setManaging] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  /* pré-carrega preferências salvas ao abrir o modal */
  const openManage = () => {
    setAnalytics(preferences?.analytics ?? false);
    setMarketing(preferences?.marketing ?? false);
    setManaging(true);
  };

  /* escuta evento global "openCookieManager" — disparado pelo footer */
  useEffect(() => {
    const handler = () => openManage();
    window.addEventListener('openCookieManager', handler);
    return () => window.removeEventListener('openCookieManager', handler);
  }, [preferences]); // eslint-disable-line react-hooks/exhaustive-deps

  /* fecha modal com ESC */
  useEffect(() => {
    if (!managing) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setManaging(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [managing]);

  const handleSaveCustom = () => {
    saveCustom({ analytics, marketing });
    setManaging(false);
  };

  /* sem consentimento: mostra banner + modal */
  /* com consentimento: só mostra modal quando aberto via evento global */
  if (hasConsented && !managing) return null;

  return (
    <>
      {/* ── Banner (só quando ainda não consentiu) ───────────────── */}
      {!hasConsented && !managing && (
        <div className="cc-banner" role="region" aria-label="Aviso de cookies">
          <div className="cc-banner-content">
            <div className="cc-banner-text">
              <p className="cc-banner-title">Cookies e privacidade</p>
              <p className="cc-banner-body">
                Usamos cookies essenciais para o funcionamento do site e, com sua
                autorização, cookies analíticos para melhorar a experiência.
                Conforme a <strong>LGPD (Lei 13.709/2018)</strong>, você escolhe o que
                aceita.{' '}
                <a href="/privacidade" className="cc-link">Política de privacidade</a>
              </p>
            </div>
            <div className="cc-banner-actions">
              <button className="cc-btn cc-btn-ghost" onClick={rejectAll}>
                Somente essenciais
              </button>
              <button className="cc-btn cc-btn-outline" onClick={openManage}>
                Gerenciar
              </button>
              <button className="cc-btn cc-btn-primary" onClick={acceptAll}>
                Aceitar tudo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de preferências ─────────────────────────────────── */}
      {managing && (
        <div
          className="cc-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cc-modal-title"
          onClick={e => { if (e.target === e.currentTarget) setManaging(false); }}
        >
          <div className="cc-modal">
            <div className="cc-modal-header">
              <h2 id="cc-modal-title" className="cc-modal-title">
                Preferências de cookies
              </h2>
              <button
                className="cc-modal-close"
                onClick={() => setManaging(false)}
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <div className="cc-modal-body">
              <p className="cc-modal-intro">
                Gerencie quais cookies o SAAFO HUB pode utilizar. Cookies
                necessários não podem ser desativados — são indispensáveis para
                autenticação, segurança e preferências de interface.
              </p>

              {/* Necessários */}
              <div className="cc-category">
                <div className="cc-category-header">
                  <div>
                    <p className="cc-category-name">Necessários</p>
                    <p className="cc-category-desc">
                      Login e sessão, segurança, tema claro/escuro, configurações
                      de Pomodoro e preferências de calendário. Sempre ativos.
                    </p>
                  </div>
                  <div className="cc-always-on">Sempre ativo</div>
                </div>
              </div>

              {/* Analíticos */}
              <div className="cc-category">
                <div className="cc-category-header">
                  <div>
                    <label className="cc-category-name" htmlFor="toggle-analytics">
                      Analíticos
                    </label>
                    <p className="cc-category-desc">
                      Métricas de uso, desempenho de páginas e análise de fluxo.
                      Ajudam a melhorar a plataforma sem identificar você pessoalmente.
                    </p>
                  </div>
                  <Toggle
                    id="toggle-analytics"
                    checked={analytics}
                    onChange={setAnalytics}
                  />
                </div>
              </div>

              {/* Marketing */}
              <div className="cc-category">
                <div className="cc-category-header">
                  <div>
                    <label className="cc-category-name" htmlFor="toggle-marketing">
                      Marketing
                    </label>
                    <p className="cc-category-desc">
                      Personalização de anúncios e rastreamento de conversão.
                      Utilizados somente com sua autorização expressa.
                    </p>
                  </div>
                  <Toggle
                    id="toggle-marketing"
                    checked={marketing}
                    onChange={setMarketing}
                  />
                </div>
              </div>
            </div>

            <div className="cc-modal-footer">
              <button
                className="cc-btn cc-btn-ghost"
                onClick={() => { rejectAll(); setManaging(false); }}
              >
                Rejeitar não essenciais
              </button>
              <button className="cc-btn cc-btn-primary" onClick={handleSaveCustom}>
                Salvar preferências
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
