import React, { useState, useEffect, useCallback } from 'react';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import {
  Brain, ChevronRight, RotateCw, AlertCircle, CheckCircle,
  Sun, Moon, Mail,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import './Auth.css';

export default function Auth() {
  const { apiCall, storeAuth, emailPending, setEmailPending, theme, toggleTheme, showError, showSuccess, setPlanSelectionOpen } = useApp();

  const [isRegistering, setIsRegistering] = useState(false);
  const [authEmail,     setAuthEmail]     = useState('');
  const [authName,      setAuthName]      = useState('');
  const [authPassword,  setAuthPassword]  = useState('');
  const [authLoading,   setAuthLoading]   = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [localError,    setLocalError]    = useState<string | null>(null);
  const [localSuccess,  setLocalSuccess]  = useState<string | null>(null);

  const flash = (kind: 'error' | 'success', msg: string) => {
    if (kind === 'error') { setLocalError(msg); setTimeout(() => setLocalError(null), 6000); }
    else { setLocalSuccess(msg); setTimeout(() => setLocalSuccess(null), 4000); }
  };

  // Handle email verification redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get('auth_error');
    if (params.get('verified')) {
      // Backend set httpOnly cookie; AppContext.tryRefresh() on mount will restore the session
      showSuccess('Email verificado! Bem-vindo.');
      window.history.replaceState({}, '', window.location.pathname);
      setPlanSelectionOpen(true);
    } else if (authError) {
      const msgs: Record<string, string> = {
        expired_token: 'Link expirado. Crie uma nova conta.',
        invalid_token: 'Link inválido.',
        user_not_found: 'Usuário não encontrado.',
      };
      showError(msgs[authError] ?? 'Erro na verificação.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [showSuccess, showError]);

  const handleGoogleSuccess = useCallback(async (cr: CredentialResponse) => {
    if (!cr.credential) return;
    setAuthLoading(true);
    try {
      const d = await apiCall('/auth/google', { method: 'POST', body: JSON.stringify({ token: cr.credential }) }) as { access_token: string; user: Parameters<typeof storeAuth>[1] };
      storeAuth(d.access_token, d.user);
    } catch (e) { flash('error', (e as Error).message); }
    finally { setAuthLoading(false); }
  }, [apiCall, storeAuth]);

  const handleResendEmail = useCallback(async () => {
    if (!emailPending) return;
    setResendLoading(true);
    try {
      const d = await apiCall('/auth/resend-verification', { method: 'POST', body: JSON.stringify({ email: emailPending }) }) as { message: string };
      flash('success', d.message);
    } catch (e) { flash('error', (e as Error).message); }
    finally { setResendLoading(false); }
  }, [emailPending, apiCall]);

  const handleAuth = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(authEmail.trim())) {
      flash('error', 'E-mail inválido. Use o formato nome@dominio.com');
      return;
    }
    setAuthLoading(true);
    try {
      if (isRegistering) {
        const d = await apiCall('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ email: authEmail, name: authName, password: authPassword }),
        }) as { message: string };
        setEmailPending(authEmail);
        setAuthEmail(''); setAuthName(''); setAuthPassword('');
        flash('success', d.message);
      } else {
        const d = await apiCall('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: authEmail, password: authPassword }),
        }) as { access_token: string; user: Parameters<typeof storeAuth>[1] };
        storeAuth(d.access_token, d.user);
      }
    } catch (e) {
      const msg = (e as Error).message;
      const isUnverified = msg?.toLowerCase().includes('não verificado')
        || msg?.toLowerCase().includes('caixa de entrada')
        || msg?.toLowerCase().includes('verify-email');
      if (!isRegistering && isUnverified) {
        setEmailPending(authEmail);
        setAuthEmail(''); setAuthPassword('');
      } else {
        flash('error', msg);
      }
    }
    finally { setAuthLoading(false); }
  }, [isRegistering, authEmail, authName, authPassword, apiCall, storeAuth, setEmailPending]);

  // ── Email pending screen ──────────────────────────────────────────────────
  if (emailPending) {
    return (
      <div className="auth-wrapper">
        <button onClick={toggleTheme} className="theme-toggle-floating">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div className="auth-icon-ring">
            <Mail size={26} style={{ color: 'var(--color-primary-text)' }} />
          </div>
          <h2 className="auth-title">Verifique seu email</h2>
          <p className="auth-subtitle">Enviamos um link de ativação para:</p>
          <p className="auth-pending-email">{emailPending}</p>
          <p className="auth-hint">
            Clique no link do email para ativar sua conta.<br />O link expira em 24 horas.
          </p>
          <div className="auth-pending-actions">
            <button className="btn-secondary" style={{ width: 'auto', padding: '10px 20px' }}
              onClick={() => setEmailPending(null)}>
              Voltar ao login
            </button>
            <button className="btn-primary" style={{ width: 'auto', padding: '10px 20px' }}
              onClick={handleResendEmail} disabled={resendLoading}>
              {resendLoading && <RotateCw size={14} className="animate-spin" />}
              Reenviar e-mail
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Login / Register screen ───────────────────────────────────────────────
  return (
    <div className="auth-wrapper">
      <button onClick={toggleTheme} className="theme-toggle-floating">
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-brand-icon"><Brain size={20} /></div>
          <span className="auth-brand-name">SAAFO HUB</span>
        </div>

        <h2 className="auth-title">
          {isRegistering ? 'Criar Conta' : 'Acessar o Hub'}
        </h2>
        <p className="auth-subtitle">
          {isRegistering
            ? 'Cadastre-se para turbinar seus estudos'
            : 'Entre para gerenciar seus flashcards'}
        </p>

        <form onSubmit={handleAuth}>
          {isRegistering && (
            <div className="form-group">
              <label className="form-label">Nome Completo</label>
              <input type="text" className="form-input" value={authName}
                onChange={e => setAuthName(e.target.value)}
                placeholder="Seu nome" required disabled={authLoading} />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">E-mail</label>
            <input type="email" className="form-input" value={authEmail}
              onChange={e => setAuthEmail(e.target.value)}
              placeholder="estudante@instituicao.edu.br" required disabled={authLoading} />
          </div>
          <div className="form-group">
            <label className="form-label">Senha</label>
            <input type="password" className="form-input" value={authPassword}
              onChange={e => setAuthPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres" required minLength={6} disabled={authLoading} />
          </div>
          <button type="submit" className="btn-primary" disabled={authLoading}>
            {authLoading && <RotateCw size={16} className="animate-spin" />}
            {isRegistering ? 'Criar Conta' : 'Entrar'}
            {!authLoading && <ChevronRight size={16} />}
          </button>
        </form>

        <div className="auth-divider">ou continue com</div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => flash('error', 'Falha no login com Google.')}
            text="signin_with" shape="rectangular"
            theme={theme === 'dark' ? 'filled_black' : 'outline'} size="large"
          />
        </div>

        <p className="auth-switch">
          {isRegistering ? 'Já tem conta?' : 'Não tem conta?'}&nbsp;
          <span onClick={() => setIsRegistering(r => !r)} className="auth-switch-link">
            {isRegistering ? 'Fazer Login' : 'Cadastre-se'}
          </span>
        </p>

        {localError && (
          <div className="auth-alert auth-alert-error">
            <AlertCircle size={16} /><span>{localError}</span>
          </div>
        )}
        {localSuccess && (
          <div className="auth-alert auth-alert-success">
            <CheckCircle size={16} /><span>{localSuccess}</span>
          </div>
        )}
      </div>
    </div>
  );
}
