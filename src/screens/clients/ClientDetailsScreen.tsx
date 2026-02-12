import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Switch, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface ClientData {
  name: string;
  email: string;
  phone: string;
  company_name: string;
  siret: string;
  siren: string;
  address: string;
  postal_code: string;
  city: string;
  country: string;
  notes: string;
  is_company: boolean;
  is_favorite: boolean;
}

export default function ClientDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const clientId = (route.params as any)?.clientId;
  const isNew = clientId === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(isNew);
  
  const [formData, setFormData] = useState<ClientData>({
    name: '',
    email: '',
    phone: '',
    company_name: '',
    siret: '',
    siren: '',
    address: '',
    postal_code: '',
    city: '',
    country: 'France',
    notes: '',
    is_company: false,
    is_favorite: false,
  });

  useEffect(() => {
    if (!isNew) {
      loadClient();
    }
  }, [clientId]);

  const loadClient = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (error) throw error;
      if (data) {
        setFormData(data);
      }
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      Alert.alert('Erreur', 'Le nom est requis');
      return false;
    }
    if (!formData.email.trim()) {
      Alert.alert('Erreur', "L'email est requis");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert('Erreur', 'Email invalide');
      return false;
    }
    if (formData.siret && formData.siret.length !== 14) {
      Alert.alert('Erreur', 'Le SIRET doit contenir 14 chiffres');
      return false;
    }
    if (formData.siren && formData.siren.length !== 9) {
      Alert.alert('Erreur', 'Le SIREN doit contenir 9 chiffres');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      if (isNew) {
        const { error } = await supabase
          .from('clients')
          .insert({
            ...formData,
            user_id: user?.id,
          });
        if (error) throw error;
        Alert.alert('Succès', 'Client créé avec succès');
      } else {
        const { error } = await supabase
          .from('clients')
          .update(formData)
          .eq('id', clientId);
        if (error) throw error;
        Alert.alert('Succès', 'Client modifié avec succès');
        setEditing(false);
      }
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Confirmer la suppression',
      'Êtes-vous sûr de vouloir supprimer ce client ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('clients')
                .delete()
                .eq('id', clientId);
              if (error) throw error;
              navigation.goBack();
            } catch (error: any) {
              Alert.alert('Erreur', error.message);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isNew ? 'Nouveau client' : editing ? 'Modifier' : formData.name}
        </Text>
        {!isNew && !editing && (
          <TouchableOpacity onPress={() => setEditing(true)}>
            <Ionicons name="create-outline" size={24} color="#2563eb" />
          </TouchableOpacity>
        )}
        {!isNew && editing && (
          <TouchableOpacity onPress={() => { setEditing(false); loadClient(); }}>
            <Ionicons name="close" size={24} color="#ef4444" />
          </TouchableOpacity>
        )}
        {isNew && <View style={{ width: 24 }} />}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleItem}>
              <Ionicons name={formData.is_company ? 'briefcase' : 'person'} size={24} color="#2563eb" />
              <Text style={styles.toggleLabel}>Entreprise</Text>
              <Switch
                value={formData.is_company}
                onValueChange={(value) => setFormData({ ...formData, is_company: value })}
                disabled={!editing}
              />
            </View>
            <View style={styles.toggleItem}>
              <Ionicons name="star" size={24} color={formData.is_favorite ? '#fbbf24' : '#d1d5db'} />
              <Text style={styles.toggleLabel}>Favori</Text>
              <Switch
                value={formData.is_favorite}
                onValueChange={(value) => setFormData({ ...formData, is_favorite: value })}
                disabled={!editing}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations générales</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nom *</Text>
            <TextInput
              style={[styles.input, !editing && styles.inputDisabled]}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="Nom du client"
              editable={editing}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={[styles.input, !editing && styles.inputDisabled]}
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              placeholder="email@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={editing}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Téléphone</Text>
            <TextInput
              style={[styles.input, !editing && styles.inputDisabled]}
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              placeholder="+33 6 12 34 56 78"
              keyboardType="phone-pad"
              editable={editing}
            />
          </View>
        </View>

        {formData.is_company && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations entreprise</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Raison sociale</Text>
              <TextInput
                style={[styles.input, !editing && styles.inputDisabled]}
                value={formData.company_name}
                onChangeText={(text) => setFormData({ ...formData, company_name: text })}
                placeholder="Nom de l'entreprise"
                editable={editing}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>SIRET (14 chiffres)</Text>
              <TextInput
                style={[styles.input, !editing && styles.inputDisabled]}
                value={formData.siret}
                onChangeText={(text) => setFormData({ ...formData, siret: text })}
                placeholder="12345678901234"
                keyboardType="number-pad"
                maxLength={14}
                editable={editing}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>SIREN (9 chiffres)</Text>
              <TextInput
                style={[styles.input, !editing && styles.inputDisabled]}
                value={formData.siren}
                onChangeText={(text) => setFormData({ ...formData, siren: text })}
                placeholder="123456789"
                keyboardType="number-pad"
                maxLength={9}
                editable={editing}
              />
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Adresse</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Adresse</Text>
            <TextInput
              style={[styles.input, styles.textArea, !editing && styles.inputDisabled]}
              value={formData.address}
              onChangeText={(text) => setFormData({ ...formData, address: text })}
              placeholder="Rue, numéro..."
              multiline
              numberOfLines={2}
              editable={editing}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Code postal</Text>
            <TextInput
              style={[styles.input, !editing && styles.inputDisabled]}
              value={formData.postal_code}
              onChangeText={(text) => setFormData({ ...formData, postal_code: text })}
              placeholder="75001"
              keyboardType="number-pad"
              maxLength={5}
              editable={editing}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Ville</Text>
            <TextInput
              style={[styles.input, !editing && styles.inputDisabled]}
              value={formData.city}
              onChangeText={(text) => setFormData({ ...formData, city: text })}
              placeholder="Paris"
              editable={editing}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Pays</Text>
            <TextInput
              style={[styles.input, !editing && styles.inputDisabled]}
              value={formData.country}
              onChangeText={(text) => setFormData({ ...formData, country: text })}
              placeholder="France"
              editable={editing}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea, !editing && styles.inputDisabled]}
            value={formData.notes}
            onChangeText={(text) => setFormData({ ...formData, notes: text })}
            placeholder="Informations complémentaires..."
            multiline
            numberOfLines={4}
            editable={editing}
          />
        </View>

        {editing && (
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>
                {isNew ? 'Créer le client' : 'Enregistrer les modifications'}
              </Text>
            )}
          </TouchableOpacity>
        )}

        {!isNew && !editing && (
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={20} color="#fff" />
            <Text style={styles.deleteButtonText}>Supprimer le client</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  headerTitle: { fontSize: 20, fontWeight: '600', color: '#1f2937', flex: 1, textAlign: 'center' },
  scrollView: { flex: 1 },
  content: { padding: 16 },
  section: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1f2937', marginBottom: 16 },
  toggleRow: { flexDirection: 'row', gap: 12 },
  toggleItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f9fafb', padding: 12, borderRadius: 8 },
  toggleLabel: { flex: 1, marginLeft: 8, fontSize: 14, fontWeight: '500', color: '#1f2937' },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 16, color: '#1f2937' },
  inputDisabled: { backgroundColor: '#f3f4f6', opacity: 0.7 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  saveButton: { backgroundColor: '#2563eb', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  deleteButton: { backgroundColor: '#ef4444', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  deleteButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
