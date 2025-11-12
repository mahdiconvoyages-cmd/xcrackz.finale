import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Share,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'react-native';
import { getVehicleImageSource } from '../../utils/vehicleDefaults';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { shareMissionLink } from '../../lib/shareCode';
import LocationSharing from '../../components/LocationSharing';

const { width, height } = Dimensions.get('window');

export default function MissionViewScreenNew({ route, navigation }: any) {
  const { missionId } = route.params;
  const { colors } = useTheme();
  const { user } = useAuth();
  const [mission, setMission] = useState<any>(null);
  const [inspections, setInspections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Animations
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    loadMissionData();
    
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Refresh data when screen comes into focus (after returning from inspection)
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 Screen focused - Refreshing mission data');
      loadMissionData();
    }, [missionId])
  );

  // Realtime sync
  useEffect(() => {
    if (!user || !missionId) return;

    const channel = supabase
      .channel(`mission_${missionId}_changes`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'missions', filter: `id=eq.${missionId}` },
        () => loadMissionData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vehicle_inspections', filter: `mission_id=eq.${missionId}` },
        () => loadMissionData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, missionId]);

  const loadMissionData = async () => {
    try {
      const { data: missionData, error: missionError } = await supabase
        .from('missions')
        .select('*')
        .eq('id', missionId)
        .single();

      if (missionError) throw missionError;

      const { data: inspectionsData } = await supabase
        .from('vehicle_inspections')
        .select('*')
        .eq('mission_id', missionId)
        .order('created_at', { ascending: true });

      setMission(missionData);
      setInspections(inspectionsData || []);
    } catch (error) {
      console.error('Erreur chargement mission:', error);
      Alert.alert('Erreur', 'Impossible de charger les données de la mission');
    } finally {
      setLoading(false);
    }
  };

  const getInspectionStatus = (type: 'departure' | 'arrival') => {
    const inspection = inspections.find((i) => i.inspection_type === type);
    if (!inspection) return 'pending';
    if (inspection.completed_at) return 'completed';
    return 'in_progress';
  };

  const canStartArrival = () => {
    const departureInspection = inspections.find((i) => i.inspection_type === 'departure');
    return departureInspection && departureInspection.completed_at;
  };

  const canCompleteMission = () => {
    const departureInspection = inspections.find((i) => i.inspection_type === 'departure');
    const arrivalInspection = inspections.find((i) => i.inspection_type === 'arrival');
    return (
      departureInspection?.completed_at &&
      arrivalInspection?.completed_at &&
      mission.status !== 'completed'
    );
  };

  const handleStartInspection = (type: 'departure' | 'arrival') => {
    if (type === 'arrival' && !canStartArrival()) {
      Alert.alert(
        'Inspection bloquée',
        'Vous devez d\'abord terminer l\'inspection de départ'
      );
      return;
    }

    const existingInspection = inspections.find((i) => i.inspection_type === type);
    
    if (existingInspection?.completed_at) {
      Alert.alert('Inspection terminée', 'Cette inspection est déjà complétée');
      return;
    }

    navigation.navigate('Inspections', {
      screen: type === 'departure' ? 'InspectionDeparture' : 'InspectionArrival',
      params: {
        missionId: mission.id,
        inspectionId: existingInspection?.id,
      },
    });
  };

  const handleCompleteMission = async () => {
    Alert.alert(
      'Terminer la mission',
      'Êtes-vous sûr de vouloir terminer cette mission ? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Terminer',
          style: 'default',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('missions')
                .update({ status: 'completed', completed_at: new Date().toISOString() })
                .eq('id', missionId);

              if (error) throw error;

              Alert.alert('✅ Mission terminée', 'La mission a été marquée comme terminée');
              loadMissionData();
            } catch (error) {
              console.error('Erreur:', error);
              Alert.alert('Erreur', 'Impossible de terminer la mission');
            }
          },
        },
      ]
    );
  };

  const handleShareMission = async () => {
    try {
      // Utilise le nouveau système de deeplink
      const success = await shareMissionLink(
        missionId,
        mission.title || `Mission ${mission.reference}`
      );
      
      if (!success) {
        // Fallback si erreur
        await Share.share({
          message: `Mission ${mission.reference}\nDe: ${mission.pickup_address}\nÀ: ${mission.delivery_address}\nPrix: ${mission.price}€`,
        });
      }
    } catch (error) {
      console.error('Erreur partage:', error);
      Alert.alert('Erreur', 'Impossible de partager la mission');
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed':
        return { color: '#10b981', icon: 'checkmark-circle', label: 'Terminée', gradient: ['#10b981', '#059669'] };
      case 'in_progress':
        return { color: '#3b82f6', icon: 'play-circle', label: 'En cours', gradient: ['#3b82f6', '#2563eb'] };
      case 'pending':
        return { color: '#f59e0b', icon: 'time', label: 'En attente', gradient: ['#f59e0b', '#d97706'] };
      case 'cancelled':
        return { color: '#ef4444', icon: 'close-circle', label: 'Annulée', gradient: ['#ef4444', '#dc2626'] };
      default:
        return { color: '#6b7280', icon: 'help-circle', label: status, gradient: ['#6b7280', '#4b5563'] };
    }
  };

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#14b8a6" />
        <Text style={{ color: colors.text, marginTop: 16 }}>Chargement...</Text>
      </View>
    );
  }

  if (!mission) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons name="alert-circle-outline" size={64} color={colors.textSecondary} />
        <Text style={[styles.errorText, { color: colors.text }]}>Mission introuvable</Text>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.primary }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusConfig = getStatusConfig(mission.status);

  return (
    <View style={[styles.container, { backgroundColor: '#0a0a1a' }]}>
      {/* Animated Header */}
      <Animated.View style={[styles.fixedHeader, { opacity: headerOpacity }]}>
        <LinearGradient
          colors={['rgba(10,10,26,0.95)', 'rgba(10,10,26,0.8)'] as any}
          style={styles.blurHeader}
        >
          <View style={styles.fixedHeaderContent}>
            <TouchableOpacity
              style={styles.headerBackButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.fixedHeaderTitle}>{mission.reference}</Text>
              <Text style={styles.fixedHeaderSubtitle}>{statusConfig.label}</Text>
            </View>
            <TouchableOpacity
              style={styles.headerShareButton}
              onPress={handleShareMission}
            >
              <Ionicons name="share-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>

      <Animated.ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* Hero Header with Gradient */}
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <LinearGradient
            colors={statusConfig.gradient as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroHeader}
          >
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>

            {/* Vehicle Image (hero) */}
            {mission?.vehicle_image_url && (
              <View style={styles.heroImageWrapper}>
                <Image
                  source={getVehicleImageSource(mission.vehicle_image_url, mission.vehicle_type)}
                  style={styles.heroImage}
                  resizeMode="cover"
                />
              </View>
            )}

            <View style={styles.heroContent}>
              <View style={styles.statusIconContainer}>
                <Ionicons name={statusConfig.icon as any} size={48} color="#fff" />
              </View>
              
              <Text style={styles.heroReference}>{mission.reference}</Text>
              
              <View style={styles.statusBadge}>
                <View style={[styles.statusDot, { backgroundColor: '#fff' }]} />
                <Text style={styles.statusText}>{statusConfig.label}</Text>
              </View>

              <View style={styles.priceCard}>
                <MaterialCommunityIcons name="cash-multiple" size={24} color="#fff" />
                <Text style={styles.priceAmount}>{mission.price?.toFixed(2)} €</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.shareBtn}
              onPress={handleShareMission}
            >
              <Ionicons name="share-social" size={20} color="#fff" />
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>

        <View style={styles.content}>
          {/* Timeline Progress */}
          <Animated.View
            style={[
              styles.card,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }, { translateY: slideAnim }],
              },
            ]}
          >
            <LinearGradient
              colors={['#1e293b', '#0f172a'] as any}
              style={styles.cardGradient}
            >
              <View style={styles.cardHeader}>
                <MaterialCommunityIcons name="timeline-clock" size={24} color="#14b8a6" />
                <Text style={styles.cardTitle}>Progression de la mission</Text>
              </View>

              <View style={styles.timeline}>
                {/* Departure Inspection */}
                <View style={styles.timelineItem}>
                  <View style={styles.timelineLeft}>
                    <View
                      style={[
                        styles.timelineIcon,
                        {
                          backgroundColor:
                            getInspectionStatus('departure') === 'completed'
                              ? '#10b981'
                              : getInspectionStatus('departure') === 'in_progress'
                              ? '#f59e0b'
                              : '#334155',
                        },
                      ]}
                    >
                      {getInspectionStatus('departure') === 'completed' ? (
                        <Ionicons name="checkmark" size={20} color="#fff" />
                      ) : (
                        <Ionicons name="car-sport" size={20} color="#fff" />
                      )}
                    </View>
                    <View style={[styles.timelineLine, { backgroundColor: canStartArrival() ? '#10b981' : '#334155' }]} />
                  </View>
                  <View style={styles.timelineRight}>
                    <Text style={styles.timelineTitle}>Inspection de départ</Text>
                    <Text style={styles.timelineSubtitle}>
                      {getInspectionStatus('departure') === 'completed'
                        ? '✓ Terminée'
                        : getInspectionStatus('departure') === 'in_progress'
                        ? '⏱ En cours'
                        : '○ À faire'}
                    </Text>
                    {mission.pickup_address && (
                      <View style={styles.addressRow}>
                        <Ionicons name="location" size={14} color="#10b981" />
                        <Text style={styles.addressText} numberOfLines={1}>
                          {mission.pickup_address}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Arrival Inspection */}
                <View style={[styles.timelineItem, { marginBottom: 0 }]}>
                  <View style={styles.timelineLeft}>
                    <View
                      style={[
                        styles.timelineIcon,
                        {
                          backgroundColor:
                            getInspectionStatus('arrival') === 'completed'
                              ? '#10b981'
                              : getInspectionStatus('arrival') === 'in_progress'
                              ? '#f59e0b'
                              : '#334155',
                        },
                      ]}
                    >
                      {getInspectionStatus('arrival') === 'completed' ? (
                        <Ionicons name="checkmark" size={20} color="#fff" />
                      ) : (
                        <Ionicons name="flag" size={20} color="#fff" />
                      )}
                    </View>
                  </View>
                  <View style={styles.timelineRight}>
                    <Text style={styles.timelineTitle}>Inspection d'arrivée</Text>
                    <Text style={styles.timelineSubtitle}>
                      {getInspectionStatus('arrival') === 'completed'
                        ? '✓ Terminée'
                        : getInspectionStatus('arrival') === 'in_progress'
                        ? '⏱ En cours'
                        : canStartArrival()
                        ? '○ Disponible'
                        : '🔒 Bloquée'}
                    </Text>
                    {mission.delivery_address && (
                      <View style={styles.addressRow}>
                        <Ionicons name="location" size={14} color="#ef4444" />
                        <Text style={styles.addressText} numberOfLines={1}>
                          {mission.delivery_address}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* GPS Location Sharing */}
          {mission.status === 'in_progress' && (
            <Animated.View
              style={{
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }}
            >
              <LocationSharing missionId={missionId} />
            </Animated.View>
          )}

          {/* Code de partage */}
          {mission.share_code && mission.user_id === user?.id && (
            <Animated.View
              style={[
                styles.card,
                {
                  opacity: fadeAnim,
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              <LinearGradient
                colors={['#1e293b', '#0f172a'] as any}
                style={styles.cardGradient}
              >
                <View style={styles.cardHeader}>
                  <Ionicons name="share-social" size={24} color="#14b8a6" />
                  <Text style={styles.cardTitle}>Code de partage</Text>
                </View>

                <View style={styles.shareCodeContainer}>
                  <View style={styles.shareCodeBox}>
                    <Text style={styles.shareCodeText}>
                      {mission.share_code}
                    </Text>
                  </View>

                  <View style={styles.shareActions}>
                    <TouchableOpacity
                      style={styles.shareButton}
                      onPress={async () => {
                        await Clipboard.setStringAsync(mission.share_code);
                        Alert.alert('✅ Copié', 'Code de partage copié dans le presse-papiers');
                      }}
                    >
                      <Ionicons name="copy" size={18} color="#fff" />
                      <Text style={styles.shareButtonText}>Copier</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.shareButton}
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
              </LinearGradient>
            </Animated.View>
          )}

          {/* Action Buttons */}
          <Animated.View
            style={[
              styles.card,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <LinearGradient
              colors={['#1e293b', '#0f172a'] as any}
              style={styles.cardGradient}
            >
              <View style={styles.cardHeader}>
                <MaterialCommunityIcons name="lightning-bolt" size={24} color="#14b8a6" />
                <Text style={styles.cardTitle}>Actions rapides</Text>
              </View>

              <View style={styles.actionsGrid}>
                <TouchableOpacity
                  style={[
                    styles.actionCard,
                    getInspectionStatus('departure') === 'completed' && styles.actionCardDisabled,
                  ]}
                  onPress={() => handleStartInspection('departure')}
                  disabled={getInspectionStatus('departure') === 'completed'}
                >
                  <LinearGradient
                    colors={
                      getInspectionStatus('departure') === 'completed'
                        ? (['#334155', '#1e293b'] as any)
                        : (['#10b981', '#059669'] as any)
                    }
                    style={styles.actionGradient}
                  >
                    <Ionicons
                      name="exit-outline"
                      size={32}
                      color={getInspectionStatus('departure') === 'completed' ? '#64748b' : '#fff'}
                    />
                    <Text
                      style={[
                        styles.actionLabel,
                        getInspectionStatus('departure') === 'completed' && styles.actionLabelDisabled,
                      ]}
                    >
                      Inspection départ
                    </Text>
                    <View
                      style={[
                        styles.actionStatus,
                        {
                          backgroundColor:
                            getInspectionStatus('departure') === 'completed'
                              ? '#10b981'
                              : getInspectionStatus('departure') === 'in_progress'
                              ? '#f59e0b'
                              : 'transparent',
                        },
                      ]}
                    >
                      {getInspectionStatus('departure') === 'completed' && (
                        <Ionicons name="checkmark-circle" size={16} color="#fff" />
                      )}
                    </View>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionCard,
                    (!canStartArrival() || getInspectionStatus('arrival') === 'completed') &&
                      styles.actionCardDisabled,
                  ]}
                  onPress={() => handleStartInspection('arrival')}
                  disabled={!canStartArrival() || getInspectionStatus('arrival') === 'completed'}
                >
                  <LinearGradient
                    colors={
                      !canStartArrival() || getInspectionStatus('arrival') === 'completed'
                        ? (['#334155', '#1e293b'] as any)
                        : (['#3b82f6', '#2563eb'] as any)
                    }
                    style={styles.actionGradient}
                  >
                    <Ionicons
                      name="enter-outline"
                      size={32}
                      color={
                        !canStartArrival() || getInspectionStatus('arrival') === 'completed'
                          ? '#64748b'
                          : '#fff'
                      }
                    />
                    <Text
                      style={[
                        styles.actionLabel,
                        (!canStartArrival() || getInspectionStatus('arrival') === 'completed') &&
                          styles.actionLabelDisabled,
                      ]}
                    >
                      Inspection arrivée
                    </Text>
                    <View
                      style={[
                        styles.actionStatus,
                        {
                          backgroundColor:
                            getInspectionStatus('arrival') === 'completed'
                              ? '#10b981'
                              : getInspectionStatus('arrival') === 'in_progress'
                              ? '#f59e0b'
                              : 'transparent',
                        },
                      ]}
                    >
                      {getInspectionStatus('arrival') === 'completed' && (
                        <Ionicons name="checkmark-circle" size={16} color="#fff" />
                      )}
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {canCompleteMission() && (
                <TouchableOpacity
                  style={styles.completeButton}
                  onPress={handleCompleteMission}
                >
                  <LinearGradient
                    colors={['#10b981', '#059669'] as any}
                    style={styles.completeGradient}
                  >
                    <Ionicons name="checkmark-circle" size={28} color="#fff" />
                    <Text style={styles.completeText}>Terminer la mission</Text>
                    <Ionicons name="arrow-forward" size={24} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </LinearGradient>
          </Animated.View>

          {/* Vehicle Info */}
          {(mission.vehicle_brand || mission.vehicle_model || mission.title || mission.description) && (
            <Animated.View
              style={[
                styles.card,
                {
                  opacity: fadeAnim,
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              <LinearGradient
                colors={['#1e293b', '#0f172a'] as any}
                style={styles.cardGradient}
              >
                <View style={styles.cardHeader}>
                  <MaterialCommunityIcons name="car-info" size={24} color="#14b8a6" />
                  <Text style={styles.cardTitle}>Informations de la mission</Text>
                </View>

                {/* Titre et description */}
                {mission.title && (
                  <View style={[styles.infoGrid, { marginBottom: 12 }]}>
                    <View style={[styles.infoItem, { width: '100%' }]}>
                      <Text style={styles.infoLabel}>Titre</Text>
                      <Text style={[styles.infoValue, { fontSize: 16, fontWeight: '600' }]}>
                        {mission.title}
                      </Text>
                    </View>
                  </View>
                )}

                {mission.description && (
                  <View style={[styles.infoGrid, { marginBottom: 12 }]}>
                    <View style={[styles.infoItem, { width: '100%' }]}>
                      <Text style={styles.infoLabel}>Description</Text>
                      <Text style={[styles.infoValue, { fontSize: 14 }]}>
                        {mission.description}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Image véhicule (miniature) */}
                {mission.vehicle_image_url && (
                  <View style={styles.vehicleImageContainer}>
                    <Image
                      source={getVehicleImageSource(mission.vehicle_image_url, mission.vehicle_type)}
                      style={styles.vehicleImage}
                      resizeMode="cover"
                    />
                  </View>
                )}

                <View style={styles.infoGrid}>
                  {mission.vehicle_brand && (
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Marque</Text>
                      <Text style={styles.infoValue}>{mission.vehicle_brand}</Text>
                    </View>
                  )}
                  {mission.vehicle_model && (
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Modèle</Text>
                      <Text style={styles.infoValue}>{mission.vehicle_model}</Text>
                    </View>
                  )}
                  {mission.vehicle_type && (
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Type</Text>
                      <Text style={styles.infoValue}>{mission.vehicle_type}</Text>
                    </View>
                  )}
                  {mission.distance_km && (
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Distance</Text>
                      <Text style={styles.infoValue}>{mission.distance_km} km</Text>
                    </View>
                  )}
                  {mission.scheduled_date && (
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Date prévue</Text>
                      <Text style={styles.infoValue}>
                        {new Date(mission.scheduled_date).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </Text>
                    </View>
                  )}
                </View>
              </LinearGradient>
            </Animated.View>
          )}

          {/* Itinerary Details */}
          <Animated.View
            style={[
              styles.card,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <LinearGradient
              colors={['#1e293b', '#0f172a'] as any}
              style={styles.cardGradient}
            >
              <View style={styles.cardHeader}>
                <MaterialCommunityIcons name="map-marker-path" size={24} color="#14b8a6" />
                <Text style={styles.cardTitle}>Détails de l'itinéraire</Text>
              </View>

              {/* Pickup */}
              <View style={styles.locationCard}>
                <View style={styles.locationIconContainer}>
                  <LinearGradient
                    colors={['#10b981', '#059669'] as any}
                    style={styles.locationIconGradient}
                  >
                    <Ionicons name="location" size={24} color="#fff" />
                  </LinearGradient>
                </View>
                <View style={styles.locationContent}>
                  <Text style={styles.locationLabel}>Point d'enlèvement</Text>
                  <Text style={styles.locationAddress}>{mission.pickup_address}</Text>
                  {mission.pickup_contact_name && (
                    <View style={styles.contactRow}>
                      <Ionicons name="person" size={16} color="#64748b" />
                      <Text style={styles.contactText}>{mission.pickup_contact_name}</Text>
                    </View>
                  )}
                  {mission.pickup_date && (
                    <View style={styles.contactRow}>
                      <Ionicons name="calendar" size={16} color="#64748b" />
                      <Text style={styles.contactText}>
                        {new Date(mission.pickup_date).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.routeConnector}>
                <View style={styles.routeDots}>
                  {[...Array(3)].map((_, i) => (
                    <View key={i} style={styles.routeDot} />
                  ))}
                </View>
              </View>

              {/* Delivery */}
              <View style={styles.locationCard}>
                <View style={styles.locationIconContainer}>
                  <LinearGradient
                    colors={['#ef4444', '#dc2626'] as any}
                    style={styles.locationIconGradient}
                  >
                    <Ionicons name="flag" size={24} color="#fff" />
                  </LinearGradient>
                </View>
                <View style={styles.locationContent}>
                  <Text style={styles.locationLabel}>Point de livraison</Text>
                  <Text style={styles.locationAddress}>{mission.delivery_address}</Text>
                  {mission.delivery_contact_name && (
                    <View style={styles.contactRow}>
                      <Ionicons name="person" size={16} color="#64748b" />
                      <Text style={styles.contactText}>{mission.delivery_contact_name}</Text>
                    </View>
                  )}
                  {mission.delivery_date && (
                    <View style={styles.contactRow}>
                      <Ionicons name="calendar" size={16} color="#64748b" />
                      <Text style={styles.contactText}>
                        {new Date(mission.delivery_date).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Notes */}
          {mission.notes && (
            <Animated.View
              style={[
                styles.card,
                {
                  opacity: fadeAnim,
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              <LinearGradient
                colors={['#1e293b', '#0f172a'] as any}
                style={styles.cardGradient}
              >
                <View style={styles.cardHeader}>
                  <MaterialCommunityIcons name="note-text" size={24} color="#14b8a6" />
                  <Text style={styles.cardTitle}>Notes</Text>
                </View>
                <Text style={styles.notesText}>{mission.notes}</Text>
              </LinearGradient>
            </Animated.View>
          )}

          <View style={{ height: 40 }} />
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  blurHeader: {
    overflow: 'hidden',
  },
  fixedHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
  },
  headerBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    marginLeft: 16,
  },
  fixedHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  fixedHeaderSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  headerShareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  heroHeader: {
    paddingTop: 50,
    paddingBottom: 40,
    paddingHorizontal: 20,
    position: 'relative',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  shareBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContent: {
    alignItems: 'center',
  },
  statusIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroReference: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  priceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 12,
  },
  priceAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
  },
  heroImageWrapper: {
    width: '100%',
    height: 160,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  card: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  timeline: {
    paddingVertical: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: 16,
  },
  timelineIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 8,
  },
  timelineRight: {
    flex: 1,
    paddingTop: 4,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  timelineSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 8,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  addressText: {
    fontSize: 13,
    color: '#64748b',
    flex: 1,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionCardDisabled: {
    opacity: 0.6,
  },
  actionGradient: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
    position: 'relative',
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginTop: 12,
    textAlign: 'center',
  },
  actionLabelDisabled: {
    color: '#64748b',
  },
  actionStatus: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
  },
  completeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 18,
  },
  completeText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  infoGrid: {
    gap: 12,
  },
  infoItem: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#14b8a6',
  },
  infoLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  vehicleImageContainer: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#14b8a6',
  },
  vehicleImage: {
    width: '100%',
    height: 160,
  },
  locationCard: {
    flexDirection: 'row',
    gap: 16,
  },
  locationIconContainer: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  locationIconGradient: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationContent: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 6,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  locationAddress: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 22,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  contactText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  routeConnector: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  routeDots: {
    gap: 6,
  },
  routeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#334155',
  },
  notesText: {
    fontSize: 15,
    color: '#cbd5e1',
    lineHeight: 24,
  },
  errorText: {
    fontSize: 18,
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Code de partage
  shareCodeContainer: {
    gap: 16,
  },
  shareCodeBox: {
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    borderWidth: 2,
    borderColor: '#14b8a6',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  shareCodeText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#14b8a6',
    letterSpacing: 4,
    fontFamily: 'monospace',
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
    gap: 8,
    backgroundColor: '#14b8a6',
    paddingVertical: 14,
    borderRadius: 12,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
