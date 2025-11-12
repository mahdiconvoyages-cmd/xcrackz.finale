import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { validateShareCodeInput } from '../lib/shareCode';

interface JoinMissionByCodeProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function JoinMissionByCode({
  visible,
  onClose,
  onSuccess,
}: JoinMissionByCodeProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const formatShareCode = (text: string) => {
    // Supprimer tous les caractères non alphanumériques
    const cleaned = text.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    
    // Formater XX-XXX-XXX
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 5) return `${cleaned.slice(0, 2)}-${cleaned.slice(2)}`;
    return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 5)}-${cleaned.slice(5, 8)}`;
  };

  const handleCodeChange = (text: string) => {
    const formatted = formatShareCode(text);
    setCode(formatted);
  };

  const handleJoinMission = async () => {
    if (!user) {
      Alert.alert('Erreur', 'Vous devez être connecté');
      return;
    }
    const validation = validateShareCodeInput(code);
    if (!validation.valid || !validation.code) {
      Alert.alert('Code invalide', validation.error || 'Format incorrect (XZ-ABC-123)');
      return;
    }
    const cleanedBare = validation.code.replace(/[^A-Z0-9]/g, '');

    setLoading(true);
    try {
      console.log('🔍 Tentative de rejoindre mission avec code:', code);

      // Appeler la fonction RPC Supabase
      // Appel nouvelle fonction unifiée (wrapper possible)
      const { data, error } = await supabase.rpc('claim_mission', {
        p_code: cleanedBare,
        p_user_id: user.id,
      });

      if (error) {
        console.error('❌ Erreur RPC:', error);
        throw error;
      }

      console.log('📦 Réponse RPC brut:', data);

      // Normaliser la réponse (peut être un objet, un tableau, un booléen, ou une chaîne JSON)
      let result: any = data;
      if (typeof result === 'string') {
        try { result = JSON.parse(result); } catch {}
      }
      if (Array.isArray(result)) {
        result = result[0] || {};
      }

      // Vérifier le résultat
      if (result && typeof result === 'object') {
        if (result.success) {
          const already = !!result.alreadyJoined;
          Alert.alert(
            already ? 'ℹ️ Déjà présente' : '✅ Mission ajoutée',
            result.message || (already ? 'Cette mission est déjà dans votre liste' : 'La mission a été ajoutée avec succès'),
            [
              {
                text: 'OK',
                onPress: () => {
                  setCode('');
                  onClose();
                  onSuccess();
                },
              },
            ]
          );
        } else {
          Alert.alert('Erreur', result.message || result.error || 'Impossible de rejoindre la mission');
        }
      } else if (result === true) {
        Alert.alert('✅ Mission ajoutée', 'La mission a été ajoutée à votre liste avec succès', [
          { text: 'OK', onPress: () => { setCode(''); onClose(); onSuccess(); } }
        ]);
      } else {
        throw new Error('Réponse invalide du serveur');
      }
    } catch (error: any) {
      console.error('❌ Erreur rejoindre mission:', error);
      Alert.alert(
        'Erreur',
        error.message || 'Impossible de rejoindre la mission. Vérifiez le code et réessayez.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.card }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              Rejoindre une mission
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Instructions */}
          <View style={[styles.infoBox, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="information-circle" size={20} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.text }]}>
              Entrez le code de partage au format XZ-ABC-123 (8 caractères)
            </Text>
          </View>

          {/* Input */}
          <View style={styles.inputSection}>
            <Text style={[styles.label, { color: colors.text }]}>
              Code de partage
            </Text>
            <View style={[styles.inputContainer, { borderColor: colors.border }]}>
              <Ionicons name="key" size={20} color={colors.primary} style={styles.icon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={code}
                onChangeText={handleCodeChange}
                placeholder="XZ-ABC-123"
                placeholderTextColor={colors.textSecondary}
                maxLength={10}
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!loading}
              />
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary, { borderColor: colors.border }]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={[styles.buttonText, { color: colors.text }]}>Annuler</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.buttonPrimary,
                { backgroundColor: colors.primary },
                loading && styles.buttonDisabled,
              ]}
              onPress={handleJoinMission}
              disabled={loading || code.replace(/[^A-Z0-9]/g, '').length !== 8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="add-circle" size={20} color="#fff" />
                  <Text style={styles.buttonPrimaryText}>Rejoindre</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
  },
  inputSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 50,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  buttonSecondary: {
    borderWidth: 1.5,
  },
  buttonPrimary: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  buttonPrimaryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
