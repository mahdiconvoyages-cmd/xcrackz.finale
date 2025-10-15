// @ts-nocheck
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import InspectionDepartScreen from './InspectionDepartScreen';
import InspectionGPSScreen from './InspectionGPSScreen';
import InspectionArrivalScreen from './InspectionArrivalScreen';

const { width } = Dimensions.get('window');

type Tab = 'depart' | 'gps' | 'arrival';

interface InspectionTabsScreenProps {
  route: {
    params: {
      missionId: string;
    };
  };
}

export default function InspectionTabsScreen({ route }: InspectionTabsScreenProps) {
  const { missionId } = route.params;
  const [activeTab, setActiveTab] = useState<Tab>('depart');
  const [completedTabs, setCompletedTabs] = useState<Set<Tab>>(new Set());

  const handleTabComplete = (tab: Tab) => {
    setCompletedTabs(prev => new Set(prev).add(tab));
    
    // Auto-navigate to next tab
    if (tab === 'depart') {
      setActiveTab('gps');
    } else if (tab === 'gps') {
      setActiveTab('arrival');
    }
  };

  const tabs = [
    {
      id: 'depart' as Tab,
      label: 'État des Lieux',
      sublabel: 'Départ',
      icon: 'camera',
      color: '#06b6d4',
    },
    {
      id: 'gps' as Tab,
      label: 'GPS',
      sublabel: 'Waze',
      icon: 'navigation',
      color: '#8b5cf6',
    },
    {
      id: 'arrival' as Tab,
      label: 'État des Lieux',
      sublabel: 'Arrivée',
      icon: 'check-circle',
      color: '#10b981',
    },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'depart':
        return (
          <InspectionDepartScreen
            missionId={missionId}
            onComplete={() => handleTabComplete('depart')}
          />
        );
      case 'gps':
        return (
          <InspectionGPSScreen
            missionId={missionId}
            onComplete={() => handleTabComplete('gps')}
          />
        );
      case 'arrival':
        return (
          <InspectionArrivalScreen
            missionId={missionId}
            onComplete={() => handleTabComplete('arrival')}
          />
        );
      default:
        return null;
    }
  };

  const getTabIndex = (tab: Tab) => tabs.findIndex(t => t.id === tab);
  const activeTabIndex = getTabIndex(activeTab);
  const progress = ((activeTabIndex + 1) / tabs.length) * 100;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header with Progress */}
      <LinearGradient
        colors={['#0b1220', '#0e1930', '#0b1220']}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <Text style={styles.title}>Inspection Véhicule</Text>
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>{Math.round(progress)}%</Text>
          </View>
        </View>
        
        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBg}>
            <LinearGradient
              colors={['#06b6d4', '#0891b2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressBarFill, { width: `${progress}%` }]}
            />
          </View>
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {tabs.map((tab, index) => {
          const isActive = activeTab === tab.id;
          const isCompleted = completedTabs.has(tab.id);
          const isAccessible = index <= activeTabIndex || isCompleted;

          return (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tab,
                isActive && styles.tabActive,
              ]}
              onPress={() => isAccessible && setActiveTab(tab.id)}
              disabled={!isAccessible}
            >
              <View style={[
                styles.tabIconContainer,
                isActive && { backgroundColor: `${tab.color}30` },
                !isAccessible && styles.tabDisabled,
              ]}>
                {isCompleted ? (
                  <Feather name="check" size={18} color={tab.color} />
                ) : (
                  <Feather name={tab.icon as any} size={18} color={isActive ? tab.color : '#64748b'} />
                )}
              </View>
              <View style={styles.tabTextContainer}>
                <Text style={[
                  styles.tabLabel,
                  isActive && { color: tab.color },
                  !isAccessible && styles.tabTextDisabled,
                ]}>
                  {tab.label}
                </Text>
                <Text style={[
                  styles.tabSublabel,
                  isActive && { color: tab.color },
                  !isAccessible && styles.tabTextDisabled,
                ]}>
                  {tab.sublabel}
                </Text>
              </View>
              {isActive && (
                <View style={[styles.activeIndicator, { backgroundColor: tab.color }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Tab Content */}
      <View style={styles.content}>
        {renderTabContent()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1220',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 12 : 0,
    paddingBottom: 12,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#e5e7eb',
  },
  progressContainer: {
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.4)',
  },
  progressText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#06b6d4',
  },
  progressBarContainer: {
    marginTop: 8,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: 'rgba(71, 85, 105, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(71, 85, 105, 0.3)',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  tabActive: {
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  tabIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  tabDisabled: {
    opacity: 0.4,
  },
  tabTextContainer: {
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9ca3af',
  },
  tabSublabel: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
  tabTextDisabled: {
    color: '#475569',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  content: {
    flex: 1,
  },
});
