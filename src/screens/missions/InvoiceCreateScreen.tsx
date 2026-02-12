/**
 * 📄 INVOICE CREATE SCREEN
 * Création de facture depuis une mission terminée
 * Pré-rempli avec les données de la mission (véhicule, adresses, dates, km)
 * L'utilisateur choisit/crée un client et entre le prix manuellement
 */
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  siret: string;
}

export default function InvoiceCreateScreen({ route, navigation }: any) {
  const mission = route.params?.mission;
  const { colors } = useTheme();
  const { user } = useAuth();

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // States
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showClientSelector, setShowClientSelector] = useState(true);
  const [showNewClientForm, setShowNewClientForm] = useState(false);

  // New client form
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientAddress, setNewClientAddress] = useState('');
  const [newClientSiret, setNewClientSiret] = useState('');

  // Invoice data
  const [description, setDescription] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');
  const [vatRate, setVatRate] = useState(20);
  const [applyVat, setApplyVat] = useState(true);

  useEffect(() => {
    loadClients();
    buildDescription();

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  const loadClients = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (!error && data) setClients(data);
    } catch (err) {
      console.error('Error loading clients:', err);
    }
  };

  const buildDescription = () => {
    if (!mission) return;

    const vehicleName = [mission.vehicle_brand, mission.vehicle_model].filter(Boolean).join(' ') || 'Véhicule';
    const plate = mission.vehicle_plate || '';

    const formatDate = (dateStr: string) => {
      if (!dateStr) return '';
      try {
        return new Date(dateStr).toLocaleDateString('fr-FR', {
          day: '2-digit', month: '2-digit', year: 'numeric',
        });
      } catch { return dateStr; }
    };

    const parts: string[] = [];
    parts.push(`Convoyage: ${vehicleName}${plate ? ` - ${plate}` : ''}`);
    if (mission.pickup_address) parts.push(`Enlèvement: ${mission.pickup_address}${mission.pickup_date ? ` le ${formatDate(mission.pickup_date)}` : ''}`);
    if (mission.delivery_address) parts.push(`Livraison: ${mission.delivery_address}${mission.delivery_date ? ` le ${formatDate(mission.delivery_date)}` : ''}`);
    const distance = mission.distance_km || mission.distance || mission.estimated_distance;
    if (distance) parts.push(`Distance: ${distance} km`);

    setDescription(parts.join('\n'));
  };

  const calculateSubtotal = () => {
    const price = parseFloat(unitPrice) || 0;
    const qty = parseFloat(quantity) || 1;
    return price * qty;
  };

  const calculateTax = () => {
    if (!applyVat) return 0;
    return calculateSubtotal() * (vatRate / 100);
  };

  const calculateTotal = () => calculateSubtotal() + calculateTax();

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setShowClientSelector(false);
    setShowNewClientForm(false);
  };

  const handleClearClient = () => {
    setSelectedClient(null);
    setShowClientSelector(true);
  };

  const handleCreateClient = async () => {
    if (!newClientName.trim()) {
      Alert.alert('Erreur', 'Le nom du client est obligatoire');
      return;
    }
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('clients')
        .insert([{
          user_id: user.id,
          name: newClientName.trim(),
          email: newClientEmail.trim(),
          phone: newClientPhone.trim(),
          address: newClientAddress.trim(),
          siret: newClientSiret.trim(),
        }])
        .select()
        .single();

      if (error) throw error;

      setClients(prev => [...prev, data]);
      handleSelectClient(data);
      Alert.alert('✅ Succès', `Client "${data.name}" créé avec succès`);
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible de créer le client');
    }
  };

  const handleSubmit = async () => {
    if (!selectedClient) {
      Alert.alert('Erreur', 'Veuillez sélectionner ou créer un client');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Erreur', 'La description est obligatoire');
      return;
    }
    if (!unitPrice || parseFloat(unitPrice) <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer un prix valide');
      return;
    }
    if (!user) return;

    setLoading(true);
    try {
      const invoiceNumber = `F-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
      const subtotal = calculateSubtotal();
      const taxAmount = calculateTax();
      const total = calculateTotal();

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert([{
          user_id: user.id,
          invoice_number: invoiceNumber,
          client_name: selectedClient.name,
          client_email: selectedClient.email || '',
          client_address: selectedClient.address || '',
          client_siret: selectedClient.siret || '',
          issue_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'draft',
          subtotal,
          tax_rate: applyVat ? vatRate : 0,
          tax_amount: taxAmount,
          total,
          notes: notes.trim(),
          payment_terms: 'Paiement à réception de facture',
          vat_liable: applyVat,
          vat_regime: applyVat ? 'normal' : 'franchise',
          legal_mentions: applyVat
            ? 'TVA applicable selon les conditions générales de vente.'
            : 'TVA non applicable, art. 293 B du CGI',
        }])
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice item
      await supabase.from('invoice_items').insert([{
        invoice_id: invoice.id,
        description: description.trim(),
        quantity: parseFloat(quantity) || 1,
        unit_price: parseFloat(unitPrice) || 0,
        tax_rate: applyVat ? vatRate : 0,
        total: subtotal,
      }]);

      Alert.alert(
        '✅ Facture créée',
        `Facture ${invoiceNumber} créée avec succès pour ${selectedClient.name}\n\nMontant: ${total.toFixed(2)}€`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err: any) {
      console.error('Error creating invoice:', err);
      Alert.alert('Erreur', err.message || 'Impossible de créer la facture');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nouvelle Facture</Text>
          <View style={{ width: 40 }} />
        </View>
        {mission && (
          <View style={styles.missionBadge}>
            <Ionicons name="car-sport" size={16} color="#14b8a6" />
            <Text style={styles.missionBadgeText}>
              Mission {mission.reference || ''} • {[mission.vehicle_brand, mission.vehicle_model].filter(Boolean).join(' ')}
            </Text>
          </View>
        )}
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* CLIENT SECTION */}
          <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <LinearGradient colors={['#1e293b', '#0f172a']} style={styles.cardGradient}>
              <View style={styles.cardHeader}>
                <Ionicons name="business" size={22} color="#3b82f6" />
                <Text style={styles.cardTitle}>Client</Text>
              </View>

              {selectedClient ? (
                <View style={styles.selectedClientCard}>
                  <View style={styles.selectedClientInfo}>
                    <View style={styles.clientAvatar}>
                      <Text style={styles.clientAvatarText}>
                        {selectedClient.name?.charAt(0).toUpperCase() || '?'}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.selectedClientName}>{selectedClient.name}</Text>
                      {selectedClient.email ? (
                        <Text style={styles.selectedClientDetail}>{selectedClient.email}</Text>
                      ) : null}
                      {selectedClient.siret ? (
                        <Text style={styles.selectedClientDetail}>SIRET: {selectedClient.siret}</Text>
                      ) : null}
                    </View>
                    <TouchableOpacity style={styles.clearClientBtn} onPress={handleClearClient}>
                      <Ionicons name="close-circle" size={24} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <>
                  {/* Existing clients list */}
                  {showClientSelector && clients.length > 0 && (
                    <View style={styles.clientList}>
                      <Text style={styles.sectionSubtitle}>Clients existants</Text>
                      <ScrollView style={styles.clientScroll} nestedScrollEnabled>
                        {clients.map((client) => (
                          <TouchableOpacity
                            key={client.id}
                            style={styles.clientItem}
                            onPress={() => handleSelectClient(client)}
                          >
                            <View style={styles.clientItemAvatar}>
                              <Text style={styles.clientItemAvatarText}>
                                {client.name?.charAt(0).toUpperCase() || '?'}
                              </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.clientItemName}>{client.name}</Text>
                              {client.email ? <Text style={styles.clientItemEmail}>{client.email}</Text> : null}
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#64748b" />
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  {/* Create new client */}
                  <TouchableOpacity
                    style={styles.newClientToggle}
                    onPress={() => setShowNewClientForm(!showNewClientForm)}
                  >
                    <Ionicons name={showNewClientForm ? 'remove-circle' : 'add-circle'} size={22} color="#14b8a6" />
                    <Text style={styles.newClientToggleText}>
                      {showNewClientForm ? 'Masquer' : 'Créer un nouveau client'}
                    </Text>
                  </TouchableOpacity>

                  {showNewClientForm && (
                    <View style={styles.newClientForm}>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Nom *</Text>
                        <TextInput
                          style={styles.input}
                          value={newClientName}
                          onChangeText={setNewClientName}
                          placeholder="Nom du client"
                          placeholderTextColor="#64748b"
                        />
                      </View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Email</Text>
                        <TextInput
                          style={styles.input}
                          value={newClientEmail}
                          onChangeText={setNewClientEmail}
                          placeholder="client@email.com"
                          placeholderTextColor="#64748b"
                          keyboardType="email-address"
                          autoCapitalize="none"
                        />
                      </View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Téléphone</Text>
                        <TextInput
                          style={styles.input}
                          value={newClientPhone}
                          onChangeText={setNewClientPhone}
                          placeholder="06 12 34 56 78"
                          placeholderTextColor="#64748b"
                          keyboardType="phone-pad"
                        />
                      </View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Adresse</Text>
                        <TextInput
                          style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
                          value={newClientAddress}
                          onChangeText={setNewClientAddress}
                          placeholder="Adresse complète"
                          placeholderTextColor="#64748b"
                          multiline
                        />
                      </View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>SIRET</Text>
                        <TextInput
                          style={styles.input}
                          value={newClientSiret}
                          onChangeText={setNewClientSiret}
                          placeholder="123 456 789 00012"
                          placeholderTextColor="#64748b"
                          keyboardType="number-pad"
                        />
                      </View>
                      <TouchableOpacity style={styles.createClientBtn} onPress={handleCreateClient}>
                        <LinearGradient colors={['#14b8a6', '#0d9488']} style={styles.createClientGradient}>
                          <Ionicons name="checkmark-circle" size={20} color="#fff" />
                          <Text style={styles.createClientBtnText}>Créer et sélectionner</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}
            </LinearGradient>
          </Animated.View>

          {/* DESCRIPTION SECTION */}
          <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <LinearGradient colors={['#1e293b', '#0f172a']} style={styles.cardGradient}>
              <View style={styles.cardHeader}>
                <MaterialCommunityIcons name="file-document-edit" size={22} color="#10b981" />
                <Text style={styles.cardTitle}>Prestation</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description *</Text>
                <TextInput
                  style={[styles.input, styles.multilineInput]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Description de la prestation"
                  placeholderTextColor="#64748b"
                  multiline
                  numberOfLines={5}
                />
              </View>

              <View style={styles.priceRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
                  <Text style={styles.inputLabel}>Quantité</Text>
                  <TextInput
                    style={styles.input}
                    value={quantity}
                    onChangeText={setQuantity}
                    placeholder="1"
                    placeholderTextColor="#64748b"
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 2 }]}>
                  <Text style={styles.inputLabel}>Prix unitaire HT (€) *</Text>
                  <TextInput
                    style={[styles.input, styles.priceInput]}
                    value={unitPrice}
                    onChangeText={setUnitPrice}
                    placeholder="0.00"
                    placeholderTextColor="#64748b"
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* TVA SECTION */}
          <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <LinearGradient colors={['#1e293b', '#0f172a']} style={styles.cardGradient}>
              <View style={styles.cardHeader}>
                <Ionicons name="calculator" size={22} color="#f59e0b" />
                <Text style={styles.cardTitle}>TVA</Text>
              </View>

              <TouchableOpacity
                style={styles.vatToggle}
                onPress={() => setApplyVat(!applyVat)}
              >
                <View style={[styles.toggleTrack, applyVat && styles.toggleTrackActive]}>
                  <View style={[styles.toggleThumb, applyVat && styles.toggleThumbActive]} />
                </View>
                <Text style={styles.vatToggleText}>
                  {applyVat ? `TVA applicable (${vatRate}%)` : 'TVA non applicable (art. 293 B du CGI)'}
                </Text>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>

          {/* NOTES SECTION */}
          <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <LinearGradient colors={['#1e293b', '#0f172a']} style={styles.cardGradient}>
              <View style={styles.cardHeader}>
                <Ionicons name="chatbox-ellipses" size={22} color="#8b5cf6" />
                <Text style={styles.cardTitle}>Notes</Text>
              </View>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Notes supplémentaires (optionnel)"
                placeholderTextColor="#64748b"
                multiline
              />
            </LinearGradient>
          </Animated.View>

          {/* RECAP SECTION */}
          <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <LinearGradient colors={['#1e293b', '#0f172a']} style={styles.cardGradient}>
              <View style={styles.cardHeader}>
                <Ionicons name="receipt" size={22} color="#14b8a6" />
                <Text style={styles.cardTitle}>Récapitulatif</Text>
              </View>

              <View style={styles.recapRow}>
                <Text style={styles.recapLabel}>Sous-total HT</Text>
                <Text style={styles.recapValue}>{calculateSubtotal().toFixed(2)} €</Text>
              </View>
              <View style={styles.recapRow}>
                <Text style={styles.recapLabel}>TVA {applyVat ? `(${vatRate}%)` : ''}</Text>
                <Text style={[styles.recapValue, !applyVat && { color: '#f59e0b' }]}>
                  {applyVat ? `+${calculateTax().toFixed(2)} €` : 'Non applicable'}
                </Text>
              </View>
              <View style={[styles.recapRow, styles.recapTotal]}>
                <Text style={styles.recapTotalLabel}>TOTAL {applyVat ? 'TTC' : ''}</Text>
                <Text style={styles.recapTotalValue}>{calculateTotal().toFixed(2)} €</Text>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* SUBMIT BUTTON */}
          <TouchableOpacity
            style={[styles.submitButton, loading && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <LinearGradient colors={['#14b8a6', '#0d9488']} style={styles.submitGradient}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={24} color="#fff" />
                  <Text style={styles.submitText}>Créer la facture</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { paddingTop: 50, paddingBottom: 16, paddingHorizontal: 20 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  missionBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, backgroundColor: 'rgba(20,184,166,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start' },
  missionBadgeText: { color: '#14b8a6', fontSize: 13, fontWeight: '600' },
  scrollContent: { flex: 1 },
  scrollContainer: { padding: 16 },
  card: { marginBottom: 16, borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  cardGradient: { padding: 20 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },

  // Client selector
  selectedClientCard: { backgroundColor: 'rgba(20,184,166,0.1)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(20,184,166,0.3)' },
  selectedClientInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  clientAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#14b8a6', alignItems: 'center', justifyContent: 'center' },
  clientAvatarText: { fontSize: 20, fontWeight: '800', color: '#fff' },
  selectedClientName: { fontSize: 16, fontWeight: '700', color: '#fff' },
  selectedClientDetail: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
  clearClientBtn: { padding: 4 },

  clientList: { marginBottom: 12 },
  sectionSubtitle: { fontSize: 14, fontWeight: '600', color: '#94a3b8', marginBottom: 8 },
  clientScroll: { maxHeight: 200 },
  clientItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', marginBottom: 6 },
  clientItemAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center' },
  clientItemAvatarText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  clientItemName: { fontSize: 14, fontWeight: '600', color: '#e2e8f0' },
  clientItemEmail: { fontSize: 12, color: '#64748b', marginTop: 1 },

  newClientToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
  newClientToggleText: { fontSize: 15, fontWeight: '600', color: '#14b8a6' },

  newClientForm: { marginTop: 8, padding: 16, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },

  createClientBtn: { marginTop: 12, borderRadius: 14, overflow: 'hidden' },
  createClientGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  createClientBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // Inputs
  inputGroup: { marginBottom: 14 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#94a3b8', marginBottom: 6 },
  input: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, color: '#fff', fontSize: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  multilineInput: { height: 120, textAlignVertical: 'top', paddingTop: 12 },
  priceRow: { flexDirection: 'row', alignItems: 'flex-start' },
  priceInput: { fontSize: 22, fontWeight: '800', color: '#14b8a6' },

  // VAT
  vatToggle: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleTrack: { width: 50, height: 28, borderRadius: 14, backgroundColor: '#334155', justifyContent: 'center', paddingHorizontal: 3 },
  toggleTrackActive: { backgroundColor: '#14b8a6' },
  toggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#94a3b8' },
  toggleThumbActive: { backgroundColor: '#fff', alignSelf: 'flex-end' },
  vatToggleText: { fontSize: 14, fontWeight: '600', color: '#e2e8f0', flex: 1 },

  // Recap
  recapRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  recapLabel: { fontSize: 14, color: '#94a3b8', fontWeight: '500' },
  recapValue: { fontSize: 16, color: '#e2e8f0', fontWeight: '600' },
  recapTotal: { borderBottomWidth: 0, marginTop: 8, backgroundColor: 'rgba(20,184,166,0.1)', marginHorizontal: -8, paddingHorizontal: 16, borderRadius: 12, paddingVertical: 14 },
  recapTotalLabel: { fontSize: 16, color: '#fff', fontWeight: '800' },
  recapTotalValue: { fontSize: 26, color: '#14b8a6', fontWeight: '900' },

  // Submit
  submitButton: { marginTop: 8, borderRadius: 20, overflow: 'hidden', shadowColor: '#14b8a6', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 12 },
  submitGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18 },
  submitText: { fontSize: 18, fontWeight: '800', color: '#fff' },
});
