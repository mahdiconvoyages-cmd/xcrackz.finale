import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import StarRating from '../components/StarRating';

interface RouteParams {
  rideId: string;
  revieweeId: string;
  revieweeName: string;
  role: 'driver' | 'passenger';
}

const CovoiturageRateUser: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const { rideId, revieweeId, revieweeName, role } = route.params as RouteParams;

  const [overallRating, setOverallRating] = useState(5);
  const [punctualityRating, setPunctualityRating] = useState(5);
  const [friendlinessRating, setFriendlinessRating] = useState(5);
  const [cleanlinessRating, setCleanlinessRating] = useState(5);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const driverTags = [
    '🚗 Conduite sûre',
    '⏰ Ponctuel',
    '😊 Sympa',
    '🎵 Bonne musique',
    '💬 Bavard',
    '🤫 Silencieux',
    '✨ Voiture propre',
    '🧳 Aide aux bagages',
    '📱 Flexible',
    '🚭 Non-fumeur',
  ];

  const passengerTags = [
    '⏰ Ponctuel',
    '😊 Sympa',
    '💬 Bon convive',
    '🤫 Respectueux',
    '🧳 Bagages légers',
    '📱 Réactif',
    '🚭 Non-fumeur',
    '✨ Propre',
  ];

  const availableTags = role === 'driver' ? driverTags : passengerTags;

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = async () => {
    if (overallRating === 0) {
      Alert.alert('Erreur', 'Veuillez donner une note globale');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from('ride_ratings').insert({
        ride_id: rideId,
        reviewer_id: user?.id,
        reviewee_id: revieweeId,
        overall_rating: overallRating,
        punctuality_rating: punctualityRating,
        friendliness_rating: friendlinessRating,
        cleanliness_rating: role === 'driver' ? cleanlinessRating : null,
        comment: comment.trim() || null,
        tags: selectedTags,
        role: role,
      });

      if (error) throw error;

      Alert.alert(
        'Merci !',
        'Votre avis a été publié avec succès',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error submitting rating:', error);
      Alert.alert('Erreur', error.message || 'Impossible de publier l\'avis');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#0f172a', '#1e293b', '#334155']}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <MaterialIcons name="rate-review" size={48} color="#06b6d4" />
            <Text style={styles.headerTitle}>Noter {revieweeName}</Text>
            <Text style={styles.headerSubtitle}>
              {role === 'driver' ? 'En tant que conducteur' : 'En tant que passager'}
            </Text>
          </View>
        </View>

        {/* Note globale */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Note globale *</Text>
          <View style={styles.ratingContainer}>
            <StarRating
              rating={overallRating}
              onRatingChange={setOverallRating}
              size={40}
            />
            <Text style={styles.ratingText}>{overallRating}/5</Text>
          </View>
        </View>

        {/* Critères détaillés */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Critères détaillés</Text>

          <View style={styles.criteriaItem}>
            <View style={styles.criteriaHeader}>
              <MaterialIcons name="access-time" size={20} color="#10b981" />
              <Text style={styles.criteriaLabel}>Ponctualité</Text>
            </View>
            <StarRating
              rating={punctualityRating}
              onRatingChange={setPunctualityRating}
              size={28}
            />
          </View>

          <View style={styles.criteriaItem}>
            <View style={styles.criteriaHeader}>
              <MaterialIcons name="mood" size={20} color="#10b981" />
              <Text style={styles.criteriaLabel}>Amabilité</Text>
            </View>
            <StarRating
              rating={friendlinessRating}
              onRatingChange={setFriendlinessRating}
              size={28}
            />
          </View>

          {role === 'driver' && (
            <View style={styles.criteriaItem}>
              <View style={styles.criteriaHeader}>
                <MaterialIcons name="cleaning-services" size={20} color="#10b981" />
                <Text style={styles.criteriaLabel}>Propreté du véhicule</Text>
              </View>
              <StarRating
                rating={cleanlinessRating}
                onRatingChange={setCleanlinessRating}
                size={28}
              />
            </View>
          )}
        </View>

        {/* Tags */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ajouter des tags (optionnel)</Text>
          <View style={styles.tagsContainer}>
            {availableTags.map((tag) => (
              <TouchableOpacity
                key={tag}
                onPress={() => toggleTag(tag)}
                style={[
                  styles.tag,
                  selectedTags.includes(tag) && styles.tagSelected,
                ]}
              >
                <Text
                  style={[
                    styles.tagText,
                    selectedTags.includes(tag) && styles.tagTextSelected,
                  ]}
                >
                  {tag}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Commentaire */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Commentaire (optionnel)</Text>
          <TextInput
            style={styles.commentInput}
            value={comment}
            onChangeText={setComment}
            placeholder="Partagez votre expérience..."
            placeholderTextColor="#64748b"
            multiline
            numberOfLines={4}
            maxLength={500}
          />
          <Text style={styles.characterCount}>{comment.length}/500</Text>
        </View>

        {/* Bouton de soumission */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          style={styles.submitButton}
        >
          <LinearGradient
            colors={['#06b6d4', '#0891b2']}
            style={styles.submitGradient}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialIcons name="send" size={20} color="#fff" />
                <Text style={styles.submitText}>Publier l'avis</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 24,
  },
  backButton: {
    marginBottom: 16,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 12,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  section: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 8,
  },
  ratingText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fbbf24',
  },
  criteriaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.1)',
  },
  criteriaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  criteriaLabel: {
    fontSize: 15,
    color: '#e2e8f0',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.3)',
  },
  tagSelected: {
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
    borderColor: '#06b6d4',
  },
  tagText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  tagTextSelected: {
    color: '#06b6d4',
    fontWeight: '600',
  },
  commentInput: {
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderRadius: 12,
    padding: 12,
    color: '#fff',
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  characterCount: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'right',
    marginTop: 4,
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CovoiturageRateUser;
