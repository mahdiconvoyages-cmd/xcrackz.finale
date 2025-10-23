# 📋 EXEMPLE D'INTÉGRATION - WEB (TeamMissions.tsx)

## Ajouter la synchronisation temps réel à TeamMissions.tsx

```typescript
// ===== IMPORTS À AJOUTER =====
import { realtimeSync } from '../services/realtimeSync';

// Dans le composant TeamMissions, après les useState existants :

export default function TeamMissions() {
  const { user } = useAuth();
  
  // ... vos useState existants ...
  
  // ✅ NOUVEAU : État de connexion Realtime
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  
  // ===== SYNCHRONISATION TEMPS RÉEL =====
  useEffect(() => {
    if (!user) return;
    
    console.log('🔄 Setting up realtime sync...');
    
    // Demander permission notifications
    realtimeSync.requestNotificationPermission();
    
    // 📋 Subscribe aux changements de missions
    const missionChannel = realtimeSync.subscribeToMissions((payload) => {
      console.log('🔄 Mission changed, refreshing list...');
      loadMissions();
      loadStats();
    });
    
    // 🎯 Subscribe aux assignments reçus
    const receivedChannel = realtimeSync.subscribeToAssignments(user.id, (payload) => {
      console.log('🔔 Assignment changed, refreshing...');
      loadReceivedAssignments();
      
      // Notification déjà gérée par realtimeSync.ts
      if (payload.eventType === 'INSERT') {
        // Optionnel : Afficher toast/alert
        alert('🚗 Nouvelle mission assignée !');
      }
    });
    
    // 📊 Subscribe à TOUS les assignments (pour voir les acceptations)
    const allAssignmentsChannel = realtimeSync.subscribeToAllAssignments((payload) => {
      console.log('🔔 Assignment status changed, refreshing...');
      loadSentAssignments();
      loadMissions();
    });
    
    // Marquer comme connecté
    setIsRealtimeConnected(true);
    
    // 🧹 Cleanup
    return () => {
      console.log('🧹 Cleaning up realtime subscriptions');
      realtimeSync.unsubscribeAll();
      setIsRealtimeConnected(false);
    };
  }, [user?.id]); // Dépendance sur user.id
  
  // ... reste de votre code existant ...
  
  // ===== AFFICHER LE STATUT DANS L'UI =====
  // Ajouter dans le JSX, par exemple dans l'en-tête :
  
  return (
    <div className="container mx-auto px-6 py-8">
      {/* En-tête avec statut Realtime */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Missions Collaboratives
          </h1>
          
          {/* ✅ NOUVEAU : Indicateur Realtime */}
          <div className="flex items-center gap-2 mt-2">
            <div className={`w-2 h-2 rounded-full ${
              isRealtimeConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
            }`}></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {isRealtimeConnected ? '🟢 Synchronisation active' : '🔴 Déconnecté'}
            </span>
          </div>
        </div>
        
        {/* Vos boutons existants */}
        <button
          onClick={() => setShowMissionForm(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg"
        >
          <Plus className="w-5 h-5 inline mr-2" />
          Nouvelle Mission
        </button>
      </div>
      
      {/* Reste de votre JSX existant... */}
    </div>
  );
}
```

---

## Résultat

### Avant (sans Realtime) :
- ❌ Il faut rafraîchir manuellement la page
- ❌ Les changements n'apparaissent pas automatiquement
- ❌ Pas de notifications

### Après (avec Realtime) :
- ✅ Les missions apparaissent instantanément (< 1 sec)
- ✅ Les assignations se synchronisent automatiquement
- ✅ Notifications browser sur événements importants
- ✅ Indicateur visuel "🟢 Synchronisation active"

---

## Test rapide

1. Ouvrir TeamMissions sur web
2. Vérifier "🟢 Synchronisation active" apparaît
3. Ouvrir mobile, créer une mission
4. ✅ Mission apparaît sur web en < 1 seconde !
5. Assigner la mission depuis web
6. ✅ Notification sur mobile + apparaît dans "Reçues"

**C'EST MAGIQUE ! ✨**
