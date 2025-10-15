import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

const { width } = Dimensions.get('window');

interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  company_name?: string;
  phone?: string;
  credits?: number;
  avatar_url?: string;
  role?: string;
}

export default function ProfileScreen({ navigation }: any) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      
      // Récupérer l'utilisateur actuel
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Récupérer le profil complet
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        setProfile({
          id: user.id,
          email: user.email || '',
          full_name: profileData?.full_name || 'Utilisateur',
          company_name: profileData?.company_name,
          phone: profileData?.phone,
          credits: profileData?.credits || 0,
          avatar_url: profileData?.avatar_url,
          role: profileData?.role || 'user',
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.auth.signOut();
              await AsyncStorage.clear();
              // Navigation sera gérée par AuthContext
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de se déconnecter');
            }
          },
        },
      ]
    );
  };

  const renderMenuItem = (
    icon: string,
    title: string,
    subtitle?: string,
    onPress?: () => void,
    rightElement?: React.ReactNode,
    iconColor: string = '#3b82f6'
  ) => (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <View style={styles.menuItemLeft}>
        <View style={[styles.menuIcon, { backgroundColor: `${iconColor}20` }]}>
          <MaterialCommunityIcons name={icon as any} size={24} color={iconColor} />
        </View>
        <View style={styles.menuItemContent}>
          <Text style={styles.menuItemTitle}>{title}</Text>
          {subtitle && <Text style={styles.menuItemSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {rightElement || (onPress && <Feather name="chevron-right" size={20} color="#64748b" />)}
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0b1220" />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header Profile Card */}
        <View style={styles.profileCard}>
          <LinearGradient
            colors={['#3b82f6', '#8b5cf6', '#ec4899'] as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.profileGradient}
          >
            {/* Avatar */}
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
              <TouchableOpacity style={styles.editAvatarButton}>
                <Feather name="camera" size={16} color="white" />
              </TouchableOpacity>
            </View>

            {/* Info */}
            <Text style={styles.profileName}>{profile?.full_name || 'Utilisateur'}</Text>
            {profile?.company_name && (
              <Text style={styles.profileCompany}>{profile.company_name}</Text>
            )}
            <Text style={styles.profileEmail}>{profile?.email}</Text>

            {/* Credits Badge */}
            <View style={styles.creditsContainer}>
              <LinearGradient
                colors={['#10b981', '#22c55e'] as any}
                style={styles.creditsBadge}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <MaterialCommunityIcons name="wallet" size={20} color="white" />
                <Text style={styles.creditsText}>{profile?.credits || 0} crédits</Text>
              </LinearGradient>
            </View>
          </LinearGradient>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>24</Text>
            <Text style={styles.statLabel}>Missions</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Trajets</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>8</Text>
            <Text style={styles.statLabel}>Factures</Text>
          </View>
        </View>

        {/* Menu Sections */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Compte</Text>
          <View style={styles.menuContainer}>
            {renderMenuItem(
              'account-edit',
              'Modifier le profil',
              'Informations personnelles',
              () => Alert.alert('Modifier le profil', 'À implémenter'),
              undefined,
              '#3b82f6'
            )}
            {renderMenuItem(
              'shield-check',
              'Sécurité',
              'Mot de passe et authentification',
              () => Alert.alert('Sécurité', 'À implémenter'),
              undefined,
              '#10b981'
            )}
            {renderMenuItem(
              'shopping-bag',
              'Boutique',
              'Acheter des crédits',
              () => navigation.navigate('Shop'),
              undefined,
              '#8b5cf6'
            )}
            {renderMenuItem(
              'credit-card',
              'Moyens de paiement',
              'Gérer vos cartes bancaires',
              () => Alert.alert('Paiement', 'À implémenter'),
              undefined,
              '#f59e0b'
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Préférences</Text>
          <View style={styles.menuContainer}>
            {renderMenuItem(
              'bell',
              'Notifications',
              'Push, email et SMS',
              undefined,
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: '#334155', true: '#3b82f6' }}
                thumbColor={notifications ? '#fff' : '#94a3b8'}
              />,
              '#8b5cf6'
            )}
            {renderMenuItem(
              'theme-light-dark',
              'Mode sombre',
              'Thème de l\'application',
              undefined,
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                trackColor={{ false: '#334155', true: '#3b82f6' }}
                thumbColor={darkMode ? '#fff' : '#94a3b8'}
              />,
              '#64748b'
            )}
            {renderMenuItem(
              'translate',
              'Langue',
              'Français',
              () => Alert.alert('Langue', 'À implémenter'),
              undefined,
              '#14b8a6'
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <View style={styles.menuContainer}>
            {renderMenuItem(
              'help-circle',
              'Centre d\'aide',
              'FAQ et documentation',
              () => Alert.alert('Aide', 'À implémenter'),
              undefined,
              '#06b6d4'
            )}
            {renderMenuItem(
              'chat',
              'Nous contacter',
              'Équipe support disponible',
              () => Alert.alert('Contact', 'À implémenter'),
              undefined,
              '#3b82f6'
            )}
            {renderMenuItem(
              'file-document',
              'Conditions d\'utilisation',
              'CGU et politique de confidentialité',
              () => Alert.alert('CGU', 'À implémenter'),
              undefined,
              '#94a3b8'
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Application</Text>
          <View style={styles.menuContainer}>
            {renderMenuItem(
              'information',
              'À propos',
              'Version 1.0.0',
              () => Alert.alert('xcrackz Mobile', 'Version 1.0.0\n© 2025 xcrackz'),
              undefined,
              '#6366f1'
            )}
            {renderMenuItem(
              'star',
              'Évaluer l\'application',
              'Donnez votre avis',
              () => Alert.alert('Évaluation', 'Merci pour votre soutien !'),
              undefined,
              '#f59e0b'
            )}
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#ef4444', '#dc2626'] as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.logoutGradient}
          >
            <MaterialCommunityIcons name="logout" size={24} color="white" />
            <Text style={styles.logoutText}>Déconnexion</Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.version}>xcrackz Mobile v1.0.0</Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1220',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  profileCard: {
    margin: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  profileGradient: {
    padding: 30,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '700',
    color: 'white',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  profileCompany: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 16,
  },
  creditsContainer: {
    marginTop: 8,
  },
  creditsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  creditsText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#3b82f6',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  menuContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
  },
  logoutButton: {
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 16,
    overflow: 'hidden',
  },
  logoutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 18,
  },
  logoutText: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: '#64748b',
    marginTop: 20,
  },
});
