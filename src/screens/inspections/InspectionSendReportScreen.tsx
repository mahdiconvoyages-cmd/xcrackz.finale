/**
 * 📧 Écran de partage d'inspection (Départ ou Arrivée)
 * 
 * Appelé après validation d'une inspection pour:
 * - Générer le rapport PDF
 * - Envoyer par email à un destinataire
 * - Partager le lien public
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

interface RouteParams {
  inspectionId: string;
  inspectionType: 'departure' | 'arrival';
  missionId: string;
}

export default function InspectionSendReportScreen({ route, navigation }: any) {
  const { inspectionId, inspectionType, missionId } = route.params as RouteParams;
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  // Données inspection
  const [inspection, setInspection] = useState<any>(null);
  const [mission, setMission] = useState<any>(null);

  // Email
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [senderName, setSenderName] = useState('');

  useEffect(() => {
    loadInspectionData();
  }, []);

  const loadInspectionData = async () => {
    try {
      setLoading(true);

      // Charger l'inspection
      const { data: inspectionData, error: inspError } = await supabase
        .from('vehicle_inspections')
        .select('*')
        .eq('id', inspectionId)
        .single();

      if (inspError) throw inspError;
      setInspection(inspectionData);

      // Charger la mission
      const { data: missionData, error: missError } = await supabase
        .from('missions')
        .select('*')
        .eq('id', missionId)
        .single();

      if (missError) throw missError;
      setMission(missionData);

      // Pré-remplir avec les contacts de la mission
      if (inspectionType === 'departure' && missionData.pickup_contact_email) {
        setRecipientEmail(missionData.pickup_contact_email);
        setRecipientName(missionData.pickup_contact_name || '');
      } else if (inspectionType === 'arrival' && missionData.delivery_contact_email) {
        setRecipientEmail(missionData.delivery_contact_email);
        setRecipientName(missionData.delivery_contact_name || '');
      }

      // Nom de l'utilisateur
      if (user?.email) {
        const name = user.email.split('@')[0];
        setSenderName(name.charAt(0).toUpperCase() + name.slice(1));
      }
    } catch (error: any) {
      console.error('Erreur chargement:', error);
      Alert.alert('Erreur', 'Impossible de charger les données');
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!recipientEmail) {
      Alert.alert('Email requis', 'Veuillez entrer l\'email du destinataire');
      return;
    }

    try {
      setSending(true);

      // Appeler l'API Edge Function pour envoyer l'email
      const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/send-inspection-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          inspection_id: inspectionId,
          inspection_type: inspectionType,
          recipient_email: recipientEmail,
          recipient_name: recipientName,
          sender_name: senderName || 'Convoyeur',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur envoi email');
      }

      Alert.alert(
        '✅ Email envoyé',
        `Le rapport ${inspectionType === 'departure' ? 'de départ' : 'd\'arrivée'} a été envoyé à ${recipientEmail}`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Erreur envoi email:', error);
      Alert.alert('Erreur', error.message || 'Impossible d\'envoyer l\'email');
    } finally {
      setSending(false);
    }
  };

  const handleGeneratePDF = async () => {
    try {
      setGeneratingPDF(true);

      // Appeler l'API pour générer le PDF
      const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/generate-inspection-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          inspection_id: inspectionId,
          inspection_type: inspectionType,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur génération PDF');
      }

      const blob = await response.blob();
      const reader = new FileReader();

      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const fileName = `inspection_${inspectionType}_${mission?.reference || inspectionId}.pdf`;
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;

        await FileSystem.writeAsStringAsync(fileUri, base64.split(',')[1], {
          encoding: 'base64' as any,
        });

        // Partager le PDF
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri);
        }

        Alert.alert('✅ PDF généré', 'Le rapport a été téléchargé');
      };

      reader.readAsDataURL(blob);
    } catch (error: any) {
      console.error('Erreur génération PDF:', error);
      Alert.alert('Erreur', 'Impossible de générer le PDF');
    } finally {
      setGeneratingPDF(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="document-text" size={48} color="#10b981" />
          <Text style={styles.title}>
            Rapport {inspectionType === 'departure' ? 'de Départ' : 'd\'Arrivée'}
          </Text>
          <Text style={styles.subtitle}>
            {mission?.vehicle_brand} {mission?.vehicle_model} - {mission?.vehicle_plate}
          </Text>
        </View>

        {/* Section Email */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📧 Envoyer par email</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email destinataire *</Text>
            <TextInput
              style={styles.input}
              value={recipientEmail}
              onChangeText={setRecipientEmail}
              placeholder="contact@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nom destinataire</Text>
            <TextInput
              style={styles.input}
              value={recipientName}
              onChangeText={setRecipientName}
              placeholder="Nom du contact"
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Votre nom</Text>
            <TextInput
              style={styles.input}
              value={senderName}
              onChangeText={setSenderName}
              placeholder="Votre nom"
              autoCapitalize="words"
            />
          </View>

          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary, sending && styles.buttonDisabled]}
            onPress={handleSendEmail}
            disabled={sending || !recipientEmail}
          >
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="mail" size={20} color="#fff" />
                <Text style={styles.buttonText}>Envoyer le rapport</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Section PDF */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📄 Télécharger le PDF</Text>
          <Text style={styles.sectionDescription}>
            Générez et partagez le rapport PDF directement
          </Text>

          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary, generatingPDF && styles.buttonDisabled]}
            onPress={handleGeneratePDF}
            disabled={generatingPDF}
          >
            {generatingPDF ? (
              <ActivityIndicator color="#10b981" />
            ) : (
              <>
                <Ionicons name="download" size={20} color="#10b981" />
                <Text style={[styles.buttonText, { color: '#10b981' }]}>Télécharger PDF</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Bouton Fermer */}
        <TouchableOpacity
          style={[styles.button, styles.buttonCancel]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.buttonText, { color: '#64748b' }]}>Plus tard</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    paddingVertical: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1e293b',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  buttonPrimary: {
    backgroundColor: '#10b981',
  },
  buttonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#10b981',
  },
  buttonCancel: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
