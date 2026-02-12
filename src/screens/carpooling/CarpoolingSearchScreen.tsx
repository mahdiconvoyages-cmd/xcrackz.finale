import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CovoiturageStackParamList } from '../../types/navigation';
import { Routes } from '../../navigation/Routes';

type NavigationProp = NativeStackNavigationProp<CovoiturageStackParamList>;

const colors = {
  primary: '#0b1220',
  success: '#10b981',
  background: '#f5f5f5',
  text: '#1f2937',
  textSecondary: '#6b7280',
  border: '#e5e7eb',
  disabled: '#d1d5db',
};

export default function CarpoolingSearchScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [departureCity, setDepartureCity] = useState('');
  const [arrivalCity, setArrivalCity] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [passengers, setPassengers] = useState(1);

  const handleSearch = () => {
    navigation.navigate(Routes.CarpoolingResults as never, {
      departureCity,
      arrivalCity,
      date: date.toISOString(),
      passengers,
    } as never);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerOverlay}>
          <Text style={styles.headerTitle}>Voyagez moins cher,{'\n'}ensemble.</Text>
          <Text style={styles.headerSubtitle}>Partagez vos trajets de convoyage</Text>
        </View>
      </View>

      {/* Formulaire de recherche */}
      <View style={styles.searchCard}>
        {/* Départ */}
        <View style={styles.inputGroup}>
          <Ionicons name="location-outline" size={24} color={colors.primary} />
          <TextInput
            style={styles.input}
            placeholder="Ville de départ"
            placeholderTextColor={colors.textSecondary}
            value={departureCity}
            onChangeText={setDepartureCity}
          />
        </View>

        <View style={styles.divider} />

        {/* Destination */}
        <View style={styles.inputGroup}>
          <Ionicons name="location" size={24} color={colors.primary} />
          <TextInput
            style={styles.input}
            placeholder="Ville d'arrivée"
            placeholderTextColor={colors.textSecondary}
            value={arrivalCity}
            onChangeText={setArrivalCity}
          />
        </View>

        <View style={styles.divider} />

        {/* Date */}
        <TouchableOpacity
          style={styles.inputGroup}
          onPress={() => setShowDatePicker(true)}
        >
          <Ionicons name="calendar-outline" size={24} color={colors.primary} />
          <Text style={styles.dateText}>
            {date.toLocaleDateString('fr-FR', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
            })}
          </Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (selectedDate) setDate(selectedDate);
            }}
            minimumDate={new Date()}
          />
        )}

        <View style={styles.divider} />

        {/* Nombre de passagers */}
        <View style={styles.inputGroup}>
          <Ionicons name="person-outline" size={24} color={colors.primary} />
          <View style={styles.passengerSelector}>
            <TouchableOpacity
              onPress={() => setPassengers(Math.max(1, passengers - 1))}
              style={styles.passengerButton}
            >
              <Ionicons name="remove-circle-outline" size={28} color={colors.primary} />
            </TouchableOpacity>
            <Text style={styles.passengerCount}>{passengers} passager{passengers > 1 ? 's' : ''}</Text>
            <TouchableOpacity
              onPress={() => setPassengers(Math.min(8, passengers + 1))}
              style={styles.passengerButton}
            >
              <Ionicons name="add-circle-outline" size={28} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bouton Rechercher */}
        <TouchableOpacity
          style={[
            styles.searchButton,
            (!departureCity || !arrivalCity) && styles.searchButtonDisabled,
          ]}
          onPress={handleSearch}
          disabled={!departureCity || !arrivalCity}
        >
          <Text style={styles.searchButtonText}>Rechercher</Text>
        </TouchableOpacity>
      </View>

      {/* Trajets populaires */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trajets populaires</Text>
        <PopularRouteCard
          departure="Paris"
          arrival="Lyon"
          price="25€"
          onPress={() => {
            setDepartureCity('Paris');
            setArrivalCity('Lyon');
          }}
        />
        <PopularRouteCard
          departure="Marseille"
          arrival="Nice"
          price="15€"
          onPress={() => {
            setDepartureCity('Marseille');
            setArrivalCity('Nice');
          }}
        />
        <PopularRouteCard
          departure="Toulouse"
          arrival="Bordeaux"
          price="12€"
          onPress={() => {
            setDepartureCity('Toulouse');
            setArrivalCity('Bordeaux');
          }}
        />
      </View>

      {/* Bouton Publier un trajet */}
      <TouchableOpacity
        style={styles.publishButton}
        onPress={() => navigation.navigate('PublishRide')}
      >
        <Ionicons name="car-sport" size={24} color="#fff" />
        <Text style={styles.publishButtonText}>Publier un trajet</Text>
      </TouchableOpacity>

      {/* Avantages */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pourquoi covoiturer ?</Text>
        <BenefitCard
          icon="cash-outline"
          title="Économisez"
          description="Partagez les frais de carburant"
        />
        <BenefitCard
          icon="leaf-outline"
          title="Écologique"
          description="Réduisez votre empreinte carbone"
        />
        <BenefitCard
          icon="people-outline"
          title="Convivial"
          description="Voyagez avec des convoyeurs"
        />
      </View>
    </ScrollView>
  );
}

function PopularRouteCard({ departure, arrival, price, onPress }) {
  return (
    <TouchableOpacity style={styles.routeCard} onPress={onPress}>
      <View style={styles.routeInfo}>
        <View style={styles.routeRow}>
          <Text style={styles.routeBold}>{departure}</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.textSecondary} style={styles.arrow} />
          <Text style={styles.routeBold}>{arrival}</Text>
        </View>
        <Text style={styles.routePrice}>à partir de {price}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

function BenefitCard({ icon, title, description }) {
  return (
    <View style={styles.benefitCard}>
      <View style={styles.benefitIcon}>
        <Ionicons name={icon} size={28} color={colors.primary} />
      </View>
      <View style={styles.benefitContent}>
        <Text style={styles.benefitTitle}>{title}</Text>
        <Text style={styles.benefitDescription}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    height: 220,
    backgroundColor: colors.primary,
    justifyContent: 'center',
  },
  headerOverlay: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 20,
    justifyContent: 'center',
    height: '100%',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.9,
  },
  searchCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: -60,
    borderRadius: 12,
    padding: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: colors.text,
  },
  dateText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  passengerSelector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginLeft: 12,
  },
  passengerButton: {
    padding: 4,
  },
  passengerCount: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  searchButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  searchButtonDisabled: {
    backgroundColor: colors.disabled,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  routeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  routeInfo: {
    flex: 1,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeBold: {
    fontWeight: '600',
    color: colors.text,
    fontSize: 15,
  },
  arrow: {
    marginHorizontal: 8,
  },
  routePrice: {
    fontSize: 14,
    color: colors.success,
    fontWeight: '600',
    marginTop: 4,
  },
  publishButton: {
    backgroundColor: colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  publishButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  benefitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  benefitIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  benefitDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
