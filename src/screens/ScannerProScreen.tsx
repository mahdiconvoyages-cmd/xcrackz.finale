import React, { useState, useRef } from 'react';
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
  Modal,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { useTheme } from '../contexts/ThemeContext';
import CamScannerLikeScanner from '../components/CamScannerLikeScanner';
import * as ImageManipulator from 'expo-image-manipulator';
import { imageFilters } from '../utils/imageFilters';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 60) / 2;

interface ScannedPage {
  id: string;
  uri: string;
  timestamp: number;
  filterApplied?: string; // Nom du filtre appliqué
}

export default function ScannerProScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [scannedPages, setScannedPages] = useState<ScannedPage[]>([]);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedPageForFilter, setSelectedPageForFilter] = useState<ScannedPage | null>(null);
  const [applyingFilter, setApplyingFilter] = useState(false);
  const [proScannerVisible, setProScannerVisible] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.ease,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        easing: Easing.ease,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scannedPages.length]);

  const handleScanDocument = async () => {
    // Ouvrir le scanner professionnel
    setProScannerVisible(true);
  };

  const handleProScanComplete = async (imageUri: string) => {
    console.log('📸 Image scannée reçue:', imageUri);
    
    // Ajouter la page scannée
    const newPage: ScannedPage = {
      id: `${Date.now()}`,
      uri: imageUri,
      timestamp: Date.now(),
      filterApplied: 'Pro Scanner',
    };

    console.log('➕ Ajout de la page:', newPage);
    setScannedPages((prev) => {
      const updated = [...prev, newPage];
      console.log('📄 Total pages après ajout:', updated.length);
      return updated;
    });
    
    // Fermer le scanner APRÈS l'ajout
    setProScannerVisible(false);
    
    Alert.alert('✅ Document scanné', `Page ${scannedPages.length + 1} ajoutée avec succès`);
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

  const handleApplyFilter = async (filterName: string) => {
    if (!selectedPageForFilter) return;

    try {
      setApplyingFilter(true);
      const filter = imageFilters.find(f => f.name === filterName);
      if (!filter) return;

      const filteredUri = await filter.apply(selectedPageForFilter.uri);

      setScannedPages((prev) =>
        prev.map((page) =>
          page.id === selectedPageForFilter.id
            ? { ...page, uri: filteredUri, filterApplied: filterName }
            : page
        )
      );

      setFilterModalVisible(false);
      setSelectedPageForFilter(null);
      
      Alert.alert('✅ Filtre appliqué', `Filtre "${filterName}" appliqué avec succès !`);
    } catch (error) {
      console.error('Erreur application filtre:', error);
      Alert.alert('Erreur', 'Impossible d\'appliquer le filtre');
    } finally {
      setApplyingFilter(false);
    }
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
      console.log('🔄 Début génération PDF de', scannedPages.length, 'pages');
      console.log('📋 Pages à traiter:', scannedPages.map(p => ({ id: p.id, uri: p.uri })));

      // Créer le HTML avec toutes les images
      console.log('📄 Conversion des images en base64...');
      const imagesHtml = await Promise.all(
        scannedPages.map(async (page, index) => {
          try {
            console.log(`  🔍 Page ${index + 1}: Chemin = ${page.uri}`);
            
            // Vérifier si l'URI est valide
            if (!page.uri || page.uri.trim() === '') {
              throw new Error(`Page ${index + 1}: URI vide ou invalide`);
            }
            
            // Vérifier si le fichier existe
            const fileInfo = await FileSystem.getInfoAsync(page.uri);
            console.log(`  📊 Page ${index + 1}: Fichier existe = ${fileInfo.exists}, Taille = ${fileInfo.exists ? fileInfo.size : 'N/A'}`);
            
            if (!fileInfo.exists) {
              throw new Error(`Page ${index + 1}: Fichier introuvable à ${page.uri}`);
            }
            
            // Lire l'image en base64
            const base64 = await FileSystem.readAsStringAsync(page.uri, {
              encoding: 'base64',
            });
            
            if (!base64 || base64.length === 0) {
              throw new Error(`Page ${index + 1}: Base64 vide après lecture`);
            }
            
            console.log(`  ✅ Page ${index + 1} convertie (${base64.length} caractères)`);
            
            return `
              <div style="page-break-after: always; text-align: center; padding: 20px;">
                <img src="data:image/jpeg;base64,${base64}" style="max-width: 100%; max-height: 95vh; height: auto;" />
              </div>
            `;
          } catch (error: any) {
            console.error(`  ❌ Erreur page ${index + 1}:`, error.message);
            throw new Error(`Page ${index + 1}: ${error.message}`);
          }
        })
      );

      console.log('📝 Génération du HTML...');
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { margin: 0; padding: 0; }
              img { display: block; margin: 0 auto; }
              @media print {
                body { margin: 0; }
                div { page-break-after: always; }
              }
            </style>
          </head>
          <body>
            ${imagesHtml.join('')}
          </body>
        </html>
      `;

      console.log('🖨️ Appel expo-print...');
      // Générer le PDF avec expo-print
      const { uri } = await Print.printToFileAsync({ 
        html,
        base64: false 
      });
      
      console.log('✅ PDF créé avec succès:', uri);
      
      setIsGeneratingPDF(false);

      // Proposer le partage du PDF
      Alert.alert(
        '✅ PDF créé !',
        `${scannedPages.length} page(s) exportée(s)`,
        [
          {
            text: 'Partager',
            onPress: async () => {
              try {
                const canShare = await Sharing.isAvailableAsync();
                if (canShare) {
                  await Sharing.shareAsync(uri, {
                    mimeType: 'application/pdf',
                    dialogTitle: 'Partager le document scanné',
                    UTI: 'com.adobe.pdf',
                  });
                } else {
                  Alert.alert('Erreur', 'Le partage n\'est pas disponible sur cet appareil');
                }
              } catch (shareError) {
                console.error('Erreur partage:', shareError);
                Alert.alert('Erreur', 'Impossible de partager le PDF');
              }
            },
          },
          {
            text: 'OK',
            style: 'cancel',
          },
        ]
      );
    } catch (error: any) {
      console.error('❌ PDF generation error:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      Alert.alert(
        'Erreur génération PDF', 
        error.message || 'Impossible de créer le PDF. Vérifiez les logs pour plus de détails.'
      );
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const renderEmptyState = () => (
    <Animated.View 
      style={[
        styles.emptyState,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
        }
      ]}
    >
      <LinearGradient
        colors={['#14b8a6', '#06b6d4', '#0891b2']}
        style={styles.emptyIconModern}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <MaterialCommunityIcons name="scanner" size={100} color="white" />
        <View style={styles.pulseRing} />
      </LinearGradient>
      
      <Text style={styles.emptyTitleModern}>Scanner Professionnel</Text>
      <Text style={styles.emptyTextModern}>
        Numérisez vos documents avec intelligence artificielle{'\n'}
        Détection automatique • Amélioration • Multi-format
      </Text>

      <View style={styles.featuresModern}>
        <View style={styles.featureModernCard}>
          <View style={styles.featureIconContainer}>
            <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.featureIconBg}>
              <MaterialCommunityIcons name="crop" size={28} color="#fff" />
            </LinearGradient>
          </View>
          <Text style={styles.featureModernTitle}>Recadrage AI</Text>
          <Text style={styles.featureModernDesc}>Détection automatique</Text>
        </View>

        <View style={styles.featureModernCard}>
          <View style={styles.featureIconContainer}>
            <LinearGradient colors={['#8b5cf6', '#7c3aed']} style={styles.featureIconBg}>
              <MaterialCommunityIcons name="brightness-6" size={28} color="#fff" />
            </LinearGradient>
          </View>
          <Text style={styles.featureModernTitle}>Amélioration</Text>
          <Text style={styles.featureModernDesc}>Qualité supérieure</Text>
        </View>

        <View style={styles.featureModernCard}>
          <View style={styles.featureIconContainer}>
            <LinearGradient colors={['#10b981', '#059669']} style={styles.featureIconBg}>
              <MaterialCommunityIcons name="file-multiple" size={28} color="#fff" />
            </LinearGradient>
          </View>
          <Text style={styles.featureModernTitle}>Multi-pages</Text>
          <Text style={styles.featureModernDesc}>Sans limite</Text>
        </View>

        <View style={styles.featureModernCard}>
          <View style={styles.featureIconContainer}>
            <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.featureIconBg}>
              <MaterialCommunityIcons name="file-pdf-box" size={28} color="#fff" />
            </LinearGradient>
          </View>
          <Text style={styles.featureModernTitle}>Export PDF</Text>
          <Text style={styles.featureModernDesc}>Haute résolution</Text>
        </View>
      </View>

      <View style={styles.proTipCard}>
        <Ionicons name="bulb" size={24} color="#fbbf24" />
        <View style={styles.proTipContent}>
          <Text style={styles.proTipTitle}>Astuce Pro</Text>
          <Text style={styles.proTipText}>
            Placez le document sur un fond contrasté pour une meilleure détection
          </Text>
        </View>
      </View>
    </Animated.View>
  );

  const renderPageCard = (page: ScannedPage, index: number) => (
    <View key={page.id} style={[styles.pageCard, { backgroundColor: colors.card }]}>
      <View style={styles.pageCardHeader}>
        <Text style={[styles.pageNumber, { color: colors.text }]}>Page {index + 1}</Text>
        <View style={styles.pageCardActions}>
          {page.filterApplied && (
            <View style={styles.filterBadge}>
              <MaterialCommunityIcons name="filter" size={12} color="#14b8a6" />
              <Text style={styles.filterBadgeText}>{page.filterApplied}</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleRemovePage(page.id)}
          >
            <Ionicons name="trash" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.pageImageContainer}>
        <Image source={{ uri: page.uri }} style={styles.pageImage} resizeMode="cover" />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.3)'] as any}
          style={styles.pageOverlay}
        />
      </View>

      <View style={styles.pageFooter}>
        <TouchableOpacity
          style={styles.filterActionButton}
          onPress={() => {
            setSelectedPageForFilter(page);
            setFilterModalVisible(true);
          }}
        >
          <MaterialCommunityIcons name="filter-variant" size={16} color="#14b8a6" />
          <Text style={styles.filterActionText}>Filtre</Text>
        </TouchableOpacity>

        <View style={styles.pageInfoContainer}>
          <Ionicons name="document-text" size={16} color="#14b8a6" />
          <Text style={[styles.pageStatus, { color: '#14b8a6' }]}>
            Prêt pour export
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header Premium */}
      <LinearGradient
        colors={['#14b8a6', '#0d9488']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <View style={styles.headerIconContainer}>
              <MaterialCommunityIcons name="scanner" size={32} color="#fff" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Scanner Documents</Text>
              <Text style={styles.headerSubtitle}>
                {scannedPages.length > 0
                  ? `${scannedPages.length} page(s) scannée(s)`
                  : 'Prêt à scanner'}
              </Text>
            </View>
          </View>
          {scannedPages.length > 0 && (
            <TouchableOpacity style={styles.resetButton} onPress={handleResetAll}>
              <Ionicons name="refresh" size={24} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

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

      {/* Modal de sélection de filtres */}
      <Modal
        visible={filterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choisir un filtre</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Ionicons name="close" size={28} color="#64748b" />
              </TouchableOpacity>
            </View>

            {selectedPageForFilter && (
              <Image source={{ uri: selectedPageForFilter.uri }} style={styles.modalPreview} />
            )}

            <ScrollView style={styles.filtersContainer}>
              {imageFilters.map((filter) => (
                <TouchableOpacity
                  key={filter.name}
                  style={[
                    styles.filterOption,
                    selectedPageForFilter?.filterApplied === filter.name && styles.filterOptionActive
                  ]}
                  onPress={() => handleApplyFilter(filter.name)}
                  disabled={applyingFilter}
                >
                  <View style={styles.filterInfo}>
                    <Text style={styles.filterName}>{filter.name}</Text>
                    <Text style={styles.filterDescription}>{filter.description}</Text>
                  </View>
                  {selectedPageForFilter?.filterApplied === filter.name && (
                    <Ionicons name="checkmark-circle" size={24} color="#14b8a6" />
                  )}
                  {applyingFilter && (
                    <ActivityIndicator size="small" color="#14b8a6" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Scanner type CamScanner avec détection ML automatique */}
      <CamScannerLikeScanner
        visible={proScannerVisible}
        onScanComplete={handleProScanComplete}
        onCancel={() => setProScannerVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  headerIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.95,
    marginTop: 2,
    fontWeight: '600',
  },
  resetButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Platform.OS === 'android' ? 120 : 110,
  },
  
  // Empty State Modern
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
    paddingHorizontal: 24,
  },
  emptyIconModern: {
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    elevation: 12,
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },
  pulseRing: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 3,
    borderColor: 'rgba(20, 184, 166, 0.3)',
  },
  emptyTitleModern: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  emptyTextModern: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 48,
    maxWidth: 340,
  },
  featuresModern: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 32,
  },
  featureModernCard: {
    width: (width - 80) / 2,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.1)',
  },
  featureIconContainer: {
    marginBottom: 12,
  },
  featureIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  featureModernTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
    textAlign: 'center',
  },
  featureModernDesc: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    fontWeight: '500',
  },
  proTipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    maxWidth: 340,
  },
  proTipContent: {
    flex: 1,
  },
  proTipTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fbbf24',
    marginBottom: 4,
  },
  proTipText: {
    fontSize: 13,
    color: '#cbd5e1',
    lineHeight: 18,
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
  pageInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pageStatus: {
    fontSize: 12,
    fontWeight: '600',
    color: '#14b8a6',
  },
  footer: {
    padding: 20,
    paddingBottom: 60,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(30, 41, 59, 0.8)',
    backgroundColor: 'rgba(11, 18, 32, 0.95)',
  },
  exportButton: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  exportGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 18,
    position: 'relative',
  },
  exportText: {
    fontSize: 17,
    fontWeight: '800',
    color: 'white',
    letterSpacing: 0.5,
  },
  exportBadge: {
    position: 'absolute',
    right: 24,
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  exportBadgeText: {
    fontSize: 15,
    fontWeight: '900',
    color: 'white',
  },
  scanButton: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  scanButtonSecondary: {
    shadowColor: '#1e293b',
  },
  scanGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 18,
  },
  scanText: {
    fontSize: 17,
    fontWeight: '800',
    color: 'white',
    letterSpacing: 0.5,
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
  pageCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#14b8a6',
  },
  filterActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    borderRadius: 8,
  },
  filterActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#14b8a6',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  modalPreview: {
    width: '90%',
    height: 200,
    alignSelf: 'center',
    borderRadius: 12,
    marginBottom: 20,
  },
  filtersContainer: {
    paddingHorizontal: 20,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  filterOptionActive: {
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    borderColor: '#14b8a6',
  },
  filterInfo: {
    flex: 1,
  },
  filterName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  filterDescription: {
    fontSize: 13,
    color: '#64748b',
  },
});

