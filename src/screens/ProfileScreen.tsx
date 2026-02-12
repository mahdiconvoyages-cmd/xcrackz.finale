import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { SyncIndicator } from '../components/SyncIndicator';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { colors, mode, toggleTheme, isDark } = useTheme();
  const { user } = useAuth();

  const getThemeLabel = () => {
    switch (mode) {
      case 'light': return 'Clair';
      case 'dark': return 'Sombre';
      case 'auto': return 'Auto';
      default: return mode;
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.topBar, { backgroundColor: colors.surface, borderBottomColor: colors.textSecondary + '22' }]}> 
        <TouchableOpacity style={styles.menuButton} onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
          <Ionicons name="menu" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.topBarTitle, { color: colors.text }]}>Profil</Text>
        <View style={styles.topBarRight}>
          <SyncIndicator />
        </View>
      </View>

      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>
              {user?.user_metadata?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
          <Text style={[styles.name, { color: colors.text }]}>
            {user?.user_metadata?.full_name || 'Utilisateur'}
          </Text>
          <Text style={[styles.email, { color: colors.textSecondary }]}>
            {user?.email}
          </Text>
        </View>

        <View style={styles.content}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Paramètres</Text>

        <TouchableOpacity
          style={[styles.settingCard, { backgroundColor: colors.card }]}
          onPress={toggleTheme}
        >
          <View style={styles.settingLeft}>
            <Ionicons
              name={isDark ? 'moon' : 'sunny'}
              size={24}
              color={colors.primary}
            />
            <View style={{ marginLeft: 12 }}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>
                Thème
              </Text>
              <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>
                {getThemeLabel()}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.settingCard, { backgroundColor: colors.card }]}
        >
          <View style={styles.settingLeft}>
            <Ionicons name="notifications" size={24} color={colors.primary} />
            <View style={{ marginLeft: 12 }}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>
                Notifications
              </Text>
              <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>
                Gérer les notifications
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.settingCard, { backgroundColor: colors.card }]}
        >
          <View style={styles.settingLeft}>
            <Ionicons name="language" size={24} color={colors.primary} />
            <View style={{ marginLeft: 12 }}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>
                Langue
              </Text>
              <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>
                Français
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>
          Support
        </Text>

        <TouchableOpacity
          style={[styles.settingCard, { backgroundColor: colors.card }]}
        >
          <View style={styles.settingLeft}>
            <Ionicons name="help-circle" size={24} color={colors.primary} />
            <Text style={[styles.settingTitle, { color: colors.text, marginLeft: 12 }]}>
              Aide & Support
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.settingCard, { backgroundColor: colors.card }]}
        >
          <View style={styles.settingLeft}>
            <Ionicons name="information-circle" size={24} color={colors.primary} />
            <Text style={[styles.settingTitle, { color: colors.text, marginLeft: 12 }]}>
              À propos
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <Text style={[styles.version, { color: colors.textSecondary }]}>
          Version 1.0.0
        </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  topBarRight: {
    minWidth: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  container: { flex: 1 },
  header: {
    alignItems: 'center',
    padding: 32,
    paddingTop: 48,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
  },
  content: {
    padding: 20,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  settingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    marginTop: 32,
  },
  logoutText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 24,
  },
});
