import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface AddressSuggestion {
  label: string;
  city: string;
  postcode: string;
  coordinates: [number, number]; // [lng, lat]
}

interface Props {
  value: string;
  onSelect: (address: string, lat: number, lng: number) => void;
  placeholder?: string;
  label?: string;
}

export default function AddressAutocomplete({ value, onSelect, placeholder, label }: Props) {
  const { colors } = useTheme();
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(() => {
      searchAddress(query);
    }, 300); // Debounce de 300ms

    return () => clearTimeout(timer);
  }, [query]);

  const searchAddress = async (searchQuery: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(searchQuery)}&limit=5`
      );
      const data = await response.json();

      const results: AddressSuggestion[] = (data.features || []).map((feature: any) => ({
        label: feature.properties.label,
        city: feature.properties.city,
        postcode: feature.properties.postcode,
        coordinates: feature.geometry.coordinates,
      }));

      setSuggestions(results);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Erreur recherche adresse:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSuggestion = (suggestion: AddressSuggestion) => {
    const [lng, lat] = suggestion.coordinates;
    setQuery(suggestion.label);
    setSuggestions([]);
    setShowSuggestions(false);
    onSelect(suggestion.label, lat, lng);
  };

  const handleChangeText = (text: string) => {
    setQuery(text);
    if (text.length === 0) {
      setSuggestions([]);
      setShowSuggestions(false);
    } else {
      setShowSuggestions(true);
    }
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    onSelect('', 0, 0);
  };

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, { color: colors.text }]}>{label}</Text>}
      
      <View style={styles.inputContainer}>
        <Ionicons name="location-outline" size={20} color={colors.textSecondary} style={styles.icon} />
        
        <TextInput
          style={[styles.input, { 
            backgroundColor: colors.surface, 
            color: colors.text,
            borderColor: colors.border 
          }]}
          value={query}
          onChangeText={handleChangeText}
          placeholder={placeholder || "Rechercher une adresse..."}
          placeholderTextColor={colors.textSecondary}
          onFocus={() => query.length >= 3 && setShowSuggestions(true)}
        />

        {loading && <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />}
        
        {query.length > 0 && !loading && (
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {showSuggestions && suggestions.length > 0 && (
        <View style={[styles.suggestionsContainer, { 
          backgroundColor: colors.surface,
          borderColor: colors.border 
        }]}>
          <FlatList
            data={suggestions}
            keyExtractor={(item, index) => `${item.label}-${index}`}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.suggestionItem, { borderBottomColor: colors.border }]}
                onPress={() => handleSelectSuggestion(item)}
              >
                <Ionicons name="location" size={16} color={colors.primary} />
                <View style={styles.suggestionText}>
                  <Text style={[styles.suggestionLabel, { color: colors.text }]} numberOfLines={1}>
                    {item.label}
                  </Text>
                  <Text style={[styles.suggestionCity, { color: colors.textSecondary }]}>
                    {item.postcode} {item.city}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            scrollEnabled={true}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    zIndex: 1000,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  icon: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  input: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    paddingLeft: 40,
    paddingRight: 40,
    paddingVertical: 10,
    fontSize: 16,
  },
  loader: {
    position: 'absolute',
    right: 12,
  },
  clearButton: {
    position: 'absolute',
    right: 12,
  },
  suggestionsContainer: {
    marginTop: 4,
    borderRadius: 8,
    borderWidth: 1,
    maxHeight: 200,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  suggestionText: {
    flex: 1,
  },
  suggestionLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  suggestionCity: {
    fontSize: 12,
  },
});
