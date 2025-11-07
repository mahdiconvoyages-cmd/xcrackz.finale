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
    <View style={[styles.reportCard, { backgroundColor: colors.surface }]}>
      {/* En-tête */}
      <View style={styles.reportHeader}>
        <View style={styles.reportInfo}>
          <Text style={[styles.missionNumber, { color: colors.text }]}>
            Mission #{item.reference}
          </Text>
          <Text style={[styles.vehicleInfo, { color: colors.textSecondary }]}>
            {item.vehicle_brand} {item.vehicle_model} - {item.vehicle_plate}
          </Text>
          <Text style={[styles.dateInfo, { color: colors.textSecondary }]}>
            {new Date(item.pickup_date).toLocaleDateString('fr-FR')}
          </Text>
        </View>
        <View style={styles.inspectionBadges}>
          {item.has_departure && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Départ</Text>
            </View>
          )}
          {item.has_arrival && (
            <View style={[styles.badge, styles.badgeArrival]}>
              <Text style={styles.badgeText}>Arrivée</Text>
            </View>
          )}
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.actionPrimary]}
          onPress={() => handleOpenWeb(item.mission_id)}
          disabled={generatingLink === item.mission_id}
        >
          {generatingLink === item.mission_id ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Ionicons name="globe-outline" size={20} color="#FFF" />
              <Text style={styles.actionPrimaryText}>Ouvrir le Rapport</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.shareActions}>
          <TouchableOpacity
            style={[styles.shareButton, { backgroundColor: colors.background }]}
            onPress={() => handleCopyLink(item.mission_id)}
            disabled={generatingLink === item.mission_id}
          >
            <Ionicons name="copy-outline" size={22} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.shareButton, { backgroundColor: '#25D366' }]}
            onPress={() => handleShareWhatsApp(item.mission_id, item.reference)}
            disabled={generatingLink === item.mission_id}
          >
            <Ionicons name="logo-whatsapp" size={22} color="#FFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.shareButton, { backgroundColor: colors.background }]}
            onPress={() => handleShareSMS(item.mission_id, item.reference)}
            disabled={generatingLink === item.mission_id}
          >
            <Ionicons name="chatbubble-outline" size={22} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.shareButton, { backgroundColor: colors.background }]}
            onPress={() => handleShareEmail(item.mission_id, item.reference)}
            disabled={generatingLink === item.mission_id}
          >
            <Ionicons name="mail-outline" size={22} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.shareButton, { backgroundColor: colors.primary }]}
            onPress={() => handleShareNative(item.mission_id, item.reference)}
            disabled={generatingLink === item.mission_id}
          >
            <Ionicons name="share-social-outline" size={22} color="#FFF" />
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
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  listContainer: {
    padding: 15,
  },
  reportCard: {
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  reportHeader: {
    marginBottom: 15,
  },
  reportInfo: {
    marginBottom: 10,
  },
  missionNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  vehicleInfo: {
    fontSize: 14,
    marginBottom: 3,
  },
  dateInfo: {
    fontSize: 12,
  },
  inspectionBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeArrival: {
    backgroundColor: '#3b82f6',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  actionsContainer: {
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  actionPrimary: {
    backgroundColor: '#3b82f6',
  },
  actionPrimaryText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  shareActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  shareButton: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    marginTop: 15,
    fontSize: 16,
    textAlign: 'center',
  },
});
