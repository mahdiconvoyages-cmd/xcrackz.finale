import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { PDFDocument } from 'pdf-lib';
import DocumentScanner from 'react-native-document-scanner-plugin';
import { useSubscription } from '../hooks/useSubscription';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 60) / 2;

interface ScannedPage {
  id: string;
  uri: string;
  timestamp: number;
}

export default function ScannerScreen({ navigation }: any) {
  const { subscription: userSubscription, loading: subscriptionLoading } = useSubscription();
  const [scannedPages, setScannedPages] = useState<ScannedPage[]>([]);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const handleScanDocument = async () => {
    try {
      setIsScanning(true);

      // Lancer le scanner avec détection automatique
      const { scannedImages } = await DocumentScanner.scanDocument({
        // Options de scan
        maxNumDocuments: 1, // 1 page à la fois (on peut répéter pour multi-pages)
        croppedImageQuality: 100, // Qualité maximale
        responseType: 'base64' as any, // Retourne le chemin du fichier
      });

      if (scannedImages && scannedImages.length > 0) {
        // Ajouter les nouvelles pages scannées
        const newPages: ScannedPage[] = scannedImages.map((uri, index) => ({
          id: `${Date.now()}_${index}`,
          uri,
          timestamp: Date.now(),
        }));

        setScannedPages((prev) => [...prev, ...newPages]);
        Alert.alert('Succès', `${newPages.length} page(s) ajoutée(s) !`);
      } else {
        Alert.alert('Annulé', 'Aucun document scanné');
      }
    } catch (error: any) {
      console.error('Scan error:', error);
      if (error.message !== 'User canceled document scan') {
        Alert.alert('Erreur', 'Impossible de scanner le document. Vérifiez les permissions caméra.');
      }
    } finally {
      setIsScanning(false);
    }
  };

  const handleRemovePage = (id: string) => {
    Alert.alert('Supprimer', 'Voulez-vous supprimer cette page ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => setScannedPages((prev) => prev.filter((page) => page.id !== id)),
      },
    ]);
  };

  const handleResetAll = () => {
    Alert.alert('Réinitialiser', 'Supprimer tous les scans ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Réinitialiser',
        style: 'destructive',
        onPress: () => setScannedPages([]),
      },
    ]);
  };

  const handleExportPDF = async () => {
    if (scannedPages.length === 0) {
      Alert.alert('Erreur', 'Aucune page à exporter');
      return;
    }

    try {
      setIsGeneratingPDF(true);

      // Créer un nouveau document PDF
      const pdfDoc = await PDFDocument.create();

      // Ajouter chaque page scannée au PDF
      for (const page of scannedPages) {
        // Lire l'image en base64
        const base64 = await FileSystem.readAsStringAsync(page.uri, {
          encoding: 'base64' as any,
        });

        // Déterminer le type d'image (PNG ou JPEG)
        const imageBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        
        let image;
        if (page.uri.toLowerCase().endsWith('.png')) {
          image = await pdfDoc.embedPng(imageBytes);
        } else {
          image = await pdfDoc.embedJpg(imageBytes);
        }

        // Créer une page avec les dimensions de l'image
        const pdfPage = pdfDoc.addPage([image.width, image.height]);
        
        // Dessiner l'image sur la page
        pdfPage.drawImage(image, {
          x: 0,
          y: 0,
          width: image.width,
          height: image.height,
        });
      }

      // Sauvegarder le PDF
      const pdfBytes = await pdfDoc.save();
      const pdfBase64 = btoa(String.fromCharCode(...pdfBytes));

      // Créer le fichier PDF dans le cache
      const fileName = `xcrackz_Scan_${Date.now()}.pdf`;
      const fileUri = (FileSystem as any).documentDirectory + fileName;

      await FileSystem.writeAsStringAsync(fileUri, pdfBase64, {
        encoding: 'base64' as any,
      });

      // Proposer le partage du PDF
      Alert.alert(
        'PDF créé !',
        `${scannedPages.length} page(s) exportée(s)`,
        [
          {
            text: 'Partager',
            onPress: async () => {
              const canShare = await Sharing.isAvailableAsync();
              if (canShare) {
                await Sharing.shareAsync(fileUri, {
                  mimeType: 'application/pdf',
                  dialogTitle: 'Partager le document scanné',
                  UTI: 'com.adobe.pdf',
                });
              } else {
                Alert.alert('Erreur', 'Le partage n\'est pas disponible sur cet appareil');
              }
            },
          },
          {
            text: 'OK',
            style: 'cancel',
          },
        ]
      );
    } catch (error) {
      console.error('PDF generation error:', error);
      Alert.alert('Erreur', 'Impossible de créer le PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <LinearGradient
        colors={['#0d9488', '#14b8a6'] as any}
        style={styles.emptyIcon}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <MaterialCommunityIcons name="scanner" size={80} color="white" />
      </LinearGradient>
      <Text style={styles.emptyTitle}>Scanner de documents</Text>
      <Text style={styles.emptyText}>
        Scannez vos documents avec détection automatique{'\n'}
        des bords et amélioration de l'image
      </Text>

      <View style={styles.featuresContainer}>
        <View style={styles.featureItem}>
          <MaterialCommunityIcons name="crop" size={24} color="#14b8a6" />
          <Text style={styles.featureText}>Recadrage auto</Text>
        </View>
        <View style={styles.featureItem}>
          <MaterialCommunityIcons name="brightness-6" size={24} color="#14b8a6" />
          <Text style={styles.featureText}>Amélioration</Text>
        </View>
        <View style={styles.featureItem}>
          <MaterialCommunityIcons name="file-multiple" size={24} color="#14b8a6" />
          <Text style={styles.featureText}>Multi-pages</Text>
        </View>
        <View style={styles.featureItem}>
          <MaterialCommunityIcons name="file-pdf-box" size={24} color="#14b8a6" />
          <Text style={styles.featureText}>Export PDF</Text>
        </View>
      </View>
    </View>
  );

  const renderPageCard = (page: ScannedPage, index: number) => (
    <View key={page.id} style={styles.pageCard}>
      <View style={styles.pageCardHeader}>
        <Text style={styles.pageNumber}>Page {index + 1}</Text>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleRemovePage(page.id)}
        >
          <Feather name="trash-2" size={16} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <View style={styles.pageImageContainer}>
        <Image source={{ uri: page.uri }} style={styles.pageImage} resizeMode="cover" />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.3)'] as any}
          style={styles.pageOverlay}
        />
      </View>

      <View style={styles.pageFooter}>
        <MaterialCommunityIcons name="check-circle" size={16} color="#14b8a6" />
        <Text style={styles.pageStatus}>Scanné</Text>
      </View>
    </View>
  );

  if (subscriptionLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#14b8a6" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!userSubscription.isActive) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="#0b1220" />
        <View style={styles.subscriptionRequired}>
          <View style={styles.subscriptionCard}>
            <MaterialCommunityIcons name="lock" size={60} color="#f97316" />
            <Text style={styles.subscriptionTitle}>Abonnement requis</Text>
            <Text style={styles.subscriptionMessage}>
              Pour utiliser le scanner professionnel, vous devez disposer d'un abonnement actif.
            </Text>
            {userSubscription.expiresAt && new Date(userSubscription.expiresAt) < new Date() && (
              <View style={styles.expiryNotice}>
                <MaterialCommunityIcons name="clock-alert-outline" size={20} color="#dc2626" />
                <Text style={styles.expiryText}>Abonnement expiré</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.subscriptionButton}
              onPress={() => navigation.navigate('Shop')}
            >
              <LinearGradient
                colors={['#f97316', '#dc2626'] as any}
                style={styles.subscriptionGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons name="cart" size={20} color="white" />
                <Text style={styles.subscriptionButtonText}>Voir les abonnements</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backButtonText}>Retour</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0b1220" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <LinearGradient
            colors={['#0d9488', '#14b8a6'] as any}
            style={styles.headerIcon}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <MaterialCommunityIcons name="scanner" size={28} color="white" />
          </LinearGradient>
          <View>
            <Text style={styles.headerTitle}>Scanner Pro</Text>
            <Text style={styles.headerSubtitle}>
              {scannedPages.length > 0
                ? `${scannedPages.length} page(s) scannée(s)`
                : 'Aucune page'}
            </Text>
          </View>
        </View>

        {scannedPages.length > 0 && (
          <TouchableOpacity style={styles.resetButton} onPress={handleResetAll}>
            <Feather name="refresh-cw" size={20} color="#ef4444" />
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {scannedPages.length === 0 ? (
          renderEmptyState()
        ) : (
          <View style={styles.pagesGrid}>
            {scannedPages.map((page, index) => renderPageCard(page, index))}
          </View>
        )}
      </ScrollView>

      {/* Footer Actions */}
      <View style={styles.footer}>
        {scannedPages.length > 0 && (
          <TouchableOpacity
            style={styles.exportButton}
            onPress={handleExportPDF}
            disabled={isGeneratingPDF}
          >
            <LinearGradient
              colors={['#3b82f6', '#8b5cf6'] as any}
              style={styles.exportGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isGeneratingPDF ? (
                <>
                  <ActivityIndicator size="small" color="white" />
                  <Text style={styles.exportText}>Génération...</Text>
                </>
              ) : (
                <>
                  <MaterialCommunityIcons name="file-pdf-box" size={24} color="white" />
                  <Text style={styles.exportText}>Exporter en PDF</Text>
                  <View style={styles.exportBadge}>
                    <Text style={styles.exportBadgeText}>{scannedPages.length}</Text>
                  </View>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.scanButton, scannedPages.length > 0 && styles.scanButtonSecondary]}
          onPress={handleScanDocument}
          disabled={isScanning}
        >
          <LinearGradient
            colors={
              scannedPages.length > 0
                ? ['#1e293b', '#334155']
                : (['#0d9488', '#14b8a6'] as any)
            }
            style={styles.scanGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {isScanning ? (
              <>
                <ActivityIndicator size="small" color="white" />
                <Text style={styles.scanText}>Scan en cours...</Text>
              </>
            ) : (
              <>
                <MaterialCommunityIcons name="camera-plus" size={24} color="white" />
                <Text style={styles.scanText}>
                  {scannedPages.length > 0 ? 'Ajouter une page' : 'Scanner un document'}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1220',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  resetButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Platform.OS === 'android' ? 110 : 100,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: 'white',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 20,
  },
  featureItem: {
    alignItems: 'center',
    width: 100,
  },
  featureText: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 8,
    fontWeight: '600',
    textAlign: 'center',
  },
  pagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    gap: 16,
  },
  pageCard: {
    width: CARD_WIDTH,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
  },
  pageCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  pageNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#ef444415',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageImageContainer: {
    width: '100%',
    aspectRatio: 0.7,
    position: 'relative',
  },
  pageImage: {
    width: '100%',
    height: '100%',
  },
  pageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  pageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  pageStatus: {
    fontSize: 12,
    fontWeight: '600',
    color: '#14b8a6',
  },
  footer: {
    padding: 20,
    paddingBottom: 60, // Raised by 3cm (40px extra) for better button positioning
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    backgroundColor: '#0b1220',
  },
  exportButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  exportGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    position: 'relative',
  },
  exportText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  exportBadge: {
    position: 'absolute',
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  exportBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: 'white',
  },
  scanButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  scanButtonSecondary: {},
  scanGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  scanText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0b1220',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: '600',
  },
  subscriptionRequired: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#0b1220',
  },
  subscriptionCard: {
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(249, 115, 22, 0.3)',
    maxWidth: 400,
    width: '100%',
  },
  subscriptionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#f8fafc',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  subscriptionMessage: {
    fontSize: 16,
    color: '#cbd5e1',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  expiryNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(220, 38, 38, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  expiryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fca5a5',
  },
  subscriptionButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  subscriptionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  subscriptionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
});
