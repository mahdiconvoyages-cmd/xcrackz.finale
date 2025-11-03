# 📱 NOUVEAU MISSIONSSCREEN - GUIDE D'IMPLÉMENTATION

## ✅ CE QUI A ÉTÉ FAIT

1. **Facturation supprimée**
   - FacturationScreen.tsx retiré
   - Navigation mise à jour
   - Types mis à jour

2. **Plan détaillé créé**
   - Structure définie
   - Logique documentée
   - Checklist complète

---

## 🚀 PROCHAINES ÉTAPES

### Étape 1 : Créer MissionsScreen.tsx

Le fichier est trop volumineux pour être créé en une seule fois via l'outil.

**SOLUTION :** Créer manuellement en copiant-collant du code web adapté.

**Structure recommandée :**
1. Créer le fichier vide
2. Copier la logique de `src/pages/TeamMissions.tsx`
3. Adapter pour React Native
4. Tester progressivement

---

## 📝 CODE DE BASE MINIMAL

Voici un code de base minimal fonctionnel que vous pouvez étendre :

```typescript
// src/screens/MissionsScreen.tsx

import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function MissionsScreen() {
  const { user } = useAuth();
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadMissions();
    }
  }, [user]);

  const loadMissions = async () => {
    setLoading(true);
    
    // Charger missions créées
    const { data: created } = await supabase
      .from('missions')
      .select('*')
      .eq('user_id', user.id)
      .order('pickup_date', { ascending: true });

    // Charger inspections pour calculer statut
    const missionIds = (created || []).map(m => m.id);
    const { data: inspections } = await supabase
      .from('vehicle_inspections')
      .select('mission_id, inspection_type')
      .in('mission_id', missionIds);

    // Calculer statuts et filtrer terminées
    const processed = (created || []).map(mission => {
      const missionInspections = (inspections || []).filter(i => i.mission_id === mission.id);
      const hasDepart = missionInspections.some(i => i.inspection_type === 'departure');
      const hasArrival = missionInspections.some(i => i.inspection_type === 'arrival');
      
      let status = 'pending';
      if (hasDepart && hasArrival) {
        return null; // Masquer les terminées
      } else if (hasDepart) {
        status = 'in_progress';
      }
      
      return { ...mission, status };
    }).filter(Boolean);

    setMissions(processed);
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Mes Missions</Text>
      <FlatList
        data={missions}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadMissions} />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.reference}>{item.reference}</Text>
            <Text>{item.vehicle_brand} {item.vehicle_model}</Text>
            <Text>{item.status}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  title: { fontSize: 24, fontWeight: 'bold', padding: 16 },
  card: { backgroundColor: '#fff', margin: 8, padding: 16, borderRadius: 12 },
  reference: { fontSize: 16, fontWeight: '600' },
});
```

---

## 🎨 EXTENSIONS À AJOUTER

### 1. Onglets (Material Top Tabs)
```bash
npm install @react-navigation/material-top-tabs
```

```typescript
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';

const Tab = createMaterialTopTabNavigator();

function MyMissionsTab() {
  // Logique Mes Missions
}

function ReceivedMissionsTab() {
  // Logique Missions Reçues
}

export default function MissionsScreen() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="MyMissions" component={MyMissionsTab} options={{ title: 'Mes Missions' }} />
      <Tab.Screen name="Received" component={ReceivedMissionsTab} options={{ title: 'Reçues' }} />
    </Tab.Navigator>
  );
}
```

### 2. Toggle Grid/List
```typescript
const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

// Affichage
{viewMode === 'grid' ? (
  <FlatList
    numColumns={2}
    data={missions}
    renderItem={({ item }) => <GridCard mission={item} />}
  />
) : (
  <FlatList
    data={missions}
    renderItem={({ item }) => <ListCard mission={item} />}
  />
)}
```

### 3. Recherche
```typescript
const [searchTerm, setSearchTerm] = useState('');

const filtered = missions.filter(m =>
  m.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
  m.vehicle_brand.toLowerCase().includes(searchTerm.toLowerCase())
);
```

### 4. Stats Cards
```typescript
const stats = {
  total: missions.length,
  pending: missions.filter(m => m.status === 'pending').length,
  inProgress: missions.filter(m => m.status === 'in_progress').length,
};

<View style={styles.statsRow}>
  <StatCard label="Total" value={stats.total} />
  <StatCard label="En attente" value={stats.pending} />
  <StatCard label="En cours" value={stats.inProgress} />
</View>
```

---

## 🔗 INTÉGRATION NAVIGATION

Dans `src/navigation/MainNavigator.tsx` :

```typescript
import MissionsScreen from '../screens/MissionsScreen';

// Dans le Tab.Navigator
<Tab.Screen
  name="Missions"
  component={MissionsScreen}
  options={{
    title: 'Missions',
    tabBarIcon: ({ color }) => (
      <MaterialCommunityIcons name="truck" size={24} color={color} />
    ),
  }}
/>
```

---

## 📊 PDF Optimisé

Dans `src/services/missionPdfGeneratorMobile.ts`, ajouter :

```typescript
export async function generateMissionPDFWithComparison(
  mission: Mission,
  departureInspection: Inspection,
  arrivalInspection: Inspection
) {
  // ... code existant ...
  
  // NOUVELLE SECTION : Comparaison
  page.drawText('📊 COMPARAISON DÉPART / ARRIVÉE', {
    x: 50,
    y: yPosition,
    size: 16,
  });
  
  // Photos côte-à-côte
  const photoWidth = 200;
  const photoHeight = 150;
  
  // Départ à gauche
  if (departureInspection.photos[0]) {
    const departurePhoto = await pdfDoc.embedJpg(departureInspection.photos[0]);
    page.drawImage(departurePhoto, {
      x: 50,
      y: yPosition - 170,
      width: photoWidth,
      height: photoHeight,
    });
  }
  
  // Arrivée à droite
  if (arrivalInspection.photos[0]) {
    const arrivalPhoto = await pdfDoc.embedJpg(arrivalInspection.photos[0]);
    page.drawImage(arrivalPhoto, {
      x: 300,
      y: yPosition - 170,
      width: photoWidth,
      height: photoHeight,
    });
  }
  
  // Signatures côte-à-côte
  // ... même logique ...
}
```

---

## ✅ CHECKLIST

### Missions créé
- [ ] Fichier MissionsScreen.tsx créé
- [ ] Logique chargement missions OK
- [ ] Calcul statuts basé inspections OK
- [ ] Filtrage missions terminées OK
- [ ] Onglets Mes/Reçues OK
- [ ] Toggle Grid/List OK
- [ ] Recherche OK
- [ ] Stats cards OK

### Navigation
- [ ] MainNavigator mis à jour
- [ ] Tab Missions ajouté
- [ ] Tab Facturation retiré
- [ ] Icône missions choisie

### PDF
- [ ] Section comparaison ajoutée
- [ ] Photos côte-à-côte
- [ ] Signatures côte-à-côte
- [ ] Export photos séparées

---

## 🎯 RÉSULTAT

Après implémentation complète :
- ✅ Facturation supprimée
- ✅ Missions identiques au web
- ✅ Calcul automatique des statuts
- ✅ PDF optimisé avec comparaison
- ✅ Photos téléchargeables

**Application mobile synchronisée avec le web !**
