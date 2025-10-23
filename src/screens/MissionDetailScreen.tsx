import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  getMissionById,
  getMissionInspections,
  deleteMission,
  type MissionWithContacts,
  type Inspection,
} from '../services/missionService';
import { formatDateTime, formatRelativeDate } from '../utils/dateFormat';
import { generateAndShareMissionPDF } from '../services/missionPdfGeneratorMobile';
import {
  startMissionTracking,
  stopMissionTracking,
  isTrackingActive,
  getActiveMission,
} from '../services/missionTrackingService';

export default function MissionDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { missionId } = route.params as { missionId: string };

  const [mission, setMission] = useState<MissionWithContacts | null>(null);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'inspections'>('details');
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    loadData();
    checkTrackingStatus();
  }, [missionId]);

  const checkTrackingStatus = () => {
    const activeMission = getActiveMission();
    setIsTracking(activeMission?.id === missionId);
  };

  const loadData = async () => {
    try {
      const [missionData, inspectionsData] = await Promise.all([
        getMissionById(missionId),
        getMissionInspections(missionId),
      ]);

      setMission(missionData);
      setInspections(inspectionsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Supprimer la mission',
      'Êtes-vous sûr de vouloir supprimer cette mission ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteMission(missionId);
            if (success) {
              navigation.goBack();
            }
          },
        },
      ]
    );
  };

  const handleCall = (phone?: string) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const handleEmail = (email?: string) => {
    if (email) {
      Linking.openURL(`mailto:${email}`);
    }
  };

  const handleGeneratePDF = async () => {
    if (!mission) return;
    
    try {
      await generateAndShareMissionPDF(mission);
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Erreur', 'Impossible de générer le PDF');
    }
  };

  const handleStartTracking = async () => {
    if (!mission) return;

    Alert.alert(
      '🚗 Démarrer la Mission',
      'Le tracking GPS sera activé en arrière-plan. Vous recevrez une notification persistante.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Démarrer',
          onPress: async () => {
            const result = await startMissionTracking({
              id: mission.id,
              reference: mission.reference,
              pickup_address: mission.pickup_address,
              delivery_address: mission.delivery_address,
              status: mission.status,
            });

            if (result.success) {
              setIsTracking(true);
              Alert.alert('✅ Mission démarrée', 'Le tracking GPS est maintenant actif');
            } else {
              Alert.alert('❌ Erreur', result.error || 'Impossible de démarrer le tracking');
            }
          },
        },
      ]
    );
  };

  const handleStopTracking = async () => {
    Alert.alert(
      '⏹️ Arrêter le Tracking',
      'Êtes-vous sûr de vouloir arrêter le tracking GPS ?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui, arrêter',
          style: 'destructive',
          onPress: async () => {
            await stopMissionTracking();
            setIsTracking(false);
            Alert.alert('✅ Tracking arrêté');
          },
        },
      ]
    );
  };

  // 🆕 Gérer les changements de statut avec tracking automatique
  const handleStatusChange = async (newStatus: string) => {
    if (!mission) return;

    try {
      // Mettre à jour le statut dans la base de données
      const { error } = await supabase
        .from('missions')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', mission.id);

      if (error) throw error;

      // Démarrer le tracking automatiquement si le statut passe à "in_progress"
      if (newStatus === 'in_progress' && !isTracking) {
        const result = await startMissionTracking({
          id: mission.id,
          reference: mission.reference,
          pickup_address: mission.pickup_address,
          delivery_address: mission.delivery_address,
          status: newStatus,
        });

        if (result.success) {
          setIsTracking(true);
          Alert.alert('✅ Mission démarrée', 'Le tracking GPS a été activé automatiquement.');
        }
      }

      // Arrêter le tracking automatiquement si le statut passe à "completed"
      if (newStatus === 'completed' && isTracking) {
        await stopMissionTracking();
        setIsTracking(false);
        Alert.alert('✅ Mission terminée', 'Le tracking GPS a été arrêté automatiquement.');
      }

      // Recharger les données
      setMission({ ...mission, status: newStatus });
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour le statut');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return { bg: '#d1fae5', text: '#065f46' };
      case 'in_progress':
        return { bg: '#dbeafe', text: '#1e40af' };
      case 'pending':
        return { bg: '#fef3c7', text: '#92400e' };
      case 'cancelled':
        return { bg: '#fee2e2', text: '#991b1b' };
      default:
        return { bg: '#f1f5f9', text: '#475569' };
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Terminée';
      case 'in_progress':
        return 'En cours';
      case 'pending':
        return 'En attente';
      case 'cancelled':
        return 'Annulée';
      case 'assigned':
        return 'Assignée';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#14b8a6" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!mission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Mission introuvable</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const statusColors = getStatusColor(mission.status);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Détails</Text>
        <TouchableOpacity style={styles.headerButton} onPress={handleDelete}>
          <Feather name="trash-2" size={24} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'details' && styles.tabActive]}
          onPress={() => setActiveTab('details')}
        >
          <Text
            style={[styles.tabText, activeTab === 'details' && styles.tabTextActive]}
          >
            Détails
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'inspections' && styles.tabActive]}
          onPress={() => setActiveTab('inspections')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'inspections' && styles.tabTextActive,
            ]}
          >
            Inspections ({inspections.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'details' ? (
          <View>
            <View style={styles.statusCard}>
              <Text style={styles.reference}>{mission.reference}</Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: statusColors.bg },
                ]}
              >
                <Text style={[styles.statusText, { color: statusColors.text }]}>
                  {getStatusLabel(mission.status)}
                </Text>
              </View>
            </View>

            {mission.vehicle_image_url && (
              <Image
                source={{ uri: mission.vehicle_image_url }}
                style={styles.vehicleImage}
              />
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Véhicule</Text>
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Feather name="truck" size={20} color="#64748b" />
                  <Text style={styles.infoLabel}>Marque / Modèle</Text>
                </View>
                <Text style={styles.infoValue}>
                  {mission.vehicle_brand} {mission.vehicle_model}
                </Text>
              </View>

              {mission.vehicle_plate && (
                <View style={styles.infoCard}>
                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons
                      name="card-text"
                      size={20}
                      color="#64748b"
                    />
                    <Text style={styles.infoLabel}>Immatriculation</Text>
                  </View>
                  <Text style={styles.infoValue}>{mission.vehicle_plate}</Text>
                </View>
              )}

              {mission.vehicle_vin && (
                <View style={styles.infoCard}>
                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons
                      name="barcode"
                      size={20}
                      color="#64748b"
                    />
                    <Text style={styles.infoLabel}>VIN</Text>
                  </View>
                  <Text style={styles.infoValue}>{mission.vehicle_vin}</Text>
                </View>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Itinéraire</Text>
              <View style={styles.routeCard}>
                <View style={styles.routePoint}>
                  <View style={styles.routeDot} />
                  <View style={styles.routeInfo}>
                    <Text style={styles.routeLabel}>Départ</Text>
                    <Text style={styles.routeAddress}>
                      {mission.pickup_address}
                    </Text>
                    <View style={styles.dateTimeContainer}>
                      <View style={styles.dateBox}>
                        <Feather name="calendar" size={14} color="#14b8a6" />
                        <Text style={styles.routeDate}>
                          {formatRelativeDate(mission.pickup_date)}
                        </Text>
                      </View>
                      <View style={styles.timeBox}>
                        <Feather name="clock" size={14} color="#14b8a6" />
                        <Text style={styles.routeTime}>
                          {formatDateTime(mission.pickup_date).time}
                        </Text>
                      </View>
                    </View>
                    {(mission.pickup_contact || mission.pickup_contact_name || mission.pickup_contact_phone) && (
                      <View style={styles.contactInfo}>
                        <Text style={styles.contactName}>
                          👤 {mission.pickup_contact_name || mission.pickup_contact?.name || 'Contact'}
                        </Text>
                        {(mission.pickup_contact_phone || mission.pickup_contact?.phone) && (
                          <TouchableOpacity
                            style={styles.contactButton}
                            onPress={() =>
                              handleCall(mission.pickup_contact_phone || mission.pickup_contact?.phone)
                            }
                          >
                            <Feather name="phone" size={16} color="#14b8a6" />
                            <Text style={styles.contactButtonText}>
                              {mission.pickup_contact_phone || mission.pickup_contact?.phone}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.routeConnector} />

                <View style={styles.routePoint}>
                  <View style={[styles.routeDot, styles.routeDotEnd]} />
                  <View style={styles.routeInfo}>
                    <Text style={styles.routeLabel}>Arrivée</Text>
                    <Text style={styles.routeAddress}>
                      {mission.delivery_address}
                    </Text>
                    <View style={styles.dateTimeContainer}>
                      <View style={styles.dateBox}>
                        <Feather name="calendar" size={14} color="#14b8a6" />
                        <Text style={styles.routeDate}>
                          {formatRelativeDate(mission.delivery_date)}
                        </Text>
                      </View>
                      <View style={styles.timeBox}>
                        <Feather name="clock" size={14} color="#14b8a6" />
                        <Text style={styles.routeTime}>
                          {formatDateTime(mission.delivery_date).time}
                        </Text>
                      </View>
                    </View>
                    {(mission.delivery_contact || mission.delivery_contact_name || mission.delivery_contact_phone) && (
                      <View style={styles.contactInfo}>
                        <Text style={styles.contactName}>
                          👤 {mission.delivery_contact_name || mission.delivery_contact?.name || 'Contact'}
                        </Text>
                        {(mission.delivery_contact_phone || mission.delivery_contact?.phone) && (
                          <TouchableOpacity
                            style={styles.contactButton}
                            onPress={() =>
                              handleCall(mission.delivery_contact_phone || mission.delivery_contact?.phone)
                            }
                          >
                            <Feather name="phone" size={16} color="#14b8a6" />
                            <Text style={styles.contactButtonText}>
                              {mission.delivery_contact_phone || mission.delivery_contact?.phone}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </View>

            {mission.driver && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Chauffeur</Text>
                <View style={styles.driverCard}>
                  <View style={styles.driverInfo}>
                    <View style={styles.driverAvatar}>
                      <Feather name="user" size={24} color="#fff" />
                    </View>
                    <View style={styles.driverDetails}>
                      <Text style={styles.driverName}>{mission.driver.name}</Text>
                      {mission.driver.phone && (
                        <Text style={styles.driverPhone}>
                          {mission.driver.phone}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.driverActions}>
                    {mission.driver.phone && (
                      <TouchableOpacity
                        style={styles.driverActionButton}
                        onPress={() => handleCall(mission.driver?.phone)}
                      >
                        <Feather name="phone" size={20} color="#14b8a6" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Prix</Text>
              <View style={styles.priceCard}>
                <Text style={styles.priceValue}>{mission.price.toFixed(2)} €</Text>
                <Text style={styles.priceLabel}>Total HT</Text>
              </View>
            </View>

            {mission.notes && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Notes</Text>
                <View style={styles.notesCard}>
                  <Text style={styles.notesText}>{mission.notes}</Text>
                </View>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionButtonsContainer}>
              {/* Boutons de statut avec tracking automatique */}
              {mission.status === 'pending' && (
                <TouchableOpacity
                  style={styles.startMissionButton}
                  onPress={() => handleStatusChange('in_progress')}
                >
                  <Feather name="play-circle" size={20} color="#FFF" />
                  <Text style={styles.startMissionButtonText}>
                    🚗 Démarrer Mission
                  </Text>
                </TouchableOpacity>
              )}

              {mission.status === 'in_progress' && (
                <View style={styles.inProgressButtons}>
                  <TouchableOpacity
                    style={[styles.trackingButton, styles.trackingButtonActive]}
                    disabled
                  >
                    <Feather name="navigation" size={20} color="#FFF" />
                    <Text style={styles.trackingButtonText}>
                      📍 Tracking Actif
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.completeMissionButton}
                    onPress={() => handleStatusChange('completed')}
                  >
                    <Feather name="check-circle" size={20} color="#FFF" />
                    <Text style={styles.completeMissionButtonText}>
                      ✅ Valider Arrivée
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {mission.status === 'completed' && (
                <View style={styles.completedBadge}>
                  <Feather name="check-circle" size={20} color="#10b981" />
                  <Text style={styles.completedText}>Mission terminée ✅</Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.pdfButton}
                onPress={handleGeneratePDF}
              >
                <Feather name="download" size={20} color="#FFF" />
                <Text style={styles.pdfButtonText}>Télécharger PDF</Text>
              </TouchableOpacity>

              {mission.status === 'pending' && (
                <TouchableOpacity
                  style={styles.inspectionButton}
                  onPress={() => navigation.navigate('InspectionWizard', { missionId: mission.id })}
                >
                  <Feather name="clipboard" size={20} color="#FFF" />
                  <Text style={styles.inspectionButtonText}>Commencer Inspection</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : (
          <View>
            {inspections.length > 0 ? (
              inspections.map((inspection) => (
                <View key={inspection.id} style={styles.inspectionCard}>
                  <View style={styles.inspectionHeader}>
                    <View
                      style={[
                        styles.inspectionBadge,
                        {
                          backgroundColor:
                            inspection.type === 'departure'
                              ? '#dbeafe'
                              : '#d1fae5',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.inspectionType,
                          {
                            color:
                              inspection.type === 'departure'
                                ? '#1e40af'
                                : '#065f46',
                          },
                        ]}
                      >
                        {inspection.type === 'departure' ? 'Départ' : 'Arrivée'}
                      </Text>
                    </View>
                    <Text style={styles.inspectionDate}>
                      {new Date(inspection.inspected_at).toLocaleString('fr-FR')}
                    </Text>
                  </View>

                  <View style={styles.inspectionBody}>
                    <View style={styles.inspectionRow}>
                      <Text style={styles.inspectionLabel}>Kilométrage:</Text>
                      <Text style={styles.inspectionValue}>
                        {inspection.vehicle_mileage} km
                      </Text>
                    </View>
                    <View style={styles.inspectionRow}>
                      <Text style={styles.inspectionLabel}>Carburant:</Text>
                      <Text style={styles.inspectionValue}>
                        {inspection.fuel_level}
                      </Text>
                    </View>
                    <View style={styles.inspectionRow}>
                      <Text style={styles.inspectionLabel}>État extérieur:</Text>
                      <Text style={styles.inspectionValue}>
                        {inspection.exterior_condition}
                      </Text>
                    </View>
                    <View style={styles.inspectionRow}>
                      <Text style={styles.inspectionLabel}>État intérieur:</Text>
                      <Text style={styles.inspectionValue}>
                        {inspection.interior_condition}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyInspections}>
                <MaterialCommunityIcons
                  name="clipboard-check-outline"
                  size={60}
                  color="#cbd5e1"
                />
                <Text style={styles.emptyInspectionsText}>
                  Aucune inspection pour le moment
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#64748b',
  },
  backButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#14b8a6',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#14b8a6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#14b8a6',
  },
  content: {
    flex: 1,
  },
  statusCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  reference: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  vehicleImage: {
    width: '100%',
    height: 240,
    resizeMode: 'cover',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  routeCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
  },
  routePoint: {
    flexDirection: 'row',
    gap: 16,
  },
  routeDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#14b8a6',
    marginTop: 4,
  },
  routeDotEnd: {
    backgroundColor: '#f59e0b',
  },
  routeInfo: {
    flex: 1,
  },
  routeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  routeAddress: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  routeDate: {
    fontSize: 14,
    color: '#64748b',
  },
  routeConnector: {
    width: 2,
    height: 32,
    backgroundColor: '#cbd5e1',
    marginLeft: 7,
    marginVertical: 8,
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  contactName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#f0fdfa',
  },
  contactButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#14b8a6',
  },
  driverCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#14b8a6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverDetails: {
    gap: 4,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  driverPhone: {
    fontSize: 14,
    color: '#64748b',
  },
  driverActions: {
    flexDirection: 'row',
    gap: 8,
  },
  driverActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0fdfa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  priceCard: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  priceValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#14b8a6',
  },
  priceLabel: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  notesCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
  },
  notesText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  inspectionCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  inspectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8fafc',
  },
  inspectionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  inspectionType: {
    fontSize: 12,
    fontWeight: '600',
  },
  inspectionDate: {
    fontSize: 12,
    color: '#64748b',
  },
  inspectionBody: {
    padding: 16,
  },
  inspectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  inspectionLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  inspectionValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  emptyInspections: {
    padding: 60,
    alignItems: 'center',
  },
  emptyInspectionsText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  actionButtonsContainer: {
    padding: 20,
    gap: 12,
  },
  startMissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#10b981',
    padding: 18,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  startMissionButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 'bold',
  },
  inProgressButtons: {
    gap: 12,
  },
  trackingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#F59E0B',
    padding: 18,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  trackingButtonActive: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
  },
  trackingButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 'bold',
  },
  completeMissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#10b981',
    padding: 18,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  completeMissionButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 'bold',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#d1fae5',
    padding: 18,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#10b981',
  },
  completedText: {
    color: '#10b981',
    fontSize: 17,
    fontWeight: 'bold',
  },
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  pdfButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  inspectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#22C55E',
    padding: 16,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  inspectionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dateTimeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  dateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    flex: 1,
  },
  timeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  routeTime: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
