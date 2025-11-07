/**
 * 🚀 Quick Access Bar - Barre de raccourcis horizontale
 * 
 * Barre scrollable avec accès rapide aux sections principales de l'app
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface QuickAccessItem {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  screen: string;
  gradient: [string, string];
}

const quickAccessItems: QuickAccessItem[] = [
  {
    id: 'dashboard',
    label: 'Accueil',
    icon: 'stats-chart',
    screen: 'Dashboard',
    gradient: ['#3B82F6', '#2563EB'],
  },
  {
    id: 'missions',
    label: 'Missions',
    icon: 'car',
    screen: 'Missions',
    gradient: ['#8B5CF6', '#7C3AED'],
  },
  {
    id: 'tracking',
    label: 'Suivi GPS',
    icon: 'navigate',
    screen: 'Tracking',
    gradient: ['#10B981', '#059669'],
  },
  {
    id: 'inspections',
    label: 'Inspections',
    icon: 'camera',
    screen: 'Inspections',
    gradient: ['#F59E0B', '#D97706'],
  },
  {
    id: 'new-missions',
    label: 'Mes Missions',
    icon: 'briefcase',
    screen: 'NewMissions',
    gradient: ['#14B8A6', '#0D9488'],
  },
];

export default function QuickAccessBar() {
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();

  const handleNavigate = (screen: string) => {
    // Fermer le drawer si ouvert
    navigation.dispatch(DrawerActions.closeDrawer());
    
    // Navigator vers l'écran
    (navigation as any).navigate(screen);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {quickAccessItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            onPress={() => handleNavigate(item.screen)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={item.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.itemGradient}
            >
              <View style={styles.itemContent}>
                <View style={styles.iconContainer}>
                  <Ionicons name={item.icon} size={24} color="#ffffff" />
                </View>
                <Text style={styles.itemLabel}>{item.label}</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 100,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  itemGradient: {
    width: 90,
    height: 76,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  itemContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemLabel: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
