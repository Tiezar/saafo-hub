import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useApp } from '../../contexts/AppContext';
import ToastContainer from '../ToastContainer';
import StudySessionOverlay from '../StudySessionOverlay';

export default function AppLayout() {
  const { activeSessionId } = useApp();

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-main">
        <Outlet />
      </main>

      <ToastContainer />
      {activeSessionId && <StudySessionOverlay />}
    </div>
  );
}
