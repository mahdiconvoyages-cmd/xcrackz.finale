import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import SignatureCanvas from 'react-native-signature-canvas';

const { width, height } = Dimensions.get('window');

interface SignatureModalProps {
  visible: boolean;
  onClose: () => void;
  onSign: (signature: string) => void;
  title: string;
  subtitle?: string;
}

export default function SignatureModal({
  visible,
  onClose,
  onSign,
  title,
  subtitle,
}: SignatureModalProps) {
  const signatureRef = useRef<any>(null);
  const [hasSignature, setHasSignature] = useState(false);

  const handleSignature = (signature: string) => {
    setHasSignature(true);
  };

  const handleClear = () => {
    signatureRef.current?.clearSignature();
    setHasSignature(false);
  };

  const handleConfirm = () => {
    if (!hasSignature) {
      Alert.alert('Attention', 'Veuillez signer avant de valider');
      return;
    }

    signatureRef.current?.readSignature();
  };

  const handleEnd = (signature: string) => {
    if (signature) {
      onSign(signature);
      handleClear();
      onClose();
    }
  };

  const webStyle = `
    .m-signature-pad {
      box-shadow: none;
      border: none;
      margin: 0;
      padding: 0;
    }
    .m-signature-pad--body {
      border: none;
      background-color: #ffffff;
    }
    .m-signature-pad--footer {
      display: none;
    }
    body, html {
      margin: 0;
      padding: 0;
      overflow: hidden;
    }
  `;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <LinearGradient
            colors={['#06b6d4', '#0891b2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <View style={styles.headerContent}>
              <View>
                <Text style={styles.title}>{title}</Text>
                {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Feather name="x" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Instructions */}
          <View style={styles.instructions}>
            <Feather name="info" size={20} color="#06b6d4" />
            <Text style={styles.instructionsText}>
              Signez dans l'espace ci-dessous avec votre doigt
            </Text>
          </View>

          {/* Signature Canvas */}
          <View style={styles.canvasContainer}>
            <SignatureCanvas
              ref={signatureRef}
              onOK={handleEnd}
              onEmpty={() => setHasSignature(false)}
              onBegin={() => setHasSignature(true)}
              descriptionText=""
              clearText="Effacer"
              confirmText="Confirmer"
              webStyle={webStyle}
              autoClear={false}
              backgroundColor="#ffffff"
              penColor="#000000"
              minWidth={2}
              maxWidth={4}
            />
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.clearButton]}
              onPress={handleClear}
            >
              <Feather name="trash-2" size={20} color="#ef4444" />
              <Text style={styles.clearButtonText}>Effacer</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.confirmButton]}
              onPress={handleConfirm}
            >
              <LinearGradient
                colors={['#10b981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.confirmGradient}
              >
                <Feather name="check" size={20} color="#fff" />
                <Text style={styles.confirmButtonText}>Valider</Text>
              </LinearGradient>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: width * 0.9,
    height: height * 0.7,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  header: {
    padding: 20,
    paddingTop: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  instructions: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#e0f2fe',
    gap: 12,
  },
  instructionsText: {
    flex: 1,
    fontSize: 14,
    color: '#0c4a6e',
  },
  canvasContainer: {
    flex: 1,
    margin: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  button: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fee2e2',
    gap: 8,
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
  confirmButton: {
    flex: 1,
  },
  confirmGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
