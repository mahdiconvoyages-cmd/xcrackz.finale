# RÉSOLUTION DU PROBLÈME RLS

## Problème rencontré
Après réactivation de RLS, tout a disparu à nouveau + erreur de storage bucket.

## Solution immédiate

### 1. Exécuter DISABLE_RLS_NOW.sql
```sql
-- Désactive RLS sur toutes les tables
-- Rend les buckets publics
```

### 2. Vider le cache du navigateur
**Option A - DevTools (RECOMMANDÉ):**
1. F12 pour ouvrir DevTools
2. Application → Storage → Clear site data
3. Cocher: Local storage, Session storage, IndexedDB
4. Cliquer "Clear site data"
5. Fermer le navigateur complètement
6. Rouvrir

**Option B - Raccourci clavier:**
- Ctrl + Shift + Delete
- Sélectionner "Tout l'historique"
- Cocher: Cookies, Cache
- Effacer

### 3. Rafraîchir l'application
- Ctrl + Shift + R (rafraîchissement forcé)

## Pourquoi RLS cause des problèmes ?

### Problème 1: Multiples instances Supabase
- Le navigateur garde des sessions dans localStorage
- Différentes clés de stockage créent des conflits
- Solution: Vider le localStorage

### Problème 2: Storage buckets bloqués
- Les buckets `vehicle-images` et `inspection-photos` ont RLS
- Impossible d'uploader des photos
- Solution: Buckets en mode public

### Problème 3: Politiques RLS mal configurées
- Les politiques vérifient `user_id = auth.uid()`
- Si la session est corrompue, auth.uid() retourne NULL
- Solution: Nettoyer les sessions + recréer les politiques

## Prochaines étapes (APRÈS avoir tout retrouvé)

1. ✅ Confirmer que vous voyez vos données
2. ✅ Tester la création d'une mission
3. ✅ Tester l'upload d'une photo
4. ⏳ Réactiver RLS progressivement (une table à la fois)
5. ⏳ Configurer les buckets correctement

## Note importante
**Le push Git N'A PAS supprimé vos données !**
- Git ne touche jamais la base de données Supabase
- Vos données sont dans le cloud (Supabase)
- Le code est sur GitHub
- Ce sont 2 systèmes séparés

Le problème est uniquement lié aux politiques RLS qui bloquent l'accès.
