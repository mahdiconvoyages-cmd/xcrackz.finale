import { useState, useEffect, useCallback } from 'react';
import { getMapboxToken } from '../config/mapbox';

interface AddressSuggestion {
  id: string;
  place_name: string;
  text: string;
  center: [number, number]; // [lng, lat]
  context?: Array<{
    id: string;
    text: string;
  }>;
}

interface UseAddressAutocompleteResult {
  suggestions: AddressSuggestion[];
  loading: boolean;
  error: string | null;
  searchAddress: (query: string) => void;
  clearSuggestions: () => void;
}

/**
 * Hook pour l'autocomplétion d'adresses via Mapbox Geocoding API
 * 
 * @param options Configuration optionnelle
 * @returns Suggestions, état de chargement, erreurs et fonctions de contrôle
 * 
 * @example
 * const { suggestions, loading, searchAddress } = useAddressAutocomplete({
 *   language: 'fr',
 *   country: 'FR'
 * });
 * 
 * // Dans un TextInput
 * <TextInput
 *   onChangeText={searchAddress}
 *   placeholder="Entrez une adresse..."
 * />
 * 
 * // Afficher les suggestions
 * {suggestions.map(s => (
 *   <TouchableOpacity key={s.id} onPress={() => selectAddress(s)}>
 *     <Text>{s.place_name}</Text>
 *   </TouchableOpacity>
 * ))}
 */
export const useAddressAutocomplete = (options?: {
  language?: string;
  country?: string;
  types?: string; // 'place', 'address', 'poi', 'postcode', 'locality', 'neighborhood'
  proximity?: [number, number]; // [lng, lat] pour prioriser les résultats proches
  limit?: number;
  debounceMs?: number;
}): UseAddressAutocompleteResult => {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string>('');

  const {
    language = 'fr',
    country = 'FR',
    types = 'place,address,locality',
    proximity,
    limit = 5,
    debounceMs = 300,
  } = options || {};

  // Récupérer le token Mapbox au montage
  useEffect(() => {
    getMapboxToken().then(token => setMapboxToken(token));
  }, []);

  const searchAddress = useCallback((query: string) => {
    // Clear previous timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Si la requête est vide, on vide les suggestions
    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Debounce la recherche
    const timer = setTimeout(async () => {
      if (!mapboxToken) {
        setError('Token Mapbox non disponible');
        setLoading(false);
        return;
      }

      try {
        // Construction de l'URL Mapbox Geocoding API
        const encodedQuery = encodeURIComponent(query.trim());
        let url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=${mapboxToken}`;
        
        // Ajouter les paramètres
        url += `&language=${language}`;
        url += `&limit=${limit}`;
        url += `&types=${types}`;
        
        if (country) {
          url += `&country=${country}`;
        }
        
        if (proximity) {
          url += `&proximity=${proximity[0]},${proximity[1]}`;
        }

        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Erreur HTTP: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.features) {
          const formattedSuggestions: AddressSuggestion[] = data.features.map((feature: any) => ({
            id: feature.id,
            place_name: feature.place_name,
            text: feature.text,
            center: feature.center,
            context: feature.context,
          }));
          
          setSuggestions(formattedSuggestions);
        } else {
          setSuggestions([]);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Erreur autocomplétion adresse:', err);
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
        setSuggestions([]);
        setLoading(false);
      }
    }, debounceMs);

    setDebounceTimer(timer);
  }, [debounceTimer, language, country, types, proximity, limit, debounceMs, mapboxToken]);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setError(null);
    setLoading(false);
  }, []);

  // Cleanup du timer au démontage
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  return {
    suggestions,
    loading,
    error,
    searchAddress,
    clearSuggestions,
  };
};

/**
 * Hook simplifié pour sélectionner une adresse parmi les suggestions
 */
export const useAddressSelection = () => {
  const [selectedAddress, setSelectedAddress] = useState<AddressSuggestion | null>(null);

  const selectAddress = useCallback((suggestion: AddressSuggestion) => {
    setSelectedAddress(suggestion);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedAddress(null);
  }, []);

  return {
    selectedAddress,
    selectAddress,
    clearSelection,
  };
};

/**
 * Fonction utilitaire pour extraire les composants d'une adresse Mapbox
 */
export const parseMapboxAddress = (suggestion: AddressSuggestion) => {
  const result: {
    street?: string;
    city?: string;
    postcode?: string;
    region?: string;
    country?: string;
    coordinates: [number, number];
  } = {
    coordinates: suggestion.center,
  };

  // Le nom principal
  result.street = suggestion.text;

  // Parser le contexte pour extraire ville, code postal, région, pays
  if (suggestion.context) {
    suggestion.context.forEach(ctx => {
      if (ctx.id.startsWith('postcode')) {
        result.postcode = ctx.text;
      } else if (ctx.id.startsWith('place')) {
        result.city = ctx.text;
      } else if (ctx.id.startsWith('region')) {
        result.region = ctx.text;
      } else if (ctx.id.startsWith('country')) {
        result.country = ctx.text;
      }
    });
  }

  return result;
};
