import React from 'react';
import { focusRingClasses, buttonAccessibleClasses } from '../utils/accessibility';

interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  ariaLabel?: string;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

/**
 * Bouton entièrement accessible avec toutes les best practices
 * - ARIA labels automatiques
 * - Focus visible
 * - Support clavier complet
 * - États disabled/loading
 * - Contrastes WCAG AA
 */
export default function AccessibleButton({
  children,
  variant = 'primary',
  size = 'md',
  ariaLabel,
  loading = false,
  disabled,
  icon,
  iconPosition = 'left',
  className = '',
  ...props
}: AccessibleButtonProps) {
  const baseClasses = `
    inline-flex items-center justify-center gap-2
    font-semibold rounded-xl transition-all duration-200
    ${buttonAccessibleClasses}
  `;

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-6 py-4 text-lg',
  };

  const variantClasses = {
    primary: `
      bg-gradient-to-r from-teal-600 to-cyan-600
      text-white
      hover:from-teal-700 hover:to-cyan-700
      active:from-teal-800 active:to-cyan-800
      shadow-lg hover:shadow-xl
      disabled:from-slate-400 disabled:to-slate-400
    `,
    secondary: `
      bg-white
      text-slate-700
      border-2 border-slate-300
      hover:bg-slate-50
      hover:border-slate-400
      active:bg-slate-100
      disabled:bg-slate-100 disabled:text-slate-400
    `,
    danger: `
      bg-red-600
      text-white
      hover:bg-red-700
      active:bg-red-800
      shadow-lg hover:shadow-xl
      disabled:bg-slate-400
    `,
    ghost: `
      bg-transparent
      text-slate-700
      hover:bg-slate-100
      active:bg-slate-200
      disabled:text-slate-400
    `,
  };

  const content = (
    <>
      {loading && (
        <svg
          className="animate-spin h-5 w-5"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {!loading && icon && iconPosition === 'left' && <span aria-hidden="true">{icon}</span>}
      <span>{children}</span>
      {!loading && icon && iconPosition === 'right' && <span aria-hidden="true">{icon}</span>}
    </>
  );

  return (
    <button
      type="button"
      disabled={disabled || loading}
      aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
      aria-busy={loading}
      className={`
        ${baseClasses}
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      {...props}
    >
      {content}
    </button>
  );
}
