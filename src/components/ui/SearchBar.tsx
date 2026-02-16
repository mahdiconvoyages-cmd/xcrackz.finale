import { Search, X } from 'lucide-react';
import { useState } from 'react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

/**
 * 🎨 SearchBar - Barre de recherche unifiée
 */
export default function SearchBar({
  value,
  onChange,
  placeholder = 'Rechercher...',
  className = '',
  autoFocus = false
}: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className={`relative ${className}`}>
      {/* Search Icon */}
      <div className={`
        absolute left-4 top-1/2 -translate-y-1/2
        transition-colors duration-200
        ${isFocused ? 'text-teal-500' : 'text-slate-400'}
      `}>
        <Search className="w-5 h-5" />
      </div>
      
      {/* Input */}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={`
          w-full pl-12 pr-10 py-3
          bg-white border-2 rounded-xl
          text-slate-900 placeholder-slate-400
          transition-all duration-200
          ${isFocused 
            ? 'border-teal-500 shadow-lg shadow-teal-500/10' 
            : 'border-slate-200 hover:border-slate-300'
          }
          focus:outline-none
        `}
      />
      
      {/* Clear Button */}
      {value && (
        <button
          onClick={() => onChange('')}
          className="
            absolute right-3 top-1/2 -translate-y-1/2
            p-1 rounded-full
            text-slate-400 hover:text-slate-600
            hover:bg-slate-100
            transition-colors duration-200
          "
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
