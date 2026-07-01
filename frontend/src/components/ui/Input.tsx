import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  containerClassName?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  id,
  className = '',
  containerClassName = '',
  ...props
}) => {
  const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div className={`form-group ${containerClassName}`.trim()}>
      {label && (
        <label htmlFor={inputId} className="form-label">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`form-input ${className}`.trim()}
        style={error ? { borderColor: 'var(--color-danger)' } : undefined}
        {...props}
      />
      {error && (
        <span
          className="error-message"
          style={{
            display: 'block',
            fontSize: '12px',
            color: 'var(--color-danger)',
            marginTop: '4px'
          }}
        >
          {error}
        </span>
      )}
    </div>
  );
};
