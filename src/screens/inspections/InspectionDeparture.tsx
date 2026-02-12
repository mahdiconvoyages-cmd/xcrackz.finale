import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';

const { width } = Dimensions.get('window');

interface InspectionDepartureProps {
  missionId: string;
  onComplete: () => void;
}

type VehicleCondition = 'excellent' | 'bon' | 'mauvais';
type DamageType = 'RAS' | 'Rayures' | 'Cassé' | 'Abimé';

interface PhotoData {
  uri: string;
  damage?: DamageType;
}

interface ChecklistData {
  nombreCles: number;
  kitSecurite: boolean;
  roueSecours: boolean;
  kitGonflage: boolean;
  carteCarburant: boolean;
  vehiculeCharge: boolean;
  objetConfie: boolean;
  objetConfiePrecision: string;
}

const InspectionDeparture: React.FC<InspectionDepartureProps> = ({
  missionId,
  onComplete,
}) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;

  // Step 1: KM & Carburant
  const [dashboardPhoto, setDashboardPhoto] = useState<string | null>(null);
  const [km, setKm] = useState('');
  const [fuelLevel, setFuelLevel] = useState(50);

  // Step 2: État & Checklist
  const [vehicleCondition, setVehicleCondition] = useState<VehicleCondition>('bon');
  const [checklist, setChecklist] = useState<ChecklistData>({
    nombreCles: 2,
    kitSecurite: false,
    roueSecours: false,
    kitGonflage: false,
    carteCarburant: false,
    vehiculeCharge: false,
    objetConfie: false,
    objetConfiePrecision: '',
  });

  // Step 3: Photos
  const [photosExterieures, setPhotosExterieures] = useState<PhotoData[]>(Array(6).fill(null));
  const [photosInterieures, setPhotosInterieures] = useState<PhotoData[]>(Array(3).fill(null));
  const [photosOptionnelles, setPhotosOptionnelles] = useState<PhotoData[]>(Array(10).fill(null));

  const photosExtLabels = [
    'Avant',
    'Avant latéral gauche',
    'Arrière latéral gauche',
    'Arrière',
    'Arrière latéral droit',
    'Avant latéral droit',
  ];

  // Step 4: Signatures
  const [clientName, setClientName] = useState('');
  const [clientSignature, setClientSignature] = useState<string | null>(null);
  const [convoyeurName, setConvoyeurName] = useState(user?.full_name || '');
  const [convoyeurSignature, setConvoyeurSignature] = useState<string | null>(null);

  // Step 5: Documents
  const [documents, setDocuments] = useState<string[]>([]);

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Accès à la caméra requis');
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      return result.assets[0].uri;
    }
    return null;
  };

  const takeDashboardPhoto = async () => {
    const uri = await takePhoto();
    if (uri) setDashboardPhoto(uri);
  };

  const takeVehiclePhoto = async (type: 'ext' | 'int' | 'opt', index: number) => {
    const uri = await takePhoto();
    if (uri) {
      const photoData: PhotoData = { uri };
      if (type === 'ext') {
        const newPhotos = [...photosExterieures];
        newPhotos[index] = photoData;
        setPhotosExterieures(newPhotos);
      } else if (type === 'int') {
        const newPhotos = [...photosInterieures];
        newPhotos[index] = photoData;
        setPhotosInterieures(newPhotos);
      } else {
        const newPhotos = [...photosOptionnelles];
        newPhotos[index] = photoData;
        setPhotosOptionnelles(newPhotos);
      }
    }
  };

  const setPhotoDamage = (type: 'ext' | 'int' | 'opt', index: number, damage: DamageType) => {
    if (type === 'ext') {
      const newPhotos = [...photosExterieures];
      if (newPhotos[index]) {
        newPhotos[index] = { ...newPhotos[index], damage };
        setPhotosExterieures(newPhotos);
      }
    } else if (type === 'int') {
      const newPhotos = [...photosInterieures];
      if (newPhotos[index]) {
        newPhotos[index] = { ...newPhotos[index], damage };
        setPhotosInterieures(newPhotos);
      }
    } else {
      const newPhotos = [...photosOptionnelles];
      if (newPhotos[index]) {
        newPhotos[index] = { ...newPhotos[index], damage };
        setPhotosOptionnelles(newPhotos);
      }
    }
  };

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 1:
        return dashboardPhoto && km.trim() !== '';
      case 2:
        return true;
      case 3:
        const allExterieuresOk = photosExterieures.every(p => p !== null && p.uri);
        const allInterieuresOk = photosInterieures.every(p => p !== null && p.uri);
        return allExterieuresOk && allInterieuresOk;
      case 4:
        return clientName.trim() !== '' && clientSignature && convoyeurName.trim() !== '' && convoyeurSignature;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (!canProceedToNextStep()) {
      Alert.alert('Champs requis', 'Veuillez remplir tous les champs obligatoires');
      return;
    }
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSave = async () => {
    if (!canProceedToNextStep()) {
      Alert.alert('Champs requis', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    // TODO: Upload photos to Supabase Storage
    // TODO: Save inspection data to database
    // TODO: Update mission status from 'pending' to 'in_progress'
    
    Alert.alert(
      'Succès',
      'Inspection de départ enregistrée. Mission démarrée !',
      [{ text: 'OK', onPress: onComplete }]
    );
  };

  const openSignaturePad = (type: 'client' | 'convoyeur') => {
    // TODO: Implement signature pad modal
    Alert.alert('Signature', `Appuyez pour signer (${type})`, [
      {
        text: 'Simuler signature',
        onPress: () => {
          const mockSignature = 'data:image/png;base64,mock';
          if (type === 'client') {
            setClientSignature(mockSignature);
          } else {
            setConvoyeurSignature(mockSignature);
          }
        },
      },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  const scanDocument = () => {
    // TODO: Implement document scanner
    Alert.alert('Scanner', 'Fonctionnalité de scan à venir');
  };

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressBar}>
        {Array.from({ length: totalSteps }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressStep,
              {
                backgroundColor: index < currentStep ? theme.colors.primary : theme.colors.border,
              },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.progressText, { color: theme.colors.text }]}>
        Étape {currentStep} sur {totalSteps}
      </Text>
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
        Kilométrage & Carburant
      </Text>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>
          Photo du tableau de bord *
        </Text>
        <TouchableOpacity
          style={[styles.photoButton, { borderColor: theme.colors.border }]}
          onPress={takeDashboardPhoto}
        >
          {dashboardPhoto ? (
            <Image source={{ uri: dashboardPhoto }} style={styles.photoPreview} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Ionicons name="camera" size={48} color={theme.colors.textSecondary} />
              <Text style={[styles.photoPlaceholderText, { color: theme.colors.textSecondary }]}>
                Prendre une photo
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>
          Kilométrage *
        </Text>
        <TextInput
          style={[styles.input, { 
            borderColor: theme.colors.border,
            color: theme.colors.text,
            backgroundColor: theme.colors.card,
          }]}
          value={km}
          onChangeText={setKm}
          placeholder="Saisir le kilométrage"
          placeholderTextColor={theme.colors.textSecondary}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>
          Niveau de carburant: {fuelLevel}%
        </Text>
        <View style={styles.fuelButtons}>
          {[0, 25, 50, 75, 100].map(level => (
            <TouchableOpacity
              key={level}
              style={[
                styles.fuelButton,
                {
                  backgroundColor: fuelLevel === level ? theme.colors.primary : theme.colors.card,
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={() => setFuelLevel(level)}
            >
              <Text
                style={[
                  styles.fuelButtonText,
                  { color: fuelLevel === level ? '#fff' : theme.colors.text },
                ]}
              >
                {level}%
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
        État du véhicule & Checklist
      </Text>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>
          État général du véhicule
        </Text>
        <View style={styles.conditionButtons}>
          {(['excellent', 'bon', 'mauvais'] as VehicleCondition[]).map(condition => (
            <TouchableOpacity
              key={condition}
              style={[
                styles.conditionButton,
                {
                  backgroundColor:
                    vehicleCondition === condition
                      ? condition === 'excellent'
                        ? '#4CAF50'
                        : condition === 'bon'
                        ? '#FF9800'
                        : '#F44336'
                      : theme.colors.card,
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={() => setVehicleCondition(condition)}
            >
              <Text
                style={[
                  styles.conditionButtonText,
                  { color: vehicleCondition === condition ? '#fff' : theme.colors.text },
                ]}
              >
                {condition.charAt(0).toUpperCase() + condition.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>
          Nombre de clés
        </Text>
        <View style={styles.numberControl}>
          <TouchableOpacity
            style={[styles.numberButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => setChecklist({ ...checklist, nombreCles: Math.max(1, checklist.nombreCles - 1) })}
          >
            <Ionicons name="remove" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={[styles.numberValue, { color: theme.colors.text }]}>
            {checklist.nombreCles}
          </Text>
          <TouchableOpacity
            style={[styles.numberButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => setChecklist({ ...checklist, nombreCles: Math.min(10, checklist.nombreCles + 1) })}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <CheckboxItem
          label="Kit de sécurité"
          value={checklist.kitSecurite}
          onToggle={() => setChecklist({ ...checklist, kitSecurite: !checklist.kitSecurite })}
        />
        <CheckboxItem
          label="Roue de secours"
          value={checklist.roueSecours}
          onToggle={() => setChecklist({ ...checklist, roueSecours: !checklist.roueSecours })}
        />
        <CheckboxItem
          label="Kit de gonflage"
          value={checklist.kitGonflage}
          onToggle={() => setChecklist({ ...checklist, kitGonflage: !checklist.kitGonflage })}
        />
        <CheckboxItem
          label="Carte carburant"
          value={checklist.carteCarburant}
          onToggle={() => setChecklist({ ...checklist, carteCarburant: !checklist.carteCarburant })}
        />
        <CheckboxItem
          label="Véhicule chargé"
          value={checklist.vehiculeCharge}
          onToggle={() => setChecklist({ ...checklist, vehiculeCharge: !checklist.vehiculeCharge })}
        />
        <CheckboxItem
          label="Objet confié"
          value={checklist.objetConfie}
          onToggle={() => setChecklist({ ...checklist, objetConfie: !checklist.objetConfie })}
        />
        {checklist.objetConfie && (
          <TextInput
            style={[styles.input, { 
              borderColor: theme.colors.border,
              color: theme.colors.text,
              backgroundColor: theme.colors.card,
              marginTop: 8,
            }]}
            value={checklist.objetConfiePrecision}
            onChangeText={(text) => setChecklist({ ...checklist, objetConfiePrecision: text })}
            placeholder="Précisez l'objet confié"
            placeholderTextColor={theme.colors.textSecondary}
          />
        )}
      </View>
    </View>
  );

  const CheckboxItem = ({ label, value, onToggle }: { label: string; value: boolean; onToggle: () => void }) => {
    const { theme } = useTheme();
    return (
      <TouchableOpacity style={styles.checkboxRow} onPress={onToggle}>
        <Ionicons
          name={value ? 'checkbox' : 'square-outline'}
          size={24}
          color={value ? theme.colors.primary : theme.colors.textSecondary}
        />
        <Text style={[styles.checkboxLabel, { color: theme.colors.text }]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderStep3 = () => {
    const optionnellesVisibleCount = photosOptionnelles.filter(p => p !== null).length;
    const showNextOptionnelle = optionnellesVisibleCount < 10;

    return (
      <View style={styles.stepContainer}>
        <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
          Photos du véhicule
        </Text>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>
            Photos extérieures (6 obligatoires) *
          </Text>
          {photosExtLabels.map((label, index) => (
            <PhotoItem
              key={`ext-${index}`}
              label={label}
              photo={photosExterieures[index]}
              onTakePhoto={() => takeVehiclePhoto('ext', index)}
              onSetDamage={(damage) => setPhotoDamage('ext', index, damage)}
            />
          ))}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>
            Photos intérieures (3 obligatoires) *
          </Text>
          {[0, 1, 2].map(index => (
            <PhotoItem
              key={`int-${index}`}
              label={`Intérieur ${index + 1}`}
              photo={photosInterieures[index]}
              onTakePhoto={() => takeVehiclePhoto('int', index)}
              onSetDamage={(damage) => setPhotoDamage('int', index, damage)}
            />
          ))}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>
            Photos optionnelles
          </Text>
          {photosOptionnelles.map((photo, index) => {
            if (index === 0 || photosOptionnelles[index - 1] !== null) {
              return (
                <PhotoItem
                  key={`opt-${index}`}
                  label={`Photo optionnelle ${index + 1}`}
                  photo={photo}
                  onTakePhoto={() => takeVehiclePhoto('opt', index)}
                  onSetDamage={(damage) => setPhotoDamage('opt', index, damage)}
                />
              );
            }
            return null;
          })}
        </View>
      </View>
    );
  };

  const PhotoItem = ({
    label,
    photo,
    onTakePhoto,
    onSetDamage,
  }: {
    label: string;
    photo: PhotoData | null;
    onTakePhoto: () => void;
    onSetDamage: (damage: DamageType) => void;
  }) => {
    const { theme } = useTheme();
    return (
      <View style={styles.photoItem}>
        <Text style={[styles.photoLabel, { color: theme.colors.text }]}>
          {label}
        </Text>
        <TouchableOpacity
          style={[styles.photoButton, { borderColor: theme.colors.border }]}
          onPress={onTakePhoto}
        >
          {photo?.uri ? (
            <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Ionicons name="camera" size={32} color={theme.colors.textSecondary} />
            </View>
          )}
        </TouchableOpacity>
        {photo?.uri && (
          <View style={styles.damageButtons}>
            {(['RAS', 'Rayures', 'Cassé', 'Abimé'] as DamageType[]).map(damage => (
              <TouchableOpacity
                key={damage}
                style={[
                  styles.damageButton,
                  {
                    backgroundColor: photo.damage === damage ? theme.colors.primary : theme.colors.card,
                    borderColor: theme.colors.border,
                  },
                ]}
                onPress={() => onSetDamage(damage)}
              >
                <Text
                  style={[
                    styles.damageButtonText,
                    { color: photo.damage === damage ? '#fff' : theme.colors.text },
                  ]}
                >
                  {damage}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
        Signatures
      </Text>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>
          Signature du client *
        </Text>
        <TextInput
          style={[styles.input, { 
            borderColor: theme.colors.border,
            color: theme.colors.text,
            backgroundColor: theme.colors.card,
          }]}
          value={clientName}
          onChangeText={setClientName}
          placeholder="Nom du client"
          placeholderTextColor={theme.colors.textSecondary}
        />
        <TouchableOpacity
          style={[styles.signatureButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}
          onPress={() => openSignaturePad('client')}
        >
          {clientSignature ? (
            <View style={styles.signaturePlaceholder}>
              <Ionicons name="checkmark-circle" size={48} color={theme.colors.success} />
              <Text style={[styles.signatureText, { color: theme.colors.success }]}>
                Signature enregistrée
              </Text>
            </View>
          ) : (
            <View style={styles.signaturePlaceholder}>
              <Ionicons name="pencil" size={48} color={theme.colors.textSecondary} />
              <Text style={[styles.signatureText, { color: theme.colors.textSecondary }]}>
                Appuyez pour signer
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>
          Signature du convoyeur *
        </Text>
        <TextInput
          style={[styles.input, { 
            borderColor: theme.colors.border,
            color: theme.colors.text,
            backgroundColor: theme.colors.card,
          }]}
          value={convoyeurName}
          onChangeText={setConvoyeurName}
          placeholder="Nom du convoyeur"
          placeholderTextColor={theme.colors.textSecondary}
        />
        <TouchableOpacity
          style={[styles.signatureButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}
          onPress={() => openSignaturePad('convoyeur')}
        >
          {convoyeurSignature ? (
            <View style={styles.signaturePlaceholder}>
              <Ionicons name="checkmark-circle" size={48} color={theme.colors.success} />
              <Text style={[styles.signatureText, { color: theme.colors.success }]}>
                Signature enregistrée
              </Text>
            </View>
          ) : (
            <View style={styles.signaturePlaceholder}>
              <Ionicons name="pencil" size={48} color={theme.colors.textSecondary} />
              <Text style={[styles.signatureText, { color: theme.colors.textSecondary }]}>
                Appuyez pour signer
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep5 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
        Documents (Optionnel)
      </Text>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>
          Documents scannés
        </Text>
        {documents.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            Aucun document scanné
          </Text>
        ) : (
          documents.map((doc, index) => (
            <View key={index} style={[styles.documentItem, { borderColor: theme.colors.border }]}>
              <Ionicons name="document-text" size={24} color={theme.colors.primary} />
              <Text style={[styles.documentText, { color: theme.colors.text }]}>
                Document {index + 1}
              </Text>
            </View>
          ))
        )}
        <TouchableOpacity
          style={[styles.scanButton, { backgroundColor: theme.colors.primary }]}
          onPress={scanDocument}
        >
          <Ionicons name="scan" size={24} color="#fff" />
          <Text style={styles.scanButtonText}>Scanner un document</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.primaryDark || theme.colors.primary]}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Inspection de départ</Text>
      </LinearGradient>

      {renderProgressBar()}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
        {currentStep === 5 && renderStep5()}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
        <View style={styles.navigationButtons}>
          {currentStep > 1 && (
            <TouchableOpacity
              style={[styles.navButton, styles.prevButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
              onPress={handlePrevious}
            >
              <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
              <Text style={[styles.navButtonText, { color: theme.colors.text }]}>Précédent</Text>
            </TouchableOpacity>
          )}
          
          {currentStep < totalSteps ? (
            <TouchableOpacity
              style={[styles.navButton, styles.nextButton, { 
                backgroundColor: canProceedToNextStep() ? theme.colors.primary : theme.colors.disabled,
                marginLeft: currentStep === 1 ? 'auto' : 12,
              }]}
              onPress={handleNext}
              disabled={!canProceedToNextStep()}
            >
              <Text style={styles.navButtonText}>Suivant</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.navButton, styles.saveButton, { 
                backgroundColor: canProceedToNextStep() ? theme.colors.success : theme.colors.disabled,
                marginLeft: 12,
              }]}
              onPress={handleSave}
              disabled={!canProceedToNextStep()}
            >
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.navButtonText}>Enregistrer</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  progressBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  progressStep: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  stepContainer: {
    paddingBottom: 24,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  photoButton: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  photoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderText: {
    marginTop: 8,
    fontSize: 14,
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
  },
  fuelButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  fuelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  fuelButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  conditionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  conditionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  conditionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  numberControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: 8,
  },
  numberButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberValue: {
    fontSize: 24,
    fontWeight: 'bold',
    minWidth: 40,
    textAlign: 'center',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  checkboxLabel: {
    fontSize: 14,
    flex: 1,
  },
  photoItem: {
    marginBottom: 16,
  },
  photoLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  damageButtons: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  damageButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
  },
  damageButtonText: {
    fontSize: 11,
    fontWeight: '600',
  },
  signatureButton: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    marginTop: 8,
    overflow: 'hidden',
  },
  signaturePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signatureText: {
    marginTop: 8,
    fontSize: 14,
  },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  documentText: {
    fontSize: 14,
    flex: 1,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  navigationButtons: {
    flexDirection: 'row',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
  },
  prevButton: {
    borderWidth: 1,
    marginRight: 'auto',
  },
  nextButton: {
    marginLeft: 'auto',
  },
  saveButton: {
    marginLeft: 'auto',
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});

export default InspectionDeparture;
