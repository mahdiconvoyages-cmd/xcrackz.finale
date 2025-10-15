import { useState } from 'react';
import { Sparkles, TrendingUp, FileText, DollarSign, Calendar } from 'lucide-react';
import { claraSuggestions } from '../lib/clara-intent-recognition';
import { useLocation } from 'react-router-dom';

interface ClaraSuggestionsProps {
  onSuggestionClick: (command: string) => void;
  visible: boolean;
}

export default function ClaraSuggestions({ onSuggestionClick, visible }: ClaraSuggestionsProps) {
  const location = useLocation();
  const [expanded, setExpanded] = useState(false);

  if (!visible) return null;

  // Déterminer les suggestions selon la page
  const getSuggestionsForPage = () => {
    if (location.pathname.includes('/crm')) {
      return claraSuggestions.CRM;
    }
    if (location.pathname.includes('/missions') || location.pathname.includes('/tracking')) {
      return claraSuggestions.Missions;
    }
    if (location.pathname.includes('/dashboard') || location.pathname.includes('/rapports')) {
      return claraSuggestions.Analytics;
    }
    return claraSuggestions.CRM; // Par défaut
  };

  const suggestions = getSuggestionsForPage();
  const displayedSuggestions = expanded ? suggestions : suggestions.slice(0, 3);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'quote': return <FileText className="w-4 h-4" />;
      case 'pricing': return <DollarSign className="w-4 h-4" />;
      case 'analytics': return <TrendingUp className="w-4 h-4" />;
      case 'planning': return <Calendar className="w-4 h-4" />;
      default: return <Sparkles className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-lg border border-purple-200 mb-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-5 h-5 text-purple-600" />
        <h3 className="font-semibold text-purple-900">Suggestions Clara</h3>
      </div>

      {/* Suggestions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {displayedSuggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onSuggestionClick(suggestion.command)}
            className="group flex items-start gap-3 p-3 bg-white hover:bg-purple-50 rounded-lg border border-purple-100 hover:border-purple-300 transition-all text-left"
          >
            {/* Icon */}
            <div className="flex-shrink-0 mt-0.5">
              <div className="w-8 h-8 bg-purple-100 group-hover:bg-purple-200 rounded-lg flex items-center justify-center text-purple-600 transition-colors">
                {getCategoryIcon(suggestion.category)}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{suggestion.icon}</span>
                <p className="font-medium text-gray-900 text-sm truncate">
                  {suggestion.text}
                </p>
              </div>
              <p className="text-xs text-gray-500 truncate">
                {suggestion.command}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Expand/Collapse */}
      {suggestions.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full mt-3 text-sm text-purple-600 hover:text-purple-700 font-medium"
        >
          {expanded ? 'Voir moins ↑' : `Voir ${suggestions.length - 3} suggestions de plus ↓`}
        </button>
      )}

      {/* Quick Tip */}
      <div className="mt-3 pt-3 border-t border-purple-200">
        <p className="text-xs text-gray-600">
          💡 <span className="font-medium">Astuce :</span> Utilisez{' '}
          <code className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-mono">
            /devis
          </code>,{' '}
          <code className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-mono">
            /grille
          </code>,{' '}
          <code className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-mono">
            /ca
          </code>{' '}
          pour des actions rapides
        </p>
      </div>
    </div>
  );
}
