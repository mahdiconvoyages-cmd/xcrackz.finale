import { ReactNode, forwardRef } from 'react';
import { LucideIcon } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  fullWidth?: boolean;
  children?: ReactNode;
}

/**
 * 🎨 Button - Bouton unifié avec variantes
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  loading = false,
  fullWidth = false,
  children,
  className = '',
  disabled,
  ...props
}, ref) => {
  
  const baseStyles = `
    inline-flex items-center justify-center gap-2 font-semibold
    transition-all duration-200 ease-out cursor-pointer
    focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
  `;
  
  const variants: Record<ButtonVariant, string> = {
    primary: `
      bg-gradient-to-r from-teal-500 to-cyan-500 text-white
      shadow-lg shadow-teal-500/30
      hover:shadow-xl hover:shadow-teal-500/40 hover:-translate-y-0.5
      active:translate-y-0 active:shadow-md
      focus-visible:ring-teal-500
    `,
    secondary: `
      bg-white text-teal-600 border-2 border-teal-200
      shadow-sm
      hover:bg-teal-50 hover:border-teal-400 hover:-translate-y-0.5
      active:translate-y-0
      focus-visible:ring-teal-500
    `,
    ghost: `
      bg-transparent text-slate-600
      hover:bg-slate-100 hover:text-slate-900
      focus-visible:ring-slate-500
    `,
    danger: `
      bg-gradient-to-r from-red-500 to-rose-500 text-white
      shadow-lg shadow-red-500/30
      hover:shadow-xl hover:shadow-red-500/40 hover:-translate-y-0.5
      active:translate-y-0
      focus-visible:ring-red-500
    `,
    success: `
      bg-gradient-to-r from-green-500 to-emerald-500 text-white
      shadow-lg shadow-green-500/30
      hover:shadow-xl hover:shadow-green-500/40 hover:-translate-y-0.5
      active:translate-y-0
      focus-visible:ring-green-500
    `,
    outline: `
      bg-transparent text-teal-600 border-2 border-teal-500
      hover:bg-teal-500 hover:text-white
      focus-visible:ring-teal-500
    `
  };
  
  const sizes: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-xs rounded-lg',
    md: 'px-4 py-2.5 text-sm rounded-xl',
    lg: 'px-6 py-3 text-base rounded-xl',
    xl: 'px-8 py-4 text-lg rounded-2xl'
  };
  
  const iconSizes: Record<ButtonSize, string> = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
    xl: 'w-6 h-6'
  };

  return (
    <button
      ref={ref}
      className={`
        ${baseStyles}
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className={`animate-spin ${iconSizes[size]}`} fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      
      {!loading && Icon && iconPosition === 'left' && (
        <Icon className={iconSizes[size]} />
      )}
      
      {children}
      
      {!loading && Icon && iconPosition === 'right' && (
        <Icon className={iconSizes[size]} />
      )}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
