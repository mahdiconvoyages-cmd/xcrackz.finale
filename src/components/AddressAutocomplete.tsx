import { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string, lat?: number, lng?: number) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  error?: string;
}

interface MapboxFeature {
  place_name: string;
  center: [number, number];
  text: string;
}

export default function AddressAutocomplete({
  value,
  onChange,
  placeholder = 'Entrez une adresse...',
  label,
  required = false,
  error,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<MapboxFeature[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchAddress = async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`
      );

      const data = await response.json();

      const formattedSuggestions = data.features?.map((feature: any) => ({
        place_name: feature.properties.label,
        text: feature.properties.name,
        center: feature.geometry.coordinates,
        properties: feature.properties
      })) || [];

      setSuggestions(formattedSuggestions);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error searching address:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      searchAddress(newValue);
    }, 300);
  };

  const handleSelectSuggestion = (suggestion: MapboxFeature) => {
    onChange(suggestion.place_name, suggestion.center[1], suggestion.center[0]);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <div className="relative">
      {label && (
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {isLoading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-300 border-t-blue-500" />
          ) : (
            <MapPin className="h-5 w-5 text-slate-400" />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={() => value.length >= 3 && suggestions.length > 0 && setShowSuggestions(true)}
          placeholder={placeholder}
          required={required}
          className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${
            error ? 'border-red-500' : 'border-slate-300'
          }`}
        />

        {value && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              setSuggestions([]);
              setShowSuggestions(false);
            }}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelectSuggestion(suggestion);
              }}
              onClick={() => handleSelectSuggestion(suggestion)}
              className="w-full px-4 py-3 text-left hover:bg-slate-50 transition flex items-start gap-3 border-b border-slate-100 last:border-b-0"
            >
              <MapPin className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{suggestion.text}</p>
                <p className="text-xs text-slate-600 truncate">{suggestion.place_name}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
