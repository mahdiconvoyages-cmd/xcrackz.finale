# 🔧 CORRECTIONS CODE WEB ET MOBILE

## ✅ Corrections déjà appliquées

### 1. Web - JoinMissionModal.tsx
**Fichier**: `src/components/JoinMissionModal.tsx`
**Ligne 59**: Changé `join_mission_v2` → `join_mission_with_code`
```typescript
// AVANT (INCORRECT)
await supabase.rpc('join_mission_v2', {

// APRÈS (CORRECT)
await supabase.rpc('join_mission_with_code', {
```

### 2. Web - TeamMissions.tsx  
**Fichier**: `src/pages/TeamMissions.tsx`
**Ligne 177**: Changé `assigned_user_id` → `assigned_to_user_id`
```typescript
// AVANT (INCORRECT)
.eq('assigned_user_id' as any, user.id);

// APRÈS (CORRECT)
.eq('assigned_to_user_id' as any, user.id);
```

## ⚠️ Corrections à faire MANUELLEMENT

### 3. Mobile - NewMissionsScreen.tsx
**Fichier**: `mobile/src/screens/NewMissionsScreen.tsx`

**Ligne 448** - Realtime subscription:
```typescript
// AVANT (INCORRECT)
{ event: '*', schema: 'public', table: 'missions', filter: `assigned_user_id=eq.${user.id}` },

// APRÈS (CORRECT)
{ event: '*', schema: 'public', table: 'missions', filter: `assigned_to_user_id=eq.${user.id}` },
```

**Ligne 473** - Query:
```typescript
// AVANT (INCORRECT)
.eq('assigned_user_id', user!.id)

// APRÈS (CORRECT)
.eq('assigned_to_user_id', user!.id)
```

### 4. Mobile - TrackingListScreen.tsx
**Fichier**: `mobile/src/screens/tracking/TrackingListScreen.tsx`
**Ligne 59**:
```typescript
// AVANT (INCORRECT)
.or(`user_id.eq.${user?.id},assigned_user_id.eq.${user?.id}`)

// APRÈS (CORRECT)
.or(`user_id.eq.${user?.id},assigned_to_user_id=eq.${user?.id}`)
```

### 5. Mobile - MissionListScreen.tsx
**Fichier**: `mobile/src/screens/missions/MissionListScreen.tsx`
**Ligne 108**:
```typescript
// AVANT (INCORRECT)
.eq('assigned_user_id', user!.id);

// APRÈS (CORRECT)
.eq('assigned_to_user_id', user!.id);
```

### 6. Web - MissionsScreen.tsx (ancien)
**Fichier**: `src/screens/MissionsScreen.tsx`
**Ligne 84**:
```typescript
// AVANT (INCORRECT)
.eq('assigned_user_id', userId)

// APRÈS (CORRECT)
.eq('assigned_to_user_id', userId)
```

### 7. Web - TeamMissions.tsx
**Fichier**: `src/pages/TeamMissions.tsx`

**Ligne 41** - Interface:
```typescript
// AVANT (INCORRECT)
assigned_user_id?: string;

// APRÈS (CORRECT)
assigned_to_user_id?: string;
```

**Ligne 190** - Error handling:
```typescript
// AVANT (INCORRECT)
if (!receivedError.message?.includes('assigned_user_id')) {

// APRÈS (CORRECT)
if (!receivedError.message?.includes('assigned_to_user_id')) {
```

## 📝 Actions SQL requises

1. **Exécuter**: `FIX_ASSIGNATION_COLONNE_COMPLETE.sql`
   - Migre les données si `assigned_user_id` existe
   - Supprime l'ancienne colonne
   - Supprime la fonction `join_mission_v2`
   - Recrée `join_mission_with_code` correctement

## 🧪 Tests après corrections

### Test 1: Assignation par code
1. Web: Créer une mission → Obtenir le code
2. Mobile: Entrer le code dans JoinMissionModal
3. Vérifier SQL:
   ```sql
   SELECT reference, user_id, assigned_to_user_id, share_code 
   FROM missions 
   WHERE share_code = 'LE_CODE';
   ```
4. Résultat attendu: `assigned_to_user_id` doit être rempli

### Test 2: Affichage missions assignées
1. Mobile: Ouvrir "Missions reçues"
2. Web: Ouvrir "Missions d'équipe" → Onglet "Reçues"
3. Les missions assignées doivent s'afficher

### Test 3: Rapports d'inspection
1. Utilisateur A crée mission + inspection
2. Utilisateur B accepte via code
3. Les deux doivent voir le rapport d'inspection

## 🎯 Priorité

1. **URGENT**: Exécuter le SQL (base de données cohérente)
2. **CRITIQUE**: Corriger les fichiers mobile (3, 4, 5)
3. **IMPORTANT**: Corriger les fichiers web (6, 7)
4. **TESTER**: Vérifier le bon fonctionnement

## 📊 Résultat attendu après corrections

```
✅ Colonne correcte: assigned_to_user_id (1)
❌ Colonne incorrecte: assigned_user_id (0)
✅ Fonction correcte: join_mission_with_code (1)
❌ Fonction incorrecte: join_mission_v2 (0)
✅ Web et Mobile utilisent la même colonne
✅ Web et Mobile utilisent la même fonction
✅ RLS policies cohérentes
✅ Sécurité rapports inspection fonctionnelle
```
