import { LucideIcon } from 'lucide-react';

interface Tab {
  id: string;
  label: string;
  icon?: LucideIcon;
  count?: number;
}

interface TabNavigationProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: 'pills' | 'underline' | 'cards';
  fullWidth?: boolean;
  className?: string;
}

/**
 * 🎨 TabNavigation - Navigation par onglets unifiée
 */
export default function TabNavigation({
  tabs,
  activeTab,
  onChange,
  variant = 'pills',
  fullWidth = false,
  className = ''
}: TabNavigationProps) {
  
  if (variant === 'underline') {
    return (
      <div className={`border-b border-slate-200 ${className}`}>
        <nav className={`flex gap-1 ${fullWidth ? '' : 'max-w-max'}`}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onChange(tab.id)}
                className={`
                  relative flex items-center gap-2 px-4 py-3 text-sm font-medium
                  transition-colors duration-200
                  ${isActive 
                    ? 'text-teal-600' 
                    : 'text-slate-500 hover:text-slate-700'
                  }
                `}
              >
                {Icon && <Icon className="w-4 h-4" />}
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`
                    ml-1 px-2 py-0.5 text-xs rounded-full
                    ${isActive 
                      ? 'bg-teal-100 text-teal-700' 
                      : 'bg-slate-100 text-slate-600'
                    }
                  `}>
                    {tab.count}
                  </span>
                )}
                
                {/* Active indicator */}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full" />
                )}
              </button>
            );
          })}
        </nav>
      </div>
    );
  }
  
  if (variant === 'cards') {
    return (
      <div className={`grid grid-cols-${tabs.length} gap-3 ${className}`}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`
                relative flex flex-col items-center gap-2 p-4 rounded-2xl
                transition-all duration-300
                ${isActive 
                  ? 'bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-500/30' 
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-teal-300 hover:shadow-md'
                }
              `}
            >
              {Icon && <Icon className={`w-6 h-6 ${isActive ? '' : 'text-teal-500'}`} />}
              <span className="font-semibold text-sm">{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`
                  text-2xl font-black
                  ${isActive ? 'text-white' : 'text-slate-900'}
                `}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Default: pills variant
  return (
    <div className={`
      inline-flex p-1 bg-slate-100 rounded-xl
      ${fullWidth ? 'w-full' : ''}
      ${className}
    `}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`
              flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
              text-sm font-semibold transition-all duration-200
              ${fullWidth ? 'flex-1' : ''}
              ${isActive 
                ? 'bg-white text-teal-600 shadow-sm' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }
            `}
          >
            {Icon && <Icon className="w-4 h-4" />}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className={`
                px-2 py-0.5 text-xs rounded-full
                ${isActive 
                  ? 'bg-teal-100 text-teal-700' 
                  : 'bg-slate-200 text-slate-600'
                }
              `}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
