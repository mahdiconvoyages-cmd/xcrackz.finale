/**
 * 📋 CLIENT CREATION SCREEN - TIMEINVOICE STYLE
 * 
 * Formulaire moderne de création de client avec:
 * - Recherche SIRET auto-complétion
 * - Validation en temps réel
 * - Sections organisées
 * - Animations fluides
 * - Support entreprise/particulier
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  FadeInDown, 
  FadeInUp,
  SlideInRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface ClientFormData {
  name: string;
  email: string;
  phone: string;
  company_name: string;
  siret: string;
  siren: string;
  tva_number: string;
  address: string;
  postal_code: string;
  city: string;
  country: string;
  website: string;
  notes: string;
  payment_terms: number;
  is_company: boolean;
  is_favorite: boolean;
}

interface InseeCompany {
  siret: string;
  siren: string;
  name: string;
  address: string;
  postal_code: string;
  city: string;
  tva_number?: string;
}

export default function ClientCreateScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const clientId = (route.params as any)?.clientId;
  const isNew = !clientId || clientId === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [siretSearching, setSiretSearching] = useState(false);
  const [siretFound, setSiretFound] = useState<boolean | null>(null);
  const [showSiretResults, setShowSiretResults] = useState(false);
  const [inseeResults, setInseeResults] = useState<InseeCompany[]>([]);

  const scrollViewRef = useRef<ScrollView>(null);
  const progressValue = useSharedValue(0);

  const [formData, setFormData] = useState<ClientFormData>({
    name: '',
    email: '',
    phone: '',
    company_name: '',
    siret: '',
    siren: '',
    tva_number: '',
    address: '',
    postal_code: '',
    city: '',
    country: 'France',
    website: '',
    notes: '',
    payment_terms: 30,
    is_company: false,
    is_favorite: false,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ClientFormData, string>>>({});

  useEffect(() => {
    if (!isNew) {
      loadClient();
    }
  }, [clientId]);

  // Calculate form completion progress
  useEffect(() => {
    const requiredFields = ['name', 'email'];
    const optionalFields = ['phone', 'address', 'city'];
    const allFields = [...requiredFields, ...optionalFields];
    
    const filledCount = allFields.filter(field => 
      formData[field as keyof ClientFormData]?.toString().trim()
    ).length;
    
    const progress = filledCount / allFields.length;
    progressValue.value = withSpring(progress);
  }, [formData]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressValue.value * 100}%`,
  }));

  const loadClient = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (error) throw error;
      if (data) {
        setFormData({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          company_name: data.company_name || '',
          siret: data.siret || '',
          siren: data.siren || '',
          tva_number: data.tva_number || '',
          address: data.address || '',
          postal_code: data.postal_code || '',
          city: data.city || '',
          country: data.country || 'France',
          website: data.website || '',
          notes: data.notes || '',
          payment_terms: data.payment_terms || 30,
          is_company: data.is_company || false,
          is_favorite: data.is_favorite || false,
        });
      }
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const searchSiret = async (siret: string) => {
    // Clean SIRET
    const cleanSiret = siret.replace(/\s/g, '');
    
    if (cleanSiret.length < 9) {
      setSiretFound(null);
      setShowSiretResults(false);
      return;
    }

    setSiretSearching(true);
    try {
      // Use INSEE API (api.insee.fr) or api-entreprise.data.gouv.fr
      const response = await fetch(
        `https://api.insee.fr/entreprises/sirene/V3/siret/${cleanSiret}`,
        {
          headers: {
            'Accept': 'application/json',
            // Add your INSEE API key here if available
          }
        }
      );

      // Fallback to recherche-entreprises.api.gouv.fr (free, no auth)
      const searchResponse = await fetch(
        `https://recherche-entreprises.api.gouv.fr/search?q=${cleanSiret}&page=1&per_page=5`
      );

      if (searchResponse.ok) {
        const data = await searchResponse.json();
        if (data.results && data.results.length > 0) {
          const companies: InseeCompany[] = data.results.map((r: any) => ({
            siret: r.siege?.siret || '',
            siren: r.siren || '',
            name: r.nom_complet || r.nom_raison_sociale || '',
            address: r.siege?.adresse || '',
            postal_code: r.siege?.code_postal || '',
            city: r.siege?.libelle_commune || '',
            tva_number: r.siren ? `FR${(12 + 3 * (parseInt(r.siren) % 97)) % 97}${r.siren}` : '',
          }));
          
          setInseeResults(companies);
          setSiretFound(true);
          setShowSiretResults(true);
        } else {
          setSiretFound(false);
          setShowSiretResults(false);
        }
      } else {
        setSiretFound(false);
      }
    } catch (error) {
      console.error('SIRET search error:', error);
      setSiretFound(false);
    } finally {
      setSiretSearching(false);
    }
  };

  const selectCompany = (company: InseeCompany) => {
    setFormData(prev => ({
      ...prev,
      company_name: company.name,
      siret: company.siret,
      siren: company.siren,
      tva_number: company.tva_number || '',
      address: company.address,
      postal_code: company.postal_code,
      city: company.city,
      is_company: true,
    }));
    setShowSiretResults(false);
    setSiretFound(true);
    Keyboard.dismiss();
  };

  const formatSiret = (value: string): string => {
    const digits = value.replace(/\D/g, '').slice(0, 14);
    const parts = [];
    for (let i = 0; i < digits.length; i += 3) {
      parts.push(digits.slice(i, i + 3));
    }
    return parts.join(' ');
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ClientFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Le nom est requis';
    }

    if (!formData.email.trim()) {
      newErrors.email = "L'email est requis";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email invalide';
    }

    if (formData.siret && formData.siret.replace(/\s/g, '').length !== 14) {
      newErrors.siret = 'Le SIRET doit contenir 14 chiffres';
    }

    if (formData.phone && !/^[\d\s+()-]{10,20}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Numéro de téléphone invalide';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert('Erreur', 'Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    setSaving(true);
    try {
      const clientData = {
        ...formData,
        siret: formData.siret.replace(/\s/g, ''),
        user_id: user?.id,
        updated_at: new Date().toISOString(),
      };

      if (isNew) {
        const { error } = await supabase
          .from('clients')
          .insert({
            ...clientData,
            created_at: new Date().toISOString(),
          });
        if (error) throw error;
        Alert.alert('✅ Succès', 'Client créé avec succès', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        const { error } = await supabase
          .from('clients')
          .update(clientData)
          .eq('id', clientId);
        if (error) throw error;
        Alert.alert('✅ Succès', 'Client modifié avec succès', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    } finally {
      setSaving(false);
    }
  };

  const renderInput = (
    label: string,
    field: keyof ClientFormData,
    options?: {
      placeholder?: string;
      keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'number-pad';
      autoCapitalize?: 'none' | 'sentences' | 'words';
      multiline?: boolean;
      icon?: string;
      required?: boolean;
      suffix?: React.ReactNode;
    }
  ) => (
    <Animated.View 
      entering={FadeInDown.delay(100)} 
      style={styles.inputGroup}
    >
      <Text style={styles.inputLabel}>
        {label} {options?.required && <Text style={styles.required}>*</Text>}
      </Text>
      <View style={[
        styles.inputContainer,
        errors[field] && styles.inputError,
      ]}>
        {options?.icon && (
          <Ionicons 
            name={options.icon as any} 
            size={20} 
            color="#6b7280" 
            style={styles.inputIcon}
          />
        )}
        <TextInput
          style={[
            styles.input,
            options?.multiline && styles.textArea,
          ]}
          value={formData[field]?.toString() || ''}
          onChangeText={(text) => {
            setFormData(prev => ({ ...prev, [field]: text }));
            if (errors[field]) {
              setErrors(prev => ({ ...prev, [field]: undefined }));
            }
          }}
          placeholder={options?.placeholder || label}
          placeholderTextColor="#9ca3af"
          keyboardType={options?.keyboardType || 'default'}
          autoCapitalize={options?.autoCapitalize || 'sentences'}
          multiline={options?.multiline}
          numberOfLines={options?.multiline ? 3 : 1}
        />
        {options?.suffix}
      </View>
      {errors[field] && (
        <Text style={styles.errorText}>{errors[field]}</Text>
      )}
    </Animated.View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0f766e" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#0f766e', '#14b8a6']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isNew ? 'Nouveau Client' : 'Modifier Client'}
          </Text>
          <TouchableOpacity 
            onPress={handleSave}
            disabled={saving}
            style={styles.saveButton}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="checkmark" size={24} color="#fff" />
            )}
          </TouchableOpacity>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBackground}>
            <Animated.View style={[styles.progressFill, progressStyle]} />
          </View>
          <Text style={styles.progressText}>Complétion du profil</Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView 
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Type Toggle */}
          <Animated.View entering={FadeInDown.delay(50)} style={styles.section}>
            <View style={styles.typeToggle}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  !formData.is_company && styles.typeButtonActive,
                ]}
                onPress={() => setFormData(prev => ({ ...prev, is_company: false }))}
              >
                <Ionicons 
                  name="person" 
                  size={24} 
                  color={!formData.is_company ? '#fff' : '#6b7280'} 
                />
                <Text style={[
                  styles.typeButtonText,
                  !formData.is_company && styles.typeButtonTextActive,
                ]}>
                  Particulier
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  formData.is_company && styles.typeButtonActive,
                ]}
                onPress={() => setFormData(prev => ({ ...prev, is_company: true }))}
              >
                <Ionicons 
                  name="business" 
                  size={24} 
                  color={formData.is_company ? '#fff' : '#6b7280'} 
                />
                <Text style={[
                  styles.typeButtonText,
                  formData.is_company && styles.typeButtonTextActive,
                ]}>
                  Entreprise
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* SIRET Search (for companies) */}
          {formData.is_company && (
            <Animated.View entering={SlideInRight.delay(100)} style={styles.section}>
              <Text style={styles.sectionTitle}>
                <Ionicons name="search" size={18} color="#0f766e" /> Recherche SIRET
              </Text>
              <View style={styles.siretSearchContainer}>
                <TextInput
                  style={styles.siretInput}
                  value={formatSiret(formData.siret)}
                  onChangeText={(text) => {
                    const cleaned = text.replace(/\D/g, '').slice(0, 14);
                    setFormData(prev => ({ ...prev, siret: cleaned }));
                    if (cleaned.length >= 9) {
                      searchSiret(cleaned);
                    }
                  }}
                  placeholder="Entrez le SIRET (14 chiffres)"
                  placeholderTextColor="#9ca3af"
                  keyboardType="number-pad"
                  maxLength={17} // 14 digits + 3 spaces
                />
                {siretSearching && (
                  <ActivityIndicator 
                    size="small" 
                    color="#0f766e" 
                    style={styles.siretLoader}
                  />
                )}
                {siretFound === true && !siretSearching && (
                  <Ionicons 
                    name="checkmark-circle" 
                    size={24} 
                    color="#10b981" 
                    style={styles.siretIcon}
                  />
                )}
                {siretFound === false && !siretSearching && (
                  <Ionicons 
                    name="close-circle" 
                    size={24} 
                    color="#ef4444" 
                    style={styles.siretIcon}
                  />
                )}
              </View>

              {/* SIRET Results */}
              {showSiretResults && inseeResults.length > 0 && (
                <View style={styles.siretResults}>
                  <Text style={styles.siretResultsTitle}>Entreprises trouvées:</Text>
                  {inseeResults.map((company, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.siretResultItem}
                      onPress={() => selectCompany(company)}
                    >
                      <View style={styles.siretResultContent}>
                        <Text style={styles.siretResultName}>{company.name}</Text>
                        <Text style={styles.siretResultAddress}>
                          {company.address}, {company.postal_code} {company.city}
                        </Text>
                        <Text style={styles.siretResultSiret}>SIRET: {company.siret}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#6b7280" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </Animated.View>
          )}

          {/* General Information */}
          <Animated.View entering={FadeInDown.delay(150)} style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="person" size={18} color="#0f766e" /> Informations générales
            </Text>
            
            {renderInput('Nom complet', 'name', { 
              required: true, 
              icon: 'person-outline',
              placeholder: formData.is_company ? 'Nom du contact' : 'Nom et prénom',
            })}

            {formData.is_company && renderInput('Raison sociale', 'company_name', { 
              icon: 'business-outline',
              placeholder: 'Nom de l\'entreprise',
            })}

            {renderInput('Email', 'email', { 
              required: true,
              icon: 'mail-outline',
              keyboardType: 'email-address',
              autoCapitalize: 'none',
              placeholder: 'email@exemple.com',
            })}

            {renderInput('Téléphone', 'phone', { 
              icon: 'call-outline',
              keyboardType: 'phone-pad',
              placeholder: '+33 6 12 34 56 78',
            })}

            {formData.is_company && renderInput('Site web', 'website', { 
              icon: 'globe-outline',
              keyboardType: 'default',
              autoCapitalize: 'none',
              placeholder: 'https://www.exemple.com',
            })}
          </Animated.View>

          {/* Company Details */}
          {formData.is_company && (
            <Animated.View entering={FadeInDown.delay(200)} style={styles.section}>
              <Text style={styles.sectionTitle}>
                <Ionicons name="briefcase" size={18} color="#0f766e" /> Informations légales
              </Text>
              
              {renderInput('SIREN', 'siren', { 
                icon: 'document-outline',
                keyboardType: 'number-pad',
                placeholder: '9 chiffres',
              })}

              {renderInput('N° TVA Intracommunautaire', 'tva_number', { 
                icon: 'receipt-outline',
                placeholder: 'FR12345678901',
                autoCapitalize: 'none',
              })}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Délai de paiement (jours)</Text>
                <View style={styles.paymentTermsContainer}>
                  {[0, 15, 30, 45, 60].map((days) => (
                    <TouchableOpacity
                      key={days}
                      style={[
                        styles.paymentTermButton,
                        formData.payment_terms === days && styles.paymentTermButtonActive,
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, payment_terms: days }))}
                    >
                      <Text style={[
                        styles.paymentTermText,
                        formData.payment_terms === days && styles.paymentTermTextActive,
                      ]}>
                        {days === 0 ? 'Comptant' : `${days}j`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </Animated.View>
          )}

          {/* Address */}
          <Animated.View entering={FadeInDown.delay(250)} style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="location" size={18} color="#0f766e" /> Adresse
            </Text>
            
            {renderInput('Adresse', 'address', { 
              icon: 'location-outline',
              placeholder: 'Numéro et rue',
              multiline: true,
            })}

            <View style={styles.row}>
              <View style={styles.halfWidth}>
                {renderInput('Code postal', 'postal_code', { 
                  keyboardType: 'number-pad',
                  placeholder: '75001',
                })}
              </View>
              <View style={styles.halfWidth}>
                {renderInput('Ville', 'city', { 
                  placeholder: 'Paris',
                })}
              </View>
            </View>

            {renderInput('Pays', 'country', { 
              icon: 'flag-outline',
              placeholder: 'France',
            })}
          </Animated.View>

          {/* Notes & Preferences */}
          <Animated.View entering={FadeInDown.delay(300)} style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="create" size={18} color="#0f766e" /> Notes & Préférences
            </Text>
            
            {renderInput('Notes internes', 'notes', { 
              icon: 'document-text-outline',
              placeholder: 'Informations complémentaires sur ce client...',
              multiline: true,
            })}

            <View style={styles.toggleRow}>
              <View style={styles.toggleItem}>
                <Ionicons 
                  name={formData.is_favorite ? 'star' : 'star-outline'} 
                  size={24} 
                  color={formData.is_favorite ? '#f59e0b' : '#d1d5db'} 
                />
                <Text style={styles.toggleLabel}>Marquer comme favori</Text>
                <Switch
                  value={formData.is_favorite}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, is_favorite: value }))}
                  trackColor={{ false: '#d1d5db', true: '#fde68a' }}
                  thumbColor={formData.is_favorite ? '#f59e0b' : '#f4f4f5'}
                />
              </View>
            </View>
          </Animated.View>

          {/* Save Button */}
          <Animated.View entering={FadeInUp.delay(350)} style={styles.saveSection}>
            <TouchableOpacity
              style={[styles.saveButtonLarge, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              <LinearGradient
                colors={saving ? ['#9ca3af', '#6b7280'] : ['#0f766e', '#14b8a6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveButtonGradient}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={24} color="#fff" />
                    <Text style={styles.saveButtonText}>
                      {isNew ? 'Créer le client' : 'Enregistrer les modifications'}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  saveButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    marginTop: 16,
    gap: 6,
  },
  progressBackground: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'right',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  typeToggle: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeButtonActive: {
    backgroundColor: '#0f766e',
    borderColor: '#0f766e',
  },
  typeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  siretSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  siretInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 2,
    paddingVertical: 16,
    color: '#1f2937',
  },
  siretLoader: {
    marginLeft: 8,
  },
  siretIcon: {
    marginLeft: 8,
  },
  siretResults: {
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  siretResultsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#166534',
    marginBottom: 8,
  },
  siretResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  siretResultContent: {
    flex: 1,
  },
  siretResultName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  siretResultAddress: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  siretResultSiret: {
    fontSize: 12,
    color: '#0f766e',
    marginTop: 4,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    paddingVertical: 14,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
    marginLeft: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  paymentTermsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  paymentTermButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  paymentTermButtonActive: {
    backgroundColor: '#0f766e',
  },
  paymentTermText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  paymentTermTextActive: {
    color: '#fff',
  },
  toggleRow: {
    gap: 12,
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 14,
    borderRadius: 12,
    gap: 12,
  },
  toggleLabel: {
    flex: 1,
    fontSize: 15,
    color: '#1f2937',
    fontWeight: '500',
  },
  saveSection: {
    marginTop: 8,
    marginBottom: 20,
  },
  saveButtonLarge: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
});
