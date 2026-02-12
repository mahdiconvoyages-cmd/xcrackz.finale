import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import JoinMissionByCode from '../../components/JoinMissionByCode';
import HeaderGradient from '../../components/ui/HeaderGradient';
import CardGradient from '../../components/ui/CardGradient';
import ChipPro from '../../components/ui/ChipPro';
import SearchBarPro from '../../components/ui/SearchBarPro';
import EmptyStatePro from '../../components/ui/EmptyStatePro';

interface Mission {
  id: string;
  reference: string;
  pickup_address: string;
  delivery_address: string;
  pickup_date: string;
  delivery_date: string;
  status: 'pending' | 'in_progress' | 'completed' | string;
  vehicle_brand: string;
  vehicle_model: string;
  vehicle_plate: string;
  price: number;
  created_at: string;
  user_id: string;
  assigned_user_id?: string;
  archived?: boolean;
}

type TabType = 'created' | 'received';
type StatusFilter = 'all' | 'pending' | 'in_progress' | 'completed';
type TimeFilter = 'all' | 'today' | 'week' | 'month';
type SortBy = 'date_desc' | 'date_asc' | 'price_desc' | 'price_asc';

export default function MissionsScreenPro({ navigation }: any) {
  const { colors } = useTheme();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>('created');
  const [created, setCreated] = useState<Mission[]>([]);
  const [received, setReceived] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // UX premium states
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [time, setTime] = useState<TimeFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('date_desc');
  const [showJoinModal, setShowJoinModal] = useState(false);

  useEffect(() => {
    loadMissions();
  }, []);

  const loadMissions = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data: createdData, error: createdError } = await supabase
        .from('missions')
        .select('*')
        .eq('user_id', user.id)
        .or('archived.is.null,archived.eq.false')
        .order('created_at', { ascending: false });
      if (createdError) throw createdError;

      const { data: receivedData, error: receivedError } = await supabase
        .from('missions')
        .select('*')
        .eq('assigned_user_id', user.id)
        .or('archived.is.null,archived.eq.false')
        .order('created_at', { ascending: false });
      if (receivedError) throw receivedError;

      setCreated(createdData || []);
      setReceived(receivedData || []);
    } catch (e) {
      console.error('Erreur chargement missions', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMissions();
  };

  const dataset = activeTab === 'created' ? created : received;

  const filtered = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay); startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let arr = dataset;

    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter(m =>
        m.reference?.toLowerCase().includes(q)
        || m.vehicle_brand?.toLowerCase().includes(q)
        || m.vehicle_model?.toLowerCase().includes(q)
        || m.vehicle_plate?.toLowerCase().includes(q)
        || m.pickup_address?.toLowerCase().includes(q)
        || m.delivery_address?.toLowerCase().includes(q)
      );
    }

    if (status !== 'all') {
      arr = arr.filter(m => m.status === status);
    }

    if (time !== 'all') {
      arr = arr.filter(m => {
        const d = new Date(m.pickup_date || m.created_at);
        if (time === 'today') return d >= startOfDay;
        if (time === 'week') return d >= startOfWeek;
        if (time === 'month') return d >= startOfMonth;
        return true;
      });
    }

    const sorter: Record<SortBy, (a: Mission, b: Mission) => number> = {
      date_desc: (a, b) => +new Date(b.pickup_date || b.created_at) - +new Date(a.pickup_date || a.created_at),
      date_asc: (a, b) => +new Date(a.pickup_date || a.created_at) - +new Date(b.pickup_date || b.created_at),
      price_desc: (a, b) => (b.price || 0) - (a.price || 0),
      price_asc: (a, b) => (a.price || 0) - (b.price || 0),
    };

    return [...arr].sort(sorter[sortBy]);
  }, [dataset, search, status, time, sortBy]);

  const StatusChip = ({ value, label }: { value: StatusFilter; label: string }) => (
    <ChipPro label={label} active={status === value} onPress={() => setStatus(value)} />
  );

  const TimeChip = ({ value, label }: { value: TimeFilter; label: string }) => (
    <ChipPro label={label} active={time === value} onPress={() => setTime(value)} />
  );

  const SortChip = ({ value, label, icon }: { value: SortBy; label: string; icon: keyof typeof Ionicons.glyphMap }) => (
    <ChipPro label={label} active={sortBy === value} onPress={() => setSortBy(value)} />
  );

  const getStatusLabel = (s: string) => s === 'pending' ? 'En attente' : s === 'in_progress' ? 'En cours' : s === 'completed' ? 'Terminée' : s;
  const getStatusColor = (s: string) => s === 'pending' ? '#FFA500' : s === 'in_progress' ? '#2196F3' : s === 'completed' ? '#4CAF50' : colors.textSecondary;

  const renderCard = ({ item: m }: { item: Mission }) => (
    <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate('MissionView', { missionId: m.id })}>
      <CardGradient style={{ marginHorizontal: 16, marginVertical: 8 }}>
        <View style={styles.cardRowTop}>
          <View style={styles.leftRef}>
            <Ionicons name="car" size={18} color="#22d3ee" />
            <Text style={[styles.refText, { color: '#e2e8f0' }]}>{m.reference}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: getStatusColor(m.status) + '20' }]}>
            <Text style={[styles.badgeText, { color: getStatusColor(m.status) }]}>{getStatusLabel(m.status)}</Text>
          </View>
        </View>

        <Text style={[styles.vehicle, { color: '#f8fafc' }]} numberOfLines={1}>
          {m.vehicle_brand} {m.vehicle_model}
        </Text>
        <View style={styles.metaRow}>
          <View style={[styles.platePill, { borderColor: '#334155' }]}> 
            <MaterialIcons name="confirmation-number" size={14} color="#94a3b8" />
            <Text style={[styles.plateText, { color: '#94a3b8' }]}>{m.vehicle_plate}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={[styles.price, { color: '#22d3ee' }]}>{(m.price ?? 0).toFixed(2)} €</Text>
          </View>
        </View>

        <View style={styles.addresses}>
          <View style={styles.addressRow}>
            <Ionicons name="location" size={16} color="#10b981" />
            <Text style={[styles.address, { color: '#94a3b8' }]} numberOfLines={1}>{m.pickup_address}</Text>
          </View>
          <View style={styles.addressRow}>
            <Ionicons name="flag" size={16} color="#ef4444" />
            <Text style={[styles.address, { color: '#94a3b8' }]} numberOfLines={1}>{m.delivery_address}</Text>
          </View>
        </View>

        <View style={styles.footerRow}>
          <Text style={[styles.date, { color: '#94a3b8' }]}>
            {new Date(m.pickup_date).toLocaleDateString('fr-FR')}
          </Text>
          <View style={styles.quickActions}>
            {activeTab === 'received' && (
              <TouchableOpacity style={[styles.iconBtn, { borderColor: '#334155' }]} onPress={() => setShowJoinModal(true)}>
                <Ionicons name="enter" size={18} color="#94a3b8" />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.iconBtn, { borderColor: '#334155' }]} onPress={() => navigation.navigate('MissionTracking', { missionId: m.id })}>
              <Ionicons name="navigate" size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        </View>
      </CardGradient>
    </TouchableOpacity>
  );

  const Header = () => (
    <View>
      <HeaderGradient title="Mes missions" />
      {/* Build/version marker to confirm latest APK */}
      <View style={{ paddingHorizontal: 16, paddingTop: 6, backgroundColor: '#0a0a1a' }}>
        <Text style={{ color: '#64748b', fontSize: 12 }}>
          PRO v2 • build {new Date().toLocaleDateString('fr-FR')} {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, backgroundColor: '#0a0a1a', borderBottomWidth: 1, borderBottomColor: '#1f2937', paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
          {activeTab === 'received' && (
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#22d3ee' }]} onPress={() => setShowJoinModal(true)}>
              <Ionicons name="enter" size={18} color="#0a0a1a" />
              <Text style={[styles.primaryBtnText, { color: '#0a0a1a' }]}>Rejoindre</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#22d3ee' }]} onPress={() => navigation.navigate('MissionCreate')}>
            <Ionicons name="add" size={18} color="#0a0a1a" />
            <Text style={[styles.primaryBtnText, { color: '#0a0a1a' }]}>Créer</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity onPress={() => setActiveTab('created')} style={[styles.tab, activeTab === 'created' && styles.tabActive]}> 
            <Ionicons name="briefcase" size={18} color={activeTab === 'created' ? '#22d3ee' : '#94a3b8'} />
            <Text style={[styles.tabText, { color: activeTab === 'created' ? '#22d3ee' : '#94a3b8' }]}>Créées</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('received')} style={[styles.tab, activeTab === 'received' && styles.tabActive]}> 
            <Ionicons name="download" size={18} color={activeTab === 'received' ? '#22d3ee' : '#94a3b8'} />
            <Text style={[styles.tabText, { color: activeTab === 'received' ? '#22d3ee' : '#94a3b8' }]}>Reçues</Text>
          </TouchableOpacity>
        </View>

        {/* Search & filters */}
        <View style={styles.searchRow}>
          <SearchBarPro value={search} onChangeText={setSearch} placeholder="Recherche: réf, véhicule, plaque, adresse..." />
        </View>

        <View style={styles.filtersRow}>
          <StatusChip value="all" label="Tous" />
          <StatusChip value="pending" label="En attente" />
          <StatusChip value="in_progress" label="En cours" />
          <StatusChip value="completed" label="Terminées" />
        </View>

        <View style={styles.filtersRow}>
          <TimeChip value="all" label="Toutes dates" />
          <TimeChip value="today" label="Aujourd'hui" />
          <TimeChip value="week" label="Cette semaine" />
          <TimeChip value="month" label="Ce mois" />
        </View>

        <View style={styles.filtersRow}>
          <SortChip value="date_desc" label="Plus récentes" icon="time" />
          <SortChip value="date_asc" label="Plus anciennes" icon="time" />
          <SortChip value="price_desc" label="Prix ⬆" icon="cash" />
          <SortChip value="price_asc" label="Prix ⬇" icon="cash" />
        </View>
      </View>
    </View>
  );

  const Empty = () => (
    <View>
      <EmptyStatePro
        icon={activeTab === 'created' ? 'add-circle-outline' : 'mail-open-outline'}
        title={activeTab === 'created' ? 'Aucune mission créée' : 'Aucune mission reçue'}
        subtitle={activeTab === 'created' ? 'Créez votre première mission' : 'Les missions partagées avec vous apparaîtront ici'}
      />
      <View style={{ alignItems: 'center' }}>
        {activeTab === 'received' ? (
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#22d3ee' }]} onPress={() => setShowJoinModal(true)}>
            <Ionicons name="enter" size={18} color="#0a0a1a" />
            <Text style={[styles.primaryBtnText, { color: '#0a0a1a' }]}>Rejoindre une mission</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#22d3ee' }]} onPress={() => navigation.navigate('MissionCreate')}>
            <Ionicons name="add" size={18} color="#0a0a1a" />
            <Text style={[styles.primaryBtnText, { color: '#0a0a1a' }]}>Créer une mission</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const Skeleton = () => (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonLineLarge} />
      <View style={styles.skeletonLine} />
      <View style={styles.skeletonLine} />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: '#0a0a1a' }]}> 
      <FlatList
        data={loading ? Array.from({ length: 6 }, (_, i) => ({ id: `sk-${i}` })) as any : filtered}
        keyExtractor={(item: any) => item.id}
        renderItem={loading ? () => <Skeleton /> : renderCard}
        ListHeaderComponent={<Header />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={!loading ? <Empty /> : null}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
      />

      <JoinMissionByCode
        visible={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onSuccess={() => {
          setShowJoinModal(false);
          loadMissions();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingBottom: 24 },
  header: { paddingVertical: 12, borderBottomWidth: 1, paddingHorizontal: 16 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  title: { fontSize: 22, fontWeight: '800' },
  headerButtons: { flexDirection: 'row', gap: 8 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  primaryBtnText: { fontWeight: '800' },
  tabs: { flexDirection: 'row', gap: 10, marginTop: 12, marginBottom: 8 },
  tab: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, backgroundColor: '#0b1222', borderWidth: 1, borderColor: '#334155' },
  tabActive: { backgroundColor: '#14b8a620', borderColor: '#14b8a6' },
  tabText: { fontWeight: '700' },
  searchRow: { marginTop: 8 },
  filtersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  card: { borderRadius: 14, padding: 16, marginHorizontal: 16, marginVertical: 8, borderWidth: 1 },
  cardRowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  leftRef: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  refText: { fontSize: 16, fontWeight: '800' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  vehicle: { marginTop: 6, fontSize: 16, fontWeight: '800' },
  metaRow: { marginTop: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  platePill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#0b1222' },
  plateText: { fontSize: 12 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  price: { fontSize: 18, fontWeight: '800' },
  addresses: { gap: 8, marginTop: 10 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  address: { flex: 1, fontSize: 14 },
  date: { fontSize: 12 },
  footerRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  quickActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 1, backgroundColor: '#0b1222' },
  skeletonCard: { height: 110, borderRadius: 14, marginHorizontal: 16, marginVertical: 8, overflow: 'hidden', padding: 16, backgroundColor: '#0b1222', borderWidth: 1, borderColor: '#334155' },
  skeletonLine: { height: 10, backgroundColor: '#1f2937', borderRadius: 4, marginTop: 8 },
  skeletonLineLarge: { height: 16, width: '60%', backgroundColor: '#1f2937', borderRadius: 4 },
});
