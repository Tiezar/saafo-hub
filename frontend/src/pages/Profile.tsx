import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Star, RotateCw, AlertTriangle, RefreshCw, Check } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import type { Institution } from '../types';
import './Profile.css';

interface SubscriptionDetails {
  status: string;
  nextDueDate: string;
  value: number;
  billingType: string;
  creditCardBrand?: string;
  creditCardLastFour?: string;
}

function initPhoneDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  const local = digits.startsWith('55') && digits.length > 2 ? digits.slice(2) : digits;
  return formatBRPhone(local);
}

function formatBRPhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

function toRawPhone(display: string): string {
  const digits = display.replace(/\D/g, '');
  if (!digits) return '';
  return `55${digits}`;
}

export default function Profile() {
  const {
    currentUser, planStatus, institutions,
    fetchInstitutions, handleUpdateProfile,
    setUpgradeModalOpen, setCheckoutOpen, fetchPlanStatus,
    apiCall, showSuccess, showError,
  } = useApp();

  const [name,         setName]         = useState(currentUser?.name ?? '');
  const [nickname,     setNickname]     = useState(currentUser?.nickname ?? '');
  const [phoneDisplay, setPhoneDisplay] = useState(() => initPhoneDisplay(currentUser?.phone ?? ''));
  const [password,     setPassword]     = useState('');
  const [instSearch,    setInstSearch]    = useState('');
  const [selectedInst,  setSelectedInst]  = useState<Institution | null>(null);
  const [showDropdown,  setShowDropdown]  = useState(false);
  const [saving,        setSaving]        = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Subscription details (only fetched when user is STUDENT)
  const [subDetails,     setSubDetails]     = useState<SubscriptionDetails | null>(null);
  const [subLoading,     setSubLoading]     = useState(false);
  const [cancelConfirm,  setCancelConfirm]  = useState(false);
  const [cancelling,     setCancelling]     = useState(false);

  const fetchSubDetails = useCallback(async () => {
    setSubLoading(true);
    try {
      const d = await apiCall('/billing/subscription/details') as SubscriptionDetails | null;
      setSubDetails(d);
    } catch { /* silent */ }
    finally { setSubLoading(false); }
  }, [apiCall]);

  useEffect(() => {
    if (planStatus?.plan === 'STUDENT') fetchSubDetails();
  }, [planStatus?.plan, fetchSubDetails]);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await apiCall('/billing/subscription', { method: 'DELETE' });
      await fetchPlanStatus();
      setSubDetails(null);
      setCancelConfirm(false);
      showSuccess('Assinatura cancelada. Acesso encerra no fim do ciclo pago.');
    } catch (err) { showError((err as Error).message); }
    finally { setCancelling(false); }
  };

  const billingLabel = (type: string) => {
    if (type === 'CREDIT_CARD') return 'Cartão de crédito';
    if (type === 'PIX') return 'PIX';
    if (type === 'BOLETO') return 'Boleto';
    return type;
  };

  // Init search label from existing institution
  useEffect(() => {
    if (currentUser?.institutionId && institutions.length) {
      const inst = institutions.find(i => i.id === currentUser.institutionId);
      if (inst) { setSelectedInst(inst); setInstSearch(`${inst.sigla} - ${inst.name}`); }
    }
  }, [currentUser, institutions]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await handleUpdateProfile({
        name, nickname: nickname || undefined,
        password: password || undefined,
        institutionId: selectedInst?.id || undefined,
        phone: phoneDisplay ? toRawPhone(phoneDisplay) : undefined,
      });
      setPassword('');
      showSuccess('Perfil atualizado!');
    } catch (err) { showError((err as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <div className="page" style={{ padding: '24px 24px 48px' }}>
      {/* Page Header */}
      <header style={{ marginBottom: 40, borderBottom: '1px solid var(--border-color)', paddingBottom: 24 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 300, color: 'var(--text-primary)', margin: 0 }}>Perfil</h2>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: 'var(--text-muted)', marginTop: 8 }}>
          Gerencie suas informações pessoais e detalhes da sua assinatura.
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 48 }}>
        {/* Left Column: Painel de Assinatura */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <h3 className="academic-label" style={{ color: 'var(--text-secondary)' }}>Painel de Assinatura</h3>

          {planStatus && (
            <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 24 }}>
              <span className="academic-label" style={{ display: 'block', marginBottom: 8, fontSize: 10 }}>Plano Ativo</span>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontStyle: 'italic', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 20 }}>
                {planStatus.plan === 'STUDENT' ? 'Estudante' : planStatus.isActive ? 'Período de Experiência' : 'Assinatura Expirada'}
              </div>

              {planStatus.plan !== 'STUDENT' && (
                <div style={{ marginTop: 16 }}>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>
                    {planStatus.isActive
                      ? `Você possui ${planStatus.trialDaysLeft} dias restantes em seu período gratuito.`
                      : 'Seu período de teste expirou. Assine o plano Estudante para reaver o acesso à IA, WhatsApp e flashcards ilimitados.'}
                  </p>
                  <button className="btn-oxblood" style={{ width: '100%' }} onClick={() => setUpgradeModalOpen(true)}>
                    <Star size={12} style={{ marginRight: 6 }} /> Assinar Plano Estudante
                  </button>
                </div>
              )}

              {planStatus.plan === 'STUDENT' && (
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {subLoading && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                      <RotateCw size={14} className="animate-spin" /> Carregando detalhes...
                    </div>
                  )}

                  {subDetails && !subLoading && (
                    <>
                      <div>
                        <span className="academic-label" style={{ display: 'block', fontSize: 10, marginBottom: 4 }}>Bloco de Cobrança</span>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Próximo Vencimento:</span>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {subDetails.nextDueDate
                              ? new Date(subDetails.nextDueDate + 'T12:00:00').toLocaleDateString('pt-BR')
                              : '—'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Valor:</span>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            R$ {subDetails.value?.toFixed(2).replace('.', ',')}/mês
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: 'var(--bg-surface)', padding: 12, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginTop: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                          💳 {billingLabel(subDetails.billingType)}
                          {subDetails.creditCardBrand && ` ${subDetails.creditCardBrand}`}
                          {subDetails.creditCardLastFour && ` •••• ${subDetails.creditCardLastFour}`}
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
                        <button
                          className="btn-outline-custom"
                          style={{ width: '100%', padding: '10px' }}
                          onClick={() => setCheckoutOpen(true)}>
                          Atualizar cartão
                        </button>
                        <button
                          className="btn-outline-custom"
                          style={{ width: '100%', padding: '10px' }}
                          onClick={fetchSubDetails}>
                          <RefreshCw size={12} style={{ marginRight: 6, display: 'inline' }} /> Atualizar Informações
                        </button>

                        {!cancelConfirm ? (
                          <button
                            style={{
                              width: '100%', padding: '10px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em',
                              borderRadius: 'var(--radius-md)', border: '1px solid var(--color-danger)', background: 'transparent',
                              color: 'var(--color-danger)', cursor: 'pointer', fontFamily: 'var(--font-label)', marginTop: 8
                            }}
                            onClick={() => setCancelConfirm(true)}>
                            Cancelar assinatura
                          </button>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, border: '1px solid var(--color-danger)', padding: 12, borderRadius: 'var(--radius-md)', marginTop: 8 }}>
                            <span style={{ fontSize: 13, color: 'var(--color-danger)', textAlign: 'center', fontWeight: 600 }}>Tem certeza que deseja cancelar?</span>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button
                                style={{ flex: 1, padding: '8px', borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--color-danger)', color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-label)', fontSize: 11, textTransform: 'uppercase' }}
                                onClick={handleCancel} disabled={cancelling}>
                                {cancelling ? <RotateCw size={12} className="animate-spin" /> : 'Sim, cancelar'}
                              </button>
                              <button
                                className="btn-outline-custom"
                                style={{ flex: 1, padding: '8px' }}
                                onClick={() => setCancelConfirm(false)}>
                                Voltar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Dados da Conta */}
        <div>
          <h3 className="academic-label" style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Dados da Conta</h3>
          <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Nome completo */}
            <div>
              <label className="academic-label" style={{ fontSize: 10, display: 'block', marginBottom: 4 }} htmlFor="nome">Nome completo</label>
              <input
                className="input-notebook"
                id="nome"
                type="text"
                placeholder="Seu nome completo"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>

            {/* Apelido */}
            <div>
              <label className="academic-label" style={{ fontSize: 10, display: 'block', marginBottom: 4 }} htmlFor="apelido">Apelido</label>
              <input
                className="input-notebook"
                id="apelido"
                type="text"
                placeholder="Como prefere ser chamado"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
              />
            </div>

            {/* WhatsApp */}
            <div>
              <label className="academic-label" style={{ fontSize: 10, display: 'block', marginBottom: 4 }} htmlFor="whatsapp">WhatsApp</label>
              <input
                className="input-notebook"
                id="whatsapp"
                type="tel"
                placeholder="(00) 00000-0000"
                value={phoneDisplay}
                onChange={e => setPhoneDisplay(formatBRPhone(e.target.value))}
              />
            </div>

            {/* Instituição de Ensino */}
            <div style={{ position: 'relative' }}>
              <label className="academic-label" style={{ fontSize: 10, display: 'block', marginBottom: 4 }} htmlFor="instituicao">Instituição de Ensino</label>
              <input
                className="input-notebook"
                id="instituicao"
                type="text"
                placeholder="Ex: USP, Unicamp..."
                value={instSearch}
                onChange={e => {
                  setInstSearch(e.target.value);
                  setShowDropdown(true);
                  if (debounceRef.current) clearTimeout(debounceRef.current);
                  debounceRef.current = setTimeout(() => fetchInstitutions(e.target.value), 300);
                }}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              />
              {showDropdown && institutions.length > 0 && (
                <div className="autocomplete-dropdown">
                  {institutions.map(inst => (
                    <div key={inst.id} className="autocomplete-item"
                      onClick={() => { setSelectedInst(inst); setInstSearch(`${inst.sigla} - ${inst.name}`); setShowDropdown(false); }}>
                      <div className="autocomplete-item-name" style={{ color: 'var(--text-primary)' }}>{inst.sigla} - {inst.name}</div>
                      <div className="autocomplete-item-meta">{inst.uf} | {inst.domains.join(', ')}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Nova senha */}
            <div>
              <label className="academic-label" style={{ fontSize: 10, display: 'block', marginBottom: 4 }} htmlFor="senha">Nova senha</label>
              <input
                className="input-notebook"
                id="senha"
                type="password"
                placeholder="Mínimo de 6 caracteres (deixe em branco para manter)"
                value={password}
                onChange={e => setPassword(e.target.value)}
                minLength={6}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <button
                type="submit"
                className="btn-oxblood"
                disabled={saving}
                style={{ width: 'auto', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, textTransform: 'uppercase', fontFamily: 'var(--font-label)' }}
              >
                {saving ? <RotateCw size={14} className="animate-spin" /> : <Check size={14} />}
                Salvar Configurações
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
