# 📘 Guide Test Mollie - Vérification Achats & Crédits

## ✅ Statut Admin
**Les crédits automatiques sont RÉACTIVÉS** - L'Admin ajoute les crédits correctement selon `shop_items`.

---

## 🎯 Objectif du Test SQL
Le fichier **TEST_MOLLIE_ABONNEMENTS.sql** permet de vérifier que les achats Mollie ajoutent les bons crédits aux utilisateurs.

---

## 📋 11 Sections de Test

### **1️⃣ Vérification Plans Boutique**
```sql
-- Vérifie que shop_items contient les bons montants de crédits
```
**Résultat attendu :**
- starter: 10 crédits (9.99€)
- basic: 25 crédits (19.99€)
- pro: 100 crédits (49.99€)
- business: 500 crédits (79.99€)
- enterprise: 1500 crédits (1119.99€)

### **2️⃣ Transactions Récentes**
```sql
-- Liste les 20 dernières transactions Mollie
```
**Vérifie :** status = 'completed', subscription_plan correspond au plan acheté

### **3️⃣ Transactions par Statut**
```sql
-- Compte combien de transactions par statut
```
**Vérifie :** Combien de 'completed', 'pending', 'failed'

### **4️⃣ Abonnements Actifs**
```sql
-- Liste les abonnements actifs avec end_date dans le futur
```
**Vérifie :** payment_method = 'mollie' ou 'manual'

### **5️⃣ Historique Crédits**
```sql
-- Historique des mouvements de crédits
```
**Vérifie :** 
- Les ajouts (+) avec description "Achat abonnement..."
- Les retraits (-) pour missions/covoiturage

### **6️⃣ Cohérence Achats vs Crédits**
```sql
-- CRITIQUE : Vérifie que chaque achat Mollie a bien ajouté les crédits
```
**Vérifie :**
- Chaque transaction 'completed' a une entrée dans credit_transactions
- Le montant de crédits correspond au plan acheté
- Les user_id correspondent

### **7️⃣ Simulation Achat PRO**
```sql
-- Simule ce qui se passerait avec un achat PRO
```
**Vérifie :** Quelle requête INSERT devrait être faite

### **8️⃣ Solde Utilisateur Spécifique**
```sql
-- Remplacez 'USER_ID_ICI' par votre ID utilisateur
```
**Pour tester avec votre compte :**
1. Copiez votre user_id depuis Supabase
2. Remplacez 'USER_ID_ICI' dans le SQL
3. Exécutez pour voir votre historique complet

### **9️⃣ Transactions Sans Crédits Ajoutés**
```sql
-- ALERTE : Trouve les achats qui n'ont pas ajouté de crédits
```
**Si résultat ≠ 0 :** Le webhook Mollie ne fonctionne pas correctement

### **🔟 Dernières Activités Webhook**
```sql
-- Vérifie que le webhook ajoute bien les crédits
```
**Vérifie :** Description contient "Achat abonnement" avec le bon plan

### **1️⃣1️⃣ Matrice Complète**
```sql
-- Vue d'ensemble : Plans boutique vs Achats réels vs Crédits reçus
```
**Résultat attendu :** Chaque plan doit avoir correspondance parfaite

---

## 🚀 Comment Utiliser

