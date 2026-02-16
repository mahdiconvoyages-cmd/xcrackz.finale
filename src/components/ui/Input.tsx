import { forwardRef } from 'react';
import { LucideIcon } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
}

/**
 * 🎨 Input - Champ de saisie unifié
 */
const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  hint,
  icon: Icon,
  iconPosition = 'left',
  className = '',
  ...props
}, ref) => {
  
  const hasIcon = !!Icon;
  
  return (
    <div className="w-full">
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-2">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      {/* Input Container */}
      <div className="relative">
        {/* Icon Left */}
        {Icon && iconPosition === 'left' && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <Icon className="w-5 h-5" />
          </div>
        )}
        
        {/* Input */}
        <input
          ref={ref}
          className={`
            w-full py-3 px-4
            bg-white border-2 rounded-xl
            text-slate-900 placeholder-slate-400
            transition-all duration-200
            focus:outline-none focus:border-teal-500 focus:shadow-lg focus:shadow-teal-500/10
            hover:border-slate-300
            disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed
            ${hasIcon && iconPosition === 'left' ? 'pl-12' : ''}
            ${hasIcon && iconPosition === 'right' ? 'pr-12' : ''}
            ${error ? 'border-red-500 focus:border-red-500 focus:shadow-red-500/10' : 'border-slate-200'}
            ${className}
          `}
          {...props}
        />
        
        {/* Icon Right */}
        {Icon && iconPosition === 'right' && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      
      {/* Error */}
      {error && (
        <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
      
      {/* Hint */}
      {hint && !error && (
        <p className="mt-2 text-sm text-slate-500">{hint}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
