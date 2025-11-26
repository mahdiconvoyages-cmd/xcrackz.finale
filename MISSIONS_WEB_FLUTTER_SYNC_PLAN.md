# 🎯 Plan de Synchronisation: Page Missions Web ↔ Flutter

## 📊 Analyse Comparative

### Flutter (missions_screen.dart)
**Structure actuelle:**
- ✅ **3 onglets tabs**: En attente | En cours | Terminées
- ✅ **Toggle vue**: Grid / List
- ✅ **Join Mission Card**: Bandeau compact en haut avec input code
- ✅ **Stats**: Affichage des compteurs par statut
- ✅ **Cards gradient**: Design premium avec bordures colorées selon statut
- ✅ **Info chips**: Client name, vehicle type séparés
- ✅ **Status badges**: Icônes avec gradient par statut
- ✅ **Floating Action Button**: Création mission

**Statuts:**
- `pending` → Orange → "En attente" → Icon: `pending_actions`
- `in_progress` → Blue → "En cours" → Icon: `local_shipping`
- `completed` → Green → "Terminée" → Icon: `check_circle`

### Web (TeamMissions.tsx)
**Structure actuelle:**
- ❌ **2 onglets**: Missions créées | Missions reçues (différent de Flutter)
- ✅ Toggle vue: Grid / List
- ❌ Filtre status séparé (dropdown au lieu de tabs)
- ❌ Cards basiques sans gradient premium
- ❌ Mélange missions créées/assignées dans même liste
- ❌ **Missions completed filtrées** (ne s'affichent pas)
- ⚠️ Join mission en modal au lieu de bandeau

## 🎯 Objectifs

1. **Supprimer** la séparation "Missions créées / Missions reçues"
2. **Implémenter** les 3 tabs Flutter: En attente | En cours | Terminées
3. **Afficher** toutes les missions (créées + assignées) mélangées par statut
4. **Design cards** identique à Flutter avec gradients premium
5. **Join Mission Card** en bandeau compact comme Flutter
6. **Réafficher les missions completed** dans l'onglet "Terminées"

## 📋 Nouveau Plan d'Action

### Phase 1: Restructuration États & Filtrage
```typescript
// SUPPRIMER
const [activeTab, setActiveTab] = useState<TabType>('missions' | 'received');
const [receivedMissions, setReceivedMissions] = useState<Mission[]>([]);

// AJOUTER
const [activeTab, setActiveTab] = useState<'pending' | 'in_progress' | 'completed'>('pending');
const [allMissions, setAllMissions] = useState<Mission[]>([]); // Toutes les missions mélangées
```

### Phase 2: Requête Unique
```typescript
const loadMissions = async () => {
  if (!user) return;
  
  // Requête 1: Missions créées par l'utilisateur
  const { data: createdData } = await supabase
    .from('missions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  
  // Requête 2: Missions assignées à l'utilisateur
  const { data: assignedData } = await supabase
    .from('missions')
    .select('*')
    .eq('assigned_user_id', user.id)
    .order('created_at', { ascending: false });
  
  // Fusionner et dédupliquer
  const allMissions = [...(createdData || []), ...(assignedData || [])];
  const uniqueMissions = Array.from(
    new Map(allMissions.map(m => [m.id, m])).values()
  );
  
  // NE PAS FILTRER les missions 'completed' !
  setAllMissions(uniqueMissions);
};
```

### Phase 3: Système de Tabs Flutter
```tsx
<div className="border-b border-gray-200">
  <div className="flex">
    {[
      { key: 'pending', label: 'En attente', icon: Clock },
      { key: 'in_progress', label: 'En cours', icon: Truck },
      { key: 'completed', label: 'Terminées', icon: CheckCircle }
    ].map(tab => (
      <button
        key={tab.key}
        onClick={() => setActiveTab(tab.key)}
        className={`flex-1 py-4 px-6 font-semibold transition-all ${
          activeTab === tab.key
            ? 'border-b-2 border-teal-500 text-teal-600 bg-teal-50'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        }`}
      >
        <div className="flex items-center justify-center gap-2">
          <tab.icon className="w-5 h-5" />
          {tab.label}
        </div>
      </button>
    ))}
  </div>
</div>
```

### Phase 4: Filtrage par Tab
```typescript
const filteredMissions = allMissions.filter(m => m.status === activeTab);
```

### Phase 5: Join Mission Card (Bandeau Compact)
```tsx
{/* Join Mission Code Card - Bandeau compact comme Flutter */}
<div className="bg-gradient-to-r from-teal-500 to-blue-500 p-4 rounded-xl shadow-lg mb-6">
  <div className="flex items-center gap-4">
    <div className="flex-shrink-0 bg-white/20 p-3 rounded-lg">
      <LogIn className="w-6 h-6 text-white" />
    </div>
    <div className="flex-1">
      <h3 className="text-white font-semibold mb-1">Rejoindre une mission</h3>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Code de partage"
          className="flex-1 px-3 py-2 rounded-lg text-sm"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value)}
        />
        <button
          onClick={handleJoinMission}
          className="px-4 py-2 bg-white text-teal-600 rounded-lg font-medium hover:bg-gray-100 transition-colors"
        >
          Rejoindre
        </button>
      </div>
    </div>
  </div>
</div>
```

### Phase 6: Cards Design Premium
```tsx
// Card avec gradient et bordure colorée selon statut
<div className={`
  bg-gradient-to-br from-gray-800 to-gray-900 
  rounded-xl p-6 
  border-2 ${getStatusBorderColor(mission.status)}
  shadow-lg hover:shadow-xl transition-all
  relative overflow-hidden
`}>
  {/* Badge statut avec gradient */}
  <div className="absolute top-0 right-0 px-4 py-2 rounded-bl-xl bg-gradient-to-br ${getStatusGradient(mission.status)}">
    <StatusIcon className="w-5 h-5 text-white" />
  </div>
  
  {/* Header avec icône véhicule */}
  <div className="flex items-start gap-4 mb-4">
    <div className={`p-3 rounded-xl bg-gradient-to-br ${getStatusGradient(mission.status)}`}>
      <Truck className="w-6 h-6 text-white" />
    </div>
    <div className="flex-1">
      <h3 className="text-white font-bold text-lg mb-1">
        {mission.pickup_address}
      </h3>
      <p className="text-gray-400 text-sm">Réf: {mission.reference}</p>
    </div>
  </div>
  
  {/* Destination */}
  <div className="bg-white/5 rounded-lg p-3 mb-4 border border-white/10">
    <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
      <MapPin className="w-4 h-4 text-teal-500" />
      Destination
    </div>
    <p className="text-white font-medium">{mission.delivery_address}</p>
  </div>
  
  {/* Info chips: Client + Vehicle */}
  <div className="flex gap-2 mb-4">
    <div className="flex-1 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-blue-400" />
        <span className="text-sm text-blue-300">{mission.client_name || 'Client'}</span>
      </div>
    </div>
    <div className="flex-1 bg-teal-500/10 border border-teal-500/20 rounded-lg px-3 py-2">
      <div className="flex items-center gap-2">
        <Truck className="w-4 h-4 text-teal-400" />
        <span className="text-sm text-teal-300">{mission.vehicle_type || 'VL'}</span>
      </div>
    </div>
  </div>
  
  {/* Footer: Date + Prix */}
  <div className="flex items-center justify-between text-sm">
    <div className="flex items-center gap-2 text-gray-400">
      <Calendar className="w-4 h-4" />
      {formatDate(mission.pickup_date)}
    </div>
    {mission.price && (
      <div className="text-teal-400 font-bold">
        {mission.price}€
      </div>
    )}
  </div>
</div>
```

### Phase 7: Fonctions Utilitaires
```typescript
const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return 'orange';
    case 'in_progress': return 'blue';
    case 'completed': return 'green';
    default: return 'gray';
  }
};

const getStatusBorderColor = (status: string) => {
  switch (status) {
    case 'pending': return 'border-orange-500/30';
    case 'in_progress': return 'border-blue-500/30';
    case 'completed': return 'border-green-500/30';
    default: return 'border-gray-500/30';
  }
};

const getStatusGradient = (status: string) => {
  switch (status) {
    case 'pending': return 'from-orange-500 to-orange-600';
    case 'in_progress': return 'from-blue-500 to-blue-600';
    case 'completed': return 'from-green-500 to-green-600';
    default: return 'from-gray-500 to-gray-600';
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'pending': return 'En attente';
    case 'in_progress': return 'En cours';
    case 'completed': return 'Terminée';
    default: return status;
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pending': return Clock;
    case 'in_progress': return Truck;
    case 'completed': return CheckCircle;
    default: return Package;
  }
};
```

## 🔥 Changements Majeurs

### ❌ À SUPPRIMER
1. **Tab "Missions reçues"** séparé
2. **Filtre status dropdown** (remplacé par tabs)
3. **État `receivedMissions`** séparé
4. **Filtrage des missions completed** (ligne 177-179 de TeamMissions.tsx)
5. **Modal Join Mission** (remplacer par bandeau)

### ✅ À AJOUTER
1. **3 tabs Flutter**: En attente | En cours | Terminées
2. **Fusion missions créées + assignées** dans une seule liste
3. **Cards design premium** avec gradients
4. **Bandeau Join Mission** compact en haut
5. **Affichage missions completed** dans onglet Terminées
6. **Badge statut** avec icône et gradient
7. **Info chips** Client + Vehicle séparés

## 📊 Structure Finale

```
TeamMissions
├── Header (AppBar)
│   ├── Titre "Mes Convoyages"
│   ├── Toggle Grid/List
│   └── Avatar utilisateur
├── Tabs Bar (3 onglets)
│   ├── En attente (pending)
│   ├── En cours (in_progress)
│   └── Terminées (completed)
├── Join Mission Card (Bandeau)
│   ├── Icône
│   ├── Titre
│   └── Input + Bouton
├── Mission List/Grid
│   └── Mission Cards (Premium Design)
│       ├── Badge statut (gradient)
│       ├── Header (icône + pickup)
│       ├── Destination (card interne)
│       ├── Info chips (client + vehicle)
│       └── Footer (date + prix)
└── FAB Create Mission
```

## 🎨 Palette Couleurs

### Statuts
- **Pending**: Orange (`#FB923C`, `#F97316`)
- **In Progress**: Blue (`#3B82F6`, `#2563EB`)
- **Completed**: Green (`#10B981`, `#059669`)

### Thème
- **Primary Teal**: `#14B8A6`
- **Primary Blue**: `#3B82F6`
- **Primary Indigo**: `#6366F1`
- **Card BG**: `from-gray-800 to-gray-900`
- **Light BG**: `#F0FDFA`

## ⚡ Prochaines Étapes

1. ✅ Créer ce document de spécification
2. ⏳ Créer le nouveau fichier `TeamMissionsPerfect.tsx`
3. ⏳ Implémenter la structure 3 tabs
4. ⏳ Fusionner requêtes missions créées + assignées
5. ⏳ Créer les cards design premium
6. ⏳ Ajouter bandeau Join Mission
7. ⏳ Réafficher missions completed
8. ⏳ Supprimer l'ancien TeamMissions.tsx
9. ⏳ Mettre à jour les routes dans App.tsx
10. ⏳ Tester tous les flows

---

**Date**: 26 novembre 2025  
**Objectif**: Page Missions Web 100% identique à Flutter  
**Fichiers concernés**: 
- `src/pages/TeamMissions.tsx` → `src/pages/TeamMissionsPerfect.tsx`
- `src/App.tsx` (routes)
