type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  pulse?: boolean;
  className?: string;
}

/**
 * 🎨 Badge - Badge de statut unifié
 */
export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  pulse = false,
  className = ''
}: BadgeProps) {
  
  const variants: Record<BadgeVariant, string> = {
    default: 'bg-slate-100 text-slate-700 border-slate-200',
    primary: 'bg-teal-50 text-teal-700 border-teal-200',
    success: 'bg-green-50 text-green-700 border-green-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-red-50 text-red-700 border-red-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    neutral: 'bg-slate-50 text-slate-600 border-slate-200'
  };
  
  const dotColors: Record<BadgeVariant, string> = {
    default: 'bg-slate-500',
    primary: 'bg-teal-500',
    success: 'bg-green-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
    info: 'bg-blue-500',
    neutral: 'bg-slate-400'
  };
  
  const sizes: Record<BadgeSize, string> = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm'
  };

  return (
    <span className={`
      inline-flex items-center gap-1.5
      font-semibold rounded-full border
      ${variants[variant]}
      ${sizes[size]}
      ${className}
    `}>
      {dot && (
        <span className={`
          w-1.5 h-1.5 rounded-full
          ${dotColors[variant]}
          ${pulse ? 'animate-pulse' : ''}
        `} />
      )}
      {children}
    </span>
  );
}

// Preset badges for common statuses
Badge.Status = function StatusBadge({ 
  status 
}: { 
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'active' | 'inactive';
}) {
  const config: Record<string, { variant: BadgeVariant; label: string; dot?: boolean }> = {
    pending: { variant: 'warning', label: 'En attente', dot: true },
    in_progress: { variant: 'info', label: 'En cours', dot: true },
    completed: { variant: 'success', label: 'Terminé' },
    cancelled: { variant: 'danger', label: 'Annulé' },
    active: { variant: 'success', label: 'Actif', dot: true },
    inactive: { variant: 'neutral', label: 'Inactif' }
  };
  
  const { variant, label, dot } = config[status] || config.pending;
  
  return (
    <Badge variant={variant} dot={dot}>
      {label}
    </Badge>
  );
};
