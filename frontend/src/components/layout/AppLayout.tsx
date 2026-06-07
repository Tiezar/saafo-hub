import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import { useApp } from '../../contexts/AppContext';
import ToastContainer from '../ToastContainer';
import StudySessionOverlay from '../StudySessionOverlay';

export default function AppLayout() {
  const { activeSessionId } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Close drawer on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="app-shell">
      {/* Mobile hamburger */}
      <button
        className="hamburger-btn"
        onClick={() => setSidebarOpen(true)}
        aria-label="Abrir menu"
      >
        <Menu size={20} />
      </button>

      {/* Overlay for mobile drawer */}
      <div
        className={`sidebar-overlay${sidebarOpen ? ' sidebar-open' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      <Sidebar onClose={() => setSidebarOpen(false)} mobileOpen={sidebarOpen} />

      <main className="app-main">
        <Outlet />
      </main>

      <ToastContainer />
      {activeSessionId && <StudySessionOverlay />}
    </div>
  );
}
