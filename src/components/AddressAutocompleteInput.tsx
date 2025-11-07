import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAddressAutocomplete, parseNominatimAddress } from '../hooks/useAddressAutocompleteNominatim';

interface AddressAutocompleteInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSelectAddress: (address: {
    fullAddress: string;
    city?: string;
    coordinates: [number, number];
  }) => void;
  placeholder?: string;
  icon?: keyof typeof Feather.glyphMap;
  style?: any;
  inputStyle?: any;
  country?: string;
  types?: string;
  editable?: boolean;
}

/**
 * Composant d'input avec autocomplétion d'adresses via Nominatim (OpenStreetMap)
 * 100% GRATUIT - Pas de clé API requise
 * 
 * @example
 * <AddressAutocompleteInput
 *   value={departure}
 *   onChangeText={setDeparture}
 *   onSelectAddress={(address) => {
 *     setDeparture(address.fullAddress);
 *     setDepartureCoords(address.coordinates);
 *   }}
 *   placeholder="D'où partez-vous ?"
 *   icon="map-pin"
 * />
 */
export const AddressAutocompleteInput: React.FC<AddressAutocompleteInputProps> = ({
  value,
  onChangeText,
  onSelectAddress,
  placeholder = 'Entrez une adresse',
  icon = 'map-pin',
  style,
  inputStyle,
  country = 'FR',
  types = 'place,locality,address',
  editable = true,
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { suggestions, loading, searchAddress, clearSuggestions } = useAddressAutocomplete({
    country,
    limit: 5,
  });

  const handleTextChange = (text: string) => {
    onChangeText(text);
    searchAddress(text);
    setShowSuggestions(true);
  };

  const handleSelectSuggestion = (suggestion: any) => {
    const parsed = parseNominatimAddress(suggestion);
    onSelectAddress({
      fullAddress: suggestion.place_name,
      city: parsed.city,
      coordinates: parsed.coordinates,
    });
    onChangeText(suggestion.place_name);
    setShowSuggestions(false);
    clearSuggestions();
  };

  const handleClear = () => {
    onChangeText('');
    clearSuggestions();
    setShowSuggestions(false);
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.inputContainer}>
        <View style={styles.iconCircle}>
          <Feather name={icon} size={18} color="#00AFF5" />
        </View>
        <TextInput
          style={[styles.input, inputStyle]}
          value={value}
          onChangeText={handleTextChange}
          placeholder={placeholder}
          placeholderTextColor="#94a3b8"
          editable={editable}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
        />
        {loading && (
          <ActivityIndicator size="small" color="#00AFF5" style={styles.loader} />
        )}
        {value.length > 0 && !loading && (
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <Feather name="x-circle" size={18} color="#64748b" />
          </TouchableOpacity>
        )}
      </View>

      {/* Modal avec suggestions */}
      <Modal
        visible={showSuggestions && suggestions.length > 0}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuggestions(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowSuggestions(false)}
        >
          <View style={styles.suggestionsContainer}>
            <View style={styles.suggestionsHeader}>
              <Text style={styles.suggestionsTitle}>Suggestions</Text>
              <TouchableOpacity onPress={() => setShowSuggestions(false)}>
                <Feather name="x" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={suggestions}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.suggestionItem}
                  onPress={() => handleSelectSuggestion(item)}
                >
                  <Feather name="map-pin" size={16} color="#00AFF5" style={styles.suggestionIcon} />
                  <View style={styles.suggestionTextContainer}>
                    <Text style={styles.suggestionText}>{item.text}</Text>
                    <Text style={styles.suggestionSubtext} numberOfLines={1}>
                      {item.place_name}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={16} color="#cbd5e1" />
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              style={styles.suggestionsList}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#f8fafc',
    fontWeight: '500',
  },
  loader: {
    marginLeft: 8,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  suggestionsContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    maxHeight: '70%',
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  suggestionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  suggestionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
  },
  suggestionsList: {
    maxHeight: 400,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1e293b',
  },
  suggestionIcon: {
    marginRight: 12,
  },
  suggestionTextContainer: {
    flex: 1,
  },
  suggestionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 2,
  },
  suggestionSubtext: {
    fontSize: 13,
    color: '#94a3b8',
  },
  separator: {
    height: 1,
    backgroundColor: '#334155',
    marginHorizontal: 16,
  },
});
