/**
 * 🚀 Tracking List Screen - Liste des missions avec suivi GPS
 * 
 * Affiche toutes les missions en cours de suivi GPS
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Mission {
  id: string;
  reference: string;
  pickup_address: string;
  delivery_address: string;
  status: string;
  vehicle_type: string;
  public_tracking_link: string | null;
  tracking_started_at: string | null;
  created_at: string;
}

export default function TrackingListScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { user } = useAuth();

  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadMissions();
  }, []);

  const loadMissions = async () => {
    try {
      console.log('[TrackingList] Loading missions for user:', user?.id);
      
      // Charger les missions avec tracking actif
      // Où le user est soit créateur (user_id) soit assigné (assigned_to_user_id)
      const { data, error } = await supabase
        .from('missions')
        .select('*')
        .or(`user_id.eq.${user?.id},assigned_to_user_id.eq.${user?.id}`)
        .in('status', ['in_progress', 'en_cours', 'departure_done', 'pending'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[TrackingList] Supabase error:', error);
        throw error;
      }

      console.log('[TrackingList] Loaded missions:', data?.length || 0);
      setMissions(data || []);
    } catch (error: any) {
      console.error('[TrackingList] Error loading missions:', error);
      Alert.alert('Erreur', 'Impossible de charger les missions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMissions();
  };

  const handleMissionPress = (missionId: string) => {
    (navigation as any).navigate('TrackingMap', { missionId });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in_progress':
      case 'en_cours':
        return { color: colors.primary, label: 'En cours', icon: 'navigate' };
      case 'departure_done':
        return { color: colors.success, label: 'Départ effectué', icon: 'checkmark-circle' };
      default:
        return { color: colors.textSecondary, label: status, icon: 'radio-button-on' };
    }
  };

  const renderMissionItem = ({ item }: { item: Mission }) => {
    const statusBadge = getStatusBadge(item.status);
    const trackingActive = !!item.tracking_started_at || item.status === 'in_progress' || item.status === 'en_cours';

    return (
      <TouchableOpacity
        style={[styles.missionCard, { backgroundColor: colors.card }]}
        onPress={() => handleMissionPress(item.id)}
        activeOpacity={0.7}
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Ionicons name="car" size={20} color={colors.primary} />
            <Text style={[styles.reference, { color: colors.text }]}>
              {item.reference}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: statusBadge.color + '20' }]}>
            <Ionicons name={statusBadge.icon as any} size={14} color={statusBadge.color} />
            <Text style={[styles.badgeText, { color: statusBadge.color }]}>
              {statusBadge.label}
            </Text>
          </View>
        </View>

        {/* Route */}
        <View style={styles.route}>
          <View style={styles.routePoint}>
            <View style={[styles.dot, { backgroundColor: colors.success }]} />
            <Text style={[styles.address, { color: colors.text }]} numberOfLines={1}>
              {item.pickup_address}
            </Text>
          </View>
          <View style={styles.routeLine} />
          <View style={styles.routePoint}>
            <View style={[styles.dot, { backgroundColor: colors.error }]} />
            <Text style={[styles.address, { color: colors.text }]} numberOfLines={1}>
              {item.delivery_address}
            </Text>
          </View>
        </View>

        {/* Tracking Status */}
        {trackingActive && (
          <View style={[styles.trackingStatus, { backgroundColor: colors.success + '15' }]}>
            <View style={styles.pulseContainer}>
              <View style={[styles.pulseDot, { backgroundColor: colors.success }]} />
              <View style={[styles.pulse, { backgroundColor: colors.success }]} />
            </View>
            <Text style={[styles.trackingText, { color: colors.success }]}>
              📡 Suivi GPS actif
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.vehicleType}>
            <Feather name="truck" size={14} color={colors.textSecondary} />
            <Text style={[styles.vehicleText, { color: colors.textSecondary }]}>
              {item.vehicle_type || 'VL'}
            </Text>
          </View>
          <TouchableOpacity style={styles.viewButton}>
            <Text style={[styles.viewButtonText, { color: colors.primary }]}>
              Voir le suivi
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Chargement des missions...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      {missions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="navigate-outline" size={64} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Aucune mission en cours
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Les missions avec suivi GPS actif apparaîtront ici
          </Text>
        </View>
      ) : (
        <FlatList
          data={missions}
          renderItem={renderMissionItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    gap: 16,
  },
  missionCard: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 2,
    borderColor: 'rgba(20, 184, 166, 0.1)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reference: {
    fontSize: 17,
    fontWeight: '800',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  route: {
    gap: 10,
    marginBottom: 14,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  routeLine: {
    width: 3,
    height: 20,
    backgroundColor: 'rgba(20, 184, 166, 0.2)',
    marginLeft: 3.5,
    borderRadius: 1.5,
  },
  address: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 21,
  },
  trackingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  pulseContainer: {
    width: 14,
    height: 14,
    position: 'relative',
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    position: 'absolute',
    top: 2,
    left: 2,
  },
  pulse: {
    width: 14,
    height: 14,
    borderRadius: 7,
    opacity: 0.4,
  },
  trackingText: {
    fontSize: 14,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vehicleType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(20, 184, 166, 0.08)',
    borderRadius: 10,
  },
  vehicleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    borderRadius: 12,
  },
  viewButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
  },
});
