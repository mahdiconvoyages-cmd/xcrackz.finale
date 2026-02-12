/**
 * 📊 CRM HOME SCREEN - VERSION TIMEINVOICE STYLE
 * 
 * Interface CRM moderne avec:
 * - Onglets Clients / Devis / Factures
 * - Statistiques en temps réel
 * - Actions rapides
 * - Design premium
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  FadeInDown, 
  FadeInRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from 'react-native-reanimated';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import ClientListScreen from '../clients/ClientListScreen';

const { width } = Dimensions.get('window');

type TabType = 'clients' | 'quotes' | 'invoices';

interface CRMStats {
  totalClients: number;
  favoriteClients: number;
  companyClients: number;
  totalQuotes: number;
  pendingQuotes: number;
  totalInvoices: number;
  paidInvoices: number;
  pendingAmount: number;
  totalRevenue: number;
}

export default function CRMHomeScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('clients');
  const [stats, setStats] = useState<CRMStats>({
    totalClients: 0,
    favoriteClients: 0,
    companyClients: 0,
    totalQuotes: 0,
    pendingQuotes: 0,
    totalInvoices: 0,
    paidInvoices: 0,
    pendingAmount: 0,
    totalRevenue: 0,
  });
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = async () => {
    if (!user?.id) return;

    try {
      // Load clients stats
      const { data: clients } = await supabase
        .from('clients')
        .select('id, is_favorite, is_company')
        .eq('user_id', user.id);

      // Load quotes stats
      const { data: quotes } = await supabase
        .from('quotes')
        .select('id, status, total_ttc')
        .eq('user_id', user.id);

      // Load invoices stats
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, status, total_ttc')
        .eq('user_id', user.id);

      const clientsData = clients || [];
      const quotesData = quotes || [];
      const invoicesData = invoices || [];

      setStats({
        totalClients: clientsData.length,
        favoriteClients: clientsData.filter(c => c.is_favorite).length,
        companyClients: clientsData.filter(c => c.is_company).length,
        totalQuotes: quotesData.length,
        pendingQuotes: quotesData.filter(q => q.status === 'pending' || q.status === 'sent').length,
        totalInvoices: invoicesData.length,
        paidInvoices: invoicesData.filter(i => i.status === 'paid').length,
        pendingAmount: invoicesData
          .filter(i => i.status !== 'paid')
          .reduce((sum, i) => sum + (i.total_ttc || 0), 0),
        totalRevenue: invoicesData
          .filter(i => i.status === 'paid')
          .reduce((sum, i) => sum + (i.total_ttc || 0), 0),
      });
    } catch (error) {
      console.error('Error loading CRM stats:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [user?.id])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  const tabs = [
    { id: 'clients' as TabType, label: 'Clients', icon: 'people', count: stats.totalClients },
    { id: 'quotes' as TabType, label: 'Devis', icon: 'document-text', count: stats.totalQuotes },
    { id: 'invoices' as TabType, label: 'Factures', icon: 'receipt', count: stats.totalInvoices },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const renderHeader = () => (
    <LinearGradient
      colors={['#0f766e', '#14b8a6', '#2dd4bf']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.headerGradient}
    >
      <Animated.View entering={FadeInDown.delay(100)} style={styles.headerContent}>
        <View style={styles.headerTop}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>CRM & Commercial</Text>
          <TouchableOpacity style={styles.settingsButton}>
            <Ionicons name="settings-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Quick Stats */}
        <View style={styles.quickStats}>
          <Animated.View entering={FadeInRight.delay(200)} style={styles.quickStatCard}>
            <Ionicons name="trending-up" size={20} color="#10b981" />
            <Text style={styles.quickStatValue}>{formatCurrency(stats.totalRevenue)}</Text>
            <Text style={styles.quickStatLabel}>Revenus</Text>
          </Animated.View>
          <Animated.View entering={FadeInRight.delay(300)} style={styles.quickStatCard}>
            <Ionicons name="time-outline" size={20} color="#f59e0b" />
            <Text style={styles.quickStatValue}>{formatCurrency(stats.pendingAmount)}</Text>
            <Text style={styles.quickStatLabel}>En attente</Text>
          </Animated.View>
          <Animated.View entering={FadeInRight.delay(400)} style={styles.quickStatCard}>
            <Ionicons name="checkmark-circle" size={20} color="#3b82f6" />
            <Text style={styles.quickStatValue}>{stats.paidInvoices}</Text>
            <Text style={styles.quickStatLabel}>Payées</Text>
          </Animated.View>
        </View>
      </Animated.View>
    </LinearGradient>
  );

  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      {tabs.map((tab, index) => (
        <TouchableOpacity
          key={tab.id}
          style={[
            styles.tab,
            activeTab === tab.id && styles.activeTab
          ]}
          onPress={() => setActiveTab(tab.id)}
        >
          <Ionicons
            name={tab.icon as any}
            size={20}
            color={activeTab === tab.id ? '#0f766e' : '#6b7280'}
          />
          <Text style={[
            styles.tabLabel,
            activeTab === tab.id && styles.activeTabLabel
          ]}>
            {tab.label}
          </Text>
          <View style={[
            styles.tabBadge,
            activeTab === tab.id && styles.activeTabBadge
          ]}>
            <Text style={[
              styles.tabBadgeText,
              activeTab === tab.id && styles.activeTabBadgeText
            ]}>
              {tab.count}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderQuickActions = () => (
    <View style={styles.quickActions}>
      <TouchableOpacity 
        style={styles.quickActionButton}
        onPress={() => navigation.navigate('ClientDetails' as never, { clientId: 'new' } as never)}
      >
        <LinearGradient
          colors={['#3b82f6', '#2563eb']}
          style={styles.quickActionGradient}
        >
          <Ionicons name="person-add" size={20} color="#fff" />
        </LinearGradient>
        <Text style={styles.quickActionText}>Client</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.quickActionButton}
        onPress={() => navigation.navigate('CreateQuote' as never)}
      >
        <LinearGradient
          colors={['#8b5cf6', '#7c3aed']}
          style={styles.quickActionGradient}
        >
          <Ionicons name="document-text" size={20} color="#fff" />
        </LinearGradient>
        <Text style={styles.quickActionText}>Devis</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.quickActionButton}
        onPress={() => navigation.navigate('CreateInvoice' as never)}
      >
        <LinearGradient
          colors={['#10b981', '#059669']}
          style={styles.quickActionGradient}
        >
          <Ionicons name="receipt" size={20} color="#fff" />
        </LinearGradient>
        <Text style={styles.quickActionText}>Facture</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.quickActionButton}
        onPress={() => {}}
      >
        <LinearGradient
          colors={['#f59e0b', '#d97706']}
          style={styles.quickActionGradient}
        >
          <Ionicons name="stats-chart" size={20} color="#fff" />
        </LinearGradient>
        <Text style={styles.quickActionText}>Rapports</Text>
      </TouchableOpacity>
    </View>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'clients':
        return <ClientListScreen embedded />;
      case 'quotes':
        return (
          <View style={styles.comingSoon}>
            <Ionicons name="document-text-outline" size={64} color="#d1d5db" />
            <Text style={styles.comingSoonText}>Module Devis</Text>
            <Text style={styles.comingSoonSubtext}>Bientôt disponible</Text>
          </View>
        );
      case 'invoices':
        return (
          <View style={styles.comingSoon}>
            <Ionicons name="receipt-outline" size={64} color="#d1d5db" />
            <Text style={styles.comingSoonText}>Module Factures</Text>
            <Text style={styles.comingSoonSubtext}>Bientôt disponible</Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {renderHeader()}
      {renderTabs()}
      {activeTab === 'clients' && renderQuickActions()}
      <View style={styles.content}>
        {renderContent()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    gap: 16,
  },
  headerTop: {
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
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickStats: {
    flexDirection: 'row',
    gap: 10,
  },
  quickStatCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  quickStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  quickStatLabel: {
    fontSize: 11,
    color: '#6b7280',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    gap: 6,
  },
  activeTab: {
    backgroundColor: '#d1fae5',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeTabLabel: {
    color: '#0f766e',
    fontWeight: '600',
  },
  tabBadge: {
    backgroundColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  activeTabBadge: {
    backgroundColor: '#0f766e',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
  },
  activeTabBadgeText: {
    color: '#fff',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  quickActionButton: {
    alignItems: 'center',
    gap: 6,
  },
  quickActionGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionText: {
    fontSize: 12,
    color: '#4b5563',
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  comingSoon: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  comingSoonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  comingSoonSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
});
