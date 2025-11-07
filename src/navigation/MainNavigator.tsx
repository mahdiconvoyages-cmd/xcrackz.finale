import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { SyncIndicator } from '../components/SyncIndicator';
import { useAuth } from '../contexts/AuthContext';

// Screens
import DashboardScreen from '../screens/DashboardScreenNew';
import MissionsNavigator from './MissionsNavigator';
import InspectionsNavigator from './InspectionsNavigator';
import NewMissionsScreen from '../screens/NewMissionsScreen';
import CarpoolingNavigator from './CarpoolingNavigator';
import ProfileScreen from '../screens/ProfileScreen';
import ScannerProScreen from '../screens/ScannerProScreen';

// Composant pour les raccourcis rapides
function CustomDrawerContent(props: any) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const navigation = props.navigation;

  const quickActions = [
    {
      id: 'new-mission',
      icon: 'add-circle',
      label: 'Nouvelle mission',
      color: '#10b981',
      onPress: () => {
        navigation.navigate('Missions', {
          screen: 'MissionCreate',
        });
      },
    },
    {
      id: 'carpooling',
      icon: 'car-sport',
      label: 'Covoiturage',
      color: '#8b5cf6',
      onPress: () => {
        navigation.navigate('Covoiturage');
      },
    },
    {
      id: 'scan-document',
      icon: 'scanner',
      label: 'Scanner Doc',
      color: '#3b82f6',
      onPress: () => {
        navigation.navigate('ScannerPro');
      },
    },
  ];

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

      {/* Raccourcis rapides */}
      <View style={styles.quickActionsContainer}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Raccourcis
        </Text>
        <View style={styles.quickActionsGrid}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={[styles.quickAction, { backgroundColor: action.color + '15' }]}
              onPress={action.onPress}
              activeOpacity={0.7}
            >
              <MaterialIcons name={action.icon as any} size={24} color={action.color} />
              <Text style={[styles.quickActionLabel, { color: colors.text }]} numberOfLines={1}>
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Menu principal */}
      <View style={styles.menuContainer}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Menu principal
        </Text>
        <DrawerItemList {...props} />
      </View>

      {/* Pied de page avec version */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          Version 1.0.0
        </Text>
      </View>
    </DrawerContentScrollView>
  );
}

const Drawer = createDrawerNavigator();

export default function MainNavigator() {
  const { colors, isDark } = useTheme();

  return (
    <Drawer.Navigator
      id={undefined}
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTintColor: colors.text,
        headerRight: () => <SyncIndicator />,
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
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Tableau de bord',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="stats-chart" size={size} color={color} />
          ),
        }}
      />
      
      {/* Nouvelles Missions (identique au web) */}
      <Drawer.Screen
        name="NewMissions"
        component={NewMissionsScreen}
        options={{
          title: 'Mes Missions',
          headerShown: true,
          drawerIcon: ({ color, size }) => (
            <Ionicons name="briefcase" size={size} color={color} />
          ),
        }}
      />
      
      {/* Covoiturage */}
      <Drawer.Screen
        name="Covoiturage"
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
        name="Profile"
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
        name="Inspections"
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
        name="ScannerPro"
        component={ScannerProScreen}
        options={{
          title: 'Scanner Documents',
          drawerIcon: ({ color, size }) => (
            <MaterialIcons name="scanner" size={size} color={color} />
          ),
        }}
      />
      
      {/* Missions & Inspections (caché - accessible uniquement par navigation) */}
      <Drawer.Screen
        name="Missions"
        component={MissionsNavigator}
        options={{
          headerShown: false,
          drawerItemStyle: { display: 'none' }, // Masque du drawer
        }}
      />
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
  quickActionsContainer: {
    paddingHorizontal: 16,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickAction: {
    width: '47%',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  menuContainer: {
    paddingHorizontal: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
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
});
