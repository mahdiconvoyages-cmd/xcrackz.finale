# 📱 EXEMPLE D'INTÉGRATION - MOBILE (TeamMissionsScreen.tsx)

## Ajouter la synchronisation temps réel à TeamMissionsScreen.tsx

```typescript
// ===== IMPORTS À AJOUTER =====
import { useRealtimeSync } from '../hooks/useRealtimeSync';

// Dans le composant TeamMissionsScreen :

export default function TeamMissionsScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  
  // ... vos useState existants ...
  
  // ✅ NOUVEAU : Hook de synchronisation temps réel
  const { lastUpdate, isConnected } = useRealtimeSync({
    userId: user?.id || '',
    onMissionChange: () => {
      console.log('🔄 Mission changed, refreshing...');
      loadMissions();
    },
    onAssignmentChange: () => {
      console.log('🔔 Assignment changed, refreshing...');
      loadReceivedAssignments();
      loadSentAssignments();
    },
    onLocationUpdate: () => {
      console.log('📍 Location updated');
      // Si vous avez une map, refresh ici
    },
  });
  
  // ✅ NOUVEAU : Refresh automatique quand lastUpdate change
  useEffect(() => {
    if (user) {
      loadMissions();
      loadReceivedAssignments();
      loadSentAssignments();
    }
  }, [lastUpdate]); // Se déclenche à chaque changement Realtime
  
  // ... reste de votre code existant ...
  
  // ===== AFFICHER LE STATUT DANS L'UI =====
  
  return (
    <SafeAreaView style={styles.container}>
      {/* En-tête avec statut Realtime */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Missions</Text>
          
          {/* ✅ NOUVEAU : Indicateur Realtime */}
          <View style={styles.realtimeStatus}>
            <View style={[
              styles.statusDot,
              { backgroundColor: isConnected ? '#10b981' : '#ef4444' }
            ]} />
            <Text style={styles.statusText}>
              {isConnected ? '🟢 En ligne' : '🔴 Hors ligne'}
            </Text>
          </View>
        </View>
        
        {/* Vos boutons/tabs existants */}
      </View>
      
      {/* Reste de votre JSX existant... */}
    </SafeAreaView>
  );
}

// ===== STYLES À AJOUTER =====

const styles = StyleSheet.create({
  // ... vos styles existants ...
  
  realtimeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
});
```

---

## Résultat

### Avant (sans Realtime) :
- ❌ Il faut pull-to-refresh manuellement
- ❌ Les changements n'apparaissent pas automatiquement
- ❌ Pas de notifications

### Après (avec Realtime) :
- ✅ Les missions se synchronisent automatiquement
- ✅ Notifications locales sur assignations
- ✅ Indicateur "🟢 En ligne" / "🔴 Hors ligne"
- ✅ Refresh automatique toutes les 2 secondes

---

## Notifications automatiques déjà incluses

Le hook `useRealtimeSync` envoie automatiquement :

### 1. Nouvelle assignation
```
🚗 Nouvelle Mission
Une mission vous a été assignée
```

### 2. Mission acceptée
```
✅ Mission Acceptée
La mission #1234 a été acceptée
```

### 3. Mission refusée
```
❌ Mission Refusée
La mission #1234 a été refusée
```

---

## Test rapide

1. Ouvrir TeamMissionsScreen sur mobile
2. Vérifier "🟢 En ligne" apparaît en haut
3. Créer mission depuis web
4. ✅ Mission apparaît sur mobile en < 1 seconde !
5. Assigner depuis mobile
6. ✅ Notification locale instantanée
7. Accepter sur un autre device
8. ✅ Statut change instantanément

**SYNCHRONISATION PARFAITE ! ⚡**

---

## Configuration Notifications (si pas déjà fait)

Dans `App.tsx`, ajouter :

```typescript
import * as Notifications from 'expo-notifications';

// Configurer les notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Dans useEffect :
useEffect(() => {
  // Demander permission
  (async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.log('❌ Notification permission denied');
    } else {
      console.log('✅ Notification permission granted');
    }
  })();
}, []);
```

**TOUT AUTOMATIQUE ! 🎉**
