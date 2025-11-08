import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Linking,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface BuyCreditModalProps {
  visible: boolean;
  onClose: () => void;
  currentCredits: number;
  requiredCredits: number;
  action?: string;
}

export default function BuyCreditModal({
  visible,
  onClose,
  currentCredits,
  requiredCredits,
  action = "effectuer cette action"
}: BuyCreditModalProps) {
  const missingCredits = Math.max(0, requiredCredits - currentCredits);

  const handleBuyCredits = async () => {
    try {
      await Linking.openURL('https://www.xcrackz.com/boutique');
      onClose();
    } catch (error) {
      console.error('Erreur ouverture boutique:', error);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <LinearGradient
            colors={['#f97316', '#ef4444']}
            style={styles.header}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.headerTop}>
              <View style={styles.headerLeft}>
                <View style={styles.iconContainer}>
                  <Ionicons name="wallet" size={24} color="#fff" />
                </View>
                <View>
                  <Text style={styles.headerTitle}>Crédits insuffisants</Text>
                  <Text style={styles.headerSubtitle}>Rechargez pour continuer</Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          <ScrollView style={styles.content}>
            {/* Balance Card */}
            <LinearGradient
              colors={['#fff7ed', '#fee2e2']}
              style={styles.balanceCard}
            >
              <View style={styles.balanceRow}>
                <View>
                  <Text style={styles.balanceLabel}>Solde actuel</Text>
                  <View style={styles.balanceValueContainer}>
                    <Ionicons name="wallet" size={28} color="#f97316" />
                    <Text style={styles.balanceValue}>{currentCredits}</Text>
                  </View>
                </View>
                <View style={styles.balanceRight}>
                  <Text style={styles.balanceLabel}>Requis</Text>
                  <Text style={styles.balanceRequired}>{requiredCredits}</Text>
                </View>
              </View>

              {missingCredits > 0 && (
                <View style={styles.warningBox}>
                  <Ionicons name="alert-circle" size={20} color="#dc2626" />
                  <Text style={styles.warningText}>
                    <Text style={styles.warningBold}>Il vous manque {missingCredits} crédit{missingCredits > 1 ? 's' : ''}</Text> pour {action}
                  </Text>
                </View>
              )}
            </LinearGradient>

            {/* Pricing */}
            <View style={styles.pricingSection}>
              <Text style={styles.pricingTitle}>💡 Tarification</Text>
              
              <View style={styles.pricingItem}>
                <View style={[styles.pricingBadge, { backgroundColor: '#ccfbf1' }]}>
                  <Text style={[styles.pricingBadgeText, { color: '#0d9488' }]}>1</Text>
                </View>
                <Text style={styles.pricingLabel}>Créer une mission</Text>
              </View>

              <View style={styles.pricingItem}>
                <View style={[styles.pricingBadge, { backgroundColor: '#dbeafe' }]}>
                  <Text style={[styles.pricingBadgeText, { color: '#2563eb' }]}>2</Text>
                </View>
                <Text style={styles.pricingLabel}>Publier un trajet de covoiturage</Text>
              </View>

              <View style={styles.pricingItem}>
                <View style={[styles.pricingBadge, { backgroundColor: '#e9d5ff' }]}>
                  <Text style={[styles.pricingBadgeText, { color: '#9333ea' }]}>2</Text>
                </View>
                <Text style={styles.pricingLabel}>Réserver une place en covoiturage</Text>
              </View>

              <View style={styles.pricingItem}>
                <View style={[styles.pricingBadge, { backgroundColor: '#d1fae5' }]}>
                  <Text style={[styles.pricingBadgeText, { color: '#059669' }]}>0</Text>
                </View>
                <Text style={styles.pricingLabel}>Inspections (incluses avec la mission)</Text>
              </View>
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.buyButton}
              onPress={handleBuyCredits}
            >
              <LinearGradient
                colors={['#f97316', '#ef4444']}
                style={styles.buyButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="cart" size={20} color="#fff" />
                <Text style={styles.buyButtonText}>Acheter</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 450,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: '90%',
  },
  header: {
    padding: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  balanceCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 6,
  },
  balanceValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  balanceValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#0f172a',
  },
  balanceRight: {
    alignItems: 'flex-end',
  },
  balanceRequired: {
    fontSize: 32,
    fontWeight: '700',
    color: '#dc2626',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fecaca',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 8,
    padding: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#991b1b',
  },
  warningBold: {
    fontWeight: '700',
  },
  pricingSection: {
    marginBottom: 20,
  },
  pricingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 12,
  },
  pricingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  pricingBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pricingBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  pricingLabel: {
    flex: 1,
    fontSize: 13,
    color: '#475569',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
  buyButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  buyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  buyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
