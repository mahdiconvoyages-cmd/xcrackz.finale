import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, Image, Alert, Modal, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { DrawerActions } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import * as Linking from 'expo-linking';
import { WebView } from 'react-native-webview';
import { SyncIndicator } from '../components/SyncIndicator';
// Removed Print as we no longer support promoting raw files to official here

interface OfficialDoc {
  id: string;
  document_title: string;
  document_type: string | null;
  document_url: string;
  pages_count: number | null;
  created_at?: string | null;
  inspection?: {
    id: string;
    inspection_type: string;
    created_at: string;
    missions?: {
      reference: string | null;
      vehicle_plate: string | null;
    } | null;
  } | null;
}

interface RawFileItem {
  path: string; // full path in storage
  name: string;
  size?: number;
  updatedAt?: string;
  context?: string; // missionId or 'standalone'
}

export default function ScansLibraryScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'officiels' | 'brouillons'>('officiels');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [officialDocs, setOfficialDocs] = useState<OfficialDoc[]>([]);
  const [rawFiles, setRawFiles] = useState<RawFileItem[]>([]);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerIsPdf, setViewerIsPdf] = useState(false);

  const canGoBack = navigation?.canGoBack?.() ?? false;

  const handleNavigateBack = () => {
    if (canGoBack) {
      navigation.goBack();
    } else {
      navigation.dispatch(DrawerActions.openDrawer());
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      await Promise.all([loadOfficialDocs(), loadRawFiles()]);
    } catch (e) {
      console.error('Erreur chargement numérisations:', e);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadAll();
    } finally {
      setRefreshing(false);
    }
  };

  const loadOfficialDocs = async () => {
    if (!user) return;
    try {
      // Documents liés à des inspections de cet utilisateur
      // Join vers vehicle_inspections pour récupérer contexte
      const { data, error } = await supabase
        .from('inspection_documents')
        .select(`
          id,
          document_title,
          document_type,
          document_url,
          pages_count,
          created_at,
          vehicle_inspections!inner (
            id,
            inspection_type,
            created_at,
            missions (
              reference,
              vehicle_plate
            )
          )
        `)
        .eq('vehicle_inspections.inspector_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      const mapped: OfficialDoc[] = (data || []).map((row: any) => ({
        id: row.id,
        document_title: row.document_title,
        document_type: row.document_type,
        document_url: row.document_url,
        pages_count: row.pages_count,
        created_at: row.created_at,
        inspection: row.vehicle_inspections ? {
          id: row.vehicle_inspections.id,
          inspection_type: row.vehicle_inspections.inspection_type,
          created_at: row.vehicle_inspections.created_at,
          missions: row.vehicle_inspections.missions || null,
        } : null,
      }));

      setOfficialDocs(mapped);
    } catch (e) {
      console.error('Erreur loadOfficialDocs:', e);
      Alert.alert('Erreur', "Impossible de charger les documents officiels");
    }
  };

  const listStorage = async (prefix: string) => {
    const { data, error } = await supabase.storage
      .from('inspection-documents')
      .list(prefix, { limit: 100, sortBy: { column: 'updated_at', order: 'desc' } });
    if (error) throw error;
    return data || [];
  };

  const loadRawFiles = async () => {
    if (!user) return;
    try {
      const base = `raw/${user.id}`;
      const level1 = await listStorage(base);

      const collected: RawFileItem[] = [];
      for (const item of level1) {
        if (item.name.endsWith('.jpg') || item.name.endsWith('.jpeg') || item.name.endsWith('.png') || item.name.endsWith('.pdf')) {
          // direct files at root (unlikely)
          collected.push({ path: `${base}/${item.name}`, name: item.name });
          continue;
        }
        // Folders: missionId or 'standalone'
        const folder = item.name;
        const level2 = await listStorage(`${base}/${folder}`);
        for (const f of level2) {
          if (f.name.endsWith('.jpg') || f.name.endsWith('.jpeg') || f.name.endsWith('.png') || f.name.endsWith('.pdf')) {
            collected.push({ path: `${base}/${folder}/${f.name}`, name: f.name, context: folder });
          }
        }
      }

      // Sort recent first by name timestamp if present
      collected.sort((a, b) => (a.name < b.name ? 1 : -1));
      setRawFiles(collected);
    } catch (e) {
      console.error('Erreur loadRawFiles:', e);
      // Non bloquant; ne pas alerter si le bucket est vide
    }
  };

  const openUrl = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert('Erreur', "Impossible d'ouvrir le document");
    }
  };

  const openViewer = (url: string) => {
    const isPdf = url.toLowerCase().includes('.pdf');
    setViewerIsPdf(isPdf);
    setViewerUrl(url);
    setViewerVisible(true);
  };

  const deleteRaw = async (item: RawFileItem) => {
    Alert.alert('Supprimer', `Supprimer ${item.name} ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive', onPress: async () => {
          try {
            const { error } = await supabase.storage
              .from('inspection-documents')
              .remove([item.path]);
            if (error) throw error;
            setRawFiles((prev) => prev.filter((f) => f.path !== item.path));
          } catch (e) {
            console.error('Erreur suppression:', e);
            Alert.alert('Erreur', 'Suppression impossible');
          }
        }
      }
    ]);
  };

  // Promotion de brouillon vers officiel supprimée sur demande

  const renderOfficialItem = ({ item }: { item: OfficialDoc }) => {
    const subtitle = item.inspection?.missions?.reference
      ? `${item.inspection.missions.reference} • ${item.inspection?.inspection_type === 'arrival' ? 'Arrivée' : 'Départ'}`
      : (item.inspection?.inspection_type || '').toUpperCase();

    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>        
        <View style={styles.cardIcon}>
          <MaterialCommunityIcons name="file-pdf-box" size={28} color="#ef4444" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>{item.document_title || 'Document'}</Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {subtitle}{item.pages_count ? ` • ${item.pages_count} page(s)` : ''}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => openViewer(item.document_url)}>
            <Ionicons name="eye" size={18} color="#0ea5e9" />
            <Text style={styles.secondaryBtnText}>Voir</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.openBtn} onPress={() => Share.share({ message: item.document_url })}>
            <Ionicons name="share-social" size={18} color="#fff" />
            <Text style={styles.openBtnText}>Partager</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderRawItem = ({ item }: { item: RawFileItem }) => {
    const { data } = supabase.storage.from('inspection-documents').getPublicUrl(item.path);
    const url = data.publicUrl;
    const isPdf = item.name.toLowerCase().endsWith('.pdf');
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>        
        <View style={styles.cardIcon}>
          {isPdf ? (
            <MaterialCommunityIcons name="file-pdf-box" size={28} color="#ef4444" />
          ) : (
            <MaterialCommunityIcons name="file-image" size={28} color="#3b82f6" />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>{item.context || 'brouillon'}</Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>{item.name}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => openViewer(url)}>
            <Ionicons name="eye" size={18} color="#0ea5e9" />
            <Text style={styles.secondaryBtnText}>Voir</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.openBtn} onPress={() => Share.share({ message: url })}>
            <Ionicons name="share-social" size={18} color="#fff" />
            <Text style={styles.openBtnText}>Partager</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteRaw(item)}>
            <Ionicons name="trash" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
  <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <LinearGradient colors={['#14b8a6', '#0d9488']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleNavigateBack}>
          <Ionicons name={canGoBack ? 'arrow-back' : 'menu'} size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Mes numérisations</Text>
          <Text style={styles.headerSubtitle}>Documents officiels et brouillons</Text>
        </View>
        <View style={styles.headerRight}>
          <SyncIndicator />
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity onPress={() => setActiveTab('officiels')} style={[styles.tabBtn, activeTab === 'officiels' && styles.tabActive]}>          
          <Text style={[styles.tabText, activeTab === 'officiels' && styles.tabTextActive]}>Officiels</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveTab('brouillons')} style={[styles.tabBtn, activeTab === 'brouillons' && styles.tabActive]}>          
          <Text style={[styles.tabText, activeTab === 'brouillons' && styles.tabTextActive]}>Brouillons</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loading}>          
          <ActivityIndicator size="large" color="#14b8a6" />
          <Text style={{ marginTop: 8, color: colors.textSecondary }}>Chargement…</Text>
        </View>
      ) : (
        activeTab === 'officiels' ? (
          <FlatList
            data={officialDocs}
            keyExtractor={(item) => item.id}
            renderItem={renderOfficialItem}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={(<Text style={[styles.emptyText, { color: colors.textSecondary }]}>Aucun document officiel pour le moment</Text>)}
          />
        ) : (
          <FlatList
            data={rawFiles}
            keyExtractor={(item) => item.path}
            renderItem={renderRawItem}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={(<Text style={[styles.emptyText, { color: colors.textSecondary }]}>Aucune numérisation brute trouvée</Text>)}
          />
        )
      )}
      {/* Viewer Modal */}
      <Modal visible={viewerVisible} animationType="slide" onRequestClose={() => setViewerVisible(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12 }}>
            <TouchableOpacity onPress={() => setViewerVisible(false)} style={{ padding: 8 }}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Aperçu</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={{ flex: 1 }}>
            {viewerUrl && (
              viewerIsPdf ? (
                <WebView source={{ uri: `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(viewerUrl)}` }} style={{ flex: 1 }} />
              ) : (
                <Image source={{ uri: viewerUrl }} style={{ flex: 1, resizeMode: 'contain' }} />
              )
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  headerSubtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  tabsRow: { flexDirection: 'row', gap: 8, padding: 12, paddingTop: 16 },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#14b8a655', alignItems: 'center' },
  tabActive: { backgroundColor: '#14b8a61A' },
  tabText: { color: '#64748b', fontWeight: '700' },
  tabTextActive: { color: '#0d9488' },
  listContent: { padding: 12, paddingBottom: 24 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
  cardIcon: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(20,184,166,0.1)' },
  cardTitle: { fontSize: 14, fontWeight: '700' },
  cardSubtitle: { fontSize: 12 },
  openBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#0ea5e9', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  openBtnText: { color: '#fff', fontWeight: '700' },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'transparent', paddingHorizontal: 8, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#0ea5e9' },
  secondaryBtnText: { color: '#0ea5e9', fontWeight: '700' },
  deleteBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#ef4444' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { textAlign: 'center', marginTop: 24 },
});
