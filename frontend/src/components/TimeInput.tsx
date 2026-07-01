import React, { useState, useEffect, useRef } from 'react';

interface Props {
  value: string;                                        // "HH:MM"
  onChange: (v: string) => void;
  allowedRanges?: { start: number; end: number }[];     // intervalos livres em minutos desde meia-noite
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i); // 00–23
const MINUTES = Array.from({ length: 60 }, (_, i) => i); // 00–59

function parse(t: string): [number, number] {
  const [h, m] = (t || '').split(':').map(Number);
  return [isNaN(h) ? 6 : h, isNaN(m) ? 0 : m];
}

function fmt(h: number, m: number) {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export default function TimeInput({
  value, onChange, allowedRanges, disabled, className, placeholder,
}: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef  = useRef<HTMLDivElement>(null);
  const hourRef  = useRef<HTMLDivElement>(null);
  const [selH, selM] = parse(value);

  // Fechar ao clicar fora
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Rolagem automática para hora selecionada ao abrir
  useEffect(() => {
    if (!open || !hourRef.current) return;
    const active = hourRef.current.querySelector('.ti-cell--active') as HTMLElement | null;
    active?.scrollIntoView({ block: 'nearest' });
  }, [open]);

  function isAllowed(h: number, m: number): boolean {
    if (!allowedRanges || allowedRanges.length === 0) return true;
    const mins = h * 60 + m;
    return allowedRanges.some(r => mins >= r.start && mins < r.end);
  }

  function isHourPartlyAllowed(h: number): boolean {
    if (!allowedRanges || allowedRanges.length === 0) return true;
    return MINUTES.some(m => isAllowed(h, m));
  }

  function selectHour(h: number) {
    if (!isHourPartlyAllowed(h)) return;
    // mantém minuto atual se permitido, senão pega o primeiro permitido
    const newM = isAllowed(h, selM) ? selM : (MINUTES.find(m => isAllowed(h, m)) ?? 0);
    onChange(fmt(h, newM));
  }

  function selectMinute(m: number) {
    if (!isAllowed(selH, m)) return;
    onChange(fmt(selH, m));
    setOpen(false);
  }

  return (
    <div className={`ti-wrapper${className ? ' ' + className : ''}`} ref={wrapRef}>
      <button
        type="button"
        className={`ti-display${open ? ' ti-display--open' : ''}${disabled ? ' ti-display--disabled' : ''}`}
        onClick={() => !disabled && setOpen(o => !o)}
      >
        {value || <span className="ti-placeholder">{placeholder ?? '--:--'}</span>}
      </button>

      {open && (
        <div className="ti-panel">
          <div className="ti-columns">
            {/* Horas */}
            <div className="ti-col ti-col--hours" ref={hourRef}>
              {HOURS.map(h => (
                <button
                  key={h}
                  type="button"
                  className={`ti-cell${selH === h ? ' ti-cell--active' : ''}${!isHourPartlyAllowed(h) ? ' ti-cell--blocked' : ''}`}
                  onClick={() => selectHour(h)}
                >
                  {String(h).padStart(2, '0')}
                </button>
              ))}
            </div>

            <div className="ti-sep">:</div>

            {/* Minutos */}
            <div className="ti-col ti-col--mins">
              {MINUTES.map(m => {
                const blocked = !isAllowed(selH, m);
                return (
                  <button
                    key={m}
                    type="button"
                    className={`ti-cell${selM === m ? ' ti-cell--active' : ''}${blocked ? ' ti-cell--blocked' : ''}`}
                    onClick={() => selectMinute(m)}
                  >
                    {String(m).padStart(2, '0')}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
