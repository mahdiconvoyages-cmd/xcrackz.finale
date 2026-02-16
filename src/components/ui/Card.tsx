import { ReactNode } from 'react';

type CardVariant = 'default' | 'glass' | 'gradient' | 'bordered' | 'elevated';

interface CardProps {
  variant?: CardVariant;
  className?: string;
  children: ReactNode;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

/**
 * 🎨 Card - Carte unifiée avec variantes
 */
export default function Card({ 
  variant = 'default',
  className = '',
  children,
  hover = true,
  padding = 'md',
  onClick
}: CardProps) {
  
  const baseStyles = `
    rounded-2xl transition-all duration-300
    ${onClick ? 'cursor-pointer' : ''}
  `;
  
  const variants: Record<CardVariant, string> = {
    default: `
      bg-white border border-slate-100
      shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.04)]
      ${hover ? 'hover:shadow-[0_4px_12px_rgba(0,0,0,0.08),0_8px_24px_rgba(0,0,0,0.06)] hover:-translate-y-1' : ''}
    `,
    glass: `
      bg-white/80 backdrop-blur-xl border border-white/50
      shadow-lg
      ${hover ? 'hover:bg-white/90 hover:shadow-xl hover:-translate-y-1' : ''}
    `,
    gradient: `
      bg-gradient-to-br from-teal-500 to-cyan-500 text-white
      shadow-lg shadow-teal-500/30
      ${hover ? 'hover:shadow-xl hover:shadow-teal-500/40 hover:-translate-y-1' : ''}
    `,
    bordered: `
      bg-white border-2 border-slate-200
      ${hover ? 'hover:border-teal-400 hover:shadow-lg hover:-translate-y-1' : ''}
    `,
    elevated: `
      bg-white
      shadow-[0_2px_4px_rgba(0,0,0,0.02),0_4px_8px_rgba(0,0,0,0.04),0_8px_16px_rgba(0,0,0,0.04),0_16px_32px_rgba(0,0,0,0.04)]
      ${hover ? 'hover:shadow-[0_4px_8px_rgba(0,0,0,0.04),0_8px_16px_rgba(0,0,0,0.06),0_16px_32px_rgba(0,0,0,0.06),0_32px_64px_rgba(0,0,0,0.06)] hover:-translate-y-1' : ''}
    `
  };
  
  const paddings: Record<'none' | 'sm' | 'md' | 'lg', string> = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  return (
    <div 
      className={`${baseStyles} ${variants[variant]} ${paddings[padding]} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// Sous-composants pour structure
Card.Header = function CardHeader({ 
  children, 
  className = '' 
}: { 
  children: ReactNode; 
  className?: string;
}) {
  return (
    <div className={`pb-4 border-b border-slate-100 mb-4 ${className}`}>
      {children}
    </div>
  );
};

Card.Body = function CardBody({ 
  children, 
  className = '' 
}: { 
  children: ReactNode; 
  className?: string;
}) {
  return (
    <div className={className}>
      {children}
    </div>
  );
};

Card.Footer = function CardFooter({ 
  children, 
  className = '' 
}: { 
  children: ReactNode; 
  className?: string;
}) {
  return (
    <div className={`pt-4 border-t border-slate-100 mt-4 ${className}`}>
      {children}
    </div>
  );
};
