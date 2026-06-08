import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Star, RotateCw, AlertTriangle, RefreshCw, Check, Bot, FileText, CheckCircle, Trash2, Plus, Edit3, Clock, X } from 'lucide-react';
import { useIsMobile } from '../hooks/useIsMobile';
import { useApp } from '../contexts/AppContext';
import type { Institution, UserWeeklyRoutine } from '../types';
import './Profile.css';
import CustomSelect from '../components/CustomSelect';
import DeleteAccountModal from '../components/DeleteAccountModal';

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
    apiCall, showSuccess, showError, handleLogout,
    weeklyRoutines, createWeeklyRoutine, updateWeeklyRoutine, deleteWeeklyRoutine,
  } = useApp();

  const [name,         setName]         = useState(currentUser?.name ?? '');
  const [nickname,     setNickname]     = useState(currentUser?.nickname ?? '');
  const [phoneDisplay, setPhoneDisplay] = useState(() => initPhoneDisplay(currentUser?.phone ?? ''));
  const [password,     setPassword]     = useState('');
  const [selectedInst,  setSelectedInst]  = useState<Institution | null>(null);
  const [instSelection, setInstSelection] = useState<'IFRO' | 'UNIR' | 'OTHER' | ''>('');
  const [customInstName, setCustomInstName] = useState('');
  const [saving,        setSaving]        = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // Weekly routine states
  const [editingRoutine, setEditingRoutine] = useState<UserWeeklyRoutine | null>(null);
  const [routineModalOpen, setRoutineModalOpen] = useState(false);
  const [routineLabel, setRoutineLabel] = useState('');
  const [routineColor, setRoutineColor] = useState('#6366f1');
  const [routineDays, setRoutineDays] = useState<number[]>([]);
  const [routineSlots, setRoutineSlots] = useState<{ startTime: string; endTime: string }[]>([
    { startTime: '08:00', endTime: '12:00' }
  ]);
  const [routineSaving, setRoutineSaving] = useState(false);

  const weekdaysPT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const handleOpenNewRoutine = () => {
    setEditingRoutine(null);
    setRoutineLabel('');
    setRoutineColor('#6366f1');
    setRoutineDays([]);
    setRoutineSlots([{ startTime: '08:00', endTime: '12:00' }]);
    setRoutineModalOpen(true);
  };

  const handleOpenEditRoutine = (r: UserWeeklyRoutine) => {
    setEditingRoutine(r);
    setRoutineLabel(r.label);
    setRoutineColor(r.color);
    setRoutineDays(r.days);
    setRoutineSlots(r.slots.map(s => ({ startTime: s.startTime, endTime: s.endTime })));
    setRoutineModalOpen(true);
  };

  const handleAddSlot = () => {
    setRoutineSlots(prev => [...prev, { startTime: '08:00', endTime: '12:00' }]);
  };

  const handleRemoveSlot = (idx: number) => {
    setRoutineSlots(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSlotChange = (idx: number, field: 'startTime' | 'endTime', val: string) => {
    setRoutineSlots(prev => prev.map((s, i) => i === idx ? { ...s, [field]: val } : s));
  };

  const toggleDay = (day: number) => {
    setRoutineDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  const handleSaveRoutine = async () => {
    if (!routineLabel.trim()) {
      showError('Digite o nome da rotina.');
      return;
    }
    if (routineDays.length === 0) {
      showError('Selecione pelo menos um dia da semana.');
      return;
    }
    if (routineSlots.length === 0) {
      showError('Adicione pelo menos um intervalo de horário.');
      return;
    }
    for (const slot of routineSlots) {
      if (slot.startTime >= slot.endTime) {
        showError(`O horário de início (${slot.startTime}) deve ser menor que o de término (${slot.endTime}).`);
        return;
      }
    }

    setRoutineSaving(true);
    try {
      const payload = {
        label: routineLabel.trim(),
        color: routineColor,
        days: routineDays,
        slots: routineSlots,
      };
      if (editingRoutine) {
        await updateWeeklyRoutine(editingRoutine.id, payload);
        showSuccess('Rotina atualizada!');
      } else {
        await createWeeklyRoutine(payload);
        showSuccess('Rotina criada!');
      }
      setRoutineModalOpen(false);
    } catch (err) {
      showError((err as Error).message);
    } finally {
      setRoutineSaving(false);
    }
  };

  const handleDeleteRoutineClick = async (id: string) => {
    if (!window.confirm('Excluir esta rotina?')) return;
    try {
      await deleteWeeklyRoutine(id);
      showSuccess('Rotina excluída!');
    } catch (err) {
      showError((err as Error).message);
    }
  };

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

  // Usage credits and limits
  interface UsageDetails {
    cardsGeneratedToday: number;
    maxCardsPerDay: number;
    cardsRemaining: number;
    examsThisWeek: number;
    maxExamsPerWeek: number;
    examsRemaining: number;
  }
  const [usage, setUsage] = useState<UsageDetails | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);

  const fetchUsage = useCallback(async () => {
    if (!planStatus?.isActive) return;
    setUsageLoading(true);
    try {
      const data = await apiCall('/ai/usage') as UsageDetails;
      setUsage(data);
    } catch { /* silent */ }
    finally { setUsageLoading(false); }
  }, [apiCall, planStatus?.isActive]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

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

  // Synchronize currentUser updates with form states (resolves intermittent loading issues)
  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name ?? '');
      setNickname(currentUser.nickname ?? '');
      setPhoneDisplay(initPhoneDisplay(currentUser.phone ?? ''));
      
      if (currentUser.institutionId && institutions.length > 0) {
        const found = institutions.find(i => i.id === currentUser.institutionId);
        if (found) {
          setSelectedInst(found);
          const siglaUpper = found.sigla?.toUpperCase();
          if (siglaUpper === 'IFRO') {
            setInstSelection('IFRO');
          } else if (siglaUpper === 'UNIR') {
            setInstSelection('UNIR');
          } else {
            setInstSelection('OTHER');
            setCustomInstName(found.name);
          }
        }
      } else if (!currentUser.institutionId) {
        setSelectedInst(null);
        setInstSelection('');
        setCustomInstName('');
      }
    }
  }, [currentUser, institutions]);

  const handleInstSelectionChange = async (val: 'IFRO' | 'UNIR' | 'OTHER' | '') => {
    setInstSelection(val);
    if (val === 'IFRO') {
      setCustomInstName('');
      try {
        const res = await apiCall('/institutions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Instituto Federal de Rondônia', sigla: 'IFRO' })
        }) as Institution;
        setSelectedInst(res);
      } catch (err) {
        showError('Erro ao carregar instituição IFRO.');
      }
    } else if (val === 'UNIR') {
      setCustomInstName('');
      try {
        const res = await apiCall('/institutions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Universidade Federal de Rondônia', sigla: 'UNIR' })
        }) as Institution;
        setSelectedInst(res);
      } catch (err) {
        showError('Erro ao carregar instituição UNIR.');
      }
    } else if (val === 'OTHER') {
      setSelectedInst(null);
      setCustomInstName('');
    } else {
      setSelectedInst(null);
      setCustomInstName('');
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let instId: string | undefined = undefined;
      if (instSelection === 'IFRO' || instSelection === 'UNIR') {
        instId = selectedInst?.id;
      } else if (instSelection === 'OTHER' && customInstName.trim() !== '') {
        const res = await apiCall('/institutions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: customInstName.trim() })
        }) as Institution;
        instId = res.id;
      }

      await handleUpdateProfile({
        name,
        nickname: nickname || undefined,
        password: password || undefined,
        institutionId: instId,
        phone: phoneDisplay ? toRawPhone(phoneDisplay) : undefined,
      });
      setPassword('');
      showSuccess('Perfil atualizado!');
    } catch (err) { showError((err as Error).message); }
    finally { setSaving(false); }
  };

  const isMobile = useIsMobile();

  const handleDeleteAccount = async () => {
    await apiCall('/profile', { method: 'DELETE' });
    handleLogout();
  };

  return (
    <div className="page" style={{ padding: '24px 24px 48px' }}>
      <DeleteAccountModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteAccount}
      />
      {/* Page Header */}
      <header style={{ marginBottom: 40, borderBottom: '1px solid var(--border-color)', paddingBottom: 24 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: isMobile ? 26 : 36, fontWeight: 300, color: 'var(--text-primary)', margin: 0 }}>Perfil</h2>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: 'var(--text-muted)', marginTop: 8 }}>
          Gerencie suas informações pessoais e detalhes da sua assinatura.
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: isMobile ? 24 : 48 }}>
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
                  <div style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius)', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>
                    🔒 Pagamentos disponíveis em breve
                  </div>
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

          {planStatus?.isActive && (
            <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 24 }}>
              <h4 className="academic-label" style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>Créditos e Uso da IA</h4>
              
              {usageLoading && !usage ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                  <RotateCw size={14} className="animate-spin" /> Carregando créditos...
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Flashcards generator progress */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                      <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Bot size={14} /> Flashcards Gerados hoje
                      </span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {usage?.cardsGeneratedToday ?? 0} / {usage?.maxCardsPerDay ?? 100}
                      </span>
                    </div>
                    <div style={{ width: '100%', height: 6, backgroundColor: 'var(--border-subtle)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ 
                        width: `${Math.min(100, (((usage?.cardsGeneratedToday ?? 0) / (usage?.maxCardsPerDay ?? 100)) * 100))}%`, 
                        height: '100%', 
                        backgroundColor: 'var(--color-primary)', 
                        borderRadius: 3,
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>
                      Resta(m) {usage?.cardsRemaining ?? 100} hoje. Reinicia à meia-noite.
                    </span>
                  </div>

                  {/* Exams generator progress */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                      <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <FileText size={14} /> Provas Criadas esta semana
                      </span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {usage?.examsThisWeek ?? 0} / {usage?.maxExamsPerWeek ?? 20}
                      </span>
                    </div>
                    <div style={{ width: '100%', height: 6, backgroundColor: 'var(--border-subtle)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ 
                        width: `${Math.min(100, (((usage?.examsThisWeek ?? 0) / (usage?.maxExamsPerWeek ?? 20)) * 100))}%`, 
                        height: '100%', 
                        backgroundColor: 'var(--color-secondary)', 
                        borderRadius: 3,
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>
                      Resta(m) {usage?.examsRemaining ?? 20} esta semana.
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 24 }}>
            <h4 className="academic-label" style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
              Benefícios do Plano {planStatus?.plan === 'STUDENT' ? 'Estudante' : 'Experiência'}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <CheckCircle size={16} color="var(--color-success)" style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>IA Ilimitada (SM-2)</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Pratique repetição espaçada à vontade e de forma personalizada sem bloqueios.</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <CheckCircle size={16} color="var(--color-success)" style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>Integração com WhatsApp</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Receba lembretes acadêmicos automáticos diretamente em seu número de celular.</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <CheckCircle size={16} color="var(--color-success)" style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>Insights de Aprendizado</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Nosso algoritmo de IA analisa seus gaps de conhecimento semanalmente de forma automática.</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <CheckCircle size={16} color="var(--color-success)" style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>Geração Inteligente de Provas</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Gere provas mock baseadas nos flashcards já criados com análise e notas automáticas.</span>
                </div>
              </div>
            </div>
          </div>
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
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5 }}>
                💬 Necessário para receber lembretes diários de flashcards pendentes e alertas do calendário via WhatsApp.
              </p>
            </div>

            {/* Instituição de Ensino */}
            <div>
              <label className="academic-label" style={{ fontSize: 10, display: 'block', marginBottom: 4 }}>Instituição de Ensino</label>
              <CustomSelect
                value={instSelection}
                onChange={val => handleInstSelectionChange(val as any)}
                options={[
                  { value: 'IFRO', label: 'Instituto Federal de Rondônia (IFRO)' },
                  { value: 'UNIR', label: 'Universidade Federal de Rondônia (UNIR)' },
                  { value: 'OTHER', label: 'Outra...' }
                ]}
                placeholder="Selecione uma instituição..."
                variant="notebook"
              />
            </div>

            {/* Custom Institution Name (Conditional) */}
            {instSelection === 'OTHER' && (
              <div style={{ marginTop: -8 }}>
                <label className="academic-label" style={{ fontSize: 10, display: 'block', marginBottom: 4 }} htmlFor="instituicao-custom">Nome da Instituição</label>
                <input
                  className="input-notebook"
                  id="instituicao-custom"
                  type="text"
                  placeholder="Digite o nome da instituição"
                  value={customInstName}
                  onChange={e => setCustomInstName(e.target.value)}
                  required
                />
              </div>
            )}

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

      {/* Weekly Routine Section */}
      <div style={{ marginTop: 64, borderTop: '1px solid var(--border-color)', paddingTop: 40 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h3 className="academic-label" style={{ color: 'var(--text-secondary)', margin: 0 }}>Minha Rotina Semanal</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              Cadastre seus compromissos fixos recorrentes (faculdade, trabalho, igreja, etc.) para sinalizar seu tempo ocupado no calendário.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenNewRoutine}
            className="btn-oxblood"
            style={{ width: 'auto', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, textTransform: 'uppercase', fontFamily: 'var(--font-label)', fontWeight: 600 }}
          >
            <Plus size={14} />
            Nova Rotina
          </button>
        </div>

        {weeklyRoutines.length === 0 ? (
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
            Nenhuma rotina semanal cadastrada. Adicione seus horários ocupados!
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            {weeklyRoutines.map(r => (
              <div key={r.id} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: r.color }} />
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 15 }}>{r.label}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 500 }}>
                    📅 {r.days.map(d => weekdaysPT[d]).join(', ')}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {r.slots.map((s, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                        <Clock size={12} />
                        <span>{s.startTime} - {s.endTime}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16, borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
                  <button
                    onClick={() => handleOpenEditRoutine(r)}
                    className="btn-ghost"
                    style={{ padding: '4px 8px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)', cursor: 'pointer', border: 'none', background: 'transparent' }}
                  >
                    <Edit3 size={12} /> Editar
                  </button>
                  <button
                    onClick={() => handleDeleteRoutineClick(r.id)}
                    className="btn-ghost"
                    style={{ padding: '4px 8px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-danger)', cursor: 'pointer', border: 'none', background: 'transparent' }}
                  >
                    <Trash2 size={12} /> Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Routine Modal */}
      {routineModalOpen && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setRoutineModalOpen(false); }}>
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                {editingRoutine ? 'Editar Rotina' : 'Nova Rotina Semanal'}
              </h3>
              <button onClick={() => setRoutineModalOpen(false)} className="btn-ghost btn-icon">
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Nome */}
              <div>
                <label className="academic-label" style={{ fontSize: 10, display: 'block', marginBottom: 4 }}>Nome da Rotina</label>
                <input
                  className="input-notebook"
                  type="text"
                  placeholder="Ex: Trabalho, Faculdade"
                  value={routineLabel}
                  onChange={e => setRoutineLabel(e.target.value)}
                  maxLength={50}
                  required
                />
              </div>

              {/* Cor */}
              <div>
                <label className="academic-label" style={{ fontSize: 10, display: 'block', marginBottom: 6 }}>Cor de Identificação</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6'].map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setRoutineColor(c)}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        backgroundColor: c,
                        border: routineColor === c ? '2px solid var(--text-primary)' : '1px solid var(--border-color)',
                        cursor: 'pointer',
                        padding: 0,
                        transform: routineColor === c ? 'scale(1.1)' : 'none',
                        transition: 'transform 0.1s'
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Dias da Semana */}
              <div>
                <label className="academic-label" style={{ fontSize: 10, display: 'block', marginBottom: 8 }}>Dias da Semana</label>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                  {weekdaysPT.map((dayLabel, idx) => {
                    const active = routineDays.includes(idx);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleDay(idx)}
                        style={{
                          flex: 1,
                          height: 36,
                          borderRadius: '50%',
                          border: active ? 'none' : '1px solid var(--border-color)',
                          backgroundColor: active ? routineColor : 'transparent',
                          color: active ? '#fff' : 'var(--text-secondary)',
                          fontFamily: 'var(--font-label)',
                          fontSize: 12,
                          fontWeight: active ? 'bold' : 'normal',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s'
                        }}
                      >
                        {dayLabel[0]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Intervalos */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label className="academic-label" style={{ fontSize: 10, margin: 0 }}>Intervalos de Horário</label>
                  <button
                    type="button"
                    onClick={handleAddSlot}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--color-primary)',
                      fontFamily: 'var(--font-label)',
                      fontSize: 11,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontWeight: 600
                    }}
                  >
                    <Plus size={12} /> Adicionar
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {routineSlots.map((slot, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>De</span>
                        <input
                          type="time"
                          className="academic-input"
                          style={{ fontSize: 13, height: 34, padding: '4px 8px' }}
                          value={slot.startTime}
                          onChange={e => handleSlotChange(idx, 'startTime', e.target.value)}
                          required
                        />
                      </div>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Até</span>
                        <input
                          type="time"
                          className="academic-input"
                          style={{ fontSize: 13, height: 34, padding: '4px 8px' }}
                          value={slot.endTime}
                          onChange={e => handleSlotChange(idx, 'endTime', e.target.value)}
                          required
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSlot(idx)}
                        disabled={routineSlots.length <= 1}
                        className="btn-ghost btn-icon"
                        style={{ opacity: routineSlots.length <= 1 ? 0.3 : 1 }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-outline-custom"
                onClick={() => setRoutineModalOpen(false)}
                disabled={routineSaving}
                style={{ flex: 1 }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-oxblood"
                onClick={handleSaveRoutine}
                disabled={routineSaving}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 12, textTransform: 'uppercase', fontFamily: 'var(--font-label)' }}
              >
                {routineSaving ? <RotateCw size={14} className="animate-spin" /> : <Check size={14} />}
                Salvar Rotina
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Danger Zone */}
      <div style={{ marginTop: 64, borderTop: '1px solid var(--border-color)', paddingTop: 40 }}>
        <h3 className="academic-label" style={{ color: 'var(--color-danger)', marginBottom: 16 }}>Zona de Perigo</h3>
        <div style={{
          backgroundColor: 'var(--bg-card)', border: '1px solid var(--color-danger)',
          borderRadius: 'var(--radius-md)', padding: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24,
          flexWrap: 'wrap',
        }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)', marginBottom: 4 }}>
              Apagar minha conta
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Remove permanentemente sua conta e todos os dados associados. Sem recuperação.
            </div>
          </div>
          <button
            onClick={() => setDeleteModalOpen(true)}
            style={{
              flexShrink: 0, padding: '10px 20px', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-danger)', background: 'transparent',
              color: 'var(--color-danger)', cursor: 'pointer',
              fontFamily: 'var(--font-label)', fontSize: 12,
              textTransform: 'uppercase', letterSpacing: '0.05em',
              display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600,
            }}
          >
            <Trash2 size={14} />
            Apagar conta
          </button>
        </div>
      </div>
    </div>
  );
}
