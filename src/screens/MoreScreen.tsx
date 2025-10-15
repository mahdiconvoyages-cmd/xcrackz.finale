import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';

interface MenuItem {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  screen?: string;
  action?: () => void;
}

export default function MoreScreen() {
  const navigation = useNavigation();
  const { signOut, user } = useAuth();

  const menuSections: { title: string; items: MenuItem[] }[] = [
    {
      title: 'Services',
      items: [
        {
          id: 'boutique',
          title: 'Boutique',
          subtitle: 'Pièces et accessoires',
          icon: 'shopping-bag',
          color: '#f59e0b',
          screen: 'Shop',
        },
      ],
    },
    {
      title: 'Compte',
      items: [
        {
          id: 'profile',
          title: 'Mon Profil',
          subtitle: 'Informations personnelles',
          icon: 'user',
          color: '#06b6d4',
        },
        {
          id: 'settings',
          title: 'Paramètres',
          subtitle: 'Configuration de l\'app',
          icon: 'settings',
          color: '#64748b',
        },
        {
          id: 'help',
          title: 'Aide & Support',
          subtitle: 'Contactez notre équipe',
          icon: 'help-circle',
          color: '#3b82f6',
          screen: 'Support',
        },
      ],
    },
    {
      title: 'Actions',
      items: [
        {
          id: 'logout',
          title: 'Déconnexion',
          subtitle: 'Se déconnecter de l\'application',
          icon: 'log-out',
          color: '#ef4444',
          action: () => {
            signOut();
          },
        },
      ],
    },
  ];

  const handleMenuPress = (item: MenuItem) => {
    if (item.action) {
      item.action();
    } else if (item.screen) {
      // @ts-ignore
      navigation.navigate(item.screen);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0b1220', '#0e1930', '#0b1220']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Plus</Text>
        {user && (
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Feather name="user" size={24} color="#06b6d4" />
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{user.email}</Text>
              <Text style={styles.userRole}>Conducteur</Text>
            </View>
          </View>
        )}
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {menuSections.map((section, sectionIndex) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.menuList}>
              {section.items.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.menuItem,
                    index === section.items.length - 1 && styles.menuItemLast,
                  ]}
                  onPress={() => handleMenuPress(item)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
                    <Feather name={item.icon} size={22} color={item.color} />
                  </View>
                  <View style={styles.menuContent}>
                    <Text style={styles.menuTitle}>{item.title}</Text>
                    <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                  </View>
                  <Feather name="chevron-right" size={20} color="#64748b" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>XCrackz Mobile v1.0</Text>
          <Text style={styles.footerSubtext}>© 2025 Tous droits réservés</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1220',
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 40 : 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#e5e7eb',
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.2)',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDetails: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e5e7eb',
  },
  userRole: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: Platform.OS === 'android' ? 110 : 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  menuList: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(71, 85, 105, 0.3)',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(71, 85, 105, 0.2)',
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContent: {
    flex: 1,
    marginLeft: 12,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e5e7eb',
  },
  menuSubtitle: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(71, 85, 105, 0.2)',
  },
  footerText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  footerSubtext: {
    fontSize: 11,
    color: '#475569',
    marginTop: 4,
  },
});
