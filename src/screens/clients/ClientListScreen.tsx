import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Routes } from '../../navigation/Routes';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { realtimeSync } from '../../services/realtimeSync';

interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company_name?: string;
  city?: string;
  is_company: boolean;
  is_favorite: boolean;
  created_at: string;
}

interface Props {
  embedded?: boolean;
}

export default function ClientListScreen({ embedded = false }: Props) {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user?.id)
        .order('is_favorite', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
      setFilteredClients(data || []);
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadClients();

      // S'abonner aux changements en temps réel
      if (user?.id) {
        realtimeSync.subscribeToClients(user.id, () => {
          console.log('[ClientListScreen] Realtime update detected, reloading clients');
          loadClients();
        });

        return () => {
          realtimeSync.unsubscribe(`clients_${user.id}`);
        };
      }
    }, [user?.id])
  );

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setFilteredClients(clients);
      return;
    }

    const query = text.toLowerCase();
    const filtered = clients.filter(client =>
      client.name.toLowerCase().includes(query) ||
      client.email.toLowerCase().includes(query) ||
      client.company_name?.toLowerCase().includes(query) ||
      client.phone?.includes(query) ||
      client.city?.toLowerCase().includes(query)
    );
    setFilteredClients(filtered);
  };

  const toggleFavorite = async (clientId: string, currentFavorite: boolean) => {
    try {
      const { error } = await supabase
        .from('clients')
        .update({ is_favorite: !currentFavorite })
        .eq('id', clientId);

      if (error) throw error;
      loadClients();
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    }
  };

  const deleteClient = async (clientId: string) => {
    Alert.alert(
      'Confirmer la suppression',
      'Êtes-vous sûr de vouloir supprimer ce client ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('clients')
                .delete()
                .eq('id', clientId);

              if (error) throw error;
              loadClients();
            } catch (error: any) {
              Alert.alert('Erreur', error.message);
            }
          },
        },
      ]
    );
  };

  const renderClient = ({ item }: { item: Client }) => (
    <TouchableOpacity
      style={styles.clientCard}
      onPress={() => navigation.navigate(Routes.ClientDetails as never, { clientId: item.id } as never)}
    >
      <View style={styles.clientHeader}>
        <View style={styles.avatarContainer}>
          <Ionicons
            name={item.is_company ? 'briefcase' : 'person'}
            size={24}
            color="#2563eb"
          />
          {item.is_favorite && (
            <View style={styles.favoriteBadge}>
              <Ionicons name="star" size={12} color="#fbbf24" />
            </View>
          )}
        </View>
        <View style={styles.clientInfo}>
          <Text style={styles.clientName}>{item.name}</Text>
          {item.company_name && (
            <Text style={styles.companyName}>{item.company_name}</Text>
          )}
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => toggleFavorite(item.id, item.is_favorite)}
            style={styles.actionButton}
          >
            <Ionicons
              name={item.is_favorite ? 'star' : 'star-outline'}
              size={22}
              color={item.is_favorite ? '#fbbf24' : '#6b7280'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => deleteClient(item.id)}
            style={styles.actionButton}
          >
            <Ionicons name="trash-outline" size={22} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.clientDetails}>
        {item.email && (
          <View style={styles.detailRow}>
            <Ionicons name="mail-outline" size={16} color="#6b7280" />
            <Text style={styles.detailText}>{item.email}</Text>
          </View>
        )}
        {item.phone && (
          <View style={styles.detailRow}>
            <Ionicons name="call-outline" size={16} color="#6b7280" />
            <Text style={styles.detailText}>{item.phone}</Text>
          </View>
        )}
        {item.city && (
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={16} color="#6b7280" />
            <Text style={styles.detailText}>{item.city}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const totalClients = clients.length;
  const favoriteClients = clients.filter(c => c.is_favorite).length;
  const companyClients = clients.filter(c => c.is_company).length;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {!embedded && (
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Clients</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate(Routes.ClientDetails as never, { clientId: 'new' } as never)}
          >
            <Ionicons name="add" size={28} color="#2563eb" />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#6b7280" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un client..."
          value={searchQuery}
          onChangeText={handleSearch}
        />
        {searchQuery !== '' && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Ionicons name="close-circle" size={20} color="#6b7280" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Ionicons name="people" size={24} color="#2563eb" />
          <Text style={styles.statNumber}>{totalClients}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="star" size={24} color="#fbbf24" />
          <Text style={styles.statNumber}>{favoriteClients}</Text>
          <Text style={styles.statLabel}>Favoris</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="briefcase" size={24} color="#8b5cf6" />
          <Text style={styles.statNumber}>{companyClients}</Text>
          <Text style={styles.statLabel}>Entreprises</Text>
        </View>
      </View>

      <FlatList
        data={filteredClients}
        renderItem={renderClient}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadClients(); }} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>Aucun client trouvé</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => navigation.navigate('ClientDetails' as never, { clientId: 'new' } as never)}
            >
              <Text style={styles.addButtonText}>Ajouter un client</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  headerTitle: { fontSize: 20, fontWeight: '600', color: '#1f2937' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginVertical: 12, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16 },
  statsContainer: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 12, gap: 12 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 8, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
  statNumber: { fontSize: 24, fontWeight: '700', color: '#1f2937', marginTop: 8 },
  statLabel: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  listContent: { padding: 16, paddingTop: 0 },
  clientCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  clientHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatarContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginRight: 12, position: 'relative' },
  favoriteBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#fff', borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fbbf24' },
  clientInfo: { flex: 1 },
  clientName: { fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 2 },
  companyName: { fontSize: 14, color: '#6b7280' },
  actions: { flexDirection: 'row', gap: 8 },
  actionButton: { padding: 8 },
  clientDetails: { gap: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 14, color: '#4b5563', flex: 1 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: '#9ca3af', marginTop: 16, marginBottom: 24 },
  addButton: { backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
