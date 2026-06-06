import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AppProvider, useApp } from './contexts/AppContext';
import { useVersionCheck } from './hooks/useVersionCheck';

import AppLayout from './components/layout/AppLayout';
import UpdateBanner from './components/UpdateBanner';
import UpgradeModal from './components/UpgradeModal';
import CheckoutModal from './components/CheckoutModal';
import PlanSelectionModal from './components/PlanSelectionModal';

import Auth        from './pages/Auth';
import Dashboard   from './pages/Dashboard';
import Materials   from './pages/Materials';
import MyCards     from './pages/MyCards';
import AIGenerator from './pages/AIGenerator';
import CalendarPage from './pages/CalendarPage';
import Pomodoro    from './pages/Pomodoro';
import ExamSession  from './pages/ExamSession';
import Profile     from './pages/Profile';
import Admin      from './pages/Admin';

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

function AppShell() {
  const { token, checkoutOpen, setCheckoutOpen, planSelectionOpen, setPlanSelectionOpen } = useApp();
  const updateAvailable = useVersionCheck();

  if (!token) return <Auth />;

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index        element={<Dashboard />}   />
          <Route path="materiais" element={<Materials />}  />
          <Route path="cards"     element={<MyCards />}    />
          <Route path="ia"        element={<AIGenerator />}/>
          <Route path="calendario" element={<CalendarPage />}/>
          <Route path="pomodoro"  element={<Pomodoro />}   />
          <Route path="provas"    element={<ExamSession />} />
          <Route path="perfil"    element={<Profile />}    />
          <Route path="admin"     element={<Admin />}      />
          <Route path="*"         element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <UpdateBanner visible={updateAvailable} />
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
