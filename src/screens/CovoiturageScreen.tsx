import React, { useState, useEffect } from 'react';import React from 'react';

import {import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

  View,import { Ionicons } from '@expo/vector-icons';

  Text,import { useTheme } from '../contexts/ThemeContext';

  StyleSheet,

  ScrollView,export default function PlaceholderScreen({ route, navigation }: any) {

  TouchableOpacity,  const { colors } = useTheme();

  RefreshControl,  const screenName = route?.name || 'Screen';

  ActivityIndicator,

} from 'react-native';  return (

import { Ionicons } from '@expo/vector-icons';    <View style={[styles.container, { backgroundColor: colors.background }]}>

import { useTheme } from '../contexts/ThemeContext';      <Ionicons name="construct" size={64} color={colors.primary} />

import { supabase } from '../lib/supabase';      <Text style={[styles.title, { color: colors.text }]}>

        {screenName}

interface DashboardStats {      </Text>

  active_rides: number;      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>

  upcoming_bookings: number;        En cours de développement

  completed_rides: number;      </Text>

  total_earnings: number;      <Text style={[styles.description, { color: colors.textSecondary }]}>

  pending_requests: number;        Cette fonctionnalité sera disponible prochainement

  unread_messages: number;      </Text>

  average_rating: number;      {navigation && (

  total_km: number;        <TouchableOpacity

}          style={[styles.button, { backgroundColor: colors.primary }]}

          onPress={() => navigation.goBack()}

interface Ride {        >

  id: string;          <Text style={styles.buttonText}>Retour</Text>

  departure_city: string;        </TouchableOpacity>

  arrival_city: string;      )}

  departure_date: string;    </View>

  departure_time: string;  );

  available_seats: number;}

  price_per_seat: number;

  status: string;const styles = StyleSheet.create({

}  container: {

    flex: 1,

export default function CovoiturageScreen({ navigation }: any) {    justifyContent: 'center',

  const { colors } = useTheme();    alignItems: 'center',

  const [loading, setLoading] = useState(true);    padding: 20,

  const [refreshing, setRefreshing] = useState(false);  },

  const [stats, setStats] = useState<DashboardStats>({  title: {

    active_rides: 0,    fontSize: 24,

    upcoming_bookings: 0,    fontWeight: 'bold',

    completed_rides: 0,    marginTop: 20,

    total_earnings: 0,    marginBottom: 8,

    pending_requests: 0,  },

    unread_messages: 0,  subtitle: {

    average_rating: 0,    fontSize: 18,

    total_km: 0,    marginBottom: 16,

  });  },

  const [myRides, setMyRides] = useState<Ride[]>([]);  description: {

    fontSize: 14,

  useEffect(() => {    textAlign: 'center',

    loadDashboardData();    marginBottom: 32,

  }, []);  },

  button: {

  const loadDashboardData = async () => {    paddingHorizontal: 24,

    try {    paddingVertical: 12,

      const { data: { user } } = await supabase.auth.getUser();    borderRadius: 12,

      if (!user) return;  },

  buttonText: {

      // Charger les stats    color: '#ffffff',

      const { data: rides } = await supabase    fontSize: 16,

        .from('carpooling_rides_pro')    fontWeight: '600',

        .select('id, status')  },

        .eq('driver_id', user.id);});



      const { data: bookings } = await supabase
        .from('ride_bookings_pro')
        .select('id, status')
        .eq('passenger_id', user.id);

      const { data: pendingRequests } = await supabase
        .from('ride_bookings_pro')
        .select('id')
        .in('ride_id', rides?.map((r: any) => r.id) || [])
        .eq('status', 'pending');

      const { data: profile } = await supabase
        .from('driver_profiles')
        .select('average_rating, total_km_driven')
        .eq('user_id', user.id)
        .single();

      setStats({
        active_rides: rides?.filter((r: any) => r.status === 'published').length || 0,
        upcoming_bookings: bookings?.filter((b: any) => b.status === 'confirmed').length || 0,
        completed_rides: rides?.filter((r: any) => r.status === 'completed').length || 0,
        total_earnings: 0,
        pending_requests: pendingRequests?.length || 0,
        unread_messages: 0,
        average_rating: (profile as any)?.average_rating || 0,
        total_km: (profile as any)?.total_km_driven || 0,
      });

      // Charger mes trajets récents
      const { data: recentRides } = await supabase
        .from('carpooling_rides_pro')
        .select('*')
        .eq('driver_id', user.id)
        .order('departure_date', { ascending: true })
        .limit(5);

      setMyRides(recentRides || []);
    } catch (error) {
      console.error('Erreur chargement dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const StatCard = ({ icon, label, value, color }: any) => (
    <View style={[styles.statCard, { backgroundColor: colors.card }]}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );

  const ActionButton = ({ icon, label, onPress, color, badge }: any) => (
    <TouchableOpacity
      style={[styles.actionButton, { backgroundColor: color }]}
      onPress={onPress}
    >
      <View style={styles.actionContent}>
        <Ionicons name={icon} size={24} color="#fff" />
        <Text style={styles.actionLabel}>{label}</Text>
        {badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Covoiturage</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Gérez vos trajets
        </Text>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <StatCard
          icon="car"
          label="Trajets actifs"
          value={stats.active_rides}
          color={colors.primary}
        />
        <StatCard
          icon="calendar"
          label="Réservations"
          value={stats.upcoming_bookings}
          color="#10b981"
        />
        <StatCard
          icon="checkmark-circle"
          label="Terminés"
          value={stats.completed_rides}
          color="#8b5cf6"
        />
        <StatCard
          icon="star"
          label="Note moy."
          value={stats.average_rating.toFixed(1)}
          color="#f59e0b"
        />
      </View>

      {/* Actions rapides */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Actions rapides
        </Text>
        <View style={styles.actionsGrid}>
          <ActionButton
            icon="add-circle"
            label="Publier"
            color={colors.primary}
            onPress={() => navigation.navigate('PublishRide')}
          />
          <ActionButton
            icon="time"
            label="Demandes"
            color="#f97316"
            badge={stats.pending_requests}
            onPress={() => navigation.navigate('BookingRequests')}
          />
          <ActionButton
            icon="search"
            label="Rechercher"
            color="#6b7280"
            onPress={() => navigation.navigate('SearchRides')}
          />
          <ActionButton
            icon="chatbubbles"
            label="Messages"
            color="#6b7280"
            badge={stats.unread_messages}
            onPress={() => navigation.navigate('Messages')}
          />
        </View>
      </View>

      {/* Mes trajets récents */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Mes trajets
          </Text>
          <TouchableOpacity>
            <Text style={[styles.seeAll, { color: colors.primary }]}>
              Voir tout
            </Text>
          </TouchableOpacity>
        </View>

        {myRides.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
            <Ionicons name="car-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Aucun trajet publié
            </Text>
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('PublishRide')}
            >
              <Text style={styles.emptyButtonText}>Publier un trajet</Text>
            </TouchableOpacity>
          </View>
        ) : (
          myRides.map((ride) => (
            <TouchableOpacity
              key={ride.id}
              style={[styles.rideCard, { backgroundColor: colors.card }]}
              onPress={() => navigation.navigate('RideDetails', { rideId: ride.id })}
            >
              <View style={styles.rideHeader}>
                <View style={styles.rideRoute}>
                  <Text style={[styles.rideCity, { color: colors.text }]}>
                    {ride.departure_city}
                  </Text>
                  <Ionicons name="arrow-forward" size={16} color={colors.textSecondary} />
                  <Text style={[styles.rideCity, { color: colors.text }]}>
                    {ride.arrival_city}
                  </Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: ride.status === 'published' ? '#10b98120' : '#6b728020' }
                ]}>
                  <Text style={[
                    styles.statusText,
                    { color: ride.status === 'published' ? '#10b981' : '#6b7280' }
                  ]}>
                    {ride.status === 'published' ? 'Publié' : 'Terminé'}
                  </Text>
                </View>
              </View>
              <View style={styles.rideDetails}>
                <View style={styles.rideDetail}>
                  <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                  <Text style={[styles.rideDetailText, { color: colors.textSecondary }]}>
                    {new Date(ride.departure_date).toLocaleDateString('fr-FR')} à {ride.departure_time}
                  </Text>
                </View>
                <View style={styles.rideDetail}>
                  <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
                  <Text style={[styles.rideDetailText, { color: colors.textSecondary }]}>
                    {ride.available_seats} place{ride.available_seats > 1 ? 's' : ''}
                  </Text>
                </View>
                <View style={styles.rideDetail}>
                  <Ionicons name="cash-outline" size={14} color={colors.textSecondary} />
                  <Text style={[styles.rideDetailText, { color: colors.textSecondary }]}>
                    {ride.price_per_seat}€/place
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  statCard: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    position: 'relative',
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyCard: {
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 20,
  },
  emptyButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  rideCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rideRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  rideCity: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  rideDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  rideDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rideDetailText: {
    fontSize: 12,
  },
});
