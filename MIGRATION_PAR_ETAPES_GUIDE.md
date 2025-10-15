# 🎯 MIGRATION PAR ÉTAPES - Guide Complet

## 🚨 Pourquoi Par Étapes ?

L'erreur `column "conversation_id" does not exist` persiste car :
1. La table `support_messages` **n'existe pas** dans votre base Supabase
2. L'exécution d'un seul fichier SQL échoue à mi-parcours
3. Supabase essaie de créer les index **avant** que les tables soient confirmées

**Solution** : Créer les tables étape par étape en vérifiant chaque succès.

---

## ✅ ÉTAPES À SUIVRE (10 minutes)

### 📍 Préparation

**Ouvrir Supabase SQL Editor** :
```
👉 https://supabase.com/dashboard/project/bfrkthzovwpjrvqktdjn/sql
```

---

### 📝 ÉTAPE 1 : Créer les Tables (2 min)

**Fichier** : `ETAPE_1_TABLES.sql`

**Actions** :
1. Ouvrir `ETAPE_1_TABLES.sql`
2. `Ctrl + A` → `Ctrl + C` (copier tout)
3. Coller dans SQL Editor
4. Cliquer **RUN**

**Résultat attendu** :
```
Success
Showing results...

column_name       | data_type
------------------|------------------
id                | uuid
conversation_id   | uuid
sender_id         | uuid
sender_type       | text
message           | text
is_automated      | boolean
read_at           | timestamp with time zone
created_at        | timestamp with time zone
```

✅ Si vous voyez cette liste de colonnes → **ÉTAPE 1 RÉUSSIE**

❌ Si erreur → **Copier l'erreur et me la montrer**

---

### 📝 ÉTAPE 2 : Créer les Index (1 min)

**Fichier** : `ETAPE_2_INDEX.sql`

**Actions** :
1. Ouvrir `ETAPE_2_INDEX.sql`
2. `Ctrl + A` → `Ctrl + C`
3. Coller dans SQL Editor
4. Cliquer **RUN**

**Résultat attendu** :
```
Success

indexname                              | tablename
---------------------------------------|-------------------------
idx_support_conversations_user_id      | support_conversations
idx_support_conversations_status       | support_conversations
idx_support_messages_conversation_id   | support_messages
idx_support_messages_created_at        | support_messages
idx_support_auto_responses_category    | support_auto_responses
```

✅ Si vous voyez ces index → **ÉTAPE 2 RÉUSSIE**

---

### 📝 ÉTAPE 3 : Créer Triggers et RLS (1 min)

**Fichier** : `ETAPE_3_TRIGGERS_RLS.sql`

**Actions** :
1. Ouvrir `ETAPE_3_TRIGGERS_RLS.sql`
2. `Ctrl + A` → `Ctrl + C`
3. Coller dans SQL Editor
4. Cliquer **RUN**

**Résultat attendu** :
```
Success

tablename                  | rowsecurity
---------------------------|-------------
support_conversations      | true
support_messages           | true
support_auto_responses     | true
```

✅ Si `rowsecurity = true` → **ÉTAPE 3 RÉUSSIE**

---

### 📝 ÉTAPE 4 : Créer les Policies (2 min)

**Fichier** : `ETAPE_4_POLICIES.sql`

**Actions** :
1. Ouvrir `ETAPE_4_POLICIES.sql`
2. `Ctrl + A` → `Ctrl + C`
3. Coller dans SQL Editor
4. Cliquer **RUN**

**Résultat attendu** :
```
Success

tablename              | policyname
-----------------------|-------------------------------------
support_conversations  | Admins can update all conversations
support_conversations  | Admins can view all conversations
support_conversations  | Users can create own conversations
support_conversations  | Users can view own conversations
support_messages       | Admins can send messages in all conversations
support_messages       | Admins can view all messages
...
```

✅ Si vous voyez ~10 policies → **ÉTAPE 4 RÉUSSIE**

---

