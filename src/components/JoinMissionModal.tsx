import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { validateShareCodeInput } from '../lib/shareCode';

interface JoinMissionModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (missionId: string) => void;
  userId: string;
}

export default function JoinMissionModal({
  visible,
  onClose,
  onSuccess,
  userId,
}: JoinMissionModalProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleClose = () => {
    setCode('');
    setError('');
    setSuccess(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (!userId) return;

    setError('');
    setLoading(true);

    try {
      // Valider le format du code
      const validation = validateShareCodeInput(code);

      if (!validation.valid) {
        setError(validation.error || 'Code invalide');
        setLoading(false);
        return;
      }

      const cleanedCode = validation.code!;

      // Appeler la fonction SQL pour rejoindre la mission
      const { data, error: rpcError } = await supabase.rpc('join_mission_with_code', {
        p_share_code: cleanedCode,
        p_user_id: userId,
      });

      if (rpcError) throw rpcError;

      // Vérifier le résultat
      if (!data.success) {
        setError(data.message || 'Impossible de rejoindre la mission');
        setLoading(false);
        return;
      }

      // Succès!
      setSuccess(true);

      // Attendre un peu avant de fermer
      setTimeout(() => {
        if (onSuccess && data.mission) {
          onSuccess(data.mission.id);
        }
        handleClose();
      }, 2000);
    } catch (error: any) {
      console.error('Error joining mission:', error);
      setError(error.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (text: string) => {
    let value = text.toUpperCase();
    value = value.replace(/[^A-Z0-9-]/g, '');

    if (value.length > 10) {
      value = value.slice(0, 10);
    }

    setCode(value);
    setError('');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.iconContainer}>
                <Ionicons name="log-in-outline" size={24} color="#0891b2" />
              </View>
              <Text style={styles.title}>Rejoindre une mission</Text>
            </View>
            <TouchableOpacity onPress={handleClose} disabled={loading} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {success ? (
              // Success State
              <View style={styles.successContainer}>
                <View style={styles.successIcon}>
                  <Ionicons name="checkmark-circle" size={64} color="#10b981" />
                </View>
                <Text style={styles.successTitle}>Mission ajoutée!</Text>
                <Text style={styles.successMessage}>
                  La mission a été ajoutée à votre liste avec succès.
                </Text>
              </View>
            ) : (
              <>
                {/* Instructions */}
                <Text style={styles.description}>
                  Entrez le code de mission que vous avez reçu pour y accéder et réaliser
                  l'inspection.
                </Text>

                <View style={styles.formatInfo}>
                  <Text style={styles.formatLabel}>📋 Format du code:</Text>
                  <Text style={styles.formatExample}>XZ-ABC-123</Text>
                </View>

                {/* Code Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Code de mission</Text>
                  <TextInput
                    style={styles.input}
                    value={code}
                    onChangeText={handleCodeChange}
                    placeholder="XZ-ABC-123"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={10}
                    editable={!loading}
                    autoFocus
                  />
                  <Text style={styles.charCount}>{code.length}/10 caractères</Text>
                </View>

                {/* Error Message */}
                {error && (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={20} color="#dc2626" />
                    <View style={styles.errorTextContainer}>
                      <Text style={styles.errorTitle}>Erreur</Text>
                      <Text style={styles.errorMessage}>{error}</Text>
                    </View>
                  </View>
                )}

                {/* Actions */}
                <View style={styles.actions}>
                  <TouchableOpacity
                    onPress={handleClose}
                    disabled={loading}
                    style={[styles.button, styles.cancelButton]}
                  >
                    <Text style={styles.cancelButtonText}>Annuler</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={loading || code.length < 8}
                    style={[
                      styles.button,
                      styles.submitButton,
                      (loading || code.length < 8) && styles.disabledButton,
                    ]}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Ionicons name="log-in-outline" size={20} color="#fff" />
                        <Text style={styles.submitButtonText}>Rejoindre</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Tip */}
                <View style={styles.tip}>
                  <Text style={styles.tipText}>
                    💡 <Text style={styles.tipBold}>Astuce:</Text> Vous pouvez coller le code
                    directement depuis votre presse-papier.
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    backgroundColor: '#cffafe',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  description: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 16,
    lineHeight: 20,
  },
  formatInfo: {
    backgroundColor: '#dbeafe',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#93c5fd',
  },
  formatLabel: {
    fontSize: 12,
    color: '#1e3a8a',
    fontWeight: '600',
    marginBottom: 4,
  },
  formatExample: {
    fontSize: 14,
    color: '#1e40af',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: 'bold',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 16,
    fontSize: 24,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#0f172a',
  },
  charCount: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#fecaca',
    gap: 8,
  },
  errorTextContainer: {
    flex: 1,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#991b1b',
    marginBottom: 2,
  },
  errorMessage: {
    fontSize: 13,
    color: '#b91c1c',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 10,
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
  },
  submitButton: {
    backgroundColor: '#0891b2',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  disabledButton: {
    backgroundColor: '#cbd5e1',
  },
  tip: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tipText: {
    fontSize: 12,
    color: '#475569',
  },
  tipBold: {
    fontWeight: '600',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  successIcon: {
    width: 80,
    height: 80,
    backgroundColor: '#d1fae5',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 16,
    color: '#475569',
    textAlign: 'center',
  },
});
