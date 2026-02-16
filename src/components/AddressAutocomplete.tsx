import { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Loader2, Search } from 'lucide-react';
import { searchAddress, AddressSuggestion } from '../lib/services/addressAutocomplete';

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string, lat?: number, lng?: number) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  error?: string;
  className?: string;
}

export default function AddressAutocomplete({
  value,
  onChange,
  placeholder = 'Entrez une adresse...',
  label,
  required = false,
  error,
  className,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
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

  const fetchAddresses = async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);

    try {
      const results = await searchAddress(query, 5);
      setSuggestions(results);
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
    setSelectedIndex(-1);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      fetchAddresses(newValue);
    }, 300);
  };

  const handleSelectSuggestion = (suggestion: AddressSuggestion) => {
    onChange(
      suggestion.label,
      suggestion.coordinates.lat,
      suggestion.coordinates.lon
    );
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelectSuggestion(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Géolocalisation du navigateur
  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      alert('La géolocalisation n\'est pas supportée par votre navigateur');
      return;
    }

    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          const response = await fetch(
            `https://api-adresse.data.gouv.fr/reverse/?lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();
          
          if (data.features && data.features.length > 0) {
            const feature = data.features[0];
            const address = feature.properties.label;
            onChange(address, latitude, longitude);
          }
        } catch (error) {
          console.error('Erreur de géolocalisation inverse:', error);
          alert('Impossible de trouver l\'adresse à cette position');
        } finally {
          setIsLoading(false);
        }
      },
      (error) => {
        console.error('Erreur de géolocalisation:', error);
        alert('Impossible d\'obtenir votre position');
        setIsLoading(false);
      }
    );
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
            <Loader2 className="h-5 w-5 text-slate-400 animate-spin" />
          ) : (
            <MapPin className="h-5 w-5 text-slate-400" />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => value.length >= 3 && suggestions.length > 0 && setShowSuggestions(true)}
          placeholder={placeholder}
          required={required}
          className={className || `w-full pl-10 pr-20 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${
            error ? 'border-red-500' : 'border-slate-300'
          }`}
        />

        {/* Bouton de géolocalisation */}
        <button
          type="button"
          onClick={handleGeolocate}
          disabled={isLoading}
          title="Utiliser ma position"
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 
                   hover:text-blue-600 transition disabled:opacity-50"
        >
          <Navigation className="h-5 w-5" />
        </button>
      </div>

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.properties.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelectSuggestion(suggestion);
              }}
              onClick={() => handleSelectSuggestion(suggestion)}
              className={`w-full px-4 py-3 text-left hover:bg-blue-50 transition flex items-start gap-3 border-b border-slate-100 last:border-b-0
                ${index === selectedIndex ? 'bg-blue-50' : ''}`}
            >
              <MapPin className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900">{suggestion.name}</p>
                <p className="text-xs text-slate-600 mt-1">{suggestion.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{suggestion.context}</p>
              </div>
              <div className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded whitespace-nowrap">
                {suggestion.type === 'housenumber' && '🏠 Numéro'}
                {suggestion.type === 'street' && '🛣️ Rue'}
                {suggestion.type === 'locality' && '📍 Lieu'}
                {suggestion.type === 'municipality' && '🏙️ Ville'}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Message "Aucun résultat" */}
      {showSuggestions && !isLoading && value.length >= 3 && suggestions.length === 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-lg shadow-lg p-6 text-center">
          <Search className="h-10 w-10 mx-auto mb-2 text-slate-400" />
          <p className="text-sm text-slate-600 font-medium">Aucune adresse trouvée</p>
          <p className="text-xs text-slate-500 mt-1">Essayez une recherche différente</p>
        </div>
      )}
    </div>
  );
}
