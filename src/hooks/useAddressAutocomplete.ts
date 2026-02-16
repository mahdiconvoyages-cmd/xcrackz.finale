import { useState, useEffect, useCallback } from 'react';
import { searchAddresses } from '../services/leafletService';

interface AddressSuggestion {
  id: string;
  label: string;
  value: string;
  lat: number;
  lng: number;
  address?: {
    road?: string;
    house_number?: string;
    postcode?: string;
    city?: string;
    country?: string;
  };
}

interface UseAddressAutocompleteResult {
  suggestions: AddressSuggestion[];
  loading: boolean;
  error: string | null;
  searchAddress: (query: string) => void;
  clearSuggestions: () => void;
}

export const useAddressAutocomplete = (options?: {
  limit?: number;
  debounceMs?: number;
}): UseAddressAutocompleteResult => {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const { limit = 5, debounceMs = 300 } = options || {};

  const searchAddress = useCallback((query: string) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    if (!query || query.trim().length < 3) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const timer = setTimeout(async () => {
      try {
        const results = await searchAddresses(query, limit);
        setSuggestions(results);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
        setSuggestions([]);
        setLoading(false);
      }
    }, debounceMs);
    setDebounceTimer(timer);
  }, [debounceTimer, limit, debounceMs]);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [debounceTimer]);

  return { suggestions, loading, error, searchAddress, clearSuggestions };
};

export const parseNominatimAddress = (suggestion: AddressSuggestion) => {
  return {
    fullAddress: suggestion.label,
    street: suggestion.address?.road || '',
    houseNumber: suggestion.address?.house_number || '',
    city: suggestion.address?.city || '',
    postcode: suggestion.address?.postcode || '',
    country: suggestion.address?.country || 'France',
    latitude: suggestion.lat,
    longitude: suggestion.lng,
  };
};
