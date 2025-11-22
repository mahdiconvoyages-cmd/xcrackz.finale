import React from 'react';

interface AccessibleInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
  showLabel?: boolean;
}

/**
 * Input accessible avec tous les attributs ARIA nécessaires
 * - Labels liés correctement
 * - Messages d'erreur accessibles
 * - Texte d'aide descriptif
 * - États visuels clairs
 */
export default function AccessibleInput({
  label,
  error,
  helperText,
  showLabel = true,
  id,
  required,
  className = '',
  ...props
}: AccessibleInputProps) {
  const inputId = id || `input-${label.toLowerCase().replace(/\s+/g, '-')}`;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;

  return (
    <div className="w-full">
      <label
        htmlFor={inputId}
        className={`block text-sm font-semibold text-slate-900 mb-2 ${
          !showLabel ? 'sr-only' : ''
        }`}
      >
        {label}
        {required && <span className="text-red-600 ml-1" aria-label="requis">*</span>}
      </label>

      <input
        id={inputId}
        aria-required={required}
        aria-invalid={!!error}
        aria-describedby={
          [
            error ? errorId : null,
            helperText ? helperId : null,
          ].filter(Boolean).join(' ') || undefined
        }
        className={`
          w-full px-4 py-3 rounded-xl border-2 transition-all
          focus:outline-none focus:ring-2 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error
            ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
            : 'border-slate-300 focus:border-teal-500 focus:ring-teal-500'
          }
          ${className}
        `}
        required={required}
        {...props}
      />

      {helperText && !error && (
        <p id={helperId} className="mt-2 text-sm text-slate-600">
          {helperText}
        </p>
      )}

      {error && (
        <p id={errorId} className="mt-2 text-sm text-red-600 flex items-start gap-1" role="alert">
          <span aria-hidden="true">⚠️</span>
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
