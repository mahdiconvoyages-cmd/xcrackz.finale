import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  Pressable,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { AddressAutocompleteInput } from '../components/AddressAutocompleteInput';
import { useCovoiturage } from '../hooks/useCovoiturage';

const { width } = Dimensions.get('window');

interface Trip {
  id: number;
  from: string;
  to: string;
  date: string;
  time: string;
  price: number;
  driver: {
    name: string;
    rating: number;
    trips: number;
    avatar: string;
    verified: boolean;
  };
  seats: number;
  duration: string;
  comfort: 'basic' | 'comfort' | 'premium';
  features: string[];
}

const CovoiturageScreenBlaBlaCar = () => {
  const [activeTab, setActiveTab] = useState<'search' | 'publish' | 'trips'>('search');
  const [departure, setDeparture] = useState('');
  const [destination, setDestination] = useState('');
  const [selectedDate, setSelectedDate] = useState('Aujourd\'hui');
  
  // Coordonnées GPS des villes sélectionnées
  const [departureCoords, setDepartureCoords] = useState<[number, number] | null>(null);
  const [destinationCoords, setDestinationCoords] = useState<[number, number] | null>(null);
  
  // Hook Covoiturage pour gérer les trajets
  const { trips, loading, error, searchTrips, createTrip } = useCovoiturage();

  // States pour l'onglet "Publier"
  const [publishDeparture, setPublishDeparture] = useState('');
  const [publishDestination, setPublishDestination] = useState('');
  const [publishDepartureCoords, setPublishDepartureCoords] = useState<[number, number] | null>(null);
  const [publishDestinationCoords, setPublishDestinationCoords] = useState<[number, number] | null>(null);
  const [publishDate, setPublishDate] = useState('Aujourd\'hui');
  const [publishTime, setPublishTime] = useState('14:00');
  const [publishPrice, setPublishPrice] = useState('');
  const [publishSeats, setPublishSeats] = useState(2);
  const [publishComfort, setPublishComfort] = useState<'basic' | 'comfort' | 'premium'>('comfort');
  const [publishFeatures, setPublishFeatures] = useState<string[]>([]);
  
  // States pour les pickers de date/heure
  const [datePickerValue, setDatePickerValue] = useState(new Date());
  const [timePickerValue, setTimePickerValue] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const demoTrips: Trip[] = [
    {
      id: 1,
      from: 'Paris',
      to: 'Lyon',
      date: 'Aujourd\'hui',
      time: '14:30',
      price: 25,
      driver: {
        name: 'Marie Dupont',
        rating: 4.9,
        trips: 87,
        avatar: 'MD',
        verified: true,
      },
      seats: 2,
      duration: '4h30',
      comfort: 'comfort',
      features: ['Climatisation', 'Musique', 'Bagage OK'],
    },
    {
      id: 2,
      from: 'Paris',
      to: 'Lyon',
      date: 'Aujourd\'hui',
      time: '16:00',
      price: 22,
      driver: {
        name: 'Thomas Martin',
        rating: 4.8,
        trips: 124,
        avatar: 'TM',
        verified: true,
      },
      seats: 3,
      duration: '4h45',
      comfort: 'basic',
      features: ['Climatisation', 'Non-fumeur'],
    },
    {
      id: 3,
      from: 'Paris',
      to: 'Lyon',
      date: 'Demain',
      time: '08:00',
      price: 28,
      driver: {
        name: 'Sophie Bernard',
        rating: 5.0,
        trips: 203,
        avatar: 'SB',
        verified: true,
      },
      seats: 1,
      duration: '4h20',
      comfort: 'premium',
      features: ['Premium', 'Climatisation', 'Wi-Fi', 'Confort Max'],
    },
  ];

  const comfortColors = {
    basic: '#64748b',
    comfort: '#0ea5e9',
    premium: '#8b5cf6',
  };

  const comfortLabels = {
    basic: 'Standard',
    comfort: 'Confort',
    premium: 'Premium',
  };

  // Fonction pour gérer les features (toggle)
  const toggleFeature = (feature: string) => {
    setPublishFeatures(prev => 
      prev.includes(feature) 
        ? prev.filter(f => f !== feature)
        : [...prev, feature]
    );
  };

  // Handlers pour les pickers
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios'); // Sur iOS, garde le picker ouvert
    if (selectedDate) {
      setDatePickerValue(selectedDate);
      // Formater la date
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      if (selectedDate.toDateString() === today.toDateString()) {
        setPublishDate('Aujourd\'hui');
      } else if (selectedDate.toDateString() === tomorrow.toDateString()) {
        setPublishDate('Demain');
      } else {
        const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
        setPublishDate(selectedDate.toLocaleDateString('fr-FR', options));
      }
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(Platform.OS === 'ios'); // Sur iOS, garde le picker ouvert
    if (selectedTime) {
      setTimePickerValue(selectedTime);
      // Formater l'heure
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      setPublishTime(`${hours}:${minutes}`);
    }
  };

  // Fonction de publication du trajet
  const handlePublishTrip = async () => {
    try {
      // Validation des champs requis
      if (!publishDeparture || !publishDestination) {
        Alert.alert('Erreur', 'Veuillez renseigner les villes de départ et d\'arrivée');
        return;
      }

      if (!publishPrice || parseFloat(publishPrice) <= 0) {
        Alert.alert('Erreur', 'Veuillez renseigner un prix valide');
        return;
      }

      // Convertir la date formatée en format SQL
      let sqlDate: string;
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      if (publishDate === 'Aujourd\'hui') {
        sqlDate = today.toISOString().split('T')[0];
      } else if (publishDate === 'Demain') {
        sqlDate = tomorrow.toISOString().split('T')[0];
      } else {
        // Convertir "15 octobre" en format YYYY-MM-DD
        sqlDate = datePickerValue.toISOString().split('T')[0];
      }

      // Créer le trajet
      const tripData = {
        departure_city: publishDeparture,
        arrival_city: publishDestination,
        departure_lat: publishDepartureCoords?.[1],
        departure_lng: publishDepartureCoords?.[0],
        arrival_lat: publishDestinationCoords?.[1],
        arrival_lng: publishDestinationCoords?.[0],
        departure_date: sqlDate,
        departure_time: publishTime,
        available_seats: publishSeats,
        price_per_seat: parseFloat(publishPrice),
        comfort_level: publishComfort,
        features: publishFeatures,
      };

      console.log('[Publier] Création trajet:', tripData);

      const result = await createTrip(tripData);

      if (result) {
        Alert.alert('Succès', 'Trajet publié avec succès !');
        // Réinitialiser le formulaire
        setPublishDeparture('');
        setPublishDestination('');
        setPublishDepartureCoords(null);
        setPublishDestinationCoords(null);
        setPublishDate('Aujourd\'hui');
        setPublishTime('14:00');
        setPublishPrice('');
        setPublishSeats(2);
        setPublishComfort('comfort');
        setPublishFeatures([]);
        // Passer à l'onglet "Mes trajets"
        setActiveTab('trips');
      } else {
        Alert.alert('Erreur', 'Erreur lors de la publication du trajet');
      }
    } catch (err) {
      console.error('[Publier] Erreur:', err);
      Alert.alert('Erreur', err instanceof Error ? err.message : 'Erreur inconnue');
    }
  };

  const renderSearchSection = () => (
    <View style={styles.searchSection}>
      {/* Hero avec gradient BlaBlaCar */}
      <LinearGradient
        colors={['#00AFF5', '#0083C3']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroGradient}
      >
        <View style={styles.heroContent}>
          <Text style={styles.heroTitle}>Allez partout,{'\n'}pour moins cher</Text>
          <Text style={styles.heroSubtitle}>Voyagez en covoiturage de confiance</Text>
        </View>
      </LinearGradient>

      {/* Carte de recherche */}
      <View style={styles.searchCard}>
        <View style={styles.searchCardInner}>
          {/* Départ */}
          <View style={styles.inputRow}>
            <View style={styles.iconCircle}>
              <View style={styles.circleOutline}>
                <View style={styles.circleFilled} />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <AddressAutocompleteInput
                value={departure}
                onChangeText={setDeparture}
                onSelectAddress={(address) => {
                  setDeparture(address.city || address.fullAddress);
                  setDepartureCoords(address.coordinates);
                }}
                placeholder="D'où partez-vous ?"
                icon="circle"
                types="place,locality"
                inputStyle={styles.searchInput}
              />
            </View>
          </View>

          {/* Ligne de séparation avec points */}
          <View style={styles.separatorLine}>
            <View style={styles.dottedLine} />
          </View>

          {/* Arrivée */}
          <View style={styles.inputRow}>
            <View style={styles.iconCircle}>
              <Feather name="map-pin" size={18} color="#00AFF5" />
            </View>
            <View style={{ flex: 1 }}>
              <AddressAutocompleteInput
                value={destination}
                onChangeText={setDestination}
                onSelectAddress={(address) => {
                  setDestination(address.city || address.fullAddress);
                  setDestinationCoords(address.coordinates);
                }}
                placeholder="Où allez-vous ?"
                icon="map-pin"
                types="place,locality"
                inputStyle={styles.searchInput}
              />
            </View>
          </View>

          {/* Date */}
          <View style={[styles.inputRow, { marginTop: 16, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 16 }]}>
            <View style={styles.iconCircle}>
              <Feather name="calendar" size={18} color="#00AFF5" />
            </View>
            <TouchableOpacity style={styles.dateButton}>
              <Text style={styles.dateText}>{selectedDate}</Text>
              <Feather name="chevron-down" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Bouton de recherche */}
          <TouchableOpacity 
            style={styles.searchButton}
            onPress={() => {
              if (departure && destination) {
                searchTrips(departure, destination);
              }
            }}
            disabled={loading || !departure || !destination}
          >
            <Text style={styles.searchButtonText}>Rechercher</Text>
            {loading ? (
              <ActivityIndicator size="small" color="white" style={{ marginLeft: 8 }} />
            ) : (
              <Feather name="arrow-right" size={20} color="white" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick stats */}
      <View style={styles.quickStats}>
        <View style={styles.statBox}>
          <MaterialCommunityIcons name="account-group" size={24} color="#00AFF5" />
          <Text style={styles.statNumber}>100M+</Text>
          <Text style={styles.statLabel}>Membres</Text>
        </View>
        <View style={styles.statBox}>
          <MaterialCommunityIcons name="shield-check" size={24} color="#10b981" />
          <Text style={styles.statNumber}>4.8/5</Text>
          <Text style={styles.statLabel}>Note moyenne</Text>
        </View>
        <View style={styles.statBox}>
          <MaterialCommunityIcons name="leaf" size={24} color="#22c55e" />
          <Text style={styles.statNumber}>-50%</Text>
          <Text style={styles.statLabel}>CO₂ en moins</Text>
        </View>
      </View>
    </View>
  );

  const renderTripCard = (trip: any) => {
    // Adapter les données de Supabase au format attendu
    const departureTime = trip.departure_time || '08:00';
    const estimatedArrivalTime = trip.estimated_arrival_time || '12:30';
    const totalDistance = trip.total_distance || 450;
    const estimatedDuration = trip.estimated_duration || 270;
    const durationHours = Math.floor(estimatedDuration / 60);
    const durationMinutes = estimatedDuration % 60;
    const durationText = durationMinutes > 0 ? `${durationHours}h${durationMinutes}` : `${durationHours}h`;
    
    return (
      <TouchableOpacity key={trip.id} style={styles.tripCard} activeOpacity={0.7}>
        {/* Header avec heure et durée */}
        <View style={styles.tripHeader}>
          <View style={styles.timeInfo}>
            <Text style={styles.tripTime}>{departureTime}</Text>
            <View style={styles.durationContainer}>
              <View style={styles.durationLine} />
              <Text style={styles.durationText}>{durationText}</Text>
            </View>
            <Text style={styles.tripTime}>{estimatedArrivalTime}</Text>
          </View>
          <View style={styles.priceContainer}>
            <Text style={styles.priceAmount}>{trip.price_per_seat}€</Text>
            <Text style={styles.priceLabel}>par personne</Text>
          </View>
        </View>

        {/* Route */}
        <View style={styles.routeInfo}>
          <View style={styles.locationRow}>
            <View style={styles.locationDot} />
            <Text style={styles.locationText}>{trip.departure_city}</Text>
          </View>
          <View style={styles.locationRow}>
            <Feather name="map-pin" size={14} color="#00AFF5" />
            <Text style={styles.locationText}>{trip.arrival_city}</Text>
          </View>
        </View>

        {/* Driver info (simplifié car pas de relation user dans le hook actuel) */}
        <View style={styles.driverSection}>
          <View style={styles.driverLeft}>
            <View style={styles.driverAvatar}>
              <Text style={styles.avatarText}>👤</Text>
            </View>
            <View style={styles.driverDetails}>
              <View style={styles.driverNameRow}>
                <Text style={styles.driverName}>Conducteur</Text>
              </View>
              <View style={styles.ratingRow}>
                <Feather name="star" size={12} color="#fbbf24" fill="#fbbf24" />
                <Text style={styles.ratingText}>4.8</Text>
                <Text style={styles.tripsText}>• Vérifié</Text>
              </View>
            </View>
          </View>
          
          {/* Comfort badge */}
          <View style={[styles.comfortBadge, { backgroundColor: `${comfortColors[trip.comfort_level || 'standard']}15` }]}>
            <Text style={[styles.comfortText, { color: comfortColors[trip.comfort_level || 'standard'] }]}>
              {comfortLabels[trip.comfort_level || 'standard']}
            </Text>
          </View>
        </View>

        {/* Features */}
        <View style={styles.featuresContainer}>
          {(trip.features || []).slice(0, 3).map((feature: string, index: number) => (
            <View key={index} style={styles.featureTag}>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
          {(trip.features || []).length > 3 && (
            <Text style={styles.moreFeatures}>+{trip.features.length - 3}</Text>
          )}
        </View>

        {/* Seats available */}
        <View style={styles.seatsInfo}>
          <Feather name="users" size={14} color="#64748b" />
          <Text style={styles.seatsText}>
            {trip.available_seats} {trip.available_seats === 1 ? 'place disponible' : 'places disponibles'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderTripsTab = () => (
    <ScrollView 
      style={styles.tripsTab} 
      contentContainerStyle={styles.tripsTabContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Trajets disponibles</Text>
        <TouchableOpacity style={styles.filterButton}>
          <Feather name="sliders" size={18} color="#00AFF5" />
          <Text style={styles.filterText}>Filtres</Text>
        </TouchableOpacity>
      </View>

      {/* Résultats */}
      {loading ? (
        <View style={{ alignItems: 'center', paddingVertical: 40 }}>
          <ActivityIndicator size="large" color="#00AFF5" />
          <Text style={{ color: '#94a3b8', marginTop: 12 }}>Recherche en cours...</Text>
        </View>
      ) : error ? (
        <View style={{ alignItems: 'center', paddingVertical: 40 }}>
          <MaterialCommunityIcons name="alert-circle" size={48} color="#ef4444" />
          <Text style={{ color: '#ef4444', marginTop: 12, fontSize: 16 }}>{error}</Text>
        </View>
      ) : trips.length > 0 ? (
        <>
          <View style={styles.resultsInfo}>
            <Text style={styles.resultsText}>
              {trips.length} {trips.length === 1 ? 'trajet' : 'trajets'} • {departure} → {destination}
            </Text>
          </View>

          {trips.map(renderTripCard)}

          {/* Load more */}
          <TouchableOpacity style={styles.loadMoreButton}>
            <Text style={styles.loadMoreText}>Voir plus de trajets</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={{ alignItems: 'center', paddingVertical: 60 }}>
          <MaterialCommunityIcons name="car-off" size={64} color="#64748b" />
          <Text style={{ color: '#94a3b8', marginTop: 16, fontSize: 18, fontWeight: '600' }}>
            Aucun trajet trouvé
          </Text>
          <Text style={{ color: '#64748b', marginTop: 8, textAlign: 'center', paddingHorizontal: 40 }}>
            Essayez de modifier vos critères de recherche ou publiez votre propre trajet
          </Text>
        </View>
      )}

      {/* Load more */}
      <TouchableOpacity style={styles.loadMoreButton}>
        <Text style={styles.loadMoreText}>Voir plus de trajets</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderPublishTab = () => (
    <ScrollView 
      style={styles.publishTab} 
      contentContainerStyle={styles.publishTabContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.publishHero}>
        <LinearGradient
          colors={['#8b5cf6', '#6366f1']}
          style={styles.publishGradient}
        >
          <MaterialCommunityIcons name="car-side" size={64} color="white" />
          <Text style={styles.publishTitle}>Proposez un trajet</Text>
          <Text style={styles.publishSubtitle}>
            Rentabilisez vos trajets et rencontrez de nouvelles personnes
          </Text>
        </LinearGradient>
      </View>

      <View style={styles.publishForm}>
        <View style={styles.publishCard}>
          <Text style={styles.cardTitle}>Informations du trajet</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Départ</Text>
            <AddressAutocompleteInput
              value={publishDeparture}
              onChangeText={setPublishDeparture}
              onSelectAddress={(address) => {
                setPublishDeparture(address.city || address.fullAddress);
                setPublishDepartureCoords(address.coordinates);
              }}
              placeholder="Ville de départ"
              icon="circle"
              types="place,locality"
              style={{ marginBottom: 0 }}
              inputStyle={{
                backgroundColor: '#1e293b',
                borderWidth: 1,
                borderColor: '#334155',
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                color: '#f8fafc',
                fontSize: 16,
              }}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Destination</Text>
            <AddressAutocompleteInput
              value={publishDestination}
              onChangeText={setPublishDestination}
              onSelectAddress={(address) => {
                setPublishDestination(address.city || address.fullAddress);
                setPublishDestinationCoords(address.coordinates);
              }}
              placeholder="Ville d'arrivée"
              icon="map-pin"
              types="place,locality"
              style={{ marginBottom: 0 }}
              inputStyle={{
                backgroundColor: '#1e293b',
                borderWidth: 1,
                borderColor: '#334155',
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                color: '#f8fafc',
                fontSize: 16,
              }}
            />
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Date</Text>
              <TouchableOpacity 
                style={styles.inputContainer}
                onPress={() => setShowDatePicker(true)}
              >
                <Feather name="calendar" size={18} color="#00AFF5" />
                <Text style={[styles.formInput, { color: '#f8fafc' }]}>{publishDate}</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Heure</Text>
              <TouchableOpacity 
                style={styles.inputContainer}
                onPress={() => setShowTimePicker(true)}
              >
                <Feather name="clock" size={18} color="#00AFF5" />
                <Text style={[styles.formInput, { color: '#f8fafc' }]}>{publishTime}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Date Picker */}
          {showDatePicker && (
            <DateTimePicker
              value={datePickerValue}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              minimumDate={new Date()}
              locale="fr-FR"
            />
          )}

          {/* Time Picker */}
          {showTimePicker && (
            <DateTimePicker
              value={timePickerValue}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleTimeChange}
              is24Hour={true}
              locale="fr-FR"
            />
          )}

          <View style={styles.formGroup}>
            <Text style={styles.label}>Prix par passager</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.currencySymbol}>€</Text>
              <TextInput
                style={[styles.formInput, { color: '#f8fafc' }]}
                placeholder="25"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={publishPrice}
                onChangeText={setPublishPrice}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Places disponibles</Text>
            <View style={styles.seatsSelector}>
              {[1, 2, 3, 4].map((num) => (
                <TouchableOpacity 
                  key={num} 
                  style={[
                    styles.seatOption,
                    publishSeats === num && { backgroundColor: '#00AFF5', borderColor: '#00AFF5' }
                  ]}
                  onPress={() => setPublishSeats(num)}
                >
                  <Text style={[
                    styles.seatNumber,
                    publishSeats === num && { color: 'white' }
                  ]}>{num}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.publishCard}>
          <Text style={styles.cardTitle}>Options de confort</Text>
          
          <TouchableOpacity 
            style={styles.optionRow}
            onPress={() => toggleFeature('Climatisation')}
          >
            <View style={styles.optionLeft}>
              <MaterialCommunityIcons name="snowflake" size={20} color="#64748b" />
              <Text style={styles.optionText}>Climatisation</Text>
            </View>
            <View style={[
              styles.checkbox,
              publishFeatures.includes('Climatisation') && styles.checkboxChecked
            ]}>
              {publishFeatures.includes('Climatisation') && (
                <Feather name="check" size={16} color="white" />
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.optionRow}
            onPress={() => toggleFeature('Musique')}
          >
            <View style={styles.optionLeft}>
              <MaterialCommunityIcons name="music" size={20} color="#64748b" />
              <Text style={styles.optionText}>Musique autorisée</Text>
            </View>
            <View style={[
              styles.checkbox,
              publishFeatures.includes('Musique') && styles.checkboxChecked
            ]}>
              {publishFeatures.includes('Musique') && (
                <Feather name="check" size={16} color="white" />
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.optionRow}
            onPress={() => toggleFeature('Non-fumeur')}
          >
            <View style={styles.optionLeft}>
              <MaterialCommunityIcons name="smoking-off" size={20} color="#64748b" />
              <Text style={styles.optionText}>Non-fumeur</Text>
            </View>
            <View style={[
              styles.checkbox,
              publishFeatures.includes('Non-fumeur') && styles.checkboxChecked
            ]}>
              {publishFeatures.includes('Non-fumeur') && (
                <Feather name="check" size={16} color="white" />
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.optionRow}
            onPress={() => toggleFeature('Bagages')}
          >
            <View style={styles.optionLeft}>
              <MaterialCommunityIcons name="bag-suitcase" size={20} color="#64748b" />
              <Text style={styles.optionText}>Bagages autorisés</Text>
            </View>
            <View style={[
              styles.checkbox,
              publishFeatures.includes('Bagages') && styles.checkboxChecked
            ]}>
              {publishFeatures.includes('Bagages') && (
                <Feather name="check" size={16} color="white" />
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Niveau de confort */}
        <View style={styles.publishCard}>
          <Text style={styles.cardTitle}>Niveau de confort</Text>
          <View style={styles.comfortSelector}>
            <TouchableOpacity
              style={[
                styles.comfortOption,
                publishComfort === 'basic' && { 
                  backgroundColor: '#64748b20',
                  borderColor: '#64748b'
                }
              ]}
              onPress={() => setPublishComfort('basic')}
            >
              <Text style={[
                styles.comfortLabel,
                publishComfort === 'basic' && { color: '#64748b', fontWeight: '600' }
              ]}>
                Standard
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.comfortOption,
                publishComfort === 'comfort' && { 
                  backgroundColor: '#0ea5e920',
                  borderColor: '#0ea5e9'
                }
              ]}
              onPress={() => setPublishComfort('comfort')}
            >
              <Text style={[
                styles.comfortLabel,
                publishComfort === 'comfort' && { color: '#0ea5e9', fontWeight: '600' }
              ]}>
                Confort
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.comfortOption,
                publishComfort === 'premium' && { 
                  backgroundColor: '#8b5cf620',
                  borderColor: '#8b5cf6'
                }
              ]}
              onPress={() => setPublishComfort('premium')}
            >
              <Text style={[
                styles.comfortLabel,
                publishComfort === 'premium' && { color: '#8b5cf6', fontWeight: '600' }
              ]}>
                Premium
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.publishButton}
          onPress={handlePublishTrip}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.publishButtonText}>Publier le trajet</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#00AFF5" />

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'search' && styles.tabActive]}
          onPress={() => setActiveTab('search')}
        >
          <Feather
            name="search"
            size={20}
            color={activeTab === 'search' ? '#00AFF5' : '#64748b'}
          />
          <Text style={[styles.tabText, activeTab === 'search' && styles.tabTextActive]}>
            Rechercher
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'publish' && styles.tabActive]}
          onPress={() => setActiveTab('publish')}
        >
          <Feather
            name="plus-circle"
            size={20}
            color={activeTab === 'publish' ? '#00AFF5' : '#64748b'}
          />
          <Text style={[styles.tabText, activeTab === 'publish' && styles.tabTextActive]}>
            Proposer
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'trips' && styles.tabActive]}
          onPress={() => setActiveTab('trips')}
        >
          <Feather
            name="list"
            size={20}
            color={activeTab === 'trips' ? '#00AFF5' : '#64748b'}
          />
          <Text style={[styles.tabText, activeTab === 'trips' && styles.tabTextActive]}>
            Mes trajets
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'search' && (
          <>
            {renderSearchSection()}
            {renderTripsTab()}
          </>
        )}
        {activeTab === 'publish' && renderPublishTab()}
        {activeTab === 'trips' && renderTripsTab()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#00AFF5',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
  },
  notificationButton: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    borderWidth: 2,
    borderColor: '#00AFF5',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
  },
  tabActive: {
    borderBottomWidth: 3,
    borderBottomColor: '#00AFF5',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#00AFF5',
  },
  content: {
    flex: 1,
  },
  searchSection: {
    paddingBottom: 20,
  },
  heroGradient: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: Platform.OS === 'android' ? 110 : 100,
  },
  heroContent: {
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 38,
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  searchCard: {
    marginTop: -50,
    marginHorizontal: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  searchCardInner: {
    padding: 20,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  circleOutline: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#00AFF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleFilled: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00AFF5',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '500',
  },
  separatorLine: {
    marginLeft: 20,
    marginVertical: 12,
  },
  dottedLine: {
    width: 2,
    height: 30,
    borderLeftWidth: 2,
    borderLeftColor: '#cbd5e1',
    borderStyle: 'dotted',
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: {
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '500',
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00AFF5',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
    gap: 8,
  },
  searchButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  statBox: {
    alignItems: 'center',
    gap: 6,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  tripsTab: {
    flex: 1,
  },
  tripsTabContent: {
    paddingBottom: Platform.OS === 'android' ? 110 : 100,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00AFF5',
  },
  resultsInfo: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  resultsText: {
    fontSize: 14,
    color: '#64748b',
  },
  tripCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  timeInfo: {
    flex: 1,
  },
  tripTime: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    gap: 8,
  },
  durationLine: {
    width: 40,
    height: 2,
    backgroundColor: '#cbd5e1',
  },
  durationText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceAmount: {
    fontSize: 24,
    fontWeight: '800',
    color: '#00AFF5',
  },
  priceLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  routeInfo: {
    gap: 8,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#64748b',
  },
  locationText: {
    fontSize: 15,
    color: '#0f172a',
    fontWeight: '500',
  },
  driverSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  driverLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#00AFF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  driverDetails: {
    gap: 4,
  },
  driverNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  driverName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  tripsText: {
    fontSize: 13,
    color: '#64748b',
  },
  comfortBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  comfortText: {
    fontSize: 12,
    fontWeight: '600',
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  featureTag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
  },
  featureText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  moreFeatures: {
    fontSize: 12,
    color: '#00AFF5',
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  seatsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  seatsText: {
    fontSize: 13,
    color: '#64748b',
  },
  loadMoreButton: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 20,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#00AFF5',
    alignItems: 'center',
  },
  loadMoreText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#00AFF5',
  },
  publishTab: {
    flex: 1,
  },
  publishTabContent: {
    paddingBottom: Platform.OS === 'android' ? 110 : 100,
  },
  publishHero: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  publishGradient: {
    padding: 32,
    alignItems: 'center',
  },
  publishTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: 'white',
    marginTop: 16,
  },
  publishSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginTop: 8,
  },
  publishForm: {
    padding: 20,
  },
  publishCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 10,
  },
  formInput: {
    flex: 1,
    fontSize: 15,
    color: '#0f172a',
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  formRow: {
    flexDirection: 'row',
  },
  seatsSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  seatOption: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  seatNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionText: {
    fontSize: 15,
    color: '#0f172a',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#00AFF5',
    borderColor: '#00AFF5',
  },
  comfortSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  comfortOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
  },
  comfortLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  publishButton: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  publishButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
});

export default CovoiturageScreenBlaBlaCar;
