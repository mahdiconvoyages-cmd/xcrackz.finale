import React from 'react';

interface AccessibleTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  helperText?: string;
  showLabel?: boolean;
  maxLength?: number;
  showCharCount?: boolean;
}

/**
 * Textarea accessible avec tous les attributs ARIA nécessaires
 */
export default function AccessibleTextarea({
  label,
  error,
  helperText,
  showLabel = true,
  maxLength,
  showCharCount = false,
  id,
  required,
  value,
  className = '',
  ...props
}: AccessibleTextareaProps) {
  const textareaId = id || `textarea-${label.toLowerCase().replace(/\s+/g, '-')}`;
  const errorId = `${textareaId}-error`;
  const helperId = `${textareaId}-helper`;
  const charCountId = `${textareaId}-charcount`;

  const currentLength = typeof value === 'string' ? value.length : 0;

  return (
    <div className="w-full">
      <label
        htmlFor={textareaId}
        className={`block text-sm font-semibold text-slate-900 mb-2 ${
          !showLabel ? 'sr-only' : ''
        }`}
      >
        {label}
        {required && <span className="text-red-600 ml-1" aria-label="requis">*</span>}
      </label>

      <textarea
        id={textareaId}
        aria-required={required}
        aria-invalid={!!error}
        aria-describedby={
          [
            error ? errorId : null,
            helperText ? helperId : null,
            showCharCount && maxLength ? charCountId : null,
          ].filter(Boolean).join(' ') || undefined
        }
        maxLength={maxLength}
        value={value}
        className={`
          w-full px-4 py-3 rounded-xl border-2 transition-all resize-none
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

      <div className="flex items-center justify-between mt-2">
        {helperText && !error && (
          <p id={helperId} className="text-sm text-slate-600">
            {helperText}
          </p>
        )}

        {showCharCount && maxLength && (
          <p 
            id={charCountId} 
            className={`text-sm ${
              currentLength > maxLength * 0.9 ? 'text-orange-600 font-semibold' : 'text-slate-500'
            }`}
            aria-live="polite"
          >
            {currentLength} / {maxLength}
          </p>
        )}
      </div>

      {error && (
        <p id={errorId} className="mt-2 text-sm text-red-600 flex items-start gap-1" role="alert">
          <span aria-hidden="true">⚠️</span>
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
