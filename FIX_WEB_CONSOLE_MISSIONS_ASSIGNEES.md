# 🔴 FIX : Missions Assignées Non Visibles (Console Web)

**Date:** Janvier 2025  
**Problème:** Les missions assignées ne s'affichent pas dans la console web  
**Erreur:** HTTP 406 lors du chargement des missions reçues  

---

## 📋 DIAGNOSTIC

### 1. **Symptômes**
- ✅ Mobile : Les missions assignées fonctionnent (via `assigned_to_user_id`)
- ❌ Web : Erreur 406 lors du chargement des missions dans l'onglet "Missions Reçues"
- ❌ Les logs montrent `data: null` et une erreur réseau

### 2. **Code Actuel (Web)**

**Fichier:** `src/pages/TeamMissions.tsx`

```typescript
const loadReceivedAssignments = async () => {
  console.log('🔍 DEBUG loadReceivedAssignments - Début');
  console.log('📋 User ID:', user!.id);
  
  // 🔥 SOLUTION RADICALE: Charger directement avec profiles, sans contacts
  const { data, error } = await supabase
    .from('mission_assignments')
    .select(`
      *,
      mission:missions(*),
      assignee:profiles!mission_assignments_user_id_fkey(email, id),
      assigner:profiles!mission_assignments_assigned_by_fkey(email, id)
    `)
    .eq('user_id', user!.id)  // ✅ Missions assignées À cet utilisateur
    .order('assigned_at', { ascending: false });

  console.log('📦 Missions reçues:', data);
  console.log('❌ Erreur missions:', error);
  // ...
}
```

### 3. **Problème Identifié**

**Erreur 406** = Les **RLS policies** bloquent l'accès aux données.

Deux possibilités :
1. **Policy sur `missions`** : Bloque l'accès aux missions créées par d'autres users
2. **Policy sur `mission_assignments`** : Bloque l'accès aux assignments

---

## 🔧 SOLUTION

### **Étape 1 : Vérifier les Policies RLS**

Connectez-vous à Supabase et exécutez le script SQL suivant :

```sql
-- Vérifier les policies sur missions
SELECT 
  policyname,
  cmd as operation,
  CASE 
    WHEN cmd = 'SELECT' THEN 'Qui peut VOIR'
    WHEN cmd = 'INSERT' THEN 'Qui peut CRÉER'
    WHEN cmd = 'UPDATE' THEN 'Qui peut MODIFIER'
    WHEN cmd = 'DELETE' THEN 'Qui peut SUPPRIMER'
  END as description
FROM pg_policies
WHERE tablename = 'missions'
ORDER BY cmd;

-- Vérifier les policies sur mission_assignments
SELECT 
  policyname,
  cmd as operation,
  qual as condition_using,
  with_check as condition_with_check
FROM pg_policies
WHERE tablename = 'mission_assignments'
ORDER BY cmd;
```

### **Étape 2 : Corriger les Policies (si nécessaire)**

Si les policies sont trop restrictives, appliquez cette migration :

**Fichier:** `FIX_WEB_MISSIONS_ASSIGNEES.sql` (déjà créé)

```sql
-- Appliquer depuis Supabase SQL Editor
```

### **Étape 3 : Alternative Simple**

Si le problème persiste, **simplifier** la requête web pour utiliser `assigned_to_user_id` comme le mobile :

**Modifier `src/pages/TeamMissions.tsx`** :

```typescript
const loadReceivedAssignments = async () => {
  console.log('🔍 Chargement missions assignées...');
  
  // ✅ SOLUTION SIMPLE : Charger directement depuis missions avec assigned_to_user_id
  const { data: assignedMissions, error: missionError } = await supabase
    .from('missions')
    .select('*')
    .eq('assigned_to_user_id', user!.id)
    .order('pickup_date', { ascending: false });

  if (missionError) {
    console.error('❌ Erreur chargement missions:', missionError);
    setReceivedAssignments([]);
    return;
  }

  // Transformer en format Assignment pour compatibilité
  const formattedAssignments = (assignedMissions || []).map(mission => ({
    id: mission.id + '_direct',
    mission_id: mission.id,
    contact_id: mission.user_id, // Le créateur de la mission
    payment_ht: 0,
    commission: 0,
    status: 'accepted',
    assigned_at: mission.created_at,
    mission: mission,
    contact: null, // Pas besoin pour l'affichage basique
  }));

  console.log('✅ Missions assignées:', formattedAssignments.length);
  setReceivedAssignments(formattedAssignments as any);
};
```

---

## ✅ VÉRIFICATION

### **Test 1 : Console Navigateur**

Après modification, vérifier les logs :
```
🔍 Chargement missions assignées...
✅ Missions assignées: 3
```

### **Test 2 : UI**

1. Se connecter avec un utilisateur qui a reçu des missions
2. Aller dans **Missions d'Équipe**
3. Cliquer sur l'onglet **"Missions Reçues"**
4. ✅ Les missions doivent s'afficher

---

## 📊 COMPARAISON MOBILE vs WEB

| Fonctionnalité | Mobile | Web (Avant) | Web (Après) |
|----------------|--------|-------------|-------------|
| **Source de données** | `missions.assigned_to_user_id` | `mission_assignments` | `missions.assigned_to_user_id` |
| **Complexité** | Simple | Complexe (JOIN profiles) | Simple |
| **Performance** | Rapide | Lent (JOIN multiple) | Rapide |
| **Fiabilité** | ✅ | ❌ (Erreur 406) | ✅ |

---

## 🎯 RECOMMANDATION

**Option A (Rapide)** : Utiliser `assigned_to_user_id` comme le mobile
- ✅ Plus simple
- ✅ Plus rapide
- ✅ Même logique que mobile
- ❌ Perd les infos de `mission_assignments` (paiement, commission)

**Option B (Complet)** : Corriger les policies RLS
- ✅ Garde toutes les fonctionnalités
- ✅ Architecture complète
- ❌ Plus complexe
- ❌ Nécessite fix SQL

**Choix suggéré : Option A** si les infos de paiement ne sont pas critiques pour l'affichage.

---

## 🚀 PROCHAINES ÉTAPES

1. ✅ **Appliquer Option A** : Modifier `loadReceivedAssignments()` dans TeamMissions.tsx
2. 🔍 **Tester** : Vérifier l'affichage des missions reçues
3. 📊 **Monitorer** : Observer les logs console
4. ⚠️ **Si besoin Option B** : Appliquer le script SQL `FIX_WEB_MISSIONS_ASSIGNEES.sql`

---

## 📝 FICHIERS MODIFIÉS

- `src/pages/TeamMissions.tsx` (fonction `loadReceivedAssignments`)
- (Optionnel) `FIX_WEB_MISSIONS_ASSIGNEES.sql` (policies RLS)

---

**Résultat attendu :** Les missions assignées s'affichent correctement dans la console web, sans erreur 406.
