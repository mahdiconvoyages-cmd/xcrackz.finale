# 🔧 FIX: Unifier le Système d'Assignation Mobile & Web

## 🚨 Problème Identifié

**Le mobile et le web utilisent des systèmes d'assignation DIFFÉRENTS:**

### Web ✅ (Correct - Nouveau système)
```typescript
// src/pages/TeamMissions.tsx
const { data } = await supabase
  .from('missions')
  .select('*')
  .eq('assigned_to_user_id', user.id);  // ✅ Utilise assigned_to_user_id
```

### Mobile ❌ (Ancien système - À corriger)
```typescript
// mobile/src/screens/TeamMissionsScreen.tsx
const { data } = await supabase
  .from('mission_assignments')  // ❌ Table séparée obsolète
  .select('*, mission:missions(*)')
  .eq('user_id', userId);
```

---

## 📊 Architecture Unifiée (À implémenter)

### Table `missions` (Déjà en place)
```sql
missions (
  id UUID PRIMARY KEY,
  user_id UUID,              -- Créateur
  assigned_to_user_id UUID,  -- Utilisateur assigné (via share_code)
  share_code VARCHAR(10),    -- Format: XZ-XXX-XXX
  reference VARCHAR,
  status VARCHAR,
  ...
)
```

### Flow d'assignation
1. **User A** crée mission → `user_id` = A
2. Mission auto-génère `share_code` = "XZ-ABC-DEF"
3. **User B** entre le code → RPC `join_mission_with_code()`
4. RPC met à jour `assigned_to_user_id` = B
5. **User B** voit la mission dans "Missions Reçues"

---

## 🔧 Corrections Mobile

### 1. Mettre à jour `MissionListScreenNew.tsx`

**AVANT (ligne 156-165):**
```typescript
const loadReceivedAssignments = async () => {
  try {
    const { data: assignments, error } = await supabase
      .from('mission_assignments')  // ❌ Table obsolète
      .select(`*, mission:missions(*)`)
      .eq('contact_id', user!.id)
      .order('created_at', { ascending: false });
```

**APRÈS:**
```typescript
const loadReceivedAssignments = async () => {
  try {
    const { data: missions, error } = await supabase
      .from('missions')  // ✅ Table unifiée
      .select('*')
      .eq('assigned_to_user_id', user!.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Convertir en format Assignment pour compatibilité UI
    const assignments = missions?.map(m => ({
      id: m.id,
      mission_id: m.id,
      mission: m,
      assigned_at: m.created_at,
      status: m.status,
    })) || [];
    
    setReceivedAssignments(assignments);
```

### 2. Créer un nouvel écran d'assignation unifié

**Fichier:** `mobile/src/screens/missions/ShareMissionScreen.tsx`

```typescript
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function ShareMissionScreen({ route, navigation }: any) {
  const { mission } = route.params;
  const [shareCode] = useState(mission.share_code);
  const [joinCode, setJoinCode] = useState('');

  const handleShare = () => {
    Alert.alert(
      '📤 Partager la mission',
      `Code de partage: ${shareCode}\n\nPartagez ce code avec la personne qui doit réaliser la mission.`
    );
  };

  const handleJoin = async () => {
    try {
      const { data, error } = await supabase.rpc('join_mission_with_code', {
        p_share_code: joinCode.trim(),
        p_user_id: (await supabase.auth.getUser()).data.user?.id
      });

      if (error) throw error;

      const result = JSON.parse(data);
      if (!result.success) {
        throw new Error(result.message || 'Erreur inconnue');
      }

      Alert.alert('✅ Succès', 'Mission assignée avec succès !');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('❌ Erreur', error.message);
    }
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 20 }}>
        Partager une Mission
      </Text>

      <View style={{ marginBottom: 30 }}>
        <Text style={{ fontSize: 16, marginBottom: 10 }}>Code de partage:</Text>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#3B82F6' }}>
          {shareCode}
        </Text>
        <TouchableOpacity 
          onPress={handleShare}
          style={{ 
            backgroundColor: '#3B82F6', 
            padding: 15, 
            borderRadius: 10,
            marginTop: 10 
          }}
        >
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
            📤 Partager ce code
          </Text>
        </TouchableOpacity>
      </View>

      <View>
        <Text style={{ fontSize: 16, marginBottom: 10 }}>Rejoindre une mission:</Text>
        <TextInput
          value={joinCode}
          onChangeText={setJoinCode}
          placeholder="XZ-XXX-XXX"
          autoCapitalize="characters"
          style={{
            borderWidth: 1,
            borderColor: '#D1D5DB',
            borderRadius: 10,
            padding: 15,
            fontSize: 18,
            marginBottom: 10
          }}
        />
        <TouchableOpacity 
          onPress={handleJoin}
          disabled={!joinCode.trim()}
          style={{ 
            backgroundColor: joinCode.trim() ? '#10B981' : '#D1D5DB',
            padding: 15, 
            borderRadius: 10 
          }}
        >
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
            ✅ Rejoindre cette mission
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
```

### 3. Mettre à jour `TeamMissionsScreen.tsx`

**Remplacer la logique d'assignation par:**

```typescript
// Ligne ~185-210
const handleAssignMission = (mission: Mission) => {
  navigation.navigate('ShareMission', { mission });
};
```

---

## 🗑️ Tables Obsolètes à Supprimer (Après migration)

Une fois le système unifié testé et validé:

```sql
-- ⚠️ ATTENTION: Faire un backup avant !
-- DROP TABLE IF EXISTS mission_assignments CASCADE;
```

---

## ✅ Checklist de Migration

- [ ] 1. Vérifier que `assigned_to_user_id` existe dans `missions`
- [ ] 2. Créer `ShareMissionScreen.tsx` 
- [ ] 3. Mettre à jour `MissionListScreenNew.tsx`
- [ ] 4. Mettre à jour `TeamMissionsScreen.tsx`
- [ ] 5. Tester création mission sur web
- [ ] 6. Tester assignation via code sur mobile
- [ ] 7. Vérifier que les missions apparaissent dans "Reçues"
- [ ] 8. Supprimer `mission_assignments` (optionnel, après validation)

---

## 🧪 Tests

### Test 1: Web → Mobile
1. Sur **web**: Créer mission REF-001
2. Noter le `share_code` (ex: XZ-ABC-DEF)
3. Sur **mobile**: Entrer code XZ-ABC-DEF
4. **Vérifier**: Mission apparaît dans "Missions Reçues"

### Test 2: Mobile → Web
1. Sur **mobile**: Créer mission REF-002
2. Noter le `share_code`
3. Sur **web**: Entrer le code
4. **Vérifier**: Mission apparaît dans "Missions Reçues"

---

## 📍 Fichiers à Modifier

### Mobile
1. `mobile/src/screens/missions/MissionListScreenNew.tsx` (ligne 156-165)
2. `mobile/src/screens/missions/ShareMissionScreen.tsx` (CRÉER)
3. `mobile/src/screens/TeamMissionsScreen.tsx` (ligne 185-210)
4. `mobile/src/types/navigation.ts` (ajouter ShareMission route)

### Web (Déjà OK ✅)
- `src/pages/TeamMissions.tsx` utilise déjà `assigned_to_user_id`

---

## 🚀 Prochaines Étapes

1. Créer `ShareMissionScreen.tsx`
2. Modifier `MissionListScreenNew.tsx`
3. Tester le flow complet
4. Valider sur les deux plateformes
