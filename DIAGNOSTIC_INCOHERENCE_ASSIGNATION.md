# 🚨 INCOHÉRENCE CRITIQUE SYSTÈME D'ASSIGNATION

## Problème identifié le 2025-11-07

### ❌ INCOHÉRENCES TROUVÉES

#### 1. **Noms de fonctions différents**
- **MOBILE** utilise: `join_mission_with_code`
- **WEB** utilise: `join_mission_v2`
- ⚠️ Deux fonctions différentes = comportements potentiellement différents

#### 2. **Noms de colonnes différents**
- **Table missions** a la colonne: `assigned_to_user_id` ✅
- **Fonction join_mission_v2** (WEB) utilise: `assigned_user_id` ❌
- **Fonction join_mission_with_code** (MOBILE) utilise: `assigned_to_user_id` ✅

### 📊 Détails techniques

#### Mobile (CORRECT)
```typescript
// mobile/src/components/JoinMissionModal.tsx:62
await supabase.rpc('join_mission_with_code', {
  p_share_code: cleanedCode,
  p_user_id: userId,
});
```

Fonction SQL utilisée (FIX_SECURITE_RAPPORTS_INSPECTION.sql):
```sql
UPDATE missions 
SET assigned_to_user_id = p_user_id  -- ✅ CORRECT
```

#### Web (INCORRECT)
```typescript
// src/components/JoinMissionModal.tsx:59
await supabase.rpc('join_mission_v2', {
  p_share_code: cleanedCode,
  p_user_id: user.id
});
```

Fonction SQL utilisée (CREATE_NEW_FUNCTION.sql:24):
```sql
SELECT 
    assigned_user_id,  -- ❌ COLONNE N'EXISTE PAS !
INTO 
    v_current_assigned_id,

-- Plus tard:
UPDATE missions 
SET assigned_user_id = p_user_id,  -- ❌ COLONNE N'EXISTE PAS !
```

### 🔍 Vérification base de données

La table `missions` contient:
- ✅ `user_id` (créateur)
- ✅ `assigned_to_user_id` (assigné)
- ✅ `share_code`
- ❌ **PAS** `assigned_user_id`

### 💥 Conséquences

1. **WEB ne fonctionne PAS** - La fonction `join_mission_v2` cherche une colonne inexistante
2. **MOBILE fonctionne** - La fonction `join_mission_with_code` utilise la bonne colonne
3. **Filtres rapports inspection WEB** - Probablement cassés aussi
4. **Incohérence totale** entre web et mobile

### ✅ SOLUTION

#### Option 1: Supprimer join_mission_v2 et utiliser join_mission_with_code partout
```typescript
// Dans src/components/JoinMissionModal.tsx
await supabase.rpc('join_mission_with_code', {  // Changé !
  p_share_code: cleanedCode,
  p_user_id: user.id
});
```

#### Option 2: Corriger join_mission_v2
Remplacer `assigned_user_id` par `assigned_to_user_id` dans CREATE_NEW_FUNCTION.sql

### 🎯 RECOMMANDATION

**Option 1** - Unifier sur `join_mission_with_code` qui est:
- ✅ Testé et fonctionnel (mobile)
- ✅ Utilise les bonnes colonnes
- ✅ A des logs de debugging
- ✅ Crée des notifications
- ✅ Déjà dans FIX_SECURITE_RAPPORTS_INSPECTION.sql

### 📝 Fichiers à corriger

1. **src/components/JoinMissionModal.tsx** (ligne 59)
2. **CREATE_NEW_FUNCTION.sql** (supprimer ou corriger)
3. Vérifier si d'autres fichiers web utilisent `join_mission_v2`

### 🧪 Test après correction

1. Web: Créer mission → Obtenir code
2. Web: Utilisateur 2 entre le code
3. Vérifier que `assigned_to_user_id` est mis à jour
4. Vérifier que les rapports sont visibles pour les 2 utilisateurs
