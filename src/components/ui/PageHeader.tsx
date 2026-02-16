import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children?: ReactNode;
  variant?: 'primary' | 'gradient' | 'minimal';
  actions?: ReactNode;
}

/**
 * 🎨 PageHeader - En-tête de page unifié
 * Utiliser ce composant pour tous les headers de pages
 */
export default function PageHeader({ 
  title, 
  description, 
  icon: Icon, 
  children,
  variant = 'gradient',
  actions
}: PageHeaderProps) {
  
  if (variant === 'minimal') {
    return (
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-teal-500/30">
                <Icon className="w-6 h-6 text-white" />
              </div>
            )}
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
                {title}
              </h1>
              {description && (
                <p className="text-slate-500 mt-1">{description}</p>
              )}
            </div>
          </div>
          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 rounded-2xl sm:rounded-3xl p-6 sm:p-8 mb-6 shadow-2xl">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLW9wYWNpdHk9Ii4yIi8+PC9nPjwvc3ZnPg==')]" />
      </div>
      
      {/* Decorative Elements */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-cyan-400/20 rounded-full blur-3xl" />
      
      {/* Content */}
      <div className="relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            {Icon && (
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 shadow-lg">
                <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              </div>
            )}
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white drop-shadow-lg">
                {title}
              </h1>
              {description && (
                <p className="text-white/80 mt-1 text-sm sm:text-base max-w-xl">
                  {description}
                </p>
              )}
            </div>
          </div>
          
          {actions && (
            <div className="flex items-center gap-2 flex-wrap">
              {actions}
            </div>
          )}
        </div>
        
        {children && (
          <div className="mt-6">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
