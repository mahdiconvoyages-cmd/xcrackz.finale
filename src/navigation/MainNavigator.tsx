import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { SyncIndicator } from '../components/SyncIndicator';
import { useAuth } from '../contexts/AuthContext';

// Screens
import DashboardScreen from '../screens/DashboardScreenNew';
import MissionsNavigator from './MissionsNavigator';
import InspectionsNavigator from './InspectionsNavigator';
// Remplace l'ancien écran par le nouveau navigateur Missions
// import NewMissionsScreen from '../screens/NewMissionsScreen';
import CarpoolingNavigator from './CarpoolingNavigator';
import ProfileScreen from '../screens/ProfileScreen';
import ScannerProScreen from '../screens/ScannerProScreen';
import ScansLibraryScreen from '../screens/ScansLibraryScreen';
import { useDeeplinkJoinMission } from '../hooks/useDeeplinkJoinMission';
import Constants from 'expo-constants';
import { useDeeplinkMission } from '../hooks/useDeeplinkMission';
import { Routes } from './Routes';

// Composant pour les raccourcis rapides
function CustomDrawerContent(props: any) {
  const { colors } = useTheme();
  const { user, signOut } = useAuth();
  const navigation = props.navigation;
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
              await signOut();
            } catch (e: any) {
              Alert.alert('Erreur', e?.message || 'Impossible de se déconnecter');
            }
          },
        },
      ],
    );
  };

  // Raccourcis supprimés sur demande

  return (
    <DrawerContentScrollView {...props}>
      {/* En-tête utilisateur */}
      <View style={[styles.userHeader, { backgroundColor: colors.primary + '10' }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: colors.text }]}>
            {user?.email?.split('@')[0] || 'Utilisateur'}
          </Text>
          <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
            {user?.email || ''}
          </Text>
        </View>
      </View>

      {/* Section raccourcis retirée */}

      {/* Menu principal */}
      <View style={[styles.menuContainer, { borderTopColor: colors.textSecondary + '22' }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Menu principal
        </Text>
        <DrawerItemList {...props} />
      </View>

      {/* Déconnexion */}
      <View style={styles.logoutContainer}>
        <TouchableOpacity style={[styles.logoutBtn, { borderColor: '#ef4444', backgroundColor: '#ef44441A' }]} onPress={handleLogout}>
          <Ionicons name="log-out" size={18} color="#ef4444" />
          <Text style={[styles.logoutText, { color: '#ef4444' }]}>Déconnexion</Text>
        </TouchableOpacity>
      </View>

      {/* Pied de page avec version */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          Version {Constants.expoConfig?.version || (Constants as any).manifest?.version || '—'}
        </Text>
      </View>
    </DrawerContentScrollView>
  );
}

const Drawer = createDrawerNavigator();

export default function MainNavigator() {
  const { colors, isDark } = useTheme();
  
  // Écoute deeplink pour assignation auto (simple feedback console)
  useDeeplinkJoinMission((missionId) => {
    console.log('✅ Mission assignée via deeplink:', missionId);
  });

  // Écoute deeplink pour ouvrir une mission directement
  useDeeplinkMission();

  return (
    <Drawer.Navigator
      id={undefined}
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTintColor: colors.text,
        drawerStyle: {
          backgroundColor: colors.background,
          width: 280,
        },
        drawerActiveTintColor: colors.primary,
        drawerInactiveTintColor: colors.textSecondary,
      }}
    >
      {/* Tableau de bord */}
      <Drawer.Screen
        name={Routes.Dashboard}
        component={DashboardScreen}
        options={{
          title: 'Tableau de bord',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="stats-chart" size={size} color={color} />
          ),
        }}
      />
      
      {/* Mes Missions (nouveau flux via MissionsNavigator) */}
      <Drawer.Screen
        name={Routes.MesMissions}
        component={MissionsNavigator}
        options={{
          title: 'Mes Missions',
          headerShown: false,
          drawerIcon: ({ color, size }) => (
            <Ionicons name="briefcase" size={size} color={color} />
          ),
        }}
      />
      
      {/* Covoiturage */}
      <Drawer.Screen
        name={Routes.Covoiturage}
        component={CarpoolingNavigator}
        options={{
          title: 'Covoiturage',
          headerShown: false,
          drawerIcon: ({ color, size }) => (
            <Ionicons name="car-sport" size={size} color={color} />
          ),
        }}
      />
      
      {/* Profil */}
      <Drawer.Screen
        name={Routes.Profile}
        component={ProfileScreen}
        options={{
          title: 'Profil',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />

      {/* Rapports d'Inspection */}
      <Drawer.Screen
        name={Routes.Inspections}
        component={InspectionsNavigator}
        options={{
          title: 'Rapports d\'Inspection',
          headerShown: false,
          drawerIcon: ({ color, size }) => (
            <MaterialIcons name="assignment" size={size} color={color} />
          ),
        }}
      />

      {/* Scanner de Documents */}
      <Drawer.Screen
        name={Routes.ScannerPro}
        component={ScannerProScreen}
        options={{
          title: 'Scanner Documents',
          drawerIcon: ({ color, size }) => (
            <MaterialIcons name="scanner" size={size} color={color} />
          ),
        }}
      />
      {/* Bibliothèque de numérisations */}
      <Drawer.Screen
        name={Routes.ScansLibrary}
        component={ScansLibraryScreen}
        options={{
          title: 'Mes Numérisations',
          drawerIcon: ({ color, size }) => (
            <MaterialIcons name="folder" size={size} color={color} />
          ),
        }}
      />
      
      {/* Missions & Inspections - déjà accessible via "Mes Missions" ci-dessus */}
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 10,
    marginHorizontal: 10,
    borderRadius: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  menuContainer: {
    paddingHorizontal: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    marginTop: 5,
  },
  footer: {
    padding: 16,
    alignItems: 'center',
    marginTop: 'auto',
  },
  footerText: {
    fontSize: 11,
  },
  logoutContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  logoutText: {
    fontWeight: '700',
  },
});
