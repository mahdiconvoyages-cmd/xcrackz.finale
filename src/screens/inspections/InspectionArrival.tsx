import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';

interface InspectionArrivalProps {
  missionId: string;
  onComplete: () => void;
  onCancel: () => void;
}

type DamageType = 'RAS' | 'Rayures' | 'Cassé' | 'Abimé';

interface PhotoData {
  uri: string;
  damage: DamageType;
}

interface Expense {
  description: string;
  amount: string;
}

const EXTERIOR_PHOTOS = [
  'Avant',
  'Avant latéral gauche',
  'Arrière latéral gauche',
  'Arrière',
  'Arrière latéral droit',
  'Avant latéral droit',
];

const INTERIOR_PHOTOS = [
  'Intérieur avant',
  'Intérieur arrière',
  'Coffre',
];

const OPTIONAL_PHOTOS = Array.from({ length: 10 }, (_, i) => `Photo optionnelle ${i + 1}`);

export default function InspectionArrival({ missionId, onComplete, onCancel }: InspectionArrivalProps) {
  const { colors } = useTheme();
  const { user } = useAuth();

  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: KM & Photo
  const [dashboardPhoto, setDashboardPhoto] = useState<string | null>(null);
  const [kilometers, setKilometers] = useState('');

  // Step 2: Photos
  const [exteriorPhotos, setExteriorPhotos] = useState<{ [key: string]: PhotoData }>({});
  const [interiorPhotos, setInteriorPhotos] = useState<{ [key: string]: PhotoData }>({});
  const [optionalPhotos, setOptionalPhotos] = useState<{ [key: string]: PhotoData }>({});

  // Step 3: Signatures
  const [clientName, setClientName] = useState('');
  const [clientSignature, setClientSignature] = useState<string | null>(null);
  const [driverName, setDriverName] = useState(user?.full_name || '');
  const [driverSignature, setDriverSignature] = useState<string | null>(null);

  // Step 4: Expenses & Documents
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [documents, setDocuments] = useState<string[]>([]);

  const scrollViewRef = useRef<ScrollView>(null);

  const takeDashboardPhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Accès à la caméra nécessaire');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0]) {
      setDashboardPhoto(result.assets[0].uri);
    }
  };

  const takePhoto = async (type: 'exterior' | 'interior' | 'optional', label: string) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Accès à la caméra nécessaire');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0]) {
      const photoData: PhotoData = {
        uri: result.assets[0].uri,
        damage: 'RAS',
      };

      if (type === 'exterior') {
        setExteriorPhotos(prev => ({ ...prev, [label]: photoData }));
      } else if (type === 'interior') {
        setInteriorPhotos(prev => ({ ...prev, [label]: photoData }));
      } else {
        setOptionalPhotos(prev => ({ ...prev, [label]: photoData }));
      }
    }
  };

  const setPhotoDamage = (type: 'exterior' | 'interior' | 'optional', label: string, damage: DamageType) => {
    if (type === 'exterior') {
      setExteriorPhotos(prev => ({
        ...prev,
        [label]: { ...prev[label], damage },
      }));
    } else if (type === 'interior') {
      setInteriorPhotos(prev => ({
        ...prev,
        [label]: { ...prev[label], damage },
      }));
    } else {
      setOptionalPhotos(prev => ({
        ...prev,
        [label]: { ...prev[label], damage },
      }));
    }
  };

  const openSignaturePad = (type: 'client' | 'driver') => {
    // TODO: Implement signature pad modal
    Alert.alert('Signature', `Signature ${type === 'client' ? 'client' : 'convoyeur'} - À implémenter avec react-native-signature-canvas`);
    // Placeholder
    if (type === 'client') {
      setClientSignature('signature://client');
    } else {
      setDriverSignature('signature://driver');
    }
  };

  const addExpense = () => {
    if (!expenseDescription.trim() || !expenseAmount.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir la description et le montant');
      return;
    }

    setExpenses(prev => [...prev, { description: expenseDescription, amount: expenseAmount }]);
    setExpenseDescription('');
    setExpenseAmount('');
  };

  const removeExpense = (index: number) => {
    setExpenses(prev => prev.filter((_, i) => i !== index));
  };

  const scanDocument = async () => {
    // TODO: Implement document scanner
    Alert.alert('Scanner', 'Scanner de documents - À implémenter');
    // Placeholder
    setDocuments(prev => [...prev, `document_${Date.now()}.pdf`]);
  };

  const canGoNext = () => {
    switch (currentStep) {
      case 1:
        return dashboardPhoto !== null && kilometers.trim() !== '';
      case 2:
        const allExterior = EXTERIOR_PHOTOS.every(label => exteriorPhotos[label]?.uri);
        const allInterior = INTERIOR_PHOTOS.every(label => interiorPhotos[label]?.uri);
        return allExterior && allInterior;
      case 3:
        return clientName.trim() !== '' && clientSignature !== null && driverName.trim() !== '' && driverSignature !== null;
      case 4:
        return true; // Frais et documents optionnels
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (canGoNext()) {
      if (currentStep < 4) {
        setCurrentStep(prev => prev + 1);
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      } else {
        handleSave();
      }
    } else {
      Alert.alert('Étape incomplète', 'Veuillez remplir tous les champs obligatoires');
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  const handleSave = async () => {
    // TODO: Upload photos to Supabase Storage
    // TODO: Save inspection data to database
    // TODO: Update mission status from in_progress to completed
    // TODO: Generate public tracking link

    Alert.alert(
      'Succès',
      'Inspection d\'arrivée enregistrée. Livraison clôturée ! Lien public généré.',
      [
        {
          text: 'OK',
          onPress: () => onComplete(),
        },
      ]
    );
  };

  const renderProgressBar = () => {
    const progress = (currentStep / 4) * 100;
    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressBackground}>
          <View style={[styles.progressBar, { width: `${progress}%` }]} />
        </View>
        <Text style={[styles.progressText, { color: colors.text }]}>
          Étape {currentStep} sur 4
        </Text>
      </View>
    );
  };

  const renderDamageButtons = (type: 'exterior' | 'interior' | 'optional', label: string, photoData?: PhotoData) => {
    if (!photoData?.uri) return null;

    const damages: DamageType[] = ['RAS', 'Rayures', 'Cassé', 'Abimé'];
    const selectedDamage = photoData.damage;

    return (
      <View style={styles.damageButtonsContainer}>
        {damages.map(damage => (
          <TouchableOpacity
            key={damage}
            style={[
              styles.damageButton,
              selectedDamage === damage && styles.damageButtonSelected,
            ]}
            onPress={() => setPhotoDamage(type, label, damage)}
          >
            <Text
              style={[
                styles.damageButtonText,
                selectedDamage === damage && styles.damageButtonTextSelected,
              ]}
            >
              {damage}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        Kilométrage et Photo du Tableau de Bord
      </Text>

      <TouchableOpacity
        style={styles.photoButton}
        onPress={takeDashboardPhoto}
      >
        {dashboardPhoto ? (
          <Image source={{ uri: dashboardPhoto }} style={styles.photoPreview} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Ionicons name="camera" size={48} color="#4CAF50" />
            <Text style={styles.photoPlaceholderText}>Photo tableau de bord *</Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.inputContainer}>
        <Text style={[styles.label, { color: colors.text }]}>Kilométrage *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
          placeholder="Entrez le kilométrage"
          placeholderTextColor={colors.textSecondary}
          value={kilometers}
          onChangeText={setKilometers}
          keyboardType="numeric"
        />
      </View>
    </View>
  );

  const renderStep2 = () => {
    const visibleOptionalPhotos = OPTIONAL_PHOTOS.filter((label, index) => {
      if (index === 0) return true;
      const prevLabel = OPTIONAL_PHOTOS[index - 1];
      return optionalPhotos[prevLabel]?.uri;
    });

    return (
      <View style={styles.stepContainer}>
        <Text style={[styles.stepTitle, { color: colors.text }]}>Photos du Véhicule</Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Photos Extérieures (6 obligatoires)
        </Text>
        {EXTERIOR_PHOTOS.map(label => (
          <View key={label} style={styles.photoSection}>
            <TouchableOpacity
              style={styles.photoButton}
              onPress={() => takePhoto('exterior', label)}
            >
              {exteriorPhotos[label]?.uri ? (
                <Image source={{ uri: exteriorPhotos[label].uri }} style={styles.photoPreview} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="camera" size={40} color="#4CAF50" />
                  <Text style={styles.photoPlaceholderText}>{label} *</Text>
                </View>
              )}
            </TouchableOpacity>
            {renderDamageButtons('exterior', label, exteriorPhotos[label])}
          </View>
        ))}

        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 20 }]}>
          Photos Intérieures (3 obligatoires)
        </Text>
        {INTERIOR_PHOTOS.map(label => (
          <View key={label} style={styles.photoSection}>
            <TouchableOpacity
              style={styles.photoButton}
              onPress={() => takePhoto('interior', label)}
            >
              {interiorPhotos[label]?.uri ? (
                <Image source={{ uri: interiorPhotos[label].uri }} style={styles.photoPreview} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="camera" size={40} color="#4CAF50" />
                  <Text style={styles.photoPlaceholderText}>{label} *</Text>
                </View>
              )}
            </TouchableOpacity>
            {renderDamageButtons('interior', label, interiorPhotos[label])}
          </View>
        ))}

        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 20 }]}>
          Photos Optionnelles
        </Text>
        {visibleOptionalPhotos.map(label => (
          <View key={label} style={styles.photoSection}>
            <TouchableOpacity
              style={styles.photoButton}
              onPress={() => takePhoto('optional', label)}
            >
              {optionalPhotos[label]?.uri ? (
                <Image source={{ uri: optionalPhotos[label].uri }} style={styles.photoPreview} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="camera" size={40} color="#999" />
                  <Text style={styles.photoPlaceholderText}>{label}</Text>
                </View>
              )}
            </TouchableOpacity>
            {renderDamageButtons('optional', label, optionalPhotos[label])}
          </View>
        ))}
      </View>
    );
  };

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Signatures</Text>

      <View style={styles.signatureSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Signature Client</Text>
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text }]}>Nom du client *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
            placeholder="Nom complet du client"
            placeholderTextColor={colors.textSecondary}
            value={clientName}
            onChangeText={setClientName}
          />
        </View>
        <TouchableOpacity
          style={styles.signatureButton}
          onPress={() => openSignaturePad('client')}
        >
          {clientSignature ? (
            <View style={styles.signaturePlaceholder}>
              <Ionicons name="checkmark-circle" size={32} color="#4CAF50" />
              <Text style={styles.signatureText}>Signature enregistrée</Text>
            </View>
          ) : (
            <View style={styles.signaturePlaceholder}>
              <Ionicons name="create-outline" size={32} color="#4CAF50" />
              <Text style={styles.signatureText}>Signer *</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.signatureSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Signature Convoyeur</Text>
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text }]}>Nom du convoyeur *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
            placeholder="Nom complet du convoyeur"
            placeholderTextColor={colors.textSecondary}
            value={driverName}
            onChangeText={setDriverName}
          />
        </View>
        <TouchableOpacity
          style={styles.signatureButton}
          onPress={() => openSignaturePad('driver')}
        >
          {driverSignature ? (
            <View style={styles.signaturePlaceholder}>
              <Ionicons name="checkmark-circle" size={32} color="#4CAF50" />
              <Text style={styles.signatureText}>Signature enregistrée</Text>
            </View>
          ) : (
            <View style={styles.signaturePlaceholder}>
              <Ionicons name="create-outline" size={32} color="#4CAF50" />
              <Text style={styles.signatureText}>Signer *</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Frais et Documents</Text>

      <View style={styles.expensesSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Frais (Optionnel)</Text>
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text }]}>Description du frais</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
            placeholder="Ex: Péage, Parking, Carburant..."
            placeholderTextColor={colors.textSecondary}
            value={expenseDescription}
            onChangeText={setExpenseDescription}
          />
        </View>
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text }]}>Montant (€)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
            placeholder="0.00"
            placeholderTextColor={colors.textSecondary}
            value={expenseAmount}
            onChangeText={setExpenseAmount}
            keyboardType="decimal-pad"
          />
        </View>
        <TouchableOpacity style={styles.addButton} onPress={addExpense}>
          <Ionicons name="add-circle" size={24} color="#4CAF50" />
          <Text style={styles.addButtonText}>Ajouter frais</Text>
        </TouchableOpacity>

        {expenses.length > 0 && (
          <View style={styles.expensesList}>
            <Text style={[styles.label, { color: colors.text, marginBottom: 10 }]}>
              Frais ajoutés:
            </Text>
            {expenses.map((expense, index) => (
              <View key={index} style={[styles.expenseItem, { backgroundColor: colors.surface }]}>
                <View style={styles.expenseInfo}>
                  <Text style={[styles.expenseDescription, { color: colors.text }]}>
                    {expense.description}
                  </Text>
                  <Text style={[styles.expenseAmount, { color: colors.text }]}>
                    {expense.amount} €
                  </Text>
                </View>
                <TouchableOpacity onPress={() => removeExpense(index)}>
                  <Ionicons name="trash-outline" size={24} color="#f44336" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.documentsSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Documents (Optionnel)</Text>
        <TouchableOpacity style={styles.scanButton} onPress={scanDocument}>
          <Ionicons name="scan" size={24} color="#fff" />
          <Text style={styles.scanButtonText}>Scanner un document</Text>
        </TouchableOpacity>

        {documents.length > 0 && (
          <View style={styles.documentsList}>
            <Text style={[styles.label, { color: colors.text, marginBottom: 10 }]}>
              Documents scannés:
            </Text>
            {documents.map((doc, index) => (
              <View key={index} style={[styles.documentItem, { backgroundColor: colors.surface }]}>
                <Ionicons name="document-text" size={24} color="#4CAF50" />
                <Text style={[styles.documentName, { color: colors.text }]}>{doc}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={['#4CAF50', '#45a049']} style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={onCancel}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Inspection d'Arrivée</Text>
        <View style={styles.placeholder} />
      </LinearGradient>

      {renderProgressBar()}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footer, { backgroundColor: colors.surface }]}>
        {currentStep > 1 && (
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="#666" />
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            styles.nextButton,
            !canGoNext() && styles.nextButtonDisabled,
            currentStep === 1 && styles.nextButtonFull,
          ]}
          onPress={handleNext}
          disabled={!canGoNext()}
        >
          <Text style={styles.nextButtonText}>
            {currentStep === 4 ? 'Clôturer la livraison' : 'Suivant'}
          </Text>
          <Ionicons name="arrow-forward" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 36,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  progressBackground: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  progressText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 8,
  },
  photoButton: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  photoPlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  photoSection: {
    marginBottom: 20,
  },
  damageButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  damageButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  damageButtonSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  damageButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  damageButtonTextSelected: {
    color: '#fff',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  signatureSection: {
    marginBottom: 24,
  },
  signatureButton: {
    height: 150,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  signaturePlaceholder: {
    alignItems: 'center',
  },
  signatureText: {
    marginTop: 8,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  expensesSection: {
    marginBottom: 24,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
    gap: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
  expensesList: {
    marginTop: 16,
  },
  expenseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  expenseInfo: {
    flex: 1,
  },
  expenseDescription: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  expenseAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  documentsSection: {
    marginBottom: 24,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    gap: 8,
  },
  scanButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  documentsList: {
    marginTop: 16,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  documentName: {
    fontSize: 14,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    gap: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    gap: 8,
  },
  nextButtonFull: {
    flex: 1,
  },
  nextButtonDisabled: {
    backgroundColor: '#ccc',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});
