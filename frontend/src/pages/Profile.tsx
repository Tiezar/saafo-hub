import React, { useState, useEffect } from 'react';
import { CreditCard, Search, Check, Star, RotateCw } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import type { Institution } from '../types';

export default function Profile() {
  const {
    currentUser, planStatus, institutions,
    fetchInstitutions, handleUpdateProfile,
    setUpgradeModalOpen, showSuccess, showError,
  } = useApp();

  const [name,          setName]          = useState(currentUser?.name ?? '');
  const [nickname,      setNickname]      = useState(currentUser?.nickname ?? '');
  const [phone,         setPhone]         = useState(currentUser?.phone ?? '');
  const [password,      setPassword]      = useState('');
  const [instSearch,    setInstSearch]    = useState('');
  const [selectedInst,  setSelectedInst]  = useState<Institution | null>(null);
  const [showDropdown,  setShowDropdown]  = useState(false);
  const [saving,        setSaving]        = useState(false);

  // Init search label from existing institution
  useEffect(() => {
    if (currentUser?.institutionId && institutions.length) {
      const inst = institutions.find(i => i.id === currentUser.institutionId);
      if (inst) { setSelectedInst(inst); setInstSearch(`${inst.sigla} - ${inst.name}`); }
    }
  }, [currentUser, institutions]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await handleUpdateProfile({
        name, nickname: nickname || undefined,
        password: password || undefined,
        institutionId: selectedInst?.id || undefined,
        phone: phone || undefined,
      });
      setPassword('');
      showSuccess('Perfil atualizado!');
    } catch (err) { showError((err as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Perfil</h1>
          <p className="page-subtitle">Dados pessoais, instituição e WhatsApp</p>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Plan card */}
        {planStatus && (
          <div className="glass-card" style={{ padding: 24 }}>
            <h3 className="card-title" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <CreditCard size={18} /> Plano Atual
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <span style={{
                  padding: '4px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700,
                  background: planStatus.plan === 'STUDENT'
                    ? 'rgba(47,217,244,0.1)'
                    : planStatus.isActive ? 'rgba(255,209,102,0.1)' : 'rgba(255,180,171,0.1)',
                  color: planStatus.plan === 'STUDENT'
                    ? 'var(--color-success)'
                    : planStatus.isActive ? 'var(--color-warning)' : 'var(--color-danger)',
                }}>
                  {planStatus.plan === 'STUDENT'
                    ? '⭐ Plano Estudante'
                    : planStatus.isActive
                    ? `🕐 Trial — ${planStatus.trialDaysLeft} dias restantes`
                    : '❌ Trial expirado'}
                </span>
                {planStatus.plan === 'STUDENT' && (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>Acesso completo a todos os recursos.</p>
                )}
                {planStatus.plan === 'FREE_TRIAL' && planStatus.isActive && (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                    Acesso completo até{' '}
                    {planStatus.trialEndsAt ? new Date(planStatus.trialEndsAt).toLocaleDateString('pt-BR') : '—'}.
                  </p>
                )}
              </div>
              {planStatus.plan !== 'STUDENT' && (
                <button className="btn-primary" style={{ width: 'auto', padding: '10px 20px' }}
                  onClick={() => setUpgradeModalOpen(true)}>
                  <Star size={14} /> {planStatus.isActive ? 'Assinar agora' : 'Renovar acesso'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Profile form */}
        <div className="glass-card">
          <h3 className="card-title" style={{ marginBottom: 24 }}>Dados da Conta</h3>
          <form onSubmit={save}>
            <div className="form-group">
              <label className="form-label">Nome Completo</label>
              <input type="text" className="form-input" value={name}
                onChange={e => setName(e.target.value)} required />
            </div>

            <div className="form-group">
              <label className="form-label">Apelido (Nickname)</label>
              <input type="text" className="form-input" value={nickname}
                onChange={e => setNickname(e.target.value)}
                placeholder="Como gostaria de ser chamado" />
            </div>

            <div className="form-group">
              <label className="form-label">WhatsApp (para lembretes via EvoAPI)</label>
              <input type="tel" className="form-input" value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="5511999999999 (com código do país)" />
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                Formato: 55 + DDD + número. Ex: 5511987654321
              </p>
            </div>

            <div className="form-group" style={{ position: 'relative' }}>
              <label className="form-label">Instituição de Ensino</label>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: 14, top: 15, color: 'var(--text-muted)' }} />
                <input type="text" className="form-input" style={{ paddingLeft: 40 }}
                  value={instSearch}
                  onChange={e => {
                    setInstSearch(e.target.value);
                    fetchInstitutions(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder={selectedInst ? `${selectedInst.sigla} - ${selectedInst.name}` : 'Digite o nome da escola'} />
              </div>
              {showDropdown && institutions.length > 0 && (
                <div className="autocomplete-dropdown">
                  {institutions.map(inst => (
                    <div key={inst.id} className="autocomplete-item"
                      onClick={() => { setSelectedInst(inst); setInstSearch(`${inst.sigla} - ${inst.name}`); setShowDropdown(false); }}>
                      <div className="autocomplete-item-name">{inst.sigla} - {inst.name}</div>
                      <div className="autocomplete-item-meta">{inst.uf} | {inst.domains.join(', ')}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Nova Senha (deixe em branco para manter)</label>
              <input type="password" className="form-input" value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres" minLength={6} />
            </div>

            <button type="submit" className="btn-primary" style={{ width: 'auto', marginTop: 12 }} disabled={saving}>
              {saving ? <RotateCw size={16} className="animate-spin" /> : <Check size={16} />}
              Salvar Configurações
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
