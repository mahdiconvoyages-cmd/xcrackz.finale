// Convoyages - écran principal (version moderne premium)

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import JoinMissionByCode from '../../components/JoinMissionByCode';
import { Routes } from '../../navigation/Routes';
import { analytics } from '../../services/analytics';
import { crashReporting } from '../../services/crashReporting';
import { createAccessibilityProps } from '../../hooks/useAccessibility';

interface Mission {
  id: string;
  reference: string;
  pickup_address: string;
  delivery_address: string;
  pickup_date: string;
  delivery_date: string;
  status: string;
  vehicle_brand: string;
  vehicle_model: string;
  vehicle_plate: string;
  price: number;
  created_at: string;
  user_id: string;
  assigned_user_id?: string;
  archived?: boolean;
  share_code?: string;
  creator?: {
    id: string;
    full_name: string;
    email: string;
  };
  assigned?: {
    id: string;
    full_name: string;
    email: string;
  };
}

type TabType = 'active' | 'completed' | 'received';

export default function MissionsScreenNew({ navigation }: any) {
  const { colors } = useTheme();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  useEffect(() => {
    analytics.logScreenView('MissionsScreen');
    loadMissions();
  }, []);

  const loadMissions = async () => {
    if (!user?.id) {
      console.error('❌ Pas d\'utilisateur connecté');
      return;
    }

    setLoading(true);
    const startTime = Date.now();
    
    try {
      console.log('📥 Chargement convoyages pour user:', user.id);
      crashReporting.addBreadcrumb('Loading missions', 'data', { userId: user.id });

      // Charger TOUTES les missions (créées + reçues)
      const { data: allMissions, error } = await supabase
        .from('missions')
        .select(`
          *,
          creator:users!missions_user_id_fkey(id, full_name, email),
          assigned:users!missions_assigned_user_id_fkey(id, full_name, email)
        `)
        .or(`user_id.eq.${user.id},assigned_user_id.eq.${user.id}`)
        .or('archived.is.null,archived.eq.false')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erreur chargement missions:', error);
        crashReporting.reportError(error, {
          screen: 'MissionsScreen',
          action: 'load_missions',
        });
        throw error;
      }

      console.log('✅ Missions chargées:', allMissions?.length || 0);
      setMissions(allMissions || []);

      // Log performance
      const duration = Date.now() - startTime;
      analytics.logPerformance('MissionsScreen', duration);

    } catch (error: any) {
      console.error('❌ Erreur chargement:', error);
      Alert.alert('Erreur', 'Impossible de charger les convoyages');
      crashReporting.reportError(error, {
        screen: 'MissionsScreen',
        action: 'load_missions',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMissions();
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'in_progress': return 'En cours';
      case 'completed': return 'Terminée';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FFA500';
      case 'in_progress': return '#2196F3';
      case 'completed': return '#4CAF50';
      default: return colors.textSecondary;
    }
  };

  const getStatusIcon = (status: string): any => {
    switch (status) {
      case 'pending': return 'time-outline';
      case 'in_progress': return 'play-circle-outline';
      case 'completed': return 'checkmark-circle-outline';
      default: return 'ellipse-outline';
    }
  };

  // Filtrer les missions selon l'onglet actif
  const getFilteredMissions = () => {
    if (activeTab === 'active') {
      // Actifs: missions en attente OU en cours (créées par moi + reçues)
      return missions.filter(m => 
        (m.status === 'pending' || m.status === 'in_progress')
      );
    } else if (activeTab === 'completed') {
      // Terminées: missions avec status='completed' (créées par moi + reçues)
      return missions.filter(m => m.status === 'completed');
    } else {
      // Reçues: missions où assigned_user_id = mon id (toutes)
      return missions.filter(m => m.assigned_user_id === user?.id);
    }
  };

  const renderMissionCard = ({ item: mission }: { item: Mission }) => {
    const isCreator = mission.user_id === user?.id;
    const isCompleted = mission.status === 'completed';
    const isReceived = mission.assigned_user_id === user?.id;
    
    return (
      <TouchableOpacity
        style={[
          styles.card, 
          { backgroundColor: colors.surface },
          isCompleted && styles.completedCard
        ]}
        onPress={() => {
          analytics.logEvent('mission_card_clicked', {
            mission_id: mission.id,
            status: mission.status,
          });
          navigation.navigate(Routes.MissionView as any, { missionId: mission.id });
        }}
        activeOpacity={0.7}
        {...createAccessibilityProps(
          `Convoyage ${mission.reference}`,
          `${mission.vehicle_brand} ${mission.vehicle_model}, statut: ${getStatusLabel(mission.status)}`,
          'button'
        )}
      >
        {/* Gradient accent top */}
        <LinearGradient
          colors={isCompleted ? ['#4CAF5015', 'transparent'] : [colors.primary + '15', 'transparent']}
          style={styles.cardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />

        {/* Badge terminé */}
        {isCompleted && (
          <View style={styles.completedOverlay}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            <Text style={styles.completedOverlayText}>Terminée</Text>
          </View>
        )}

        {/* Badge "Assigné par" pour onglet Reçues */}
        {activeTab === 'received' && mission.creator && (
          <View style={[styles.assignedByBadge, { backgroundColor: colors.primary }]}>
            <Ionicons name="person" size={12} color="#fff" />
            <Text style={styles.assignedByText}>
              Assigné par {mission.creator.full_name}
            </Text>
          </View>
        )}

        {/* En-tête */}
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconContainer, { backgroundColor: isCompleted ? '#4CAF5015' : colors.primary + '15' }]}>
              <Ionicons name="car-sport" size={22} color={isCompleted ? '#4CAF50' : colors.primary} />
            </View>
            <Text style={[styles.reference, { color: colors.text }]}>
              {mission.reference}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(mission.status) + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(mission.status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(mission.status) }]}>
              {getStatusLabel(mission.status)}
            </Text>
          </View>
        </View>

        {/* Véhicule */}
        <View style={styles.vehicleSection}>
          <Text style={[styles.vehicle, { color: colors.text }]}>
            {mission.vehicle_brand} {mission.vehicle_model}
          </Text>
          <View style={[styles.plateBadge, { backgroundColor: colors.background }]}>
            <Ionicons name="car" size={12} color={colors.textSecondary} />
            <Text style={[styles.plate, { color: colors.textSecondary }]}>
              {mission.vehicle_plate}
            </Text>
          </View>
        </View>

        {/* Séparateur */}
        <View style={[styles.separator, { backgroundColor: colors.border }]} />

        {/* Itinéraire */}
        <View style={styles.routeSection}>
          <View style={styles.routeLine}>
            <View style={styles.routePoints}>
              <View style={[styles.pointStart, { backgroundColor: '#4CAF50' }]} />
              <View style={[styles.routeDash, { backgroundColor: colors.border }]} />
              <View style={[styles.pointEnd, { backgroundColor: '#f44336' }]} />
            </View>
            <View style={styles.routeAddresses}>
              <View style={styles.addressItem}>
                <Text style={[styles.addressLabel, { color: colors.textSecondary }]}>Départ</Text>
                <Text style={[styles.addressText, { color: colors.text }]} numberOfLines={1}>
                  {mission.pickup_address}
                </Text>
              </View>
              <View style={styles.addressItem}>
                <Text style={[styles.addressLabel, { color: colors.textSecondary }]}>Arrivée</Text>
                <Text style={[styles.addressText, { color: colors.text }]} numberOfLines={1}>
                  {mission.delivery_address}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Footer avec boutons d'action */}
        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            <LinearGradient
              colors={[colors.primary, colors.primary + 'CC']}
              style={styles.priceGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="cash" size={16} color="#fff" />
              <Text style={styles.priceText}>
                {mission.price?.toFixed(2) || '0.00'} €
              </Text>
            </LinearGradient>
          </View>
          <View style={styles.footerRight}>
            <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.date, { color: colors.textSecondary }]}>
              {new Date(mission.pickup_date).toLocaleDateString('fr-FR', { 
                day: 'numeric', 
                month: 'short' 
              })}
            </Text>
          </View>
        </View>

        {/* Boutons d'action selon le statut */}
        {mission.status === 'pending' && (
          <View style={styles.actionButtonContainer}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate(Routes.InspectionDeparture as any, { missionId: mission.id })}
            >
              <Ionicons name="play-circle" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Démarrer inspection départ</Text>
            </TouchableOpacity>
          </View>
        )}

        {mission.status === 'in_progress' && (
          <View style={styles.actionButtonContainer}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
              onPress={() => navigation.navigate(Routes.InspectionArrival as any, { missionId: mission.id })}
            >
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Démarrer inspection arrivée</Text>
            </TouchableOpacity>
          </View>
        )}

        {mission.status === 'completed' && mission.public_link && (
          <View style={styles.actionButtonContainer}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#2196F3' }]}
              onPress={() => {
                // Ouvrir le rapport public
                if (mission.public_link) {
                  Alert.alert(
                    'Rapport Public',
                    'Ouvrir le rapport public de ce convoyage ?',
                    [
                      { text: 'Annuler', style: 'cancel' },
                      { 
                        text: 'Ouvrir', 
                        onPress: () => {
                          // TODO: Implémenter l'ouverture du lien public
                          console.log('Ouvrir lien public:', mission.public_link);
                        }
                      }
                    ]
                  );
                }
              }}
            >
              <Ionicons name="document-text" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Voir le rapport public</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Badge mission reçue avec nom du créateur */}
        {isReceived && !isCreator && mission.creator && (
          <View style={[styles.assignedBadge, { backgroundColor: colors.primary }]}>
            <Ionicons name="arrow-down" size={12} color="#fff" />
            <Text style={styles.assignedText}>Assigné par {mission.creator.full_name}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    if (activeTab === 'active') {
      return (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconContainer, { backgroundColor: colors.primary + '10' }]}>
            <Ionicons name="rocket-outline" size={48} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Aucun convoyage actif
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Créez votre premier convoyage pour commencer
          </Text>
          <TouchableOpacity
            style={styles.emptyActionButton}
            onPress={() => navigation.navigate(Routes.MissionCreate as any)}
          >
            <LinearGradient
              colors={[colors.primary, colors.primary + 'DD']}
              style={styles.emptyActionGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.emptyActionText}>Créer un convoyage</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      );
    } else if (activeTab === 'completed') {
      return (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconContainer, { backgroundColor: '#4CAF5010' }]}>
            <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Aucun convoyage terminé
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Les convoyages que vous terminerez apparaîtront ici
          </Text>
        </View>
      );
    } else {
      // Tab 'received'
      return (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconContainer, { backgroundColor: colors.primary + '10' }]}>
            <Ionicons name="mail-open-outline" size={48} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Aucun convoyage reçu
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Les convoyages partagés avec vous apparaîtront ici
          </Text>
          <TouchableOpacity
            style={styles.emptyActionButton}
            onPress={() => setShowJoinModal(true)}
          >
            <LinearGradient
              colors={[colors.primary, colors.primary + 'DD']}
              style={styles.emptyActionGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="enter" size={20} color="#fff" />
              <Text style={styles.emptyActionText}>Rejoindre un convoyage</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      );
    }
  };

  const filteredMissions = getFilteredMissions();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header avec gradient */}
      <LinearGradient
        colors={[colors.primary, colors.primary + 'DD']}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerSubtitle}>Gestion</Text>
            <Text style={styles.headerTitle}>Mes Convoyages</Text>
          </View>
          
          <View style={styles.headerActions}>
            {activeTab === 'received' && (
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => setShowJoinModal(true)}
              >
                <Ionicons name="enter" size={22} color="#fff" />
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => {
                analytics.logEvent('create_mission_button_clicked');
                navigation.navigate(Routes.MissionCreate as any);
              }}
              {...createAccessibilityProps(
                'Créer un convoyage',
                'Créer un nouveau convoyage',
                'button'
              )}
            >
              <Ionicons name="add" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {/* Tabs modernes - 3 onglets */}
      <View style={[styles.tabsContainer, { backgroundColor: colors.surface }]}>
        <View style={[styles.tabsWrapper, { backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={[
              styles.modernTab,
              activeTab === 'active' && [styles.modernTabActive, { backgroundColor: colors.primary }]
            ]}
            onPress={() => setActiveTab('active')}
            activeOpacity={0.7}
          >
            <Ionicons 
              name="flash" 
              size={18} 
              color={activeTab === 'active' ? '#fff' : colors.textSecondary} 
            />
            <Text
              style={[
                styles.modernTabText,
                { color: activeTab === 'active' ? '#fff' : colors.textSecondary }
              ]}
            >
              Actifs
            </Text>
            {missions.filter(m => m.status === 'pending' || m.status === 'in_progress').length > 0 && (
              <View style={[
                styles.tabBadge,
                { backgroundColor: activeTab === 'active' ? '#fff' : colors.primary }
              ]}>
                <Text style={[
                  styles.tabBadgeText,
                  { color: activeTab === 'active' ? colors.primary : '#fff' }
                ]}>
                  {missions.filter(m => m.status === 'pending' || m.status === 'in_progress').length}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modernTab,
              activeTab === 'completed' && [styles.modernTabActive, { backgroundColor: colors.primary }]
            ]}
            onPress={() => setActiveTab('completed')}
            activeOpacity={0.7}
          >
            <Ionicons 
              name="checkmark-done" 
              size={18} 
              color={activeTab === 'completed' ? '#fff' : colors.textSecondary} 
            />
            <Text
              style={[
                styles.modernTabText,
                { color: activeTab === 'completed' ? '#fff' : colors.textSecondary }
              ]}
            >
              Terminées
            </Text>
            {missions.filter(m => m.status === 'completed').length > 0 && (
              <View style={[
                styles.tabBadge,
                { backgroundColor: activeTab === 'completed' ? '#fff' : colors.primary }
              ]}>
                <Text style={[
                  styles.tabBadgeText,
                  { color: activeTab === 'completed' ? colors.primary : '#fff' }
                ]}>
                  {missions.filter(m => m.status === 'completed').length}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modernTab,
              activeTab === 'received' && [styles.modernTabActive, { backgroundColor: colors.primary }]
            ]}
            onPress={() => setActiveTab('received')}
            activeOpacity={0.7}
          >
            <Ionicons 
              name="download" 
              size={18} 
              color={activeTab === 'received' ? '#fff' : colors.textSecondary} 
            />
            <Text
              style={[
                styles.modernTabText,
                { color: activeTab === 'received' ? '#fff' : colors.textSecondary }
              ]}
            >
              Reçues
            </Text>
            {missions.filter(m => m.assigned_user_id === user?.id).length > 0 && (
              <View style={[
                styles.tabBadge,
                { backgroundColor: activeTab === 'received' ? '#fff' : colors.primary }
              ]}>
                <Text style={[
                  styles.tabBadgeText,
                  { color: activeTab === 'received' ? colors.primary : '#fff' }
                ]}>
                  {missions.filter(m => m.assigned_user_id === user?.id).length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Liste */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Chargement des convoyages...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredMissions}
          renderItem={renderMissionCard}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={renderEmptyState}
        />
      )}

      {/* Modal Rejoindre */}
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
  container: {
    flex: 1,
  },
  // Header avec gradient
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#ffffff99',
    fontWeight: '500',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Tabs modernes
  tabsContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  tabsWrapper: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    gap: 8,
  },
  modernTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 6,
  },
  modernTabActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  modernTabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tabBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  // Liste
  listContent: {
    padding: 16,
  },
  // Cartes de mission
  card: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  completedCard: {
    opacity: 0.85,
  },
  completedOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    zIndex: 10,
  },
  completedOverlayText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  assignedByBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    zIndex: 10,
  },
  assignedByText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  cardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reference: {
    fontSize: 17,
    fontWeight: 'bold',
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Véhicule
  vehicleSection: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  vehicle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  plateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  plate: {
    fontSize: 13,
    fontWeight: '500',
  },
  // Séparateur
  separator: {
    height: 1,
    marginHorizontal: 16,
    marginVertical: 12,
  },
  // Itinéraire
  routeSection: {
    paddingHorizontal: 16,
  },
  routeLine: {
    flexDirection: 'row',
    gap: 12,
  },
  routePoints: {
    alignItems: 'center',
    paddingTop: 4,
  },
  pointStart: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  routeDash: {
    width: 2,
    flex: 1,
    marginVertical: 4,
  },
  pointEnd: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  routeAddresses: {
    flex: 1,
    gap: 16,
  },
  addressItem: {
    gap: 4,
  },
  addressLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addressText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 12,
  },
  footerLeft: {
    flex: 1,
  },
  priceGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  priceText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#fff',
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  date: {
    fontSize: 13,
    fontWeight: '500',
  },
  // Boutons d'action
  actionButtonContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  // Empty state
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
    gap: 16,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyActionButton: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  emptyActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  emptyActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
