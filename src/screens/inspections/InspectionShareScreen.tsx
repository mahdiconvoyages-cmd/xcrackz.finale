import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface InspectionReport {
  id: string;
  mission_id: string;
  reference: string;
  vehicle_brand: string;
  vehicle_model: string;
  vehicle_plate: string;
  pickup_date: string;
  pickup_address: string;
  delivery_address: string;
  has_departure: boolean;
  has_arrival: boolean;
}

export default function InspectionShareScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [reports, setReports] = useState<InspectionReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingLink, setGeneratingLink] = useState<string | null>(null);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);

      // Récupérer les missions avec inspections complètes
      const { data: missions, error } = await supabase
        .from('missions')
        .select(`
          id,
          reference,
          vehicle_brand,
          vehicle_model,
          vehicle_plate,
          pickup_date,
          pickup_address,
          delivery_address
        `)
        .order('pickup_date', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Vérifier quelles missions ont des inspections
      const reportsWithInspections: InspectionReport[] = [];

      for (const mission of missions || []) {
        const { data: inspections } = await supabase
          .from('vehicle_inspections')
          .select('inspection_type')
          .eq('mission_id', mission.id);

        const hasDeparture = inspections?.some(i => i.inspection_type === 'departure');
        const hasArrival = inspections?.some(i => i.inspection_type === 'arrival');

        if (hasDeparture || hasArrival) {
          reportsWithInspections.push({
            ...mission,
            mission_id: mission.id,
            has_departure: hasDeparture || false,
            has_arrival: hasArrival || false,
          });
        }
      }

      setReports(reportsWithInspections);
    } catch (error: any) {
      console.error('Erreur chargement rapports:', error);
      Alert.alert('Erreur', 'Impossible de charger les rapports');
    } finally {
      setLoading(false);
    }
  };

  const generateShareLink = async (missionId: string) => {
    try {
      setGeneratingLink(missionId);

      // Récupérer userId
      let userId = user?.id;
      if (!userId) {
        const { data: session } = await supabase.auth.getSession();
        userId = session?.session?.user?.id;
      }
      if (!userId) {
        const stored = await AsyncStorage.getItem('userId');
        userId = stored || '';
      }

      // Si toujours pas d'utilisateur valide, arrêter proprement
      if (!userId) {
        Alert.alert('Connexion requise', "Veuillez vous reconnecter pour partager un rapport d'inspection.");
        return null;
      }

      // Appeler le RPC pour créer/obtenir le token de partage
      const { data, error } = await supabase.rpc('create_or_get_inspection_share', {
        p_mission_id: missionId,
        p_report_type: 'complete',
        p_user_id: userId,
      });

      if (error) {
        console.error('❌ Erreur RPC:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error('Aucun token retourné par le serveur');
      }

      // Récupérer le token depuis le premier élément du tableau
      const token = data[0].share_token;

      // Générer le lien vers la page WEB publique
      const shareLink = `https://www.xcrackz.com/rapport-inspection/${token}`;

      console.log('✅ Lien généré:', shareLink);
      return shareLink;
    } catch (error: any) {
      console.error('Erreur génération lien:', error);
      Alert.alert('Erreur', 'Impossible de générer le lien de partage');
      return null;
    } finally {
      setGeneratingLink(null);
    }
  };

  const handleOpenWeb = async (missionId: string) => {
    const link = await generateShareLink(missionId);
    if (link) {
      // Ouvrir directement dans le navigateur
      await Linking.openURL(link);
    }
  };

  const handleCopyLink = async (missionId: string) => {
    const link = await generateShareLink(missionId);
    if (link) {
      await Clipboard.setStringAsync(link);
      Alert.alert('✅ Copié !', 'Le lien a été copié dans le presse-papiers');
    }
  };

  const handleShareWhatsApp = async (missionId: string, missionRef: string) => {
    const link = await generateShareLink(missionId);
    if (link) {
      const message = `Rapport d'Inspection - Mission ${missionRef}\n${link}`;
      const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
      
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        Alert.alert('Erreur', 'WhatsApp n\'est pas installé');
      }
    }
  };

  const handleShareSMS = async (missionId: string, missionRef: string) => {
    const link = await generateShareLink(missionId);
    if (link) {
      const message = `Rapport d'Inspection - Mission ${missionRef}\n${link}`;
      const smsUrl = `sms:?body=${encodeURIComponent(message)}`;
      await Linking.openURL(smsUrl);
    }
  };

  const handleShareEmail = async (missionId: string, missionRef: string) => {
    const link = await generateShareLink(missionId);
    if (link) {
      const subject = `Rapport d'Inspection - Mission ${missionRef}`;
      const body = `Bonjour,\n\nVeuillez trouver le rapport d'inspection de la mission ${missionRef} :\n\n${link}\n\nCordialement`;
      const emailUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      await Linking.openURL(emailUrl);
    }
  };

  const handleShareNative = async (missionId: string, missionRef: string) => {
    const link = await generateShareLink(missionId);
    if (link) {
      try {
        await Share.share({
          message: `Rapport d'Inspection - Mission ${missionRef}\n${link}`,
          title: 'Partager le Rapport',
        });
      } catch (error: any) {
        console.error('Erreur partage:', error);
      }
    }
  };

  const renderReportItem = ({ item }: { item: InspectionReport }) => (
    <View style={styles.reportCard}>
      {/* Gradient Header */}
      <View style={styles.cardHeader}>
        <View style={styles.headerTop}>
          <View style={styles.missionBadge}>
            <Ionicons name="document-text" size={16} color="#fff" />
            <Text style={styles.missionRef}>#{item.reference}</Text>
          </View>
          <View style={styles.inspectionBadges}>
            {item.has_departure && (
              <View style={[styles.badge, styles.badgeDeparture]}>
                <Ionicons name="arrow-up-circle" size={12} color="#fff" />
                <Text style={styles.badgeText}>Départ</Text>
              </View>
            )}
            {item.has_arrival && (
              <View style={[styles.badge, styles.badgeArrival]}>
                <Ionicons name="arrow-down-circle" size={12} color="#fff" />
                <Text style={styles.badgeText}>Arrivée</Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.vehicleSection}>
          <Ionicons name="car-sport" size={20} color="#14b8a6" />
          <View style={styles.vehicleInfo}>
            <Text style={styles.vehicleName}>
              {item.vehicle_brand} {item.vehicle_model}
            </Text>
            <Text style={styles.vehiclePlate}>{item.vehicle_plate}</Text>
          </View>
        </View>

        <View style={styles.dateSection}>
          <Ionicons name="calendar-outline" size={14} color="#64748b" />
          <Text style={styles.dateText}>
            {new Date(item.pickup_date).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
          </Text>
        </View>
      </View>

      {/* Actions principales */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => handleOpenWeb(item.mission_id)}
          disabled={generatingLink === item.mission_id}
        >
          {generatingLink === item.mission_id ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="eye" size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>Voir le Rapport</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Actions de partage */}
        <Text style={styles.shareTitle}>Partager via :</Text>
        <View style={styles.shareGrid}>
          <TouchableOpacity
            style={[styles.shareButton, styles.shareButtonCopy]}
            onPress={() => handleCopyLink(item.mission_id)}
            disabled={generatingLink === item.mission_id}
          >
            <Ionicons name="copy" size={20} color="#3b82f6" />
            <Text style={[styles.shareButtonText, { color: '#3b82f6' }]}>Copier</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.shareButton, styles.shareButtonWhatsApp]}
            onPress={() => handleShareWhatsApp(item.mission_id, item.reference)}
            disabled={generatingLink === item.mission_id}
          >
            <Ionicons name="logo-whatsapp" size={20} color="#fff" />
            <Text style={[styles.shareButtonText, { color: '#fff' }]}>WhatsApp</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.shareButton, styles.shareButtonSMS]}
            onPress={() => handleShareSMS(item.mission_id, item.reference)}
            disabled={generatingLink === item.mission_id}
          >
            <Ionicons name="chatbubble" size={20} color="#fff" />
            <Text style={[styles.shareButtonText, { color: '#fff' }]}>SMS</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.shareButton, styles.shareButtonEmail]}
            onPress={() => handleShareEmail(item.mission_id, item.reference)}
            disabled={generatingLink === item.mission_id}
          >
            <Ionicons name="mail" size={20} color="#fff" />
            <Text style={[styles.shareButtonText, { color: '#fff' }]}>Email</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Chargement des rapports...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={reports}
        renderItem={renderReportItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Aucun rapport d'inspection disponible
            </Text>
          </View>
        }
        refreshing={loading}
        onRefresh={loadReports}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#64748b',
  },
  listContainer: {
    padding: 16,
  },
  reportCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  cardHeader: {
    padding: 16,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  missionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#14b8a6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  missionRef: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  inspectionBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  badgeDeparture: {
    backgroundColor: '#10b981',
  },
  badgeArrival: {
    backgroundColor: '#3b82f6',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  vehicleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  vehiclePlate: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  dateSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 12,
    color: '#64748b',
  },
  actionsContainer: {
    padding: 16,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#14b8a6',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  shareTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 10,
  },
  shareGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 6,
    flex: 1,
    minWidth: '45%',
  },
  shareButtonCopy: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  shareButtonWhatsApp: {
    backgroundColor: '#25D366',
  },
  shareButtonSMS: {
    backgroundColor: '#3b82f6',
  },
  shareButtonEmail: {
    backgroundColor: '#8b5cf6',
  },
  shareButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    marginTop: 15,
    fontSize: 16,
    textAlign: 'center',
    color: '#64748b',
  },
});
