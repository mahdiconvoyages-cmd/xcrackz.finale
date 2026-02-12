import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  Share,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { createMissionShareLink } from '../../hooks/useDeepLinking';

interface ShareMissionScreenProps {
  navigation: any;
  route: {
    params: {
      mission: {
        id: string;
        reference: string;
        share_code?: string;
        vehicle_brand?: string;
        vehicle_model?: string;
        pickup_address?: string;
        delivery_address?: string;
      };
    };
  };
}

export default function ShareMissionScreen({ route, navigation }: ShareMissionScreenProps) {
  const { mission } = route.params;
  const { colors } = useTheme();
  const { user } = useAuth();
  
  // Mode "rejoindre" si id = 'join' ou si pas de share_code
  const isJoinMode = mission.id === 'join' || !mission.share_code;
  
  const [shareCode] = useState(mission.share_code || '');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleShareCode = async () => {
    try {
      // Message simple avec le code uniquement
      const message = `🚗 Mission ${mission.reference}\n\n` +
        `Véhicule: ${mission.vehicle_brand} ${mission.vehicle_model}\n` +
        `De: ${mission.pickup_address}\n` +
        `À: ${mission.delivery_address}\n\n` +
        `� CODE DE PARTAGE: ${shareCode}\n\n` +
        `Pour rejoindre cette mission:\n` +
        `1. Ouvrez l'application CHECKSFLEET\n` +
        `2. Allez dans Missions > Rejoindre une mission\n` +
        `3. Entrez le code: ${shareCode}`;

      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(shareCode);
        Alert.alert('✅ Copié', `Code ${shareCode} copié dans le presse-papier`);
      } else {
        await Share.share({
          message,
          title: `Mission ${mission.reference}`,
        });
      }
    } catch (error: any) {
      console.error('Error sharing:', error);
      Alert.alert('Erreur', 'Impossible de partager le code');
    }
  };

  const handleJoinMission = async () => {
    if (!joinCode.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un code de partage');
      return;
    }

    if (!user) {
      Alert.alert('Erreur', 'Vous devez être connecté');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.rpc('join_mission_with_code', {
        p_share_code: joinCode.trim().toUpperCase(),
        p_user_id: user.id,
      });

      if (error) throw error;

      const result = typeof data === 'string' ? JSON.parse(data) : data;

      if (!result.success) {
        throw new Error(result.message || result.error || 'Erreur inconnue');
      }

      Alert.alert(
        '✅ Mission acceptée !',
        `Vous avez rejoint la mission ${result.mission?.reference || ''}`,
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.goBack();
              // Rafraîchir la liste des missions
              navigation.navigate('Missions', { refresh: true });
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error joining mission:', error);
      Alert.alert('❌ Erreur', error.message || 'Impossible de rejoindre la mission');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {isJoinMode ? 'Rejoindre une Mission' : 'Partager une Mission'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Section: Partager ma mission */}
        {!isJoinMode && shareCode && (
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="share-outline" size={24} color="#3B82F6" />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Partager cette mission
              </Text>
            </View>

            <View style={styles.missionInfo}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Mission:
              </Text>
              <Text style={[styles.value, { color: colors.text }]}>
                {mission.reference}
              </Text>

              <Text style={[styles.label, { color: colors.textSecondary, marginTop: 10 }]}>
                Véhicule:
              </Text>
              <Text style={[styles.value, { color: colors.text }]}>
                {mission.vehicle_brand} {mission.vehicle_model}
              </Text>
            </View>

            <View style={styles.codeContainer}>
              <Text style={[styles.codeLabel, { color: colors.textSecondary }]}>
                Code de partage:
              </Text>
              <View style={styles.codeBox}>
                <Text style={styles.codeText}>{shareCode}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.shareButton}
              onPress={handleShareCode}
            >
              <LinearGradient
                colors={['#3B82F6', '#2563EB']}
                style={styles.gradient}
              >
                <Ionicons name="share-social" size={20} color="white" />
                <Text style={styles.shareButtonText}>Partager le code</Text>
              </LinearGradient>
            </TouchableOpacity>

            <Text style={[styles.helpText, { color: colors.textSecondary }]}>
              Partagez ce code avec la personne qui doit réaliser cette mission.
              Elle pourra l'entrer dans la section "Rejoindre une mission" ci-dessous.
            </Text>
          </View>
        )}

        {/* Section: Rejoindre une mission */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="enter-outline" size={24} color="#10B981" />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Rejoindre une mission
            </Text>
          </View>

          <Text style={[styles.helpText, { color: colors.textSecondary, marginBottom: 15 }]}>
            Entrez le code de partage qui vous a été communiqué pour rejoindre une mission.
          </Text>

          <TextInput
            value={joinCode}
            onChangeText={(text) => setJoinCode(text.toUpperCase())}
            placeholder="XZ-XXX-XXX"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={10}
            style={[
              styles.input,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
          />

          <TouchableOpacity
            style={[
              styles.joinButton,
              !joinCode.trim() && styles.joinButtonDisabled,
            ]}
            onPress={handleJoinMission}
            disabled={!joinCode.trim() || loading}
          >
            <LinearGradient
              colors={
                joinCode.trim()
                  ? ['#10B981', '#059669']
                  : ['#9CA3AF', '#6B7280']
              }
              style={styles.gradient}
            >
              {loading ? (
                <Text style={styles.joinButtonText}>⏳ Vérification...</Text>
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="white" />
                  <Text style={styles.joinButtonText}>Rejoindre la mission</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  section: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  missionInfo: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 2,
  },
  codeContainer: {
    marginBottom: 15,
  },
  codeLabel: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  codeBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderStyle: 'dashed',
  },
  codeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#3B82F6',
    letterSpacing: 2,
  },
  shareButton: {
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 15,
  },
  joinButton: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  joinButtonDisabled: {
    opacity: 0.6,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  shareButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  joinButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 15,
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 15,
  },
  helpText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
