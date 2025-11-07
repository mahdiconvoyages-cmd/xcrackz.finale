import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Share,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '../lib/supabase';

interface ShareReportSheetProps {
  visible: boolean;
  onClose: () => void;
  missionId: string;
  missionReference?: string | null;
  vehicleLabel?: string;
  plate?: string;
}

export default function ShareReportSheet({
  visible,
  onClose,
  missionId,
  missionReference,
  vehicleLabel,
  plate,
}: ShareReportSheetProps) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('🔍 ShareReportSheet useEffect:', { visible, missionId });
    if (visible && missionId) {
      console.log('🔗 ShareReportSheet: Generating link for mission:', missionId);
      generateShareLink();
    } else if (visible && !missionId) {
      console.log('⚠️ ShareReportSheet opened without missionId');
      setError('Mission introuvable. Veuillez réessayer.');
    }
  }, [visible, missionId]);

  const generateShareLink = async () => {
    console.log('📝 Starting link generation...');
    setLoading(true);
    setError(null);
    try {
      console.log('📡 Calling RPC with missionId:', missionId);
      const { data, error: rpcError } = await supabase.rpc('create_or_update_public_report', {
        p_mission_id: missionId,
      }) as any;

      console.log('📊 RPC Response:', { data, error: rpcError });

      if (rpcError) throw rpcError;

      if (data?.success) {
        console.log('✅ Share URL generated:', data.share_url);
        setShareUrl(data.share_url);
      } else {
        console.log('❌ RPC call failed:', data);
        throw new Error('Impossible de générer le lien');
      }
    } catch (err: any) {
      console.error('❌ Error generating share link:', err);
      setError(err.message || 'Erreur lors de la génération du lien');
      Alert.alert('Erreur', err.message || 'Impossible de générer le lien de partage');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!shareUrl) return;
    try {
      await Clipboard.setStringAsync(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      Alert.alert('Erreur', 'Impossible de copier le lien');
    }
  };

  const shareViaSystem = async () => {
    if (!shareUrl) return;
    try {
      const message = `📋 Rapport d'inspection - ${missionReference || 'Mission'}\n${
        vehicleLabel ? vehicleLabel + (plate ? ` (${plate})` : '') + '\n' : ''
      }Consultez le rapport complet : ${shareUrl}`;

      await Share.share({
        message,
        url: shareUrl,
      });
    } catch (err: any) {
      if (err.code !== 'ERR_CANCELED') {
        console.error('Share error:', err);
      }
    }
  };

  const shareViaWhatsApp = () => {
    if (!shareUrl) return;
    const text = `📋 Rapport d'inspection - ${missionReference || 'Mission'}\n${
      vehicleLabel ? vehicleLabel + (plate ? ` (${plate})` : '') + '\n' : ''
    }Consultez le rapport complet : ${shareUrl}`;
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(text)}`).catch(() => {
      Alert.alert('Erreur', 'WhatsApp n\'est pas installé');
    });
  };

  const shareViaEmail = () => {
    if (!shareUrl) return;
    const subject = `Rapport d'inspection - ${missionReference || 'Mission'}${
      vehicleLabel ? ' - ' + vehicleLabel : ''
    }`;
    const body = `Bonjour,\n\nVeuillez consulter le rapport d'inspection complet via ce lien :\n\n${shareUrl}\n\n${
      missionReference ? `Référence mission : ${missionReference}\n` : ''
    }${
      vehicleLabel ? `Véhicule : ${vehicleLabel}${plate ? ` (${plate})` : ''}\n` : ''
    }\nCordialement,\nFinality Transport`;
    Linking.openURL(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const shareViaSMS = () => {
    if (!shareUrl) return;
    const text = `Rapport d'inspection ${missionReference ? `- ${missionReference}` : ''}: ${shareUrl}`;
    Linking.openURL(`sms:?body=${encodeURIComponent(text)}`);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Ionicons name="share-social" size={24} color="#14b8a6" />
            <Text style={styles.headerTitle}>Partager le rapport</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Context */}
          {(missionReference || vehicleLabel) && (
            <View style={styles.contextBox}>
              {missionReference && (
                <Text style={styles.contextText}>
                  <Text style={styles.contextLabel}>Mission: </Text>
                  {missionReference}
                </Text>
              )}
              {vehicleLabel && (
                <Text style={styles.contextText}>
                  <Text style={styles.contextLabel}>Véhicule: </Text>
                  {vehicleLabel}
                  {plate ? ` (${plate})` : ''}
                </Text>
              )}
            </View>
          )}

          {/* Loading */}
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#14b8a6" />
              <Text style={styles.loadingText}>Génération du lien...</Text>
            </View>
          )}

          {/* Error */}
          {error && !loading && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={generateShareLink} style={styles.retryButton}>
                <Text style={styles.retryText}>Réessayer</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Share URL */}
          {shareUrl && !loading && (
            <View style={styles.contentContainer}>
              {/* URL Input */}
              <View style={styles.urlSection}>
                <View style={styles.labelRow}>
                  <Ionicons name="link" size={16} color="#475569" />
                  <Text style={styles.sectionLabel}>Lien de partage</Text>
                </View>
                <View style={styles.urlRow}>
                  <TextInput
                    value={shareUrl}
                    editable={false}
                    style={styles.urlInput}
                    numberOfLines={1}
                  />
                  <TouchableOpacity
                    onPress={copyToClipboard}
                    style={[styles.copyButton, copied && styles.copiedButton]}
                  >
                    <Ionicons name={copied ? 'checkmark' : 'copy'} size={20} color="white" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.urlHint}>
                  Ce lien est public et se met à jour automatiquement.
                </Text>
              </View>

              {/* Share Actions */}
              <View style={styles.actionsSection}>
                <Text style={styles.sectionLabel}>Partager via</Text>

                <TouchableOpacity
                  onPress={shareViaSystem}
                  style={[styles.actionButton, styles.shareButton]}
                >
                  <Ionicons name="share-outline" size={20} color="#14b8a6" />
                  <Text style={styles.shareButtonText}>Menu de partage</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={shareViaWhatsApp}
                  style={[styles.actionButton, styles.whatsappButton]}
                >
                  <Ionicons name="logo-whatsapp" size={20} color="#16a34a" />
                  <Text style={styles.whatsappButtonText}>WhatsApp</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={shareViaEmail}
                  style={[styles.actionButton, styles.emailButton]}
                >
                  <Ionicons name="mail" size={20} color="#0284c7" />
                  <Text style={styles.emailButtonText}>Email</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={shareViaSMS}
                  style={[styles.actionButton, styles.smsButton]}
                >
                  <Ionicons name="chatbubble" size={20} color="#9333ea" />
                  <Text style={styles.smsButtonText}>SMS</Text>
                </TouchableOpacity>
              </View>

              {/* Note */}
              <View style={styles.noteBox}>
                <Text style={styles.noteText}>
                  💡 <Text style={styles.noteBold}>Astuce:</Text> Le client pourra consulter le
                  rapport et télécharger toutes les photos en ZIP.
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  closeButton: {
    padding: 8,
  },
  contextBox: {
    backgroundColor: '#f0fdfa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#99f6e4',
  },
  contextText: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 4,
  },
  contextLabel: {
    fontWeight: 'bold',
    color: '#0f172a',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    fontSize: 14,
    color: '#b91c1c',
  },
  retryButton: {
    marginTop: 8,
  },
  retryText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#dc2626',
  },
  contentContainer: {
    gap: 16,
  },
  urlSection: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#475569',
  },
  urlRow: {
    flexDirection: 'row',
    gap: 8,
  },
  urlInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#475569',
  },
  copyButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#14b8a6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  copiedButton: {
    backgroundColor: '#22c55e',
  },
  urlHint: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 8,
  },
  actionsSection: {
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  shareButton: {
    backgroundColor: '#f0fdfa',
    borderColor: '#99f6e4',
  },
  shareButtonText: {
    fontWeight: 'bold',
    color: '#14b8a6',
  },
  whatsappButton: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  whatsappButtonText: {
    fontWeight: 'bold',
    color: '#16a34a',
  },
  emailButton: {
    backgroundColor: '#f0f9ff',
    borderColor: '#bae6fd',
  },
  emailButtonText: {
    fontWeight: 'bold',
    color: '#0284c7',
  },
  smsButton: {
    backgroundColor: '#faf5ff',
    borderColor: '#e9d5ff',
  },
  smsButtonText: {
    fontWeight: 'bold',
    color: '#9333ea',
  },
  noteBox: {
    backgroundColor: '#f0fdfa',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#99f6e4',
  },
  noteText: {
    fontSize: 12,
    color: '#115e59',
  },
  noteBold: {
    fontWeight: 'bold',
  },
});
