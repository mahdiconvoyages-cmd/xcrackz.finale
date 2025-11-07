/**
 * Écran Inspection Arrivée - Mobile (Version dédiée)
 * Inclut: Photos, Scanner de documents, Frais, Signatures
 * Retire: Champs optionnels notés au départ (nombre de clés, documents véhicule, etc.)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import SignaturePad from '../../components/inspection/SignaturePad';
import PhotoIndicator from '../../components/inspection/PhotoIndicator';
import CamScannerLikeScanner from '../../components/CamScannerLikeScanner';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

interface PhotoData {
  type: string;
  label: string;
  uri: string | null;
  captured: boolean;
}

interface ScannedDocument {
  id: string;
  title: string;
  uri: string;
  pages: string[]; // URIs des pages scannées
  pagesCount: number;
}

interface Expense {
  id: string;
  type: 'carburant' | 'peage' | 'transport' | 'imprevu';
  amount: string;
  description: string;
  receiptUri: string | null;
}

const REQUIRED_PHOTOS: Omit<PhotoData, 'uri' | 'captured'>[] = [
  { type: 'front', label: 'Face avant générale' },
  { type: 'back', label: 'Face arrière générale' },
  { type: 'left_front', label: 'Latéral gauche avant' },
  { type: 'left_back', label: 'Latéral gauche arrière' },
  { type: 'right_front', label: 'Latéral droit avant' },
  { type: 'right_back', label: 'Latéral droit arrière' },
  { type: 'interior', label: 'Intérieur véhicule' },
  { type: 'dashboard', label: 'Tableau de bord' },
];

const EXPENSE_TYPES = [
  { value: 'carburant', label: '⛽ Carburant', icon: 'gas-station' },
  { value: 'peage', label: '🛣️ Péage', icon: 'road-variant' },
  { value: 'transport', label: '🚌 Transport', icon: 'bus' },
  { value: 'imprevu', label: '❗ Imprévu', icon: 'alert-circle' },
];

export default function InspectionArrivalNew({ route, navigation }: any) {
  const { missionId } = route.params || {};
  const { user } = useAuth();
  const { colors } = useTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mission, setMission] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(1);

  // Photos (8 obligatoires)
  const [photos, setPhotos] = useState<PhotoData[]>(
    REQUIRED_PHOTOS.map((p) => ({ ...p, uri: null, captured: false }))
  );

  // Documents scannés
  const [scannedDocuments, setScannedDocuments] = useState<ScannedDocument[]>([]);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [currentDocTitle, setCurrentDocTitle] = useState('');
  const [docTitleModalVisible, setDocTitleModalVisible] = useState(false);
  const [docTitleInput, setDocTitleInput] = useState('');

  // Frais
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseModalVisible, setExpenseModalVisible] = useState(false);
  const [newExpenseType, setNewExpenseType] = useState<'carburant' | 'peage' | 'transport' | 'imprevu'>('carburant');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [newExpenseDesc, setNewExpenseDesc] = useState('');
  const [newExpenseReceipt, setNewExpenseReceipt] = useState<string | null>(null);
  const [scanningReceipt, setScanningReceipt] = useState(false);

  // Formulaire
  const [mileage, setMileage] = useState('');
  const [fuelLevel, setFuelLevel] = useState('50');
  const [notes, setNotes] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientSignature, setClientSignature] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverSignature, setDriverSignature] = useState('');

  useEffect(() => {
    loadMission();
    requestCameraPermissions();
  }, []);

  const requestCameraPermissions = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'L\'accès à la caméra est nécessaire pour les inspections');
    }
  };

  const loadMission = async () => {
    if (!missionId || !user) return;

    try {
      const { data: missionData, error } = await supabase
        .from('missions')
        .select('*')
        .eq('id', missionId)
        .single();

      if (error) throw error;

      // Vérifier si inspection de départ existe
      const { data: departureInsp } = await supabase
        .from('vehicle_inspections')
        .select('id')
        .eq('mission_id', missionId)
        .eq('inspection_type', 'departure')
        .single();

      if (!departureInsp) {
        Alert.alert('Inspection départ manquante', 'Veuillez d\'abord effectuer l\'inspection de départ');
        navigation.goBack();
        return;
      }

      // Vérifier si inspection d'arrivée existe déjà
      const { data: existingArrival } = await supabase
        .from('vehicle_inspections')
        .select('id')
        .eq('mission_id', missionId)
        .eq('inspection_type', 'arrival')
        .maybeSingle();

      if (existingArrival) {
        Alert.alert('Inspection complétée', 'L\'inspection d\'arrivée a déjà été effectuée');
        navigation.goBack();
        return;
      }

      setMission(missionData);
    } catch (error) {
      console.error('Erreur chargement mission:', error);
      Alert.alert('Erreur', 'Impossible de charger les données de la mission');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const takePhoto = async (type: string) => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotos((prev) =>
        prev.map((p) =>
          p.type === type
            ? { ...p, uri: result.assets[0].uri, captured: true }
            : p
        )
      );
    }
  };

  // ================================================
  // SCANNER DE DOCUMENTS
  // ================================================
  const handleStartDocumentScan = () => {
    setDocTitleInput('');
    setDocTitleModalVisible(true);
  };

  const confirmDocumentTitle = () => {
    const title = docTitleInput.trim();
    if (!title) {
      Alert.alert('Titre requis', 'Veuillez saisir un titre pour ce document');
      return;
    }
    setCurrentDocTitle(title);
    setDocTitleModalVisible(false);
    setScannerVisible(true);
  };

  const handleDocumentScanned = async (scannedPageUri: string) => {
    // Ajouter la page au document en cours
    // Pour simplifier, on crée un nouveau document pour chaque scan
    const newDoc: ScannedDocument = {
      id: `doc-${Date.now()}`,
      title: currentDocTitle || `Document ${scannedDocuments.length + 1}`,
      uri: scannedPageUri,
      pages: [scannedPageUri],
      pagesCount: 1,
    };

    setScannedDocuments((prev) => [...prev, newDoc]);
    setScannerVisible(false);
    Alert.alert('✅ Document scanné', `"${newDoc.title}" ajouté avec succès`);
  };

  const removeDocument = (docId: string) => {
    Alert.alert(
      'Supprimer le document',
      'Êtes-vous sûr ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => setScannedDocuments((prev) => prev.filter((d) => d.id !== docId)),
        },
      ]
    );
  };

  // ================================================
  // FRAIS
  // ================================================
  const handleAddExpense = () => {
    setNewExpenseType('carburant');
    setNewExpenseAmount('');
    setNewExpenseDesc('');
    setNewExpenseReceipt(null);
    setExpenseModalVisible(true);
  };

  const handleScanReceipt = async () => {
    setScanningReceipt(true);
    setScannerVisible(true);
  };

  const handleReceiptScanned = async (uri: string) => {
    setNewExpenseReceipt(uri);
    setScanningReceipt(false);
    setScannerVisible(false);
    Alert.alert('✅ Justificatif scanné', 'Le justificatif a été ajouté au frais');
  };

  const handleSaveExpense = () => {
    if (!newExpenseAmount || parseFloat(newExpenseAmount) <= 0) {
      Alert.alert('Montant invalide', 'Veuillez saisir un montant valide');
      return;
    }

    const newExpense: Expense = {
      id: `exp-${Date.now()}`,
      type: newExpenseType,
      amount: parseFloat(newExpenseAmount).toFixed(2),
      description: newExpenseDesc.trim() || `${EXPENSE_TYPES.find(t => t.value === newExpenseType)?.label}`,
      receiptUri: newExpenseReceipt,
    };

    setExpenses((prev) => [...prev, newExpense]);
    setExpenseModalVisible(false);
    Alert.alert('✅ Frais ajouté', `${newExpense.description}: ${newExpense.amount}€`);
  };

  const removeExpense = (expId: string) => {
    Alert.alert(
      'Supprimer le frais',
      'Êtes-vous sûr ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => setExpenses((prev) => prev.filter((e) => e.id !== expId)),
        },
      ]
    );
  };

  // ================================================
  // NAVIGATION STEPS
  // ================================================
  const allRequiredPhotosValid = () => photos.every((p) => p.captured);

  const handleNextStep = () => {
    if (currentStep === 1 && !allRequiredPhotosValid()) {
      Alert.alert('Photos manquantes', 'Veuillez capturer toutes les 8 photos obligatoires');
      return;
    }

    if (currentStep === 2 && scannedDocuments.length === 0) {
      Alert.alert(
        'Documents manquants',
        'Il est recommandé de scanner au moins un document (PV livraison, constat, etc.). Continuer sans document ?',
        [
          { text: 'Scanner un document', style: 'cancel' },
          { text: 'Continuer sans', onPress: () => setCurrentStep(3) },
        ]
      );
      return;
    }

    if (currentStep === 2) {
      setCurrentStep(3);
      return;
    }

    if (currentStep === 3 && !mileage) {
      Alert.alert('Kilométrage requis', 'Veuillez saisir le kilométrage');
      return;
    }

    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // ================================================
  // SOUMISSION FINALE
  // ================================================
  const handleSubmit = async () => {
    if (!clientName.trim() || !clientSignature) {
      Alert.alert('Signature client requise', 'Le client doit signer');
      return;
    }

    if (!driverName.trim() || !driverSignature) {
      Alert.alert('Signature convoyeur requise', 'Le convoyeur doit signer');
      return;
    }

    setSaving(true);

    try {
      // 1. Créer l'inspection d'arrivée
      const { data: inspection, error: inspectionError } = await supabase
        .from('vehicle_inspections')
        .insert({
          mission_id: missionId,
          inspector_id: user.id,
          inspection_type: 'arrival',
          fuel_level: parseInt(fuelLevel),
          mileage_km: parseInt(mileage),
          notes: notes,
          client_name: clientName,
          client_signature: clientSignature,
          driver_name: driverName,
          driver_signature: driverSignature,
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (inspectionError) throw inspectionError;

      const createdInspection = inspection as any;
      console.log('✅ Inspection créée:', createdInspection.id);

      // 2. Upload photos
      console.log(`📸 Upload de ${photos.length} photos...`);
      for (const photo of photos) {
        if (!photo.uri || !photo.captured) continue;

        try {
          const fileExt = photo.uri.split('.').pop() || 'jpg';
          const fileName = `${createdInspection.id}-${photo.type}-${Date.now()}.${fileExt}`;
          const filePath = `inspections/${fileName}`;

          const response = await fetch(photo.uri);
          const arrayBuffer = await response.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64 = btoa(binary);

          const { error: uploadError } = await supabase.storage
            .from('inspection-photos')
            .upload(filePath, decode(base64), {
              contentType: `image/${fileExt}`,
              upsert: false,
            });

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage.from('inspection-photos').getPublicUrl(filePath);

          await supabase.from('inspection_photos_v2').insert({
            inspection_id: createdInspection.id,
            photo_type: photo.type,
            full_url: urlData.publicUrl,
            taken_at: new Date().toISOString(),
          });
        } catch (error) {
          console.error(`Erreur upload photo ${photo.type}:`, error);
        }
      }

      // 3. Upload documents scannés
      console.log(`📄 Upload de ${scannedDocuments.length} documents...`);
      for (const doc of scannedDocuments) {
        try {
          // Générer PDF à partir des pages scannées
          const pdfUri = await generatePDFFromPages(doc.pages, doc.title);

          // Upload PDF
          const fileName = `${createdInspection.id}-doc-${Date.now()}.pdf`;
          const filePath = `documents/${fileName}`;

          const response = await fetch(pdfUri);
          const arrayBuffer = await response.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64 = btoa(binary);

          const { error: uploadError } = await supabase.storage
            .from('inspection-documents')
            .upload(filePath, decode(base64), {
              contentType: 'application/pdf',
              upsert: false,
            });

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage.from('inspection-documents').getPublicUrl(filePath);

          // Enregistrer dans DB
          await supabase.from('inspection_documents').insert({
            inspection_id: createdInspection.id,
            document_type: 'other',
            document_title: doc.title,
            document_url: urlData.publicUrl,
            pages_count: doc.pagesCount,
          });
        } catch (error) {
          console.error(`Erreur upload document ${doc.title}:`, error);
        }
      }

      // 4. Enregistrer frais
      console.log(`💰 Enregistrement de ${expenses.length} frais...`);
      for (const expense of expenses) {
        try {
          let receiptUrl = null;

          // Upload justificatif si présent
          if (expense.receiptUri) {
            const fileName = `${createdInspection.id}-receipt-${Date.now()}.pdf`;
            const filePath = `documents/${fileName}`;

            const pdfResult = await Print.printToFileAsync({
              html: `<img src="${expense.receiptUri}" style="width:100%"/>`,
            });

            const response = await fetch(pdfResult.uri);
            const arrayBuffer = await response.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            const base64 = btoa(binary);

            const { error: uploadError } = await supabase.storage
              .from('inspection-documents')
              .upload(filePath, decode(base64), {
                contentType: 'application/pdf',
                upsert: false,
              });

            if (!uploadError) {
              const { data: urlData } = supabase.storage.from('inspection-documents').getPublicUrl(filePath);
              receiptUrl = urlData.publicUrl;
            }
          }

          // Enregistrer le frais
          await supabase.from('inspection_expenses').insert({
            inspection_id: createdInspection.id,
            expense_type: expense.type,
            amount: parseFloat(expense.amount),
            description: expense.description,
            receipt_url: receiptUrl,
            receipt_pages_count: receiptUrl ? 1 : 0,
          });
        } catch (error) {
          console.error(`Erreur enregistrement frais ${expense.description}:`, error);
        }
      }

      // 5. Mettre à jour la mission
      await supabase.from('missions').update({ arrival_inspection_completed: true }).eq('id', missionId);

      Alert.alert('✅ Succès', `Inspection d'arrivée complétée !\n${photos.length} photos\n${scannedDocuments.length} documents\n${expenses.length} frais`, [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      console.error('❌ Erreur sauvegarde:', error);
      Alert.alert('Erreur', error.message || 'Impossible de sauvegarder l\'inspection');
    } finally {
      setSaving(false);
    }
  };

  // ================================================
  // GÉNÉRATION PDF à partir de pages scannées
  // ================================================
  const generatePDFFromPages = async (pages: string[], title: string): Promise<string> => {
    const imagesHtml = pages.map((uri) => `<img src="${uri}" style="width:100%; page-break-after:always;"/>`).join('');
    
    const html = `
      <html>
        <head>
          <meta charset="utf-8">
          <title>${title}</title>
        </head>
        <body style="margin:0; padding:0;">
          ${imagesHtml}
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });
    return uri;
  };

  // ================================================
  // RENDU DES ÉTAPES
  // ================================================
  const renderStep1 = () => (
    <ScrollView style={styles.stepContainer}>
      <View style={styles.photosGrid}>
        {photos.map((photo) => (
          <TouchableOpacity
            key={photo.type}
            style={[styles.photoCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => takePhoto(photo.type)}
          >
            {photo.uri ? (
              <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <PhotoIndicator
                  vehicleType={mission?.vehicle_type || 'VL'}
                  photoType={photo.type}
                  isCaptured={false}
                />
              </View>
            )}
            <View style={styles.photoLabel}>
              <Text style={[styles.photoLabelText, { color: colors.text }]} numberOfLines={2}>
                {photo.label}
              </Text>
              {photo.captured && (
                <Ionicons name="checkmark-circle" size={20} color="#10b981" style={styles.checkIcon} />
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );

  const renderStep2 = () => (
    <ScrollView style={styles.stepContainer}>
      <TouchableOpacity
        style={styles.scanButton}
        onPress={handleStartDocumentScan}
      >
        <MaterialCommunityIcons name="scanner" size={24} color="#fff" />
        <Text style={styles.scanButtonText}>Scanner un document</Text>
      </TouchableOpacity>

      {scannedDocuments.length > 0 && (
        <View style={styles.documentsListno}>
          {scannedDocuments.map((doc) => (
            <View key={doc.id} style={[styles.documentCard, { backgroundColor: colors.card }]}>
              <View style={styles.documentIcon}>
                <Ionicons name="document-text" size={32} color="#3b82f6" />
              </View>
              <View style={styles.documentInfo}>
                <Text style={[styles.documentTitle, { color: colors.text }]}>{doc.title}</Text>
                <Text style={[styles.documentMeta, { color: colors.textSecondary }]}>
                  {doc.pagesCount} page{doc.pagesCount > 1 ? 's' : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => removeDocument(doc.id)}>
                <Ionicons name="trash-outline" size={24} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );

  const renderStep3 = () => (
    <ScrollView style={styles.stepContainer}>
      <TouchableOpacity
        style={styles.addExpenseButton}
        onPress={handleAddExpense}
      >
        <Ionicons name="add-circle" size={24} color="#fff" />
        <Text style={styles.addExpenseButtonText}>Ajouter un frais</Text>
      </TouchableOpacity>

      {expenses.length > 0 && (
        <View style={styles.expensesList}>
          {expenses.map((expense) => (
            <View key={expense.id} style={[styles.expenseCard, { backgroundColor: colors.card }]}>
              <View style={styles.expenseIcon}>
                <MaterialCommunityIcons
                  name={EXPENSE_TYPES.find(t => t.value === expense.type)?.icon as any}
                  size={28}
                  color="#3b82f6"
                />
              </View>
              <View style={styles.expenseInfo}>
                <Text style={[styles.expenseDesc, { color: colors.text }]}>{expense.description}</Text>
                <Text style={[styles.expenseAmount, { color: colors.textSecondary }]}>
                  {expense.amount}€
                  {expense.receiptUri && ' • Justificatif ✓'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => removeExpense(expense.id)}>
                <Ionicons name="trash-outline" size={24} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))}
          <View style={styles.totalExpenses}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>Total:</Text>
            <Text style={[styles.totalAmount, { color: colors.text }]}>
              {expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0).toFixed(2)}€
            </Text>
          </View>
        </View>
      )}

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Kilométrage *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
          value={mileage}
          onChangeText={setMileage}
          placeholder="Ex: 50000"
          placeholderTextColor={colors.textSecondary}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Niveau carburant: {fuelLevel}%</Text>
        <View style={styles.sliderContainer}>
          <Text style={[styles.sliderLabel, { color: colors.textSecondary }]}>0%</Text>
          <TextInput
            style={[styles.sliderInput, { color: colors.text, borderColor: colors.border }]}
            value={fuelLevel}
            onChangeText={setFuelLevel}
            keyboardType="numeric"
            maxLength={3}
          />
          <Text style={[styles.sliderLabel, { color: colors.textSecondary }]}>100%</Text>
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Notes (optionnel)</Text>
        <TextInput
          style={[styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Remarques particulières..."
          placeholderTextColor={colors.textSecondary}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>
    </ScrollView>
  );

  const renderStep4 = () => (
    <ScrollView style={styles.stepContainer}>
      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Nom du client *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
          value={clientName}
          onChangeText={setClientName}
          placeholder="Nom complet du client"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Signature du client *</Text>
        <SignaturePad
          onSave={(signature) => setClientSignature(signature)}
          value={clientSignature}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Nom du convoyeur *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
          value={driverName}
          onChangeText={setDriverName}
          placeholder="Nom complet du convoyeur"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Signature du convoyeur *</Text>
        <SignaturePad
          onSave={(signature) => setDriverSignature(signature)}
          value={driverSignature}
        />
      </View>
    </ScrollView>
  );

  // ================================================
  // MODAL AJOUT FRAIS
  // ================================================
  // ================================================
  // MODALS
  // ================================================
  const renderDocTitleModal = () => (
    <Modal
      visible={docTitleModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setDocTitleModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Titre du document</Text>
            <TouchableOpacity onPress={() => setDocTitleModalVisible(false)}>
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Nom du document *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              value={docTitleInput}
              onChangeText={setDocTitleInput}
              placeholder="Ex: PV de livraison, Constat dommages"
              placeholderTextColor={colors.textSecondary}
              autoFocus
            />
          </View>

          <TouchableOpacity
            style={styles.saveExpenseButton}
            onPress={confirmDocumentTitle}
          >
            <Text style={styles.saveExpenseButtonText}>Scanner ce document</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderExpenseModal = () => (
    <Modal
      visible={expenseModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setExpenseModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Ajouter un frais</Text>
            <TouchableOpacity onPress={() => setExpenseModalVisible(false)}>
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Type de frais</Text>
            <View style={[styles.pickerContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Picker
                selectedValue={newExpenseType}
                onValueChange={setNewExpenseType}
                style={[styles.picker, { color: colors.text }]}
              >
                {EXPENSE_TYPES.map((type) => (
                  <Picker.Item key={type.value} label={type.label} value={type.value} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Montant (€) *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              value={newExpenseAmount}
              onChangeText={setNewExpenseAmount}
              placeholder="45.50"
              placeholderTextColor={colors.textSecondary}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Description</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              value={newExpenseDesc}
              onChangeText={setNewExpenseDesc}
              placeholder="Ex: Autoroute A6 Paris-Lyon"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <TouchableOpacity
            style={styles.scanReceiptButton}
            onPress={handleScanReceipt}
          >
            <MaterialCommunityIcons name="scanner" size={20} color="#3b82f6" />
            <Text style={styles.scanReceiptText}>
              {newExpenseReceipt ? '✓ Justificatif scanné' : 'Scanner un justificatif'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.saveExpenseButton}
            onPress={handleSaveExpense}
          >
            <Text style={styles.saveExpenseButtonText}>Enregistrer le frais</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={[styles.loadingText, { color: colors.text }]}>Chargement...</Text>
      </View>
    );
  }

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return 'Photos obligatoires (8)';
      case 2: return 'Documents & Frais';
      case 3: return 'Kilométrage & Carburant';
      case 4: return 'Signatures';
      default: return 'Inspection Arrivée';
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Inspection Arrivée</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>{getStepTitle()}</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      {/* Progress */}
      <View style={styles.progressContainer}>
        {[1, 2, 3, 4].map((step) => (
          <View
            key={step}
            style={[
              styles.progressDot,
              step <= currentStep && styles.progressDotActive,
              { backgroundColor: step <= currentStep ? '#3b82f6' : colors.border },
            ]}
          />
        ))}
      </View>

      {/* Content */}
      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}
      {currentStep === 4 && renderStep4()}

      {/* Navigation */}
      <View style={[styles.navigation, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        {currentStep > 1 && (
          <TouchableOpacity style={styles.navButtonSecondary} onPress={handlePreviousStep}>
            <Text style={styles.navButtonSecondaryText}>Précédent</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.navButtonPrimary, currentStep === 1 && { flex: 1 }]}
          onPress={handleNextStep}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.navButtonPrimaryText}>
              {currentStep === 4 ? 'Terminer' : 'Suivant'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Scanner Modal */}
      <CamScannerLikeScanner
        visible={scannerVisible}
        onScanComplete={(uri) => {
          if (scanningReceipt) {
            handleReceiptScanned(uri);
          } else {
            handleDocumentScanned(uri);
          }
        }}
        onCancel={() => {
          setScannerVisible(false);
          setScanningReceipt(false);
        }}
      />

      {/* Document Title Modal */}
      {renderDocTitleModal()}

      {/* Expense Modal */}
      {renderExpenseModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  progressDotActive: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  stepContainer: {
    flex: 1,
    padding: 16,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoCard: {
    width: '47%',
    borderRadius: 12,
    borderWidth: 2,
    overflow: 'hidden',
  },
  photoPreview: {
    width: '100%',
    height: 120,
  },
  photoPlaceholder: {
    width: '100%',
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
  },
  photoLabelText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  checkIcon: {
    marginLeft: 4,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  documentsListno: {
    gap: 12,
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  documentIcon: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 8,
  },
  documentInfo: {
    flex: 1,
  },
  documentTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  documentMeta: {
    fontSize: 12,
  },
  addExpenseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
  },
  addExpenseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  expensesList: {
    gap: 12,
  },
  expenseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  expenseIcon: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 8,
  },
  expenseInfo: {
    flex: 1,
  },
  expenseDesc: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  expenseAmount: {
    fontSize: 12,
  },
  totalExpenses: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#e5e7eb',
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10b981',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    minHeight: 100,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sliderLabel: {
    fontSize: 12,
  },
  sliderInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  navigation: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  navButtonSecondary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#3b82f6',
    alignItems: 'center',
  },
  navButtonSecondaryText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '600',
  },
  navButtonPrimary: {
    flex: 1,
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  navButtonPrimaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  scanReceiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3b82f6',
    gap: 8,
    marginBottom: 16,
  },
  scanReceiptText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
  },
  saveExpenseButton: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveExpenseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
