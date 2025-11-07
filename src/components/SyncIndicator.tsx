import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { offlineSyncService, SyncStatus } from '../services/offlineSyncService';
import { useTheme } from '../contexts/ThemeContext';

export const SyncIndicator: React.FC = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(offlineSyncService.getStatus());
  const [pulseAnim] = useState(new Animated.Value(1));
  const { colors } = useTheme();

  useEffect(() => {
    // S'abonner aux changements de statut
    const handleStatusChange = (status: SyncStatus) => {
      setSyncStatus(status);
    };

    offlineSyncService.addListener(handleStatusChange);

    // Démarrer la synchronisation automatique
    offlineSyncService.startAutoSync(30000); // Toutes les 30 secondes

    return () => {
      offlineSyncService.removeListener(handleStatusChange);
      offlineSyncService.stopAutoSync();
    };
  }, []);

  // Animation de pulsation pendant la synchronisation
  useEffect(() => {
    if (syncStatus.status === 'syncing') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [syncStatus.status]);

  // Déterminer l'icône et la couleur selon le statut
  const getStatusConfig = () => {
    switch (syncStatus.status) {
      case 'offline':
        return {
          icon: 'cloud-offline' as const,
          color: colors.error,
          text: 'Hors ligne',
          showQueue: true,
        };
      case 'syncing':
        return {
          icon: 'sync' as const,
          color: colors.primary,
          text: 'Synchronisation...',
          showQueue: true,
        };
      case 'synced':
        return {
          icon: 'cloud-done' as const,
          color: colors.success,
          text: 'Synchronisé',
          showQueue: false,
        };
      case 'error':
        return {
          icon: 'warning' as const,
          color: colors.warning,
          text: 'Erreur de sync',
          showQueue: true,
        };
      case 'queued':
        return {
          icon: 'cloud-upload' as const,
          color: colors.warning,
          text: 'En attente',
          showQueue: true,
        };
      default:
        return {
          icon: 'cloud-done' as const,
          color: colors.success,
          text: 'En ligne',
          showQueue: false,
        };
    }
  };

  const config = getStatusConfig();

  // Ne rien afficher si tout est synchronisé et en ligne
  if (syncStatus.status === 'synced' && syncStatus.queueLength === 0) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Animated.View
        style={[
          styles.content,
          { transform: [{ scale: pulseAnim }] },
        ]}
      >
        <Ionicons name={config.icon} size={16} color={config.color} />
        <Text style={[styles.text, { color: colors.text }]}>{config.text}</Text>
        {config.showQueue && syncStatus.queueLength > 0 && (
          <View style={[styles.badge, { backgroundColor: config.color }]}>
            <Text style={styles.badgeText}>{syncStatus.queueLength}</Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
