import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AddressAutocompleteInput } from './AddressAutocompleteInput';

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  amount: number;
}

interface CreateInvoiceModalProps {
  visible: boolean;
  type: 'invoice' | 'quote'; // facture ou devis
  onClose: () => void;
  onSubmit: (data: any, items: InvoiceItem[]) => Promise<void>;
}

export default function CreateInvoiceModal({
  visible,
  type,
  onClose,
  onSubmit,
}: CreateInvoiceModalProps) {
  const [loading, setLoading] = useState(false);
  
  // Générer numéro automatique
  const generateNumber = () => {
    const prefix = type === 'invoice' ? 'F' : 'D';
    const year = new Date().getFullYear();
    const random = String(Date.now()).slice(-4);
    return `${prefix}-${year}-${random}`;
  };

  const [formData, setFormData] = useState({
    number: generateNumber(),
    client_name: '',
    client_email: '',
    client_siret: '',
    client_address: '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: '',
    valid_until: '',
    notes: '',
    payment_terms: 'Paiement à réception de facture',
  });

  const [items, setItems] = useState<InvoiceItem[]>([
    { description: '', quantity: 1, unit_price: 0, tax_rate: 20, amount: 0 },
  ]);

  // Calculs
  const calculateItemAmount = (item: InvoiceItem) => item.quantity * item.unit_price;
  
  const calculateSubtotal = () => 
    items.reduce((sum, item) => sum + calculateItemAmount(item), 0);
  
  const calculateTax = () => 
    items.reduce((sum, item) => sum + (calculateItemAmount(item) * item.tax_rate) / 100, 0);
  
  const calculateTotal = () => calculateSubtotal() + calculateTax();

  // Gestion des items
  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unit_price: 0, tax_rate: 20, amount: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { 
      ...newItems[index], 
      [field]: field === 'quantity' || field === 'unit_price' || field === 'tax_rate' 
        ? parseFloat(value) || 0 
        : value 
    };
    setItems(newItems);
  };

  // Validation
  const validate = () => {
    if (!formData.client_name.trim()) {
      Alert.alert('Erreur', 'Le nom du client est requis');
      return false;
    }
    
    if (items.length === 0 || items.every(item => !item.description.trim())) {
      Alert.alert('Erreur', 'Ajoutez au moins un article');
      return false;
    }

    if (type === 'invoice' && !formData.due_date) {
      Alert.alert('Erreur', "La date d'échéance est requise pour une facture");
      return false;
    }

    if (type === 'quote' && !formData.valid_until) {
      Alert.alert('Erreur', 'La date de validité est requise pour un devis');
      return false;
    }

    return true;
  };

  // Soumission
  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      await onSubmit(formData, items);
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error creating document:', error);
      Alert.alert('Erreur', 'Impossible de créer le document');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      number: generateNumber(),
      client_name: '',
      client_email: '',
      client_siret: '',
      client_address: '',
      issue_date: new Date().toISOString().split('T')[0],
      due_date: '',
      valid_until: '',
      notes: '',
      payment_terms: 'Paiement à réception de facture',
    });
    setItems([{ description: '', quantity: 1, unit_price: 0, tax_rate: 20, amount: 0 }]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Header */}
        <LinearGradient colors={['#14b8a6', '#0d9488']} style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.backButton}>
            <Feather name="x" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {type === 'invoice' ? 'Nouvelle Facture' : 'Nouveau Devis'}
          </Text>
          <TouchableOpacity 
            onPress={handleSubmit} 
            style={styles.saveButton}
            disabled={loading}
          >
            <Feather name="check" size={24} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Numéro */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {type === 'invoice' ? 'Numéro de facture' : 'Numéro de devis'}
            </Text>
            <TextInput
              style={styles.input}
              value={formData.number}
              onChangeText={(text) => setFormData({ ...formData, number: text })}
              placeholder="F-2024-0001"
              placeholderTextColor="#6b7280"
            />
          </View>

          {/* Informations client */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations client</Text>
            
            <TextInput
              style={styles.input}
              value={formData.client_name}
              onChangeText={(text) => setFormData({ ...formData, client_name: text })}
              placeholder="Nom du client *"
              placeholderTextColor="#6b7280"
            />

            <TextInput
              style={styles.input}
              value={formData.client_email}
              onChangeText={(text) => setFormData({ ...formData, client_email: text })}
              placeholder="Email"
              placeholderTextColor="#6b7280"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TextInput
              style={styles.input}
              value={formData.client_siret}
              onChangeText={(text) => setFormData({ ...formData, client_siret: text })}
              placeholder="SIRET"
              placeholderTextColor="#6b7280"
            />

            <AddressAutocompleteInput
              value={formData.client_address}
              onChangeText={(text) => setFormData({ ...formData, client_address: text })}
              onSelectAddress={(address) => {
                setFormData({ ...formData, client_address: address.fullAddress });
              }}
              placeholder="Adresse complète du client"
              icon="map-pin"
              types="address"
              style={{ marginBottom: 0 }}
              inputStyle={{
                backgroundColor: '#1f2937',
                borderWidth: 1,
                borderColor: '#374151',
                borderRadius: 8,
                paddingHorizontal: 16,
                paddingVertical: 12,
                color: '#f3f4f6',
                fontSize: 16,
                minHeight: 80,
              }}
            />
          </View>

          {/* Dates */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dates</Text>
            
            <View style={styles.dateRow}>
              <Text style={styles.dateLabel}>Date d'émission</Text>
              <Text style={styles.dateValue}>{formData.issue_date}</Text>
            </View>

            {type === 'invoice' ? (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Date d'échéance *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.due_date}
                  onChangeText={(text) => setFormData({ ...formData, due_date: text })}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#6b7280"
                />
              </View>
            ) : (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Valide jusqu'au *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.valid_until}
                  onChangeText={(text) => setFormData({ ...formData, valid_until: text })}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#6b7280"
                />
              </View>
            )}
          </View>

          {/* Articles */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Articles</Text>
              <TouchableOpacity onPress={addItem} style={styles.addItemButton}>
                <Feather name="plus" size={18} color="#14b8a6" />
                <Text style={styles.addItemText}>Ajouter</Text>
              </TouchableOpacity>
            </View>

            {items.map((item, index) => (
              <View key={index} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemNumber}>Article {index + 1}</Text>
                  {items.length > 1 && (
                    <TouchableOpacity onPress={() => removeItem(index)}>
                      <Feather name="trash-2" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>

                <TextInput
                  style={[styles.input, styles.itemInput]}
                  value={item.description}
                  onChangeText={(text) => updateItem(index, 'description', text)}
                  placeholder="Description"
                  placeholderTextColor="#6b7280"
                  multiline
                />

                <View style={styles.itemRow}>
                  <View style={styles.itemCol}>
                    <Text style={styles.itemLabel}>Quantité</Text>
                    <TextInput
                      style={styles.itemSmallInput}
                      value={String(item.quantity)}
                      onChangeText={(text) => updateItem(index, 'quantity', text)}
                      keyboardType="numeric"
                      placeholderTextColor="#6b7280"
                    />
                  </View>

                  <View style={styles.itemCol}>
                    <Text style={styles.itemLabel}>Prix HT</Text>
                    <TextInput
                      style={styles.itemSmallInput}
                      value={String(item.unit_price)}
                      onChangeText={(text) => updateItem(index, 'unit_price', text)}
                      keyboardType="decimal-pad"
                      placeholderTextColor="#6b7280"
                    />
                  </View>

                  <View style={styles.itemCol}>
                    <Text style={styles.itemLabel}>TVA %</Text>
                    <TextInput
                      style={styles.itemSmallInput}
                      value={String(item.tax_rate)}
                      onChangeText={(text) => updateItem(index, 'tax_rate', text)}
                      keyboardType="numeric"
                      placeholderTextColor="#6b7280"
                    />
                  </View>
                </View>

                <View style={styles.itemTotal}>
                  <Text style={styles.itemTotalLabel}>Total HT:</Text>
                  <Text style={styles.itemTotalValue}>
                    {calculateItemAmount(item).toFixed(2)}€
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.notes}
              onChangeText={(text) => setFormData({ ...formData, notes: text })}
              placeholder="Notes additionnelles..."
              placeholderTextColor="#6b7280"
              multiline
              numberOfLines={4}
            />
          </View>

          {type === 'invoice' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Conditions de paiement</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.payment_terms}
                onChangeText={(text) => setFormData({ ...formData, payment_terms: text })}
                placeholder="Conditions de paiement..."
                placeholderTextColor="#6b7280"
                multiline
                numberOfLines={2}
              />
            </View>
          )}

          {/* Totaux */}
          <View style={styles.totalsCard}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Sous-total HT</Text>
              <Text style={styles.totalValue}>{calculateSubtotal().toFixed(2)}€</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TVA</Text>
              <Text style={styles.totalValue}>{calculateTax().toFixed(2)}€</Text>
            </View>
            <View style={[styles.totalRow, styles.totalRowFinal]}>
              <Text style={styles.totalLabelFinal}>Total TTC</Text>
              <Text style={styles.totalValueFinal}>{calculateTotal().toFixed(2)}€</Text>
            </View>
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1220',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  saveButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#1a2332',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2d3748',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a2332',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  dateLabel: {
    fontSize: 15,
    color: '#9ca3af',
  },
  dateValue: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 6,
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addItemText: {
    color: '#14b8a6',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  itemCard: {
    backgroundColor: '#1a2332',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2d3748',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#14b8a6',
  },
  itemInput: {
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  itemCol: {
    flex: 1,
    marginHorizontal: 4,
  },
  itemLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 6,
  },
  itemSmallInput: {
    backgroundColor: '#0B1220',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#2d3748',
  },
  itemTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2d3748',
  },
  itemTotalLabel: {
    fontSize: 14,
    color: '#9ca3af',
  },
  itemTotalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#14b8a6',
  },
  totalsCard: {
    backgroundColor: '#1a2332',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderWidth: 2,
    borderColor: '#14b8a6',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 15,
    color: '#9ca3af',
  },
  totalValue: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '500',
  },
  totalRowFinal: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#2d3748',
  },
  totalLabelFinal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  totalValueFinal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#14b8a6',
  },
  bottomSpacer: {
    height: 40,
  },
});
