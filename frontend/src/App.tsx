import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AppProvider, useApp } from './contexts/AppContext';
import AppLayout from './components/layout/AppLayout';
import UpgradeModal from './components/UpgradeModal';
import CheckoutModal from './components/CheckoutModal';
import PlanSelectionModal from './components/PlanSelectionModal';
import CookieConsent from './components/CookieConsent';

import Auth          from './pages/Auth';
import LandingPage   from './pages/LandingPage';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import Dashboard   from './pages/Dashboard';
import Materials   from './pages/Materials';
import MyCards     from './pages/MyCards';
import AIGenerator from './pages/AIGenerator';
import CalendarPage from './pages/CalendarPage';
import Pomodoro    from './pages/Pomodoro';
import ExamSession  from './pages/ExamSession';
import Profile     from './pages/Profile';
import Admin      from './pages/Admin';
import Onboarding from './pages/Onboarding';
import Cronograma from './pages/Cronograma';

const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) || '';

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AppProvider>
        <AppShell />
      </AppProvider>
    </GoogleOAuthProvider>
  );
}

function canAccess(user: import('./types').User | null) {
  return user?.role === 'ADMIN' || user?.onboardingStatus === 'COMPLETED';
}

function AppShell() {
  const { token, currentUser, initializing, checkoutOpen, setCheckoutOpen, planSelectionOpen, setPlanSelectionOpen } = useApp();

  if (initializing) {
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-base)',
        color: 'var(--text-primary)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="logo-icon" style={{ width: 48, height: 48, margin: '0 auto 16px', fontSize: 24, display: 'grid', placeItems: 'center', animation: 'pulse 1.5s infinite ease-in-out' }}>S</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>Carregando SAAFO HUB...</div>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Rotas Públicas */}
        <Route path="/" element={token ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
        <Route path="/auth" element={token ? <Navigate to="/dashboard" replace /> : <Auth />} />
        <Route path="/privacidade" element={<PrivacyPolicy />} />
        <Route path="/termos" element={<TermsOfService />} />

        {/* Rotas Privadas (dentro do Layout com Sidebar) */}
        <Route element={token ? <AppLayout /> : <Navigate to="/auth" replace />}>
          <Route path="dashboard"  element={canAccess(currentUser) ? <Dashboard />   : <Navigate to="/onboarding" replace />} />
          <Route path="materiais"  element={canAccess(currentUser) ? <Materials />   : <Navigate to="/onboarding" replace />} />
          <Route path="cards"      element={canAccess(currentUser) ? <MyCards />     : <Navigate to="/onboarding" replace />} />
          <Route path="ia"         element={canAccess(currentUser) ? <AIGenerator /> : <Navigate to="/onboarding" replace />} />
          <Route path="calendario" element={canAccess(currentUser) ? <CalendarPage />: <Navigate to="/onboarding" replace />} />
          <Route path="cronograma" element={canAccess(currentUser) ? <Cronograma />  : <Navigate to="/onboarding" replace />} />
          <Route path="pomodoro"   element={canAccess(currentUser) ? <Pomodoro />    : <Navigate to="/onboarding" replace />} />
          <Route path="provas"     element={canAccess(currentUser) ? <ExamSession /> : <Navigate to="/onboarding" replace />} />
          <Route path="perfil"     element={canAccess(currentUser) ? <Profile />     : <Navigate to="/onboarding" replace />} />
          <Route path="admin"      element={currentUser?.role === 'ADMIN' ? <Admin /> : <Navigate to="/dashboard" replace />} />
        </Route>
        <Route path="/onboarding" element={token ? <Onboarding /> : <Navigate to="/auth" replace />} />

        {/* Redirecionamento de Fallback */}
        <Route path="*" element={<Navigate to={token ? (canAccess(currentUser) ? "/dashboard" : "/onboarding") : "/"} replace />} />
      </Routes>
      <CookieConsent />
      <UpgradeModal />
      <CheckoutModal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} />
      <PlanSelectionModal
        open={planSelectionOpen}
        onTrial={() => setPlanSelectionOpen(false)}
        onSubscribe={() => { setPlanSelectionOpen(false); setCheckoutOpen(true); }}
      />
    </BrowserRouter>
  );
}
