import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Share,
  Clipboard,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import LocationSharing from '../../components/LocationSharing';

export default function MissionViewScreen({ route, navigation }: any) {
  const { missionId } = route.params;
  const { colors } = useTheme();
  const { user } = useAuth();
  const [mission, setMission] = useState<any>(null);
  const [inspections, setInspections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMissionData();
  }, []);

  // Realtime sync pour cette mission
  useEffect(() => {
    if (!user || !missionId) return;

    console.log('🔄 Setup realtime pour mission:', missionId);

    const channel = supabase
      .channel(`mission_${missionId}_changes`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'missions', filter: `id=eq.${missionId}` },
        (payload) => {
          console.log('📡 Mission modifiée (realtime):', payload.eventType);
          console.log('🔄 Rechargement des données mission...');
          loadMissionData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vehicle_inspections', filter: `mission_id=eq.${missionId}` },
        (payload) => {
          console.log('🔍 Inspection modifiée (realtime):', payload.eventType, payload.new);
          console.log('🔄 Rechargement des inspections...');
          loadMissionData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inspection_photos_v2', filter: `mission_id=eq.${missionId}` },
        (payload) => {
          console.log('📸 Photo ajoutée (realtime):', payload.eventType);
          loadMissionData();
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime mission details status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime activé pour mission:', missionId);
        }
      });

    // Cleanup
    return () => {
      console.log('🔌 Unsubscribe realtime mission details');
      supabase.removeChannel(channel);
    };
  }, [user, missionId]);

  const loadMissionData = async () => {
    try {
      console.log('📥 Chargement données mission:', missionId);
      
      // Charger la mission
      const { data: missionData, error: missionError } = await supabase
        .from('missions')
        .select('*')
        .eq('id', missionId)
        .single();

      if (missionError) throw missionError;

      // Si la mission est terminée, rediriger vers le rapport
      if (missionData.status === 'completed' || missionData.status === 'cancelled') {
        Alert.alert(
          'Mission terminée',
          'Cette mission est terminée.',
          [
            {
              text: 'Retour',
              onPress: () => navigation.goBack(),
              style: 'cancel'
            }
          ]
        );
        return;
      }

      console.log('✅ Mission chargée:', missionData.reference);
      setMission(missionData);

      // Charger les inspections
      const { data: inspectionsData } = await supabase
        .from('vehicle_inspections')
        .select('*')
        .eq('mission_id', missionId)
        .order('created_at', { ascending: false });

      console.log('✅ Inspections chargées:', inspectionsData?.length || 0);
      if (inspectionsData) {
        inspectionsData.forEach(insp => {
          console.log(`  - ${insp.inspection_type}: ${insp.completed_at ? '✅ Terminée' : '⏳ En cours'}`);
        });
      }

      // Force le re-render en créant un nouveau array
      setInspections([...(inspectionsData || [])]);
    } catch (error: any) {
      console.error('❌ Erreur chargement mission:', error);
      Alert.alert('Erreur', error.message);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleStartInspection = async (type: 'departure' | 'arrival') => {
    try {
      // Vérifier si l'inspection existe déjà
      const { data: existingInspection } = await supabase
        .from('vehicle_inspections')
        .select('id, completed_at')
        .eq('mission_id', missionId)
        .eq('inspection_type', type)
        .maybeSingle();

      if (existingInspection) {
        if (existingInspection.completed_at) {
          Alert.alert(
            'Inspection terminée',
            `L'inspection ${type === 'departure' ? 'de départ' : 'd\'arrivée'} est déjà complétée et ne peut pas être modifiée.`,
            [{ text: 'OK' }]
          );
          return;
        }
      }

      // Mettre à jour le statut de la mission si nécessaire
      if (mission.status === 'pending' && type === 'departure') {
        await supabase
          .from('missions')
          .update({ status: 'in_progress' })
          .eq('id', missionId);
      }

      // Navigation vers l'inspection
      const screenName = type === 'departure' ? 'InspectionDeparture' : 'InspectionArrival';
      navigation.navigate(screenName, { missionId });
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    }
  };

  const handleCompleteMission = async () => {
    try {
      const { error } = await supabase
        .from('missions')
        .update({ status: 'completed' })
        .eq('id', missionId);

      if (error) throw error;

      Alert.alert(
        'Mission terminée',
        'La mission a été marquée comme terminée.'
      );
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    }
  };

  const getInspectionStatus = (type: 'departure' | 'arrival') => {
    const inspection = inspections.find(i => i.inspection_type === type);
    if (!inspection) return 'not_started';
    if (inspection.completed_at) return 'completed';
    return 'in_progress';
  };

  const canStartArrival = () => {
    const departureInspection = inspections.find(i => i.inspection_type === 'departure');
    const canStart = departureInspection && departureInspection.completed_at;
    
    console.log('🔍 canStartArrival check:', {
      inspectionsCount: inspections.length,
      hasDeparture: !!departureInspection,
      departureCompleted: !!departureInspection?.completed_at,
      canStart
    });
    
    return canStart;
  };

  const canCompleteMission = () => {
    const departureInspection = inspections.find(i => i.inspection_type === 'departure');
    const arrivalInspection = inspections.find(i => i.inspection_type === 'arrival');
    return (
      departureInspection?.completed_at &&
      arrivalInspection?.completed_at &&
      mission.status !== 'completed'
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'in_progress': return '#3b82f6';
      case 'completed': return '#10b981';
      case 'cancelled': return '#ef4444';
      case 'assigned': return '#8b5cf6';
      default: return colors.textSecondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'in_progress': return 'En cours';
      case 'completed': return 'Terminée';
      case 'cancelled': return 'Annulée';
      case 'assigned': return 'Assignée';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return 'time-outline';
      case 'in_progress': return 'play-circle-outline';
      case 'completed': return 'checkmark-circle';
      case 'cancelled': return 'close-circle-outline';
      case 'assigned': return 'people-outline';
      default: return 'help-circle-outline';
    }
  };

  const renderActionButton = (
    icon: string,
    label: string,
    onPress: () => void,
    bgColor: string,
    status?: string,
    disabled?: boolean
  ) => (
    <TouchableOpacity
      style={[
        styles.actionButton,
        { backgroundColor: disabled ? colors.border : bgColor },
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.actionContent}>
        <Ionicons name={icon as any} size={24} color="#ffffff" />
        <View style={styles.actionTextContainer}>
          <Text style={styles.actionLabel}>{label}</Text>
          {status && (
            <View style={styles.actionStatus}>
              <View style={[styles.statusDot, { 
                backgroundColor: status === 'completed' ? '#10b981' : 
                               status === 'in_progress' ? '#f59e0b' : '#6b7280' 
              }]} />
              <Text style={styles.statusLabel}>
                {status === 'completed' ? 'Terminée' : 
                 status === 'in_progress' ? 'En cours' : 'À faire'}
              </Text>
            </View>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#ffffff" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!mission) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>Mission introuvable</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* En-tête moderne */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Text style={[styles.reference, { color: colors.text }]}>{mission.reference}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(mission.status) + '20' }]}>
              <Ionicons name={getStatusIcon(mission.status) as any} size={14} color={getStatusColor(mission.status)} />
              <Text style={[styles.statusText, { color: getStatusColor(mission.status) }]}>
                {getStatusLabel(mission.status)}
              </Text>
            </View>
          </View>
          <View style={styles.priceContainer}>
            <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>Montant</Text>
            <Text style={[styles.price, { color: colors.primary }]}>
              {mission.price?.toFixed(2)} €
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        {/* Progression de la mission */}
        <View style={[styles.progressSection, { backgroundColor: colors.card }]}>
          <View style={styles.progressHeader}>
            <MaterialIcons name="assignment-turned-in" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Progression</Text>
          </View>
          
          <View style={styles.progressSteps}>
            <View style={styles.progressStep}>
              <View style={[
                styles.progressDot,
                { backgroundColor: getInspectionStatus('departure') === 'completed' ? '#10b981' : 
                                  getInspectionStatus('departure') === 'in_progress' ? '#f59e0b' : colors.border }
              ]}>
                {getInspectionStatus('departure') === 'completed' && (
                  <Ionicons name="checkmark" size={14} color="#ffffff" />
                )}
              </View>
              <View style={styles.progressInfo}>
                <Text style={[styles.progressLabel, { color: colors.text }]}>Inspection départ</Text>
                <Text style={[styles.progressSubtext, { color: colors.textSecondary }]}>
                  {getInspectionStatus('departure') === 'completed' ? 'Terminée' : 
                   getInspectionStatus('departure') === 'in_progress' ? 'En cours' : 'À faire'}
                </Text>
              </View>
            </View>

            <View style={[styles.progressLine, { 
              backgroundColor: getInspectionStatus('arrival') === 'completed' ? '#10b981' : colors.border 
            }]} />

            <View style={styles.progressStep}>
              <View style={[
                styles.progressDot,
                { backgroundColor: getInspectionStatus('arrival') === 'completed' ? '#10b981' : 
                                  getInspectionStatus('arrival') === 'in_progress' ? '#f59e0b' : colors.border }
              ]}>
                {getInspectionStatus('arrival') === 'completed' && (
                  <Ionicons name="checkmark" size={14} color="#ffffff" />
                )}
              </View>
              <View style={styles.progressInfo}>
                <Text style={[styles.progressLabel, { color: colors.text }]}>Inspection arrivée</Text>
                <Text style={[styles.progressSubtext, { color: colors.textSecondary }]}>
                  {getInspectionStatus('arrival') === 'completed' ? 'Terminée' : 
                   getInspectionStatus('arrival') === 'in_progress' ? 'En cours' : 
                   canStartArrival() ? 'Disponible' : 'Bloquée'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Partage de position GPS en temps réel */}
        {mission.status === 'in_progress' && (
          <LocationSharing missionId={missionId} />
        )}

        {/* Actions principales */}
        <View style={[styles.actionsSection, { backgroundColor: colors.card }]}>
          <View style={styles.actionsHeader}>
            <MaterialIcons name="play-circle-outline" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Actions</Text>
          </View>

          {renderActionButton(
            'exit-outline',
            'Inspection de départ',
            () => handleStartInspection('departure'),
            '#10b981',
            getInspectionStatus('departure'),
            getInspectionStatus('departure') === 'completed'
          )}

          {renderActionButton(
            'enter-outline',
            'Inspection d\'arrivée',
            () => handleStartInspection('arrival'),
            '#3b82f6',
            getInspectionStatus('arrival'),
            !canStartArrival() || getInspectionStatus('arrival') === 'completed'
          )}

          {canCompleteMission() && (
            <>
              <View style={[styles.separator, { backgroundColor: colors.border }]} />
              <TouchableOpacity
                style={[styles.completeButton, { backgroundColor: colors.success }]}
                onPress={handleCompleteMission}
              >
                <Ionicons name="checkmark-circle" size={24} color="#ffffff" />
                <Text style={styles.completeButtonText}>Terminer la mission</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Itinéraire */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="route" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Itinéraire</Text>
          </View>
          
          <View style={styles.locationCard}>
            <View style={styles.locationIcon}>
              <Ionicons name="location" size={20} color="#10b981" />
            </View>
            <View style={styles.locationInfo}>
              <Text style={[styles.locationLabel, { color: colors.textSecondary }]}>Enlèvement</Text>
              <Text style={[styles.locationText, { color: colors.text }]}>{mission.pickup_address}</Text>
              {mission.pickup_contact_name && (
                <View style={styles.contactRow}>
                  <Ionicons name="person-outline" size={14} color={colors.textSecondary} />
                  <Text style={[styles.contactText, { color: colors.textSecondary }]}>
                    {mission.pickup_contact_name}
                  </Text>
                </View>
              )}
              <View style={styles.contactRow}>
                <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                  {new Date(mission.pickup_date).toLocaleString('fr-FR', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.routeLine, { borderColor: colors.border }]} />

          <View style={styles.locationCard}>
            <View style={styles.locationIcon}>
              <Ionicons name="flag" size={20} color="#ef4444" />
            </View>
            <View style={styles.locationInfo}>
              <Text style={[styles.locationLabel, { color: colors.textSecondary }]}>Livraison</Text>
              <Text style={[styles.locationText, { color: colors.text }]}>{mission.delivery_address}</Text>
              {mission.delivery_contact_name && (
                <View style={styles.contactRow}>
                  <Ionicons name="person-outline" size={14} color={colors.textSecondary} />
                  <Text style={[styles.contactText, { color: colors.textSecondary }]}>
                    {mission.delivery_contact_name}
                  </Text>
                </View>
              )}
              <View style={styles.contactRow}>
                <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                  {new Date(mission.delivery_date).toLocaleString('fr-FR', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Code de partage */}
        {mission.share_code && mission.user_id === user?.id && (
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="share-social" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Code de partage</Text>
            </View>
            <View style={styles.shareCodeContainer}>
              <View style={[styles.shareCodeBox, { backgroundColor: colors.background }]}>
                <Text style={[styles.shareCodeText, { color: colors.primary }]}>
                  {mission.share_code}
                </Text>
              </View>
              <View style={styles.shareActions}>
                <TouchableOpacity
                  style={[styles.shareButton, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    Clipboard.setString(mission.share_code);
                    Alert.alert('✅ Copié', 'Code de partage copié dans le presse-papiers');
                  }}
                >
                  <Ionicons name="copy" size={18} color="#fff" />
                  <Text style={styles.shareButtonText}>Copier</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.shareButton, { backgroundColor: colors.primary }]}
                  onPress={async () => {
                    try {
                      await Share.share({
                        message: `Rejoignez ma mission de convoyage !\n\nCode: ${mission.share_code}\n\nOuvrez l'app FleetCheck et utilisez "Rejoindre mission" pour accepter.`,
                        title: 'Partager mission',
                      });
                    } catch (error: any) {
                      Alert.alert('Erreur', error.message);
                    }
                  }}
                >
                  <Ionicons name="share" size={18} color="#fff" />
                  <Text style={styles.shareButtonText}>Partager</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Véhicule */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="car-sport" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Véhicule</Text>
          </View>
          <View style={styles.vehicleCard}>
            <View style={[styles.vehicleIconContainer, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="car" size={28} color={colors.primary} />
            </View>
            <View style={styles.vehicleDetails}>
              <Text style={[styles.vehicleName, { color: colors.text }]}>
                {mission.vehicle_brand} {mission.vehicle_model}
              </Text>
              <View style={styles.plateContainer}>
                <View style={[styles.plateBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.plateText}>{mission.vehicle_plate}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Notes */}
        {mission.notes && (
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="sticky-note-2" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Notes</Text>
            </View>
            <Text style={[styles.notesText, { color: colors.text }]}>{mission.notes}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    padding: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    elevation: 6,
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  headerTop: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start',
  },
  headerLeft: { flex: 1, gap: 12 },
  reference: { fontSize: 26, fontWeight: '800', letterSpacing: 0.5 },
  statusBadge: { 
    paddingHorizontal: 14, 
    paddingVertical: 8, 
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    alignSelf: 'flex-start',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  statusText: { fontSize: 14, fontWeight: '700' },
  priceContainer: { alignItems: 'flex-end' },
  priceLabel: { fontSize: 13, marginBottom: 4, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  price: { fontSize: 30, fontWeight: '900', letterSpacing: -0.5 },
  
  content: { padding: 16, paddingBottom: 40 },
  
  // Progression
  progressSection: { 
    padding: 24, 
    borderRadius: 24, 
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(20, 184, 166, 0.1)',
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
  },
  progressSteps: { gap: 0 },
  progressStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  progressDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  progressInfo: { flex: 1 },
  progressLabel: { fontSize: 16, fontWeight: '700', marginBottom: 3 },
  progressSubtext: { fontSize: 13, fontWeight: '500' },
  progressLine: {
    width: 3,
    height: 28,
    marginLeft: 16,
    marginVertical: 6,
    borderRadius: 1.5,
  },

  // Actions
  actionsSection: { 
    padding: 24, 
    borderRadius: 24, 
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(20, 184, 166, 0.1)',
  },
  actionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderRadius: 16,
    marginBottom: 14,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  actionTextContainer: { flex: 1 },
  actionLabel: { 
    color: '#ffffff', 
    fontSize: 17, 
    fontWeight: '800',
    marginBottom: 5,
  },
  actionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
  },
  statusLabel: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.95,
  },
  separator: { height: 2, marginVertical: 12, borderRadius: 1, opacity: 0.3 },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    padding: 20,
    borderRadius: 16,
    marginTop: 10,
    elevation: 5,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  completeButtonText: { 
    color: '#ffffff', 
    fontSize: 18, 
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  // Sections communes
  section: { 
    padding: 24, 
    borderRadius: 24, 
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(20, 184, 166, 0.1)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800' },

  // Locations
  locationCard: {
    flexDirection: 'row',
    gap: 14,
  },
  locationIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  locationInfo: { flex: 1 },
  locationLabel: { fontSize: 13, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  locationText: { fontSize: 16, marginBottom: 8, lineHeight: 22, fontWeight: '600' },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 5,
  },
  contactText: { fontSize: 14, fontWeight: '500' },
  dateText: { fontSize: 14, fontWeight: '500' },
  routeLine: {
    borderLeftWidth: 3,
    borderStyle: 'dashed',
    marginLeft: 22,
    height: 24,
    marginVertical: 10,
    borderRadius: 1.5,
  },

  // Véhicule
  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  vehicleIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  vehicleDetails: { flex: 1 },
  vehicleName: { 
    fontSize: 18, 
    fontWeight: '700',
    marginBottom: 10,
  },
  plateContainer: {
    flexDirection: 'row',
  },
  plateBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  plateText: { 
    color: '#ffffff', 
    fontSize: 15, 
    fontWeight: '900',
    letterSpacing: 1.5,
  },

  // Code de partage
  shareCodeContainer: {
    gap: 12,
  },
  shareCodeBox: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#14b8a6',
    borderStyle: 'dashed',
  },
  shareCodeText: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 3,
  },
  shareActions: {
    flexDirection: 'row',
    gap: 12,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Notes
  notesText: { 
    fontSize: 15, 
    lineHeight: 24,
    fontWeight: '500',
  },
  
  errorText: { 
    fontSize: 17, 
    fontWeight: '600',
    textAlign: 'center', 
    marginTop: 40 
  },
});