### 📝 ÉTAPE 5 : Insérer les Données (1 min)

**Fichier** : `ETAPE_5_DATA.sql`

**Actions** :
1. Ouvrir `ETAPE_5_DATA.sql`
2. `Ctrl + A` → `Ctrl + C`
3. Coller dans SQL Editor
4. Cliquer **RUN**

**Résultat attendu** :
```
Success

category     | count
-------------|-------
account      | 2
billing      | 2
general      | 4
greeting     | 1
technical    | 1
```

✅ Si vous voyez ces catégories → **ÉTAPE 5 RÉUSSIE**

---

## 🧪 VÉRIFICATION FINALE

### Tester dans SQL Editor

```sql
-- Vérifier que tout existe
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'support%'
ORDER BY table_name;
```

**Résultat attendu** :
```
support_auto_responses
support_conversations
support_messages
```

---

## 🚀 APRÈS MIGRATION RÉUSSIE

### 1. Redémarrer l'application

```powershell
# Dans le terminal
npm run dev
```

### 2. Vider le cache navigateur

```
Ctrl + F5
```

### 3. Tester la page Support

```
1. Ouvrir : http://localhost:5173/support
2. Créer une conversation (sujet + catégorie)
3. Envoyer un message : "Test"
4. Vérifier affichage instantané ✅
5. Vérifier réponse automatique du bot ✅
```

### 4. Vérifier la console

```
F12 → Console

✅ Aucune erreur "conversation_id does not exist"
✅ Aucune erreur 400 sur support_messages
✅ Messages chargent correctement
```

---

## 📋 Checklist Complète

**Exécution** :
- [ ] ÉTAPE 1 : Tables créées (`ETAPE_1_TABLES.sql`)
- [ ] ÉTAPE 2 : Index créés (`ETAPE_2_INDEX.sql`)
- [ ] ÉTAPE 3 : Triggers + RLS (`ETAPE_3_TRIGGERS_RLS.sql`)
- [ ] ÉTAPE 4 : Policies (`ETAPE_4_POLICIES.sql`)
- [ ] ÉTAPE 5 : Données (`ETAPE_5_DATA.sql`)

**Vérification** :
- [ ] Tables existent (requête SQL vérification)
- [ ] Application redémarrée (`npm run dev`)
- [ ] Cache vidé (`Ctrl + F5`)
- [ ] Page /support fonctionne
- [ ] Messages s'affichent
- [ ] Bot répond automatiquement

---

## 🚨 Si Problème sur une Étape

### Erreur "table already exists"

✅ **C'est bon signe !** Passez à l'étape suivante.

### Erreur "relation does not exist"

❌ **Problème** : L'étape précédente a échoué.

**Solution** :
1. Revenir à l'étape précédente
2. Vérifier qu'elle s'est bien exécutée
3. Copier l'erreur exacte et me la montrer

### Erreur "permission denied"

❌ **Problème** : Vous n'êtes pas sur le bon projet Supabase.

**Solution** :
1. Vérifier l'URL : doit contenir `bfrkthzovwpjrvqktdjn`
2. Vérifier que vous êtes connecté avec le bon compte

---

## 💡 Pourquoi Cette Méthode Fonctionne

1. **Ordre garanti** : Les tables sont créées AVANT tout le reste
2. **Vérification à chaque étape** : On peut voir exactement où ça bloque
3. **Idempotence** : `DROP TABLE IF EXISTS` permet de recommencer
4. **Atomicité** : Chaque étape est indépendante

---

## 📞 Besoin d'Aide ?

**À chaque étape, vous verrez le résultat dans Supabase.**

Si une étape échoue :
1. **Ne pas paniquer** ✅
2. **Copier l'erreur exacte**
3. **M'indiquer le numéro d'étape (1-5)**
4. **Je vous aiderai à corriger**

---

**🎯 Commencez par ÉTAPE 1 et progressez une par une !**

Temps total : **~10 minutes** avec vérifications
