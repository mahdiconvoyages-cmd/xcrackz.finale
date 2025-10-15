import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import StarRating from '../components/StarRating';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface UserProfile {
  user_id: string;
  full_name: string;
  avatar_url?: string;
  stats: {
    total_rides_as_driver: number;
    total_rides_as_passenger: number;
    avg_rating_as_driver: number;
    avg_rating_as_passenger: number;
    total_ratings_received: number;
    avg_punctuality_driver: number;
    avg_friendliness_driver: number;
    avg_cleanliness_driver: number;
    verified_phone: boolean;
    verified_email: boolean;
    chat_preference: string;
    music_preference: string;
    smoking_allowed: boolean;
    pets_allowed: boolean;
  };
  recent_ratings: Array<{
    id: string;
    overall_rating: number;
    comment: string;
    tags: string[];
    role: string;
    created_at: string;
    reviewer: {
      full_name: string;
      avatar_url?: string;
    };
  }>;
}

const CovoiturageUserProfile: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { userId } = route.params as { userId: string };

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'driver' | 'passenger'>('driver');

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase.rpc('get_user_ride_profile', {
        target_user_id: userId,
      });

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#06b6d4" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={48} color="#ef4444" />
        <Text style={styles.errorText}>Profil introuvable</Text>
      </View>
    );
  }

  const stats = profile.stats || {
    total_rides_as_driver: 0,
    total_rides_as_passenger: 0,
    avg_rating_as_driver: 0,
    avg_rating_as_passenger: 0,
    total_ratings_received: 0,
    avg_punctuality_driver: 0,
    avg_friendliness_driver: 0,
    avg_cleanliness_driver: 0,
    verified_phone: false,
    verified_email: false,
    chat_preference: 'moderate',
    music_preference: 'flexible',
    smoking_allowed: false,
    pets_allowed: false,
  };
  const activeRating = activeTab === 'driver' ? stats.avg_rating_as_driver : stats.avg_rating_as_passenger;
  const totalRides = activeTab === 'driver' ? stats.total_rides_as_driver : stats.total_rides_as_passenger;

  return (
    <LinearGradient
      colors={['#0f172a', '#1e293b', '#334155']}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            {profile.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <MaterialIcons name="person" size={48} color="#64748b" />
              </View>
            )}
            {stats.verified_email && (
              <View style={styles.verifiedBadge}>
                <MaterialIcons name="verified" size={24} color="#06b6d4" />
              </View>
            )}
          </View>

          <Text style={styles.profileName}>{profile.full_name}</Text>

          {/* Tabs */}
          <View style={styles.tabs}>
            <TouchableOpacity
              onPress={() => setActiveTab('driver')}
              style={[styles.tab, activeTab === 'driver' && styles.tabActive]}
            >
              <MaterialIcons
                name="drive-eta"
                size={20}
                color={activeTab === 'driver' ? '#06b6d4' : '#64748b'}
              />
              <Text style={[styles.tabText, activeTab === 'driver' && styles.tabTextActive]}>
                Conducteur
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('passenger')}
              style={[styles.tab, activeTab === 'passenger' && styles.tabActive]}
            >
              <MaterialIcons
                name="airline-seat-recline-normal"
                size={20}
                color={activeTab === 'passenger' ? '#06b6d4' : '#64748b'}
              />
              <Text style={[styles.tabText, activeTab === 'passenger' && styles.tabTextActive]}>
                Passager
              </Text>
            </TouchableOpacity>
          </View>

          {/* Rating Summary */}
          <View style={styles.ratingSummary}>
            <Text style={styles.ratingNumber}>{activeRating?.toFixed(1) || '0.0'}</Text>
            <StarRating rating={Math.round(activeRating || 0)} size={28} readonly />
            <Text style={styles.ratingCount}>
              {stats.total_ratings_received || 0} avis • {totalRides || 0} trajets
            </Text>
          </View>

          {/* Detailed Ratings */}
          {activeTab === 'driver' && stats.avg_punctuality_driver > 0 && (
            <View style={styles.detailedRatings}>
              <View style={styles.detailedRatingItem}>
                <Text style={styles.detailedRatingLabel}>Ponctualité</Text>
                <View style={styles.detailedRatingBar}>
                  <View
                    style={[
                      styles.detailedRatingFill,
                      { width: `${(stats.avg_punctuality_driver / 5) * 100}%` },
                    ]}
                  />
                </View>
                <Text style={styles.detailedRatingValue}>
                  {stats.avg_punctuality_driver?.toFixed(1)}
                </Text>
              </View>

              <View style={styles.detailedRatingItem}>
                <Text style={styles.detailedRatingLabel}>Amabilité</Text>
                <View style={styles.detailedRatingBar}>
                  <View
                    style={[
                      styles.detailedRatingFill,
                      { width: `${(stats.avg_friendliness_driver / 5) * 100}%` },
                    ]}
                  />
                </View>
                <Text style={styles.detailedRatingValue}>
                  {stats.avg_friendliness_driver?.toFixed(1)}
                </Text>
              </View>

              <View style={styles.detailedRatingItem}>
                <Text style={styles.detailedRatingLabel}>Propreté</Text>
                <View style={styles.detailedRatingBar}>
                  <View
                    style={[
                      styles.detailedRatingFill,
                      { width: `${(stats.avg_cleanliness_driver / 5) * 100}%` },
                    ]}
                  />
                </View>
                <Text style={styles.detailedRatingValue}>
                  {stats.avg_cleanliness_driver?.toFixed(1)}
                </Text>
              </View>
            </View>
          )}

          {/* Preferences */}
          <View style={styles.preferences}>
            <Text style={styles.preferencesTitle}>Préférences</Text>
            <View style={styles.preferencesList}>
              <View style={styles.preferenceItem}>
                <MaterialIcons name="chat" size={20} color="#06b6d4" />
                <Text style={styles.preferenceText}>
                  {stats.chat_preference === 'quiet'
                    ? '🤫 Calme'
                    : stats.chat_preference === 'chatty'
                    ? '💬 Bavard'
                    : '😊 Flexible'}
                </Text>
              </View>

              <View style={styles.preferenceItem}>
                <MaterialIcons name="music-note" size={20} color="#06b6d4" />
                <Text style={styles.preferenceText}>
                  {stats.music_preference === 'no_music'
                    ? '🔇 Pas de musique'
                    : stats.music_preference === 'music_lover'
                    ? '🎵 Amateur de musique'
                    : '🎧 Flexible'}
                </Text>
              </View>

              {!stats.smoking_allowed && (
                <View style={styles.preferenceItem}>
                  <MaterialIcons name="smoke-free" size={20} color="#10b981" />
                  <Text style={styles.preferenceText}>Non-fumeur</Text>
                </View>
              )}

              {stats.pets_allowed && (
                <View style={styles.preferenceItem}>
                  <MaterialIcons name="pets" size={20} color="#10b981" />
                  <Text style={styles.preferenceText}>Animaux acceptés</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Recent Reviews */}
        <View style={styles.reviewsSection}>
          <Text style={styles.sectionTitle}>Avis récents</Text>
          {profile.recent_ratings && profile.recent_ratings.length > 0 ? (
            profile.recent_ratings.map((rating) => (
              <View key={rating.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewerInfo}>
                    {rating.reviewer.avatar_url ? (
                      <Image
                        source={{ uri: rating.reviewer.avatar_url }}
                        style={styles.reviewerAvatar}
                      />
                    ) : (
                      <View style={styles.reviewerAvatarPlaceholder}>
                        <MaterialIcons name="person" size={20} color="#64748b" />
                      </View>
                    )}
                    <View>
                      <Text style={styles.reviewerName}>{rating.reviewer.full_name}</Text>
                      <Text style={styles.reviewDate}>
                        {format(new Date(rating.created_at), 'dd MMM yyyy', { locale: fr })}
                      </Text>
                    </View>
                  </View>
                  <StarRating rating={rating.overall_rating} size={18} readonly />
                </View>

                {rating.tags && rating.tags.length > 0 && (
                  <View style={styles.reviewTags}>
                    {rating.tags.map((tag, index) => (
                      <View key={index} style={styles.reviewTag}>
                        <Text style={styles.reviewTagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {rating.comment && (
                  <Text style={styles.reviewComment}>{rating.comment}</Text>
                )}
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="rate-review" size={48} color="#475569" />
              <Text style={styles.emptyText}>Aucun avis pour le moment</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    gap: 16,
  },
  errorText: {
    fontSize: 18,
    color: '#e2e8f0',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 20,
    padding: 20,
    margin: 16,
    marginTop: 0,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(51, 65, 85, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: '35%',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 2,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
  },
  tabText: {
    fontSize: 14,
    color: '#64748b',
  },
  tabTextActive: {
    color: '#06b6d4',
    fontWeight: '600',
  },
  ratingSummary: {
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.1)',
  },
  ratingNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fbbf24',
    marginBottom: 8,
  },
  ratingCount: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
  },
  detailedRatings: {
    paddingVertical: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.1)',
  },
  detailedRatingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailedRatingLabel: {
    fontSize: 14,
    color: '#e2e8f0',
    width: 80,
  },
  detailedRatingBar: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(100, 116, 139, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  detailedRatingFill: {
    height: '100%',
    backgroundColor: '#fbbf24',
    borderRadius: 4,
  },
  detailedRatingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fbbf24',
    width: 30,
    textAlign: 'right',
  },
  preferences: {
    paddingTop: 16,
  },
  preferencesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  preferencesList: {
    gap: 8,
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  preferenceText: {
    fontSize: 14,
    color: '#e2e8f0',
  },
  reviewsSection: {
    padding: 16,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  reviewCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reviewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  reviewerAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(51, 65, 85, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  reviewDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  reviewTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  reviewTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
    borderRadius: 12,
  },
  reviewTagText: {
    fontSize: 12,
    color: '#06b6d4',
  },
  reviewComment: {
    fontSize: 14,
    color: '#e2e8f0',
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
  },
});

export default CovoiturageUserProfile;
