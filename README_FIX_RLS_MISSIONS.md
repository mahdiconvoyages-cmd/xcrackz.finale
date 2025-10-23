# 🚨 FIX URGENT : RLS Non Activé sur Table Missions

**Date:** 22 octobre 2025  
**Problème Critique:** La table `missions` n'a **PAS** Row Level Security activé  
**Impact:** Problème de sécurité + erreurs 406 dans la console web  

---

## 📊 DIAGNOSTIC

### État Actuel

| Table | RLS Activé | Problème |
|-------|------------|----------|
| `missions` | ❌ **false** | **CRITIQUE** - Pas de sécurité |
| `mission_assignments` | ✅ true | OK |

### Conséquences

1. **Sécurité :** Sans RLS, les users pourraient théoriquement voir toutes les missions (ou aucune)
2. **Erreurs 406 :** Les requêtes échouent car les policies n'existent pas ou sont mal configurées
3. **Incohérence :** Le mobile et le web ont des comportements différents

---

## 🔧 SOLUTION

### 1️⃣ **Appliquer le Script SQL**

Connectez-vous à **Supabase SQL Editor** :
1. Aller sur [Supabase Dashboard](https://supabase.com/dashboard)
2. Sélectionner votre projet
3. Menu **SQL Editor**
4. Copier-coller le script `FIX_URGENT_ENABLE_RLS_MISSIONS.sql`
5. **Exécuter** (bouton RUN)

### 2️⃣ **Vérification Immédiate**

Après exécution, vérifier :

```sql
-- RLS doit être activé
SELECT tablename, rowsecurity FROM pg_tables 
WHERE tablename = 'missions' AND schemaname = 'public';
-- Résultat attendu : rowsecurity = true

-- 4 policies doivent exister
SELECT policyname, cmd FROM pg_policies 
WHERE tablename = 'missions';
-- Résultat attendu :
-- missions_select_policy   | SELECT
-- missions_insert_policy   | INSERT
-- missions_update_policy   | UPDATE
-- missions_delete_policy   | DELETE
```

### 3️⃣ **Tester la Console Web**

1. Ouvrir la console web
2. Aller dans **Missions d'Équipe** > **Missions Reçues**
3. ✅ Les missions assignées doivent s'afficher
4. ✅ Plus d'erreur 406

---

## 🎯 CE QUI A ÉTÉ FAIT

### Code Modifié

1. **`src/pages/TeamMissions.tsx`**
   - Fonction `loadReceivedAssignments()` simplifiée
   - Utilise maintenant `missions.assigned_to_user_id` (comme le mobile)
   - Plus de JOIN complexe sur `mission_assignments`

### SQL Ajouté

2. **`FIX_URGENT_ENABLE_RLS_MISSIONS.sql`**
   - Active RLS sur la table `missions`
   - Crée 4 policies (SELECT, INSERT, UPDATE, DELETE)
   - Ajoute colonne `assigned_to_user_id` si manquante

---

## 📋 CHECKLIST

- [ ] Exécuter `FIX_URGENT_ENABLE_RLS_MISSIONS.sql` dans Supabase
- [ ] Vérifier RLS activé (`SELECT tablename, rowsecurity FROM pg_tables...`)
- [ ] Vérifier 4 policies créées (`SELECT policyname FROM pg_policies...`)
- [ ] Tester console web : Missions d'Équipe > Missions Reçues
- [ ] Vérifier logs console : `✅ Nombre missions assignées: X`
- [ ] Tester mobile : Écran Missions > Onglet "Missions Reçues"

---

## 🔍 POURQUOI CE BUG ?

Le RLS n'a probablement jamais été activé sur `missions`, ou a été désactivé par erreur lors d'une migration. Sans RLS :

- **Aucune policy ne s'applique** → Les requêtes échouent
- **Pas de filtrage** → Risque de sécurité
- **Erreur 406** → Le client ne reçoit pas de données

---

## ✅ RÉSULTAT ATTENDU

Après application du fix :

1. ✅ **RLS activé** sur `missions`
2. ✅ **4 policies** créées et fonctionnelles
3. ✅ **Console web** affiche les missions assignées
4. ✅ **Mobile** continue de fonctionner normalement
5. ✅ **Sécurité** : Chaque user voit uniquement :
   - Ses missions créées (`user_id = auth.uid()`)
   - Ses missions assignées (`assigned_to_user_id = auth.uid()`)

---

## 📞 SI LE PROBLÈME PERSISTE

Si après avoir activé RLS et les policies, l'erreur 406 persiste :

1. **Vérifier la colonne `assigned_to_user_id`** existe dans la table `missions`
2. **Vérifier les données** : Y a-t-il des missions avec `assigned_to_user_id` rempli ?
3. **Tester avec un compte** qui a effectivement des missions assignées
4. **Consulter les logs Supabase** : Dashboard > Logs > API

---

**Priorité :** 🔥 **CRITIQUE** - À appliquer immédiatement pour sécurité et fonctionnalité
