import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { copyShareCode, shareMission, showCopySuccess, getShareMessage } from '../lib/shareCode';

interface ShareCodeDisplayProps {
  visible: boolean;
  code: string;
  missionTitle?: string;
  onClose: () => void;
}

export default function ShareCodeDisplay({
  visible,
  code,
  missionTitle,
  onClose,
}: ShareCodeDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  const handleCopy = async () => {
    const success = await copyShareCode(code);
    if (success) {
      setCopied(true);
      showCopySuccess();
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    const success = await shareMission(code, missionTitle);
    if (success) {
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>🎉 Mission créée!</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.description}>
              Partagez ce code pour qu'un utilisateur puisse rejoindre la mission
            </Text>

            {/* Code Display */}
            <View style={styles.codeContainer}>
              <Text style={styles.codeLabel}>CODE DE MISSION</Text>
              <Text style={styles.code}>{code}</Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.actions}>
              <TouchableOpacity
                onPress={handleCopy}
                style={[styles.button, styles.copyButton, copied && styles.successButton]}
              >
                <Ionicons
                  name={copied ? 'checkmark' : 'copy-outline'}
                  size={20}
                  color="#fff"
                />
                <Text style={styles.buttonText}>{copied ? 'Copié!' : 'Copier le code'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleShare}
                style={[styles.button, styles.shareButton, shared && styles.successButton]}
              >
                <Ionicons
                  name={shared ? 'checkmark' : 'share-outline'}
                  size={20}
                  color="#fff"
                />
                <Text style={styles.buttonText}>{shared ? 'Partagé!' : 'Partager'}</Text>
              </TouchableOpacity>
            </View>

            {/* Instructions */}
            <View style={styles.instructions}>
              <Text style={styles.instructionsTitle}>
                📱 Comment l'utilisateur rejoint la mission:
              </Text>
              <View style={styles.stepsList}>
                <Text style={styles.step}>1. Ouvre l'app CHECKSFLEET</Text>
                <Text style={styles.step}>2. Va dans "Missions"</Text>
                <Text style={styles.step}>3. Clique "Rejoindre une mission"</Text>
                <Text style={styles.step}>
                  4. Entre le code: <Text style={styles.stepCode}>{code}</Text>
                </Text>
              </View>
            </View>

            {/* Share Message Preview */}
            <View style={styles.preview}>
              <Text style={styles.previewTitle}>📄 Message de partage</Text>
              <View style={styles.previewBox}>
                <Text style={styles.previewText}>{getShareMessage(code, missionTitle)}</Text>
              </View>
            </View>

            {/* Close Button */}
            <TouchableOpacity onPress={onClose} style={styles.closeButtonLarge}>
              <Text style={styles.closeButtonText}>Voir mes missions</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
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
  title: {
    fontSize: 24,
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
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
  },
  codeContainer: {
    backgroundColor: 'linear-gradient(135deg, #ecfeff, #dbeafe)',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#a5f3fc',
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: 12,
    color: '#0891b2',
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 8,
  },
  code: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0891b2',
    letterSpacing: 4,
    fontFamily: 'monospace',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  copyButton: {
    backgroundColor: '#0891b2',
  },
  shareButton: {
    backgroundColor: '#2563eb',
  },
  successButton: {
    backgroundColor: '#10b981',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  instructions: {
    backgroundColor: '#dbeafe',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#93c5fd',
  },
  instructionsTitle: {
    fontSize: 12,
    color: '#1e3a8a',
    fontWeight: '600',
    marginBottom: 12,
  },
  stepsList: {
    gap: 8,
  },
  step: {
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 20,
  },
  stepCode: {
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  preview: {
    marginBottom: 20,
  },
  previewTitle: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 8,
  },
  previewBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  previewText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
  },
  closeButtonLarge: {
    backgroundColor: '#0891b2',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
