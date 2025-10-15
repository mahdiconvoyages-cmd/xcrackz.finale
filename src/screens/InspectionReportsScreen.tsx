/**
 * 📱 Inspection Reports Screen - React Native
 * 
 * Affiche tous les rapports d'inspection avec:
 * - Liste des rapports (départ seul ou complet)
 * - Visualisation PDF
 * - Galerie photos
 * - Partage email
 * - Téléchargement local
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  ScrollView,
  Dimensions,
  Platform,
  TextInput,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { useAuth } from '../contexts/AuthContext';
import {
  listInspectionReports,
  generateInspectionPDF,
  downloadAllPhotos,
  sendInspectionReportByEmail,
  type InspectionReport,
} from '../services/inspectionReportService';

const { width } = Dimensions.get('window');

export default function InspectionReportsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();

  const [reports, setReports] = useState<InspectionReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // État pour les modales
  const [selectedReport, setSelectedReport] = useState<InspectionReport | null>(null);
  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [senderName, setSenderName] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  // Photo viewer
  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);
  const [currentPhotos, setCurrentPhotos] = useState<string[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  // PDF
  const [generatingPDF, setGeneratingPDF] = useState(false);

  useEffect(() => {
    loadReports();
  }, [user]);

  const loadReports = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const result = await listInspectionReports(user.id);

      if (result.success) {
        setReports(result.reports);
      } else {
        Alert.alert('Erreur', result.message);
      }
    } catch (error: any) {
      Alert.alert('Erreur', 'Impossible de charger les rapports');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReports();
    setRefreshing(false);
  };

  // Télécharger et partager le PDF
  const handleDownloadPDF = async (report: InspectionReport) => {
    try {
      setGeneratingPDF(true);

      // Pour mobile, on appelle le backend pour générer le PDF
      Alert.alert(
        'Téléchargement PDF',
        'Voulez-vous télécharger le PDF ou l\'envoyer par email ?',
        [
          {
            text: 'Annuler',
            style: 'cancel',
            onPress: () => setGeneratingPDF(false),
          },
          {
            text: 'Envoyer par email',
            onPress: () => {
              setGeneratingPDF(false);
              setSelectedReport(report);
              setEmailModalVisible(true);
            },
          },
          {
            text: 'Télécharger',
            onPress: async () => {
              try {
                // TODO: Implémenter la génération PDF via backend
                const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
                const fileName = `inspection-${report.mission_reference}.pdf`;
                const fileUri = (FileSystem as any).cacheDirectory + fileName;

                // Télécharger depuis le backend
                const downloadResult = await FileSystem.downloadAsync(
                  `${apiUrl}/api/reports/pdf/${report.mission_id}`,
                  fileUri
                );

                // Partager le PDF
                if (await Sharing.isAvailableAsync()) {
                  await Sharing.shareAsync(downloadResult.uri, {
                    mimeType: 'application/pdf',
                    dialogTitle: `Rapport ${report.mission_reference}`,
                  });
                } else {
                  Alert.alert('Succès', `PDF sauvegardé : ${fileName}`);
                }

                setGeneratingPDF(false);
              } catch (err: any) {
                setGeneratingPDF(false);
                Alert.alert('Erreur', 'La génération de PDF sera disponible prochainement. Utilisez l\'envoi par email.');
              }
            },
          },
        ]
      );
    } catch (error: any) {
      setGeneratingPDF(false);
      Alert.alert('Erreur', 'Impossible de générer le PDF');
      console.error(error);
    }
  };


  // Afficher les photos
  const handleViewPhotos = async (report: InspectionReport) => {
    try {
      const result = await downloadAllPhotos(report);

      if (result.success && result.urls.length > 0) {
        setCurrentPhotos(result.urls);
        setCurrentPhotoIndex(0);
        setPhotoViewerVisible(true);
      } else {
        Alert.alert('Info', 'Aucune photo disponible');
      }
    } catch (error: any) {
      Alert.alert('Erreur', 'Impossible de charger les photos');
      console.error(error);
    }
  };

  // Envoyer par email
  const handleSendEmail = async () => {
    if (!selectedReport) return;
    if (!emailAddress.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer une adresse email');
      return;
    }

    try {
      setSendingEmail(true);

      const result = await sendInspectionReportByEmail(
        selectedReport,
        emailAddress.trim(),
        senderName.trim() || user?.email || 'Utilisateur'
      );

      if (result.success) {
        Alert.alert('Succès', result.message);
        setEmailModalVisible(false);
        setEmailAddress('');
        setSenderName('');
        setSelectedReport(null);
      } else {
        Alert.alert('Erreur', result.message);
      }
    } catch (error: any) {
      Alert.alert('Erreur', 'Impossible d\'envoyer l\'email');
      console.error(error);
    } finally {
      setSendingEmail(false);
    }
  };

  // Rendu d'une carte de rapport
  const renderReportCard = ({ item }: { item: InspectionReport }) => {
    const statusColor = item.is_complete ? '#10b981' : '#f59e0b';
    const statusText = item.is_complete ? '✓ Complet' : '⏳ Départ uniquement';

    return (
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="document-text" size={24} color="#3b82f6" />
            <Text style={styles.cardTitle}>{item.mission_reference}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{statusText}</Text>
          </View>
        </View>

        {/* Infos véhicule */}
        <View style={styles.cardContent}>
          <View style={styles.infoRow}>
            <Ionicons name="car" size={16} color="#6b7280" />
            <Text style={styles.infoText}>
              {item.vehicle_make} {item.vehicle_model}
            </Text>
          </View>
          {item.vehicle_plate && (
            <View style={styles.infoRow}>
              <Ionicons name="pricetag" size={16} color="#6b7280" />
              <Text style={styles.infoText}>{item.vehicle_plate}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Ionicons name="calendar" size={16} color="#6b7280" />
            <Text style={styles.infoText}>
              {new Date(item.created_at).toLocaleDateString('fr-FR')}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.pdfButton]}
            onPress={() => handleDownloadPDF(item)}
            disabled={generatingPDF}
          >
            <Ionicons name="document-text" size={18} color="white" />
            <Text style={styles.actionButtonText}>PDF</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.photosButton]}
            onPress={() => handleViewPhotos(item)}
          >
            <Ionicons name="images" size={18} color="white" />
            <Text style={styles.actionButtonText}>Photos</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.emailButton]}
            onPress={() => {
              setSelectedReport(item);
              setEmailModalVisible(true);
            }}
          >
            <Ionicons name="mail" size={18} color="white" />
            <Text style={styles.actionButtonText}>Email</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Chargement des rapports...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rapports d'Inspection</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Statistiques */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{reports.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {reports.filter(r => r.is_complete).length}
          </Text>
          <Text style={styles.statLabel}>Complets</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {reports.filter(r => !r.is_complete).length}
          </Text>
          <Text style={styles.statLabel}>Départ seul</Text>
        </View>
      </View>

      {/* Liste des rapports */}
      {reports.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={64} color="#d1d5db" />
          <Text style={styles.emptyText}>Aucun rapport d'inspection</Text>
          <Text style={styles.emptySubtext}>
            Les rapports apparaîtront ici après la complétion des inspections
          </Text>
        </View>
      ) : (
        <FlatList
          data={reports}
          renderItem={renderReportCard}
          keyExtractor={(item) => item.mission_id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      {/* Modal Email */}
      <Modal
        visible={emailModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEmailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Envoyer par Email</Text>
              <TouchableOpacity onPress={() => setEmailModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>Adresse email *</Text>
              <TextInput
                style={styles.input}
                placeholder="exemple@email.com"
                value={emailAddress}
                onChangeText={setEmailAddress}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={styles.label}>Votre nom (optionnel)</Text>
              <TextInput
                style={styles.input}
                placeholder="Votre nom"
                value={senderName}
                onChangeText={setSenderName}
              />

              <TouchableOpacity
                style={[styles.sendButton, sendingEmail && styles.sendButtonDisabled]}
                onPress={handleSendEmail}
                disabled={sendingEmail}
              >
                {sendingEmail ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Ionicons name="send" size={20} color="white" />
                    <Text style={styles.sendButtonText}>Envoyer</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Photo Viewer */}
      <Modal
        visible={photoViewerVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setPhotoViewerVisible(false)}
      >
        <View style={styles.photoViewerOverlay}>
          <TouchableOpacity
            style={styles.closePhotoButton}
            onPress={() => setPhotoViewerVisible(false)}
          >
            <Ionicons name="close-circle" size={40} color="white" />
          </TouchableOpacity>

          {currentPhotos.length > 0 && (
            <>
              <Image
                source={{ uri: currentPhotos[currentPhotoIndex] }}
                style={styles.photoImage}
                resizeMode="contain"
              />

              <View style={styles.photoNavigation}>
                <TouchableOpacity
                  style={styles.photoNavButton}
                  onPress={() =>
                    setCurrentPhotoIndex((prev) =>
                      prev > 0 ? prev - 1 : currentPhotos.length - 1
                    )
                  }
                >
                  <Ionicons name="chevron-back" size={30} color="white" />
                </TouchableOpacity>

                <Text style={styles.photoCounter}>
                  {currentPhotoIndex + 1} / {currentPhotos.length}
                </Text>

                <TouchableOpacity
                  style={styles.photoNavButton}
                  onPress={() =>
                    setCurrentPhotoIndex((prev) =>
                      prev < currentPhotos.length - 1 ? prev + 1 : 0
                    )
                  }
                >
                  <Ionicons name="chevron-forward" size={30} color="white" />
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#3b82f6',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 15,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'center',
  },
  refreshButton: {
    padding: 8,
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },

  // List
  listContainer: {
    padding: 16,
  },

  // Card
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  cardContent: {
    padding: 16,
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#374151',
  },
  cardActions: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  pdfButton: {
    backgroundColor: '#ef4444',
  },
  photosButton: {
    backgroundColor: '#8b5cf6',
  },
  emailButton: {
    backgroundColor: '#14b8a6',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalBody: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 8,
    marginTop: 24,
    gap: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },

  // Photo Viewer
  photoViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closePhotoButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 20,
    zIndex: 10,
  },
  photoImage: {
    width: width,
    height: width,
  },
  photoNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'absolute',
    bottom: 50,
    width: '100%',
    paddingHorizontal: 20,
  },
  photoNavButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 25,
    padding: 10,
  },
  photoCounter: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});
