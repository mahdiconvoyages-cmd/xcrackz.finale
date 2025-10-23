import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

interface Stats {
  totalAssignmentsCreated: number;
  totalAssignmentsReceived: number;
  assignedMissions: number;
  inProgressMissions: number;
  completedMissions: number;
  totalRevenue: number;
  totalCommissions: number;
}

export default function TeamStatsScreen() {
  const [stats, setStats] = useState<Stats>({
    totalAssignmentsCreated: 0,
    totalAssignmentsReceived: 0,
    assignedMissions: 0,
    inProgressMissions: 0,
    completedMissions: 0,
    totalRevenue: 0,
    totalCommissions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadUserId();
  }, []);

  useEffect(() => {
    if (userId) {
      loadStats();
    }
  }, [userId]);

  const loadUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
    }
  };

  const loadStats = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      // Assignations créées
      const { count: createdCount } = await supabase
        .from('mission_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_by', userId);

      // Assignations reçues
      const { data: receivedData } = await supabase
        .from('mission_assignments')
        .select('payment_ht, commission, status')
        .eq('user_id', userId);

      // Calculs
      const assignedCount = receivedData?.filter(a => a.status === 'assigned').length || 0;
      const inProgressCount = receivedData?.filter(a => a.status === 'in_progress').length || 0;
      const completedCount = receivedData?.filter(a => a.status === 'completed').length || 0;
      
      const totalRevenue = receivedData?.reduce((sum, a) => sum + (a.payment_ht || 0), 0) || 0;
      const totalCommissions = receivedData?.reduce((sum, a) => sum + (a.commission || 0), 0) || 0;

      setStats({
        totalAssignmentsCreated: createdCount || 0,
        totalAssignmentsReceived: receivedData?.length || 0,
        assignedMissions: assignedCount,
        inProgressMissions: inProgressCount,
        completedMissions: completedCount,
        totalRevenue,
        totalCommissions,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Chargement des statistiques...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.header}>
        <Text style={styles.headerTitle}>📊 Statistiques d'Équipe</Text>
        <Text style={styles.headerSubtitle}>Vue d'ensemble de vos performances</Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Assignations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Assignations</Text>
          
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: '#DBEAFE' }]}>
              <Feather name="send" size={32} color="#3B82F6" />
              <Text style={styles.statValue}>{stats.totalAssignmentsCreated}</Text>
              <Text style={styles.statLabel}>Données</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
              <Feather name="inbox" size={32} color="#F59E0B" />
              <Text style={styles.statValue}>{stats.totalAssignmentsReceived}</Text>
              <Text style={styles.statLabel}>Reçues</Text>
            </View>
          </View>
        </View>

        {/* Statuts des missions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Missions Reçues par Statut</Text>
          
          <View style={styles.statusRow}>
            <View style={[styles.statusCard, { borderLeftColor: '#A855F7' }]}>
              <View style={styles.statusHeader}>
                <MaterialIcons name="assignment" size={24} color="#A855F7" />
                <Text style={[styles.statusValue, { color: '#A855F7' }]}>
                  {stats.assignedMissions}
                </Text>
              </View>
              <Text style={styles.statusLabel}>Assignées</Text>
            </View>

            <View style={[styles.statusCard, { borderLeftColor: '#3B82F6' }]}>
              <View style={styles.statusHeader}>
                <MaterialIcons name="sync" size={24} color="#3B82F6" />
                <Text style={[styles.statusValue, { color: '#3B82F6' }]}>
                  {stats.inProgressMissions}
                </Text>
              </View>
              <Text style={styles.statusLabel}>En cours</Text>
            </View>

            <View style={[styles.statusCard, { borderLeftColor: '#22C55E' }]}>
              <View style={styles.statusHeader}>
                <MaterialIcons name="check-circle" size={24} color="#22C55E" />
                <Text style={[styles.statusValue, { color: '#22C55E' }]}>
                  {stats.completedMissions}
                </Text>
              </View>
              <Text style={styles.statusLabel}>Terminées</Text>
            </View>
          </View>
        </View>

        {/* Finances */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💰 Finances</Text>
          
          <View style={styles.financeCard}>
            <LinearGradient
              colors={['#22C55E', '#16A34A']}
              style={styles.financeGradient}
            >
              <Feather name="dollar-sign" size={40} color="#FFF" />
              <View style={styles.financeInfo}>
                <Text style={styles.financeLabel}>Revenus Totaux</Text>
                <Text style={styles.financeValue}>{stats.totalRevenue.toFixed(2)}€</Text>
              </View>
            </LinearGradient>
          </View>

          <View style={styles.financeCard}>
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              style={styles.financeGradient}
            >
              <Feather name="trending-up" size={40} color="#FFF" />
              <View style={styles.financeInfo}>
                <Text style={styles.financeLabel}>Commissions Totales</Text>
                <Text style={styles.financeValue}>{stats.totalCommissions.toFixed(2)}€</Text>
              </View>
            </LinearGradient>
          </View>

          <View style={styles.financeCard}>
            <LinearGradient
              colors={['#3B82F6', '#2563EB']}
              style={styles.financeGradient}
            >
              <Feather name="pie-chart" size={40} color="#FFF" />
              <View style={styles.financeInfo}>
                <Text style={styles.financeLabel}>Total Général</Text>
                <Text style={styles.financeValue}>
                  {(stats.totalRevenue + stats.totalCommissions).toFixed(2)}€
                </Text>
              </View>
            </LinearGradient>
          </View>
        </View>

        {/* Taux de complétion */}
        {stats.totalAssignmentsReceived > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📈 Performance</Text>
            
            <View style={styles.progressCard}>
              <Text style={styles.progressLabel}>Taux de Complétion</Text>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${(stats.completedMissions / stats.totalAssignmentsReceived) * 100}%` }
                  ]} 
                />
              </View>
              <Text style={styles.progressValue}>
                {Math.round((stats.completedMissions / stats.totalAssignmentsReceived) * 100)}%
              </Text>
            </View>

            <View style={styles.infoBox}>
              <Feather name="info" size={16} color="#3B82F6" />
              <Text style={styles.infoText}>
                Vous avez complété {stats.completedMissions} sur {stats.totalAssignmentsReceived} missions reçues
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    padding: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#DBEAFE',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 12,
  },
  statLabel: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
  statusRow: {
    gap: 12,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    marginBottom: 12,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  statusLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  financeCard: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  financeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  financeInfo: {
    flex: 1,
  },
  financeLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 4,
  },
  financeValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  progressCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },
  progressBar: {
    height: 12,
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#22C55E',
    borderRadius: 6,
  },
  progressValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#22C55E',
    textAlign: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#DBEAFE',
    padding: 16,
    borderRadius: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
  },
});