### **Étape 1 : Ouvrir Supabase Dashboard**
1. Aller sur [supabase.com](https://supabase.com)
2. Ouvrir votre projet
3. Cliquer sur **SQL Editor** (à gauche)

### **Étape 2 : Exécuter le Test**
1. Copier le contenu de **TEST_MOLLIE_ABONNEMENTS.sql**
2. Coller dans SQL Editor
3. Cliquer **Run** (ou Ctrl+Enter)
4. Scroller pour voir les résultats de chaque section

### **Étape 3 : Analyser les Résultats**

#### ✅ **Résultat NORMAL :**
```
Section 6 (Cohérence) : 
- Toutes les transactions 'completed' ont une entrée credit_transactions
- Les montants correspondent (PRO = 100 crédits, etc.)

Section 9 (Transactions sans crédits) :
- 0 résultats (aucun achat sans crédits)

Section 11 (Matrice) :
- starter: 10 crédits (boutique) = 10 crédits (reçus)
- basic: 25 crédits (boutique) = 25 crédits (reçus)
- etc.
```

#### ❌ **Résultat PROBLÈME :**
```
Section 6 : 
- Transaction ID xxx n'a pas d'entrée credit_transactions
→ Le webhook n'a pas fonctionné

Section 9 :
- 3 transactions sans crédits ajoutés
→ Webhook Mollie a échoué

Section 11 :
- PRO: 100 crédits (boutique) mais 50 crédits (reçus)
→ Webhook ajoute le mauvais montant
```

---

## 🔧 Tester avec un Achat Réel

### **Option 1 : Test Sandbox Mollie**
1. Utilisez un compte Mollie en mode test
2. Faites un achat avec une carte de test
3. Vérifiez que le webhook est appelé
4. Exécutez le SQL pour vérifier les crédits

### **Option 2 : Test Production (Attention)**
1. Achetez le plan STARTER (9.99€ - le moins cher)
2. Attendez 2-3 minutes (traitement Mollie)
3. Exécutez **Section 8** avec votre user_id
4. Vérifiez que 10 crédits ont été ajoutés

---

## 🐛 Dépannage

### **Problème 1 : Aucune transaction dans la table**
**Cause :** Aucun achat n'a encore été fait via Mollie  
**Solution :** Testez avec un achat sandbox ou réel

### **Problème 2 : Transactions 'completed' mais pas de crédits**
**Cause :** Webhook Mollie ne fonctionne pas  
**Solution :** 
1. Vérifiez que le webhook Mollie est déployé sur Supabase
2. Vérifiez l'URL du webhook dans Mollie Dashboard
3. Vérifiez les logs du webhook Edge Function

### **Problème 3 : Mauvais montant de crédits**
**Cause :** Webhook utilise des valeurs hard-codées  
**Solution :** 
1. Vérifiez que le webhook lit depuis `shop_items.credits_amount`
2. Vérifiez que la table `shop_items` est à jour

### **Problème 4 : Erreur SQL "column does not exist"**
**Cause :** La base de données n'a pas les bonnes colonnes  
**Solution :** 
1. Vérifiez que `user_credits.balance` existe (pas `credits_balance`)
2. Exécutez les migrations SQL si nécessaire

---

## 📊 Interprétation des Résultats

### **Section 6 (CRITIQUE)**
C'est la section la plus importante. Elle doit montrer :
```
transaction_id | user_id | plan | credits_purchased | credits_added | match
-----------------------------------------------------------------------------
xxx-yyy-zzz    | aaa-bbb | pro  | 100              | 100          | TRUE
```

Si `match = FALSE` → Problème grave avec le webhook

### **Section 9 (ALERTE)**
Si cette section retourne des résultats :
```
transaction_id | subscription_plan | amount | user_id | created_at
-----------------------------------------------------------------
xxx-yyy-zzz    | enterprise       | 119.99 | aaa-bbb | 2024-...
```

→ Cet achat n'a PAS ajouté de crédits. Le webhook a échoué.

### **Section 11 (VUE D'ENSEMBLE)**
Résultat attendu :
```
plan       | shop_credits | total_purchased | match
------------------------------------------------------
starter    | 10           | 10             | TRUE
basic      | 25           | 25             | TRUE
pro        | 100          | 100            | TRUE
business   | 500          | 500            | TRUE
enterprise | 1500         | 1500           | TRUE
```

Si `match = FALSE` pour un plan → Le webhook ajoute le mauvais montant

---

## ✅ Checklist de Validation

Avant de considérer que tout fonctionne :

- [ ] **Section 1** : 5 plans avec les bons montants (10, 25, 100, 500, 1500)
- [ ] **Section 2** : Au moins 1 transaction 'completed'
- [ ] **Section 6** : Toutes les lignes ont `match = TRUE`
- [ ] **Section 9** : 0 résultats (aucune transaction sans crédits)
- [ ] **Section 11** : Tous les plans ont `match = TRUE`

Si tous ces points sont validés → **Système Mollie 100% fonctionnel** ✅

---

## 📝 Notes Importantes

### **Admin vs Mollie**
- **Admin** : Ajoute crédits manuellement depuis `shop_items.credits_amount` ✅ ACTIF
- **Mollie** : Ajoute crédits automatiquement via webhook après paiement

Les deux systèmes doivent utiliser les MÊMES valeurs de `shop_items`.

### **Source de Vérité**
```
shop_items.credits_amount → UNIQUE SOURCE DE VÉRITÉ
↓
Admin.tsx : Lit shop_items et appelle add_credits RPC
Mollie webhook : Lit shop_items et appelle add_credits RPC
↓
user_credits.balance → MISE À JOUR
credit_transactions → AUDIT TRAIL
```

### **Prochaines Étapes**
1. ✅ Admin réactivé (fait)
2. ⏳ Tester Mollie sandbox/production
3. ⏳ Vérifier webhook Mollie déployé
4. ⏳ Valider avec TEST_MOLLIE_ABONNEMENTS.sql

---

## 🎯 Résumé Rapide

**Fichier :** `TEST_MOLLIE_ABONNEMENTS.sql`  
**Objectif :** Vérifier que achats Mollie = bons crédits  
**Sections critiques :** 6 (Cohérence), 9 (Transactions sans crédits), 11 (Matrice)  
**Action :** Exécuter dans Supabase SQL Editor  
**Résultat attendu :** Toutes les sections montrent correspondance parfaite  

**Si problème trouvé :** Vérifier webhook Mollie Edge Function

---

*Dernière mise à jour : Système Admin réactivé avec auto-crédits depuis shop_items*
