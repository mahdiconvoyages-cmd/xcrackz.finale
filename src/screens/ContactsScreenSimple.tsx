import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';

interface Profile {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  company?: string;
  user_type?: string;
}

export default function ContactsScreenSimple() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadUserId();
  }, []);

  useEffect(() => {
    if (userId) {
      loadProfiles();
    }
  }, [userId]);

  const loadUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
    }
  };

  const loadProfiles = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      // 🔥 SOLUTION RADICALE: Charger tous les profiles sauf soi-même
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', userId)
        .order('email', { ascending: true });

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error loading profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCall = (phone?: string) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`);
  };

  const handleEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  const filteredProfiles = profiles.filter(p =>
    p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.company?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getUserTypeLabel = (type?: string) => {
    switch (type) {
      case 'convoyeur': return '🚗 Convoyeur';
      case 'agent': return '👤 Agent';
      case 'admin': return '⚡ Admin';
      default: return '👤 Utilisateur';
    }
  };

  const getUserTypeColor = (type?: string) => {
    switch (type) {
      case 'convoyeur': return '#3B82F6';
      case 'agent': return '#22C55E';
      case 'admin': return '#F59E0B';
      default: return '#64748B';
    }
  };

  const renderProfileCard = ({ item }: { item: Profile }) => (
    <View style={styles.profileCard}>
      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: getUserTypeColor(item.user_type) }]}>
        <Text style={styles.avatarText}>
          {(item.full_name || item.email).charAt(0).toUpperCase()}
        </Text>
      </View>

      {/* Info */}
      <View style={styles.profileInfo}>
        <Text style={styles.profileName}>{item.full_name || item.email.split('@')[0]}</Text>
        <Text style={styles.profileEmail}>{item.email}</Text>
        {item.company && <Text style={styles.profileCompany}>🏢 {item.company}</Text>}
        <View style={[styles.typeBadge, { backgroundColor: getUserTypeColor(item.user_type) + '20' }]}>
          <Text style={[styles.typeBadgeText, { color: getUserTypeColor(item.user_type) }]}>
            {getUserTypeLabel(item.user_type)}
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.profileActions}>
        {item.phone && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#22C55E' }]}
            onPress={() => handleCall(item.phone)}
          >
            <Feather name="phone" size={18} color="#FFF" />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#3B82F6' }]}
          onPress={() => handleEmail(item.email)}
        >
          <MaterialIcons name="email" size={18} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.header}>
        <Text style={styles.headerTitle}>📇 Annuaire d'Équipe</Text>
        <Text style={styles.headerSubtitle}>Tous les utilisateurs de la plateforme</Text>
      </LinearGradient>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Feather name="search" size={20} color="#64748B" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#94A3B8"
        />
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{profiles.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{profiles.filter(p => p.user_type === 'convoyeur').length}</Text>
          <Text style={styles.statLabel}>Convoyeurs</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{profiles.filter(p => p.user_type === 'agent').length}</Text>
          <Text style={styles.statLabel}>Agents</Text>
        </View>
      </View>

      {/* List */}
      <FlatList
        data={filteredProfiles}
        renderItem={renderProfileCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="users" size={64} color="#CBD5E1" />
            <Text style={styles.emptyText}>Aucun utilisateur trouvé</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    padding: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#DBEAFE',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3B82F6',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  profileCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 4,
  },
  profileCompany: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 8,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  profileActions: {
    flexDirection: 'column',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#94A3B8',
    marginTop: 16,
  },
});
