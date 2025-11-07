import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface RatingScreenProps {
  route: {
    params: {
      tripId: string;
      ratedUserId: string;
      role: 'driver' | 'passenger';
    };
  };
  navigation: any;
}

export default function RatingScreen({ route, navigation }: RatingScreenProps) {
  const { tripId, ratedUserId, role } = route.params;
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const [ratings, setRatings] = useState({
    overall: 0,
    punctuality: 0,
    friendliness: 0,
    cleanliness: 0,
  });
  
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const availableTags = [
    'Ponctuel',
    'Agréable',
    'Discret',
    'Bavard',
    'Conduite souple',
    'Voiture propre',
    'Musique agréable',
    'Flexibilité',
    'Recommandé',
  ];

  const handleStarPress = (category: keyof typeof ratings, value: number) => {
    setRatings({ ...ratings, [category]: value });
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (ratings.overall === 0) {
      Alert.alert('Erreur', 'Veuillez donner une note globale');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from('carpooling_ratings').insert([
        {
          trip_id: tripId,
          rater_id: user?.id,
          rated_user_id: ratedUserId,
          rating: ratings.overall,
          punctuality_rating: ratings.punctuality || null,
          friendliness_rating: ratings.friendliness || null,
          cleanliness_rating: ratings.cleanliness || null,
          comment: comment.trim() || null,
          tags: selectedTags.length > 0 ? selectedTags : null,
          role: role,
        },
      ]);

      if (error) throw error;

      Alert.alert('Merci !', 'Votre avis a été enregistré', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error('Error submitting rating:', error);
      Alert.alert('Erreur', 'Impossible d\'enregistrer votre avis');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (category: keyof typeof ratings) => {
    const value = ratings[category];

    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity key={star} onPress={() => handleStarPress(category, star)}>
            <Ionicons
              name={star <= value ? 'star' : 'star-outline'}
              size={32}
              color={star <= value ? '#FFA500' : '#CCC'}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Noter le {role === 'driver' ? 'conducteur' : 'passager'}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Note globale *</Text>
          {renderStars('overall')}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ponctualité</Text>
          {renderStars('punctuality')}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Amabilité</Text>
          {renderStars('friendliness')}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Propreté</Text>
          {renderStars('cleanliness')}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tags</Text>
          <View style={styles.tagsContainer}>
            {availableTags.map((tag) => (
              <TouchableOpacity
                key={tag}
                style={[styles.tag, selectedTags.includes(tag) && styles.tagSelected]}
                onPress={() => toggleTag(tag)}
              >
                <Text
                  style={[styles.tagText, selectedTags.includes(tag) && styles.tagTextSelected]}
                >
                  {tag}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Commentaire</Text>
          <TextInput
            style={styles.textArea}
            value={comment}
            onChangeText={setComment}
            placeholder="Partagez votre expérience (optionnel)..."
            multiline
            numberOfLines={4}
            maxLength={500}
          />
          <Text style={styles.characterCount}>{comment.length}/500</Text>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color="#FFF" />
              <Text style={styles.submitButtonText}>Envoyer l'avis</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  section: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFF',
  },
  tagSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  tagText: {
    fontSize: 14,
    color: '#666',
  },
  tagTextSelected: {
    color: '#FFF',
    fontWeight: '600',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    height: 120,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  submitButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    marginHorizontal: 16,
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginLeft: 8,
  },
  bottomPadding: {
    height: 20,
  },
});
