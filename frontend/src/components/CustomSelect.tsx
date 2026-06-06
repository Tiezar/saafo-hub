import React, { useState, useRef, useEffect, useId } from 'react';
import './CustomSelect.css';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  variant?: 'default' | 'form-input' | 'academic' | 'notebook';
  style?: React.CSSProperties;
  className?: string;
}

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Selecione...',
  disabled = false,
  variant = 'default',
  style,
  className,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const id = useId();

  const selected = options.find(o => o.value === value);
  const displayLabel = selected ? selected.label : placeholder;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Scroll selected option into view when dropdown opens
  useEffect(() => {
    if (open && listRef.current && selected) {
      const idx = options.findIndex(o => o.value === value);
      const item = listRef.current.children[idx] as HTMLElement | undefined;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [open]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(o => !o); }
    if (e.key === 'Escape') setOpen(false);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const currentIdx = options.findIndex(o => o.value === value);
      const next = e.key === 'ArrowDown'
        ? Math.min(currentIdx + 1, options.length - 1)
        : Math.max(currentIdx - 1, 0);
      if (!options[next]?.disabled) onChange(options[next].value);
    }
  }

  const variantClass = {
    default:      'cs-trigger--default',
    'form-input': 'cs-trigger--form',
    academic:     'cs-trigger--academic',
    notebook:     'cs-trigger--notebook',
  }[variant];

  return (
    <div
      ref={containerRef}
      className={`cs-root${className ? ' ' + className : ''}`}
      style={style}
    >
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={id}
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        onKeyDown={handleKeyDown}
        className={`cs-trigger ${variantClass}${open ? ' cs-trigger--open' : ''}${!selected ? ' cs-trigger--placeholder' : ''}`}
      >
        <span className="cs-trigger-label">{displayLabel}</span>
        <svg
          className={`cs-chevron${open ? ' cs-chevron--up' : ''}`}
          width="12" height="12" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <ul
          ref={listRef}
          id={id}
          role="listbox"
          className="cs-dropdown"
        >
          {options.map(opt => (
            <li
              key={opt.value}
              role="option"
              aria-selected={opt.value === value}
              aria-disabled={opt.disabled}
              className={`cs-option${opt.value === value ? ' cs-option--selected' : ''}${opt.disabled ? ' cs-option--disabled' : ''}`}
              onMouseDown={e => {
                e.preventDefault();
                if (!opt.disabled) { onChange(opt.value); setOpen(false); }
              }}
            >
              {opt.value === value && (
                <svg className="cs-option-check" width="12" height="12" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              <span>{opt.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
