import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';

interface QRScannerBackupProps {
  visible: boolean;
  onClose: () => void;
  onCodeScanned: (code: string) => void;
  title?: string;
  description?: string;
}

export default function QRScannerBackup({
  visible,
  onClose,
  onCodeScanned,
  title = 'Scanner manuel',
  description = 'Si la caméra ne fonctionne pas, entrez le code manuellement',
}: QRScannerBackupProps) {
  const [manualCode, setManualCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleManualSubmit = async () => {
    if (!manualCode.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un code');
      return;
    }

    setIsProcessing(true);
    try {
      // Valider le format du code
      if (manualCode.length < 3) {
        throw new Error('Code trop court');
      }

      // Appeler la fonction de callback
      await onCodeScanned(manualCode.trim());
      
      // Réinitialiser et fermer
      setManualCode('');
      onClose();
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Code invalide');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const { Clipboard } = await import('expo-clipboard');
      const text = await Clipboard.getStringAsync();
      if (text) {
        setManualCode(text);
      }
    } catch (error) {
      console.error('Erreur collage:', error);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.backdrop}>
          <View style={styles.content}>
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <MaterialIcons name="qr-code-scanner" size={32} color="#2563eb" />
              </View>
              <Text style={styles.title}>{title}</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
              >
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.description}>{description}</Text>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Entrez le code ici..."
                placeholderTextColor="#9ca3af"
                value={manualCode}
                onChangeText={setManualCode}
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!isProcessing}
              />
              <TouchableOpacity
                style={styles.pasteButton}
                onPress={handlePasteFromClipboard}
                disabled={isProcessing}
              >
                <Ionicons name="clipboard" size={20} color="#2563eb" />
              </TouchableOpacity>
            </View>

            <View style={styles.sampleContainer}>
              <Text style={styles.sampleTitle}>Exemples de formats acceptés:</Text>
              <View style={styles.samples}>
                <Text style={styles.sampleText}>• MIS-2024-001</Text>
                <Text style={styles.sampleText}>• VEH-ABC123</Text>
                <Text style={styles.sampleText}>• INS-20240101-0001</Text>
              </View>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
                disabled={isProcessing}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.submitButton,
                  (!manualCode.trim() || isProcessing) && styles.buttonDisabled,
                ]}
                onPress={handleManualSubmit}
                disabled={!manualCode.trim() || isProcessing}
              >
                <Text style={styles.submitButtonText}>
                  {isProcessing ? 'Traitement...' : 'Valider'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.helpContainer}>
              <Ionicons name="information-circle" size={16} color="#6b7280" />
              <Text style={styles.helpText}>
                Le code se trouve généralement sur le document ou l'équipement
              </Text>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  closeButton: {
    padding: 5,
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  input: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: '#f9fafb',
  },
  pasteButton: {
    marginLeft: 10,
    padding: 13,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
  },
  sampleContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  sampleTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  samples: {
    gap: 4,
  },
  sampleText: {
    fontSize: 13,
    color: '#9ca3af',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  submitButton: {
    backgroundColor: '#2563eb',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  helpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    gap: 6,
  },
  helpText: {
    flex: 1,
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 16,
  },
});