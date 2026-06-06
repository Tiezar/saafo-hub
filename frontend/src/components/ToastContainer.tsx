import React from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

export default function ToastContainer() {
  const { toasts, dismissToast } = useApp();

  if (!toasts.length) return null;

  return (
    <div className="toast-stack">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.kind}`}>
          {t.kind === 'success'
            ? <CheckCircle size={16} />
            : <AlertCircle size={16} />}
          <span>{t.message}</span>
          <button className="toast-dismiss" onClick={() => dismissToast(t.id)}>
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
