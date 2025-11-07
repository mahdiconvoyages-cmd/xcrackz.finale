import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

const colors = {
  primary: '#0b1220',
  success: '#10b981',
  background: '#f5f5f5',
  text: '#1f2937',
  textSecondary: '#6b7280',
  border: '#e5e7eb',
  warning: '#f59e0b',
  error: '#ef4444',
};

const CREDIT_PACKS = [
  { amount: 10, bonus: 0, price: 10 },
  { amount: 25, bonus: 2, price: 25 },
  { amount: 50, bonus: 5, price: 50 },
  { amount: 100, bonus: 15, price: 100 },
];

export default function CreditsWalletScreen() {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRechargeModal, setShowRechargeModal] = useState(false);

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    try {
      // Récupérer le solde
      const { data: creditsData, error: creditsError } = await supabase
        .from('user_credits')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      if (creditsError && creditsError.code !== 'PGRST116') {
        throw creditsError;
      }

      setBalance(creditsData?.balance || 0);

      // Récupérer l'historique
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (transactionsError) throw transactionsError;

      setTransactions(transactionsData || []);
    } catch (error) {
      console.error('Error fetching wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRecharge = async (amount) => {
    try {
      // Simuler le paiement (à remplacer par vraie intégration Stripe/PayPal)
      Alert.alert(
        'Confirmation',
        `Recharger ${amount}€ de crédits ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Confirmer',
            onPress: async () => {
              const { data, error } = await supabase.rpc('recharge_credits', {
                p_user_id: user.id,
                p_amount: amount,
                p_payment_reference: `RECHARGE-${Date.now()}`,
              });

              if (error) throw error;

              Alert.alert('Succès', `${amount}€ ajoutés à votre compte !`);
              setShowRechargeModal(false);
              fetchWalletData();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error recharging:', error);
      Alert.alert('Erreur', 'Impossible de recharger les crédits');
    }
  };

  const renderTransaction = ({ item }) => {
    const isPositive = item.amount > 0;
    const icon = {
      recharge: 'add-circle',
      payment: 'arrow-up-circle',
      refund: 'refresh-circle',
      earning: 'arrow-down-circle',
    }[item.type];

    const iconColor = {
      recharge: colors.success,
      payment: colors.error,
      refund: colors.warning,
      earning: colors.success,
    }[item.type];

    return (
      <View style={styles.transactionCard}>
        <View style={[styles.transactionIcon, { backgroundColor: `${iconColor}20` }]}>
          <Ionicons name={icon} size={24} color={iconColor} />
        </View>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionType}>{item.description}</Text>
          <Text style={styles.transactionDate}>
            {new Date(item.created_at).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
        <Text style={[styles.transactionAmount, { color: isPositive ? colors.success : colors.error }]}>
          {isPositive ? '+' : ''}{item.amount.toFixed(2)}€
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* En-tête avec solde */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mon portefeuille</Text>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Solde disponible</Text>
          <Text style={styles.balance}>{balance.toFixed(2)}€</Text>
          <TouchableOpacity
            style={styles.rechargeButton}
            onPress={() => setShowRechargeModal(true)}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.rechargeButtonText}>Recharger</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Historique */}
      <View style={styles.historySection}>
        <Text style={styles.sectionTitle}>Historique des transactions</Text>
        {transactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="wallet-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyText}>Aucune transaction</Text>
          </View>
        ) : (
          <FlatList
            data={transactions}
            renderItem={renderTransaction}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Modal de recharge */}
      <Modal
        visible={showRechargeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRechargeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Recharger mon compte</Text>
              <TouchableOpacity onPress={() => setShowRechargeModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Choisissez un montant pour recharger votre portefeuille
            </Text>

            <View style={styles.packsContainer}>
              {CREDIT_PACKS.map((pack) => (
                <TouchableOpacity
                  key={pack.amount}
                  style={styles.packCard}
                  onPress={() => handleRecharge(pack.price)}
                >
                  <Text style={styles.packAmount}>{pack.amount}€</Text>
                  {pack.bonus > 0 && (
                    <View style={styles.bonusBadge}>
                      <Text style={styles.bonusText}>+{pack.bonus}€</Text>
                    </View>
                  )}
                  <Text style={styles.packPrice}>{pack.price}€</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.paymentInfo}>
              <Ionicons name="shield-checkmark" size={20} color={colors.success} />
              <Text style={styles.paymentInfoText}>
                Paiement sécurisé par carte bancaire
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: colors.primary,
    padding: 20,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  balanceCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  balance: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  rechargeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  rechargeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  historySection: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  transactionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionType: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  packsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  packCard: {
    width: '48%',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  packAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
  },
  bonusBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bonusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  packPrice: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  paymentInfoText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
