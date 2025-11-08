# 🚨 PROBLÈMES CRITIQUES À CORRIGER

**Date**: 8 novembre 2025  
**Priorité**: URGENTE

---

## ❌ Problèmes Identifiés

### 1. ✅ Photos Inspection Départ - 0 uploadées [CRITIQUE]

**Symptôme**: 8 photos prises, 0 uploadée  
**Cause probable**: Erreur upload Supabase Storage ou table inspection_photos_v2  
**Action**: 
1. Vérifier que la table `inspection_photos_v2` existe dans Supabase
2. Vérifier les permissions RLS sur cette table
3. Vérifier le bucket `inspection-photos` existe et est accessible

**SQL à exécuter**:
```sql
-- Vérifier la table
SELECT * FROM information_schema.tables 
WHERE table_name = 'inspection_photos_v2';

-- Vérifier les politiques RLS
SELECT * FROM pg_policies 
WHERE tablename = 'inspection_photos_v2';
```

---

### 2. ✅ Générer Lien Ne Fonctionne Pas [CRITIQUE]

**Symptôme**: Modal s'ouvre mais lien non généré  
**Cause probable**: RPC `create_or_get_inspection_share` erreur  
**Fichier**: `mobile/src/components/ShareInspectionModal.tsx`

**À vérifier**:
- RPC existe et fonctionne
- Token généré correctement
- Permissions authenticated

---

### 3. ✅ Partage Mission - erreur assigner_user_id [FIXÉ]

**Symptôme**: `record "new" has no field "assigner_user_id"`  
**Cause**: Fonction RPC utilise mauvais nom de colonne  
**Solution**: ✅ SQL créé dans `FIX_TOUS_PROBLEMES_URGENTS.sql`

**À faire**: Exécuter ce SQL dans Supabase

---

### 4. ❌ Pas de Realtime dans Détails Mission

**Symptôme**: Page détails mission ne se met pas à jour automatiquement  
**Fichier**: `mobile/src/screens/missions/MissionViewScreen.tsx`  
**Solution**: Ajouter hook `useMissionsSync` dans MissionViewScreen

---

### 5. ❌ Pas de Tri par Date - Rapports Inspection Mobile

**Symptôme**: Rapports pas triés du plus récent au plus ancien  
**Fichier**: `mobile/src/screens/inspections/InspectionReportScreen.tsx`  
**Solution**: Ajouter `.order('created_at', { ascending: false })`

---

### 6. ❌ Action Supprimer Rapports Anciens

**Demande**: Bouton pour supprimer les rapports passés  
**Fichier**: `mobile/src/screens/inspections/InspectionReportScreen.tsx`  
**Solution**: Ajouter action "Supprimer" avec confirmation

---

### 7. ✅ Impossible de Signer Inspection Arrivée [CRITIQUE]

**Symptôme**: Page bouge quand on essaie de signer  
**Cause**: ScrollView non figé pendant signature  
**Fichier**: `mobile/src/screens/inspections/InspectionArrivalNew.tsx` (n'existe pas ?)  
**Solution**: Utiliser même système que InspectionDepartureNew avec `isSigningActive`

**État**: À vérifier si le fichier InspectionArrivalNew existe ou si c'est le même que InspectionDepartureNew

---

## 📋 Plan d'Action

### Étape 1: SQL Urgent (5 min)
1. Exécuter `FIX_TOUS_PROBLEMES_URGENTS.sql` dans Supabase
2. Vérifier table `inspection_photos_v2`
3. Tester partage mission avec code

### Étape 2: Fix Inspection Photos (15 min)
1. Vérifier permissions RLS
2. Vérifier bucket Storage
3. Ajouter logs détaillés upload

### Étape 3: Fix Génération Lien (10 min)
1. Tester RPC `create_or_get_inspection_share`
2. Ajouter gestion erreur dans ShareInspectionModal
3. Logs console pour debug

### Étape 4: Realtime Détails Mission (10 min)
1. Ajouter `useMissionsSync` dans MissionViewScreen
2. Recharger mission quand changement détecté

### Étape 5: Tri Rapports + Action Supprimer (15 min)
1. Ajouter tri par date dans InspectionReportScreen
2. Ajouter bouton/swipe supprimer
3. Confirmation avant suppression

### Étape 6: Fix Signature Arrivée (20 min)
1. Identifier le fichier correct
2. Copier le système `isSigningActive` de InspectionDepartureNew
3. Figer le ScrollView pendant signature

---

## 🎯 Priorités

**P0 - BLOQUANT** (à faire IMMÉDIATEMENT):
1. Photos inspection 0 uploadées
2. Signature arrivée impossible
3. Partage mission erreur

**P1 - IMPORTANT** (à faire aujourd'hui):
4. Générer lien ne fonctionne pas
5. Tri rapports par date
6. Realtime détails mission

**P2 - AMÉLIORATION** (peut attendre):
7. Action supprimer rapports anciens

---

## ✅ Checklist

- [ ] Exécuter FIX_TOUS_PROBLEMES_URGENTS.sql
- [ ] Vérifier table inspection_photos_v2
- [ ] Tester upload photos inspection
- [ ] Tester génération lien partage
- [ ] Tester partage mission via code
- [ ] Ajouter realtime détails mission
- [ ] Ajouter tri rapports
- [ ] Fix signature inspection arrivée
- [ ] Ajouter action supprimer rapports
- [ ] Tester tout le flow complet
- [ ] Build nouvel APK
- [ ] Déployer web sur Vercel
