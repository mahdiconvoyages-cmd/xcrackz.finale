import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Alert, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ShareInspectionModalProps {
  visible: boolean;
  onClose: () => void;
  missionId: string;
  reportType?: 'departure' | 'arrival' | 'complete';
}

export default function ShareInspectionModal({ visible, onClose, missionId, reportType = 'complete' }: ShareInspectionModalProps) {
  const [loading, setLoading] = useState(false);
  const [shareLink, setShareLink] = useState('');

  useEffect(() => {
    if (visible) generateShareLink();
    else setShareLink('');
  }, [visible]);

  const generateShareLink = async () => {
    try {
      setLoading(true);
      let userId = null;
      const { data: session } = await supabase.auth.getSession();
      if (session?.session?.user?.id) userId = session.session.user.id;
      else userId = await AsyncStorage.getItem('userId');

      if (!userId) { Alert.alert('Erreur', 'Impossible d\'identifier l\'utilisateur'); return; }

      const { data, error } = await supabase.rpc('create_or_get_inspection_share', {
        p_mission_id: missionId, p_report_type: reportType, p_user_id: userId
      });

      if (error) throw error;
      if (data?.share_token) setShareLink(`https://www.xcrackz.com/rapport-inspection/${data.share_token}`);
      else throw new Error('Token non généré');
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(shareLink);
    Alert.alert('', 'Lien copié !');
  };

  const shareNative = async () => {
    try {
      await Share.share({ message: `Rapport d'Inspection:\n${shareLink}`, title: 'Partager le Rapport' });
    } catch (err: any) {}
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Partager le Rapport</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color="#666" /></TouchableOpacity>
          </View>
          {loading ? (
            <ActivityIndicator size="large" color="#2563eb" />
          ) : shareLink ? (
            <>
              <View style={styles.linkBox}><Text style={styles.linkText} numberOfLines={2}>{shareLink}</Text></View>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.btnPrimary} onPress={shareNative}>
                  <Ionicons name="share-social" size={20} color="white" />
                  <Text style={styles.btnTextWhite}>Partager</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnSecondary} onPress={copyToClipboard}>
                  <Ionicons name="copy" size={20} color="#2563eb" />
                  <Text style={styles.btnTextBlue}>Copier</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1f2937' },
  linkBox: { backgroundColor: '#f3f4f6', padding: 12, borderRadius: 8, marginBottom: 16 },
  linkText: { fontSize: 13, color: '#1f2937' },
  actions: { flexDirection: 'row', gap: 12 },
  btnPrimary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 8, gap: 8, backgroundColor: '#2563eb' },
  btnSecondary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 8, gap: 8, backgroundColor: 'white', borderWidth: 1, borderColor: '#2563eb' },
  btnTextWhite: { color: 'white', fontSize: 15, fontWeight: '600' },
  btnTextBlue: { color: '#2563eb', fontSize: 15, fontWeight: '600' },
});
