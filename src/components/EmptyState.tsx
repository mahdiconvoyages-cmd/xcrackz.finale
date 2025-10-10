import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  const ActionIcon = action?.icon;

  return (
    <div className="text-center py-16 animate-in fade-in duration-500">
      <div className="relative inline-flex items-center justify-center mb-6">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/20 to-cyan-500/20 blur-2xl rounded-full"></div>
        <div className="relative w-24 h-24 bg-gradient-to-br from-teal-500/10 to-cyan-500/10 backdrop-blur rounded-3xl flex items-center justify-center border border-white/40 shadow-depth">
          <Icon className="w-12 h-12 text-teal-600" />
        </div>
      </div>
      <h3 className="text-2xl font-bold text-slate-800 mb-3 text-shadow">{title}</h3>
      <p className="text-slate-600 mb-6 max-w-md mx-auto text-lg">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white px-8 py-3 rounded-xl font-bold shadow-glow-teal hover:shadow-depth-xl transition-all duration-300 hover:-translate-y-1 hover:scale-105"
        >
          {ActionIcon && <ActionIcon className="w-5 h-5" />}
          {action.label}
        </button>
      )}
    </div>
  );
}
