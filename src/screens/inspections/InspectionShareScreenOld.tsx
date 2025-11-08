import React, { useState, useEffect, useRef } from 'react';
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
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const { width } = Dimensions.get('window');

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
  photos_count?: number;
  last_inspection_date?: string;
}

interface Stats {
  total: number;
  thisWeek: number;
  thisMonth: number;
}

export default function InspectionShareScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [reports, setReports] = useState<InspectionReport[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, thisWeek: 0, thisMonth: 0 });
  const [loading, setLoading] = useState(true);
  const [generatingLink, setGeneratingLink] = useState<string | null>(null);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    loadReports();
    
    // Animation d'entrée
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
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
        .limit(100);

      if (error) throw error;

      // Vérifier quelles missions ont des inspections
      const reportsWithInspections: InspectionReport[] = [];
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      
      let weekCount = 0;
      let monthCount = 0;

      for (const mission of missions || []) {
        const { data: inspections } = await supabase
          .from('vehicle_inspections')
          .select('id, inspection_type, created_at')
          .eq('mission_id', mission.id);

        const hasDeparture = inspections?.some(i => i.inspection_type === 'departure');
        const hasArrival = inspections?.some(i => i.inspection_type === 'arrival');
        const lastInspection = inspections?.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];

        if (hasDeparture || hasArrival) {
          reportsWithInspections.push({
            ...mission,
            mission_id: mission.id,
            has_departure: hasDeparture || false,
            has_arrival: hasArrival || false,
            photos_count: inspections?.length || 0,
            last_inspection_date: lastInspection?.created_at,
          });
          
          if (lastInspection && new Date(lastInspection.created_at) >= oneWeekAgo) {
            weekCount++;
          }
          if (lastInspection && new Date(lastInspection.created_at) >= oneMonthAgo) {
            monthCount++;
          }
        }
      }

      setReports(reportsWithInspections);
      setStats({
        total: reportsWithInspections.length,
        thisWeek: weekCount,
        thisMonth: monthCount,
      });
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

  const renderReportItem = ({ item, index }: { item: InspectionReport; index: number }) => {
    const cardAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.timing(cardAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }).start();
    }, []);

    return (
      <Animated.View
        style={[
          {
            opacity: cardAnim,
            transform: [
              {
                translateY: cardAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={[styles.reportCard, { backgroundColor: colors.surface }]}>
          {/* En-tête avec gradient */}
          <LinearGradient
            colors={['#6366f1', '#4f46e5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.cardHeader}
          >
            <View style={styles.headerContent}>
              <Text style={styles.missionNumber}>Mission #{item.reference}</Text>
              <Text style={styles.dateText}>
                {format(new Date(item.last_inspection_date || item.pickup_date), 'dd MMM yyyy', { locale: fr })}
              </Text>
            </View>
            <View style={styles.inspectionBadges}>
              {item.has_departure && (
                <View style={styles.badge}>
                  <Ionicons name="exit-outline" size={12} color="#fff" />
                  <Text style={styles.badgeText}>Départ</Text>
                </View>
              )}
              {item.has_arrival && (
                <View style={[styles.badge, styles.badgeArrival]}>
                  <Ionicons name="enter-outline" size={12} color="#fff" />
                  <Text style={styles.badgeText}>Arrivée</Text>
                </View>
              )}
            </View>
          </LinearGradient>

          {/* Contenu */}
          <View style={styles.cardBody}>
            <View style={styles.vehicleRow}>
              <Ionicons name="car-sport" size={18} color="#6366f1" />
              <Text style={[styles.vehicleInfo, { color: colors.text }]}>
                {item.vehicle_brand} {item.vehicle_model}
              </Text>
            </View>
            
            <View style={styles.plateRow}>
              <View style={styles.plateBadge}>
                <Text style={styles.plateText}>{item.vehicle_plate}</Text>
              </View>
              {item.photos_count > 0 && (
                <View style={styles.photoBadge}>
                  <Ionicons name="images" size={14} color="#10b981" />
                  <Text style={styles.photoCount}>{item.photos_count} photos</Text>
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
