import { useState, useEffect } from 'react';
import { Cloud, CloudOff, Check } from 'lucide-react';

interface AutoSaveIndicatorProps {
  lastSaved?: Date | null;
  saving?: boolean;
  error?: boolean;
}

export default function AutoSaveIndicator({ lastSaved, saving, error }: AutoSaveIndicatorProps) {
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    if (lastSaved && !saving) {
      setShowSaved(true);
      const timer = setTimeout(() => setShowSaved(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [lastSaved, saving]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (error) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <div className="backdrop-blur-xl bg-red-500/90 border border-red-400 rounded-full px-4 py-2 shadow-lg flex items-center gap-2 text-white">
          <CloudOff className="w-4 h-4 animate-pulse" />
          <span className="text-sm font-medium">Erreur sauvegarde</span>
        </div>
      </div>
    );
  }

  if (saving) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <div className="backdrop-blur-xl bg-blue-500/90 border border-blue-400 rounded-full px-4 py-2 shadow-lg flex items-center gap-2 text-white">
          <Cloud className="w-4 h-4 animate-pulse" />
          <span className="text-sm font-medium">Sauvegarde...</span>
        </div>
      </div>
    );
  }

  if (showSaved && lastSaved) {
    return (
      <div className="fixed bottom-6 right-6 z-50 animate-slide-in-right">
        <div className="backdrop-blur-xl bg-gradient-to-r from-emerald-500 to-teal-500 border border-emerald-400 rounded-full px-4 py-2 shadow-lg flex items-center gap-2 text-white">
          <Check className="w-4 h-4" />
          <span className="text-sm font-medium">Sauvegardé à {formatTime(lastSaved)}</span>
        </div>
      </div>
    );
  }

  if (lastSaved) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <div className="backdrop-blur-xl bg-slate-800/90 border border-slate-600 rounded-full px-4 py-2 shadow-lg flex items-center gap-2 text-slate-300">
          <Cloud className="w-4 h-4" />
          <span className="text-xs">Dernière sauvegarde: {formatTime(lastSaved)}</span>
        </div>
      </div>
    );
  }

  return null;
}
