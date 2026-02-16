import { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

type StatVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  variant?: StatVariant;
  trend?: {
    value: number;
    label?: string;
  };
  className?: string;
}

/**
 * 🎨 StatCard - Carte statistique unifiée
 */
export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  trend,
  className = ''
}: StatCardProps) {
  
  const variants: Record<StatVariant, { 
    iconBg: string; 
    iconColor: string;
    accent: string;
  }> = {
    default: {
      iconBg: 'bg-gradient-to-br from-slate-500 to-slate-600',
      iconColor: 'text-white',
      accent: 'from-slate-500'
    },
    primary: {
      iconBg: 'bg-gradient-to-br from-teal-500 to-cyan-500',
      iconColor: 'text-white',
      accent: 'from-teal-500'
    },
    success: {
      iconBg: 'bg-gradient-to-br from-green-500 to-emerald-500',
      iconColor: 'text-white',
      accent: 'from-green-500'
    },
    warning: {
      iconBg: 'bg-gradient-to-br from-amber-500 to-orange-500',
      iconColor: 'text-white',
      accent: 'from-amber-500'
    },
    danger: {
      iconBg: 'bg-gradient-to-br from-red-500 to-rose-500',
      iconColor: 'text-white',
      accent: 'from-red-500'
    },
    info: {
      iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-500',
      iconColor: 'text-white',
      accent: 'from-blue-500'
    }
  };
  
  const currentVariant = variants[variant];
  
  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.value > 0) return TrendingUp;
    if (trend.value < 0) return TrendingDown;
    return Minus;
  };
  
  const getTrendColor = () => {
    if (!trend) return '';
    if (trend.value > 0) return 'text-green-600 bg-green-50';
    if (trend.value < 0) return 'text-red-600 bg-red-50';
    return 'text-slate-600 bg-slate-50';
  };
  
  const TrendIcon = getTrendIcon();

  return (
    <div className={`
      relative overflow-hidden bg-white rounded-2xl p-6
      border border-slate-100
      shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.04)]
      hover:shadow-[0_4px_12px_rgba(0,0,0,0.08),0_8px_24px_rgba(0,0,0,0.06)]
      hover:-translate-y-1 transition-all duration-300
      ${className}
    `}>
      {/* Accent bar at top */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${currentVariant.accent} to-transparent`} />
      
      {/* Content */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Label */}
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          
          {/* Value */}
          <p className="text-3xl font-black text-slate-900 tracking-tight">{value}</p>
          
          {/* Subtitle or Trend */}
          <div className="mt-2 flex items-center gap-2">
            {trend && TrendIcon && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${getTrendColor()}`}>
                <TrendIcon className="w-3 h-3" />
                {Math.abs(trend.value)}%
                {trend.label && <span className="text-slate-500 font-normal ml-1">{trend.label}</span>}
              </span>
            )}
            {subtitle && !trend && (
              <span className="text-sm text-slate-500">{subtitle}</span>
            )}
          </div>
        </div>
        
        {/* Icon */}
        {Icon && (
          <div className={`
            w-12 h-12 rounded-xl flex items-center justify-center
            ${currentVariant.iconBg} ${currentVariant.iconColor}
            shadow-lg
          `}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </div>
  );
}
