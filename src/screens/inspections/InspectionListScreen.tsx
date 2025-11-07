import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Inspection {
  id: string;
  mission_id: string;
  inspection_type: 'departure' | 'arrival';
  status: string;
  created_at: string;
  missions: {
    reference: string;
    vehicle_make: string;
    vehicle_model: string;
    vehicle_plate: string;
  } | null;
}

export default function InspectionListScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadInspections();
  }, []);

  const loadInspections = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicle_inspections')
        .select(`
          id,
          mission_id,
          inspection_type,
          status,
          created_at,
          missions (
            reference,
            vehicle_brand,
            vehicle_model,
            vehicle_plate
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInspections(data as any || []);
    } catch (error) {
      console.error('Erreur chargement inspections:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadInspections();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return colors.success;
      case 'in_progress':
        return colors.warning;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Terminée';
      case 'in_progress':
        return 'En cours';
      default:
        return 'En attente';
    }
  };

  const renderInspection = ({ item }: { item: Inspection }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface }]}
      onPress={() => {
        if (item.inspection_type === 'departure') {
          navigation.navigate('InspectionDeparture', { missionId: item.mission_id });
        } else {
          navigation.navigate('InspectionArrival', { missionId: item.mission_id });
        }
      }}
    >
      <View style={styles.cardHeader}>
        <View style={styles.iconContainer}>
          <Ionicons
            name={item.inspection_type === 'departure' ? 'exit-outline' : 'enter-outline'}
            size={24}
            color={colors.primary}
          />
        </View>
        <View style={styles.cardInfo}>
          <Text style={[styles.reference, { color: colors.text }]}>
            {item.missions?.reference || 'N/A'}
          </Text>
          <Text style={[styles.vehicle, { color: colors.textSecondary }]}>
            {item.missions?.vehicle_make} {item.missions?.vehicle_model}
          </Text>
          <Text style={[styles.plate, { color: colors.textSecondary }]}>
            {item.missions?.vehicle_plate}
          </Text>
        </View>
        <View style={styles.cardRight}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) + '20' },
            ]}
          >
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusText(item.status)}
            </Text>
          </View>
          <Text style={[styles.type, { color: colors.textSecondary }]}>
            {item.inspection_type === 'departure' ? 'Départ' : 'Arrivée'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={inspections}
        renderItem={renderInspection}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="camera-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Aucune inspection
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  reference: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  vehicle: {
    fontSize: 14,
    marginBottom: 2,
  },
  plate: {
    fontSize: 12,
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  type: {
    fontSize: 12,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
});
