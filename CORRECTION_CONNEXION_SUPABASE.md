# 🔧 CORRECTIONS CONNEXION SUPABASE - MOBILE

## ✅ CE QUI A ÉTÉ CORRIGÉ

### 1. Configuration Supabase Mobile
**Problème** : L'app mobile utilisait de **vieilles URL Supabase hardcodées** au lieu des variables d'environnement.

**Fichier** : `mobile/src/lib/supabase.ts`

**Avant** :
```typescript
const supabaseUrl = 'https://avacqhxkynpvupnfxktk.supabase.co'; // ❌ Ancien projet
const supabaseAnonKey = 'eyJ...'; // ❌ Ancienne clé
```

**Après** :
```typescript
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
```

✅ Maintenant l'app utilise les **bonnes URL** depuis `.env` et `app.json`

---

### 2. Variables d'environnement dans app.json
**Fichier** : `mobile/app.json`

**Ajouté** :
```json
"extra": {
  "supabaseUrl": "https://bfrkthzovwpjrvqktdjn.supabase.co",
  "supabaseAnonKey": "eyJ...",
  "EXPO_PUBLIC_SUPABASE_URL": "https://bfrkthzovwpjrvqktdjn.supabase.co",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY": "eyJ..."
}
```

✅ Les deux formats sont disponibles pour compatibilité

---

### 3. Page de connexion modernisée
**Fichier** : `mobile/src/screens/auth/LoginScreen.tsx`

**Changements** :
- ✅ Design moderne identique au web
- ✅ Logo XCrackz en haut
- ✅ Fond dégradé bleu moderne
- ✅ Boutons avec effets hover
- ✅ Validation des champs
- ✅ Messages d'erreur clairs
- ✅ "Mot de passe oublié" (à implémenter)

---

### 4. Suppression de l'inscription
**Fichiers modifiés** :
- `mobile/App.tsx` - Retiré RegisterScreen
- Navigation simplifiée : Login uniquement

**Raison** : Les utilisateurs sont créés par l'admin uniquement (comme sur le web)

---

## 🎯 COMMENT TESTER LA CONNEXION

### 1. Vérifier les utilisateurs existants

Dans Supabase SQL Editor, exécute :
```sql
-- Voir tous les utilisateurs
SELECT id, email, email_confirmed_at 
FROM auth.users 
ORDER BY created_at DESC;

-- Voir les profils
SELECT id, full_name, email, role 
FROM profiles 
ORDER BY created_at DESC;
```

### 2. Créer un utilisateur de test (si besoin)

**Option A - Via Supabase Dashboard :**
1. Va dans Authentication → Users
2. Clique "Add user"
3. Email : `test@xcrackz.com`
4. Password : `Test123!`
5. Auto-confirm : ✅
6. Créé !

**Option B - Via SQL :**
Utilise le fichier `VERIFIER_UTILISATEURS.sql` pour créer un utilisateur

### 3. Tester la connexion dans l'app

1. Lance l'app mobile : `cd mobile && npx expo start --clear`
2. Scan le QR code
3. Tu verras le **nouveau design de connexion**
4. Entre les identifiants d'un utilisateur existant
5. Clique "Se connecter"

**Logs à vérifier** :
```
✅ [Supabase Mobile] Client initialized
📍 URL: https://bfrkthzovwpjrvqktdjn.supabase.co
🔑 Key: ✓ Present
📡 Statut réseau: En ligne
🔐 AuthProvider: Session retrieved
```

---

## 🔍 VÉRIFICATION DES TABLES

### Tables communes Web + Mobile

Exécute ce SQL pour vérifier que toutes les tables existent :

```sql
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN (
  'profiles',
  'missions',
  'mission_assignments',
  'vehicle_inspections',
  'inspection_photos',
  'clients',
  'invoices',
  'quotes',
  'carpooling_trips',
  'carpooling_bookings',
  'carpooling_messages',
  'carpooling_ratings',
  'user_push_tokens'
)
ORDER BY tablename;
```

**Résultat attendu** : 13 tables

### Vérifier les RLS policies

```sql
-- Voir toutes les policies actives
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename;
```

---

## 🚨 DÉPANNAGE

### Erreur "Network request failed"

**Cause** : Mauvaise URL Supabase ou clé invalide

**Solution** :
1. Vérifie que tu as relancé l'app avec `--clear`
2. Vérifie les logs pour voir l'URL utilisée
3. Compare avec l'URL dans Supabase Dashboard

### Erreur "Invalid login credentials"

**Cause** : Email/mot de passe incorrect OU utilisateur inexistant

**Solution** :
```sql
-- Vérifier que l'utilisateur existe
SELECT email, email_confirmed_at FROM auth.users WHERE email = 'ton@email.com';

-- Si email_confirmed_at est NULL, le confirmer :
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email = 'ton@email.com';
```

### L'app crash au démarrage

**Cause** : Variables d'environnement manquantes

**Solution** :
1. Vérifie que `mobile/.env` existe et contient :
```
EXPO_PUBLIC_SUPABASE_URL=https://bfrkthzovwpjrvqktdjn.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

2. Vérifie que `mobile/app.json` contient les mêmes valeurs dans `extra`

3. Relance avec cache nettoyé :
```bash
cd mobile
npx expo start --clear
```

---

## ✅ CHECKLIST FINALE

- [x] Supabase URL corrigée dans `supabase.ts`
- [x] Variables d'environnement dans `app.json`
- [x] Page de connexion modernisée
- [x] Page d'inscription supprimée
- [x] App relancée avec `--clear`
- [ ] Utilisateur de test créé dans Supabase
- [ ] Connexion testée et fonctionnelle
- [ ] Toutes les tables vérifiées
- [ ] RLS policies actives

---

## 📊 COMPARAISON WEB vs MOBILE

### Base de données : ✅ IDENTIQUE
Les deux utilisent **exactement les mêmes tables** :
- profiles
- missions
- mission_assignments
- vehicle_inspections
- inspection_photos
- clients
- invoices
- quotes
- carpooling_trips
- carpooling_bookings
- carpooling_messages
- carpooling_ratings
- user_push_tokens (nouvelle)

### Authentification : ✅ IDENTIQUE
- Les deux utilisent Supabase Auth
- Les mêmes utilisateurs peuvent se connecter sur web ET mobile
- Les mêmes rôles (admin, agent, driver)

### Fonctionnalités : ✅ SYNCHRONISÉES
| Fonctionnalité | Web | Mobile |
|---|---|---|
| Missions | ✅ | ✅ |
| Inspections | ✅ | ✅ |
| Facturation | ✅ | ✅ |
| Devis | ✅ | ✅ |
| Clients | ✅ | ✅ |
| Covoiturage | ✅ | ✅ |
| Notifications | ❌ | ✅ |
| Offline sync | ❌ | ✅ |

---

## 🎉 PRÊT À UTILISER !

Une fois qu'un utilisateur est créé dans Supabase, tu peux te connecter avec :
- **Email** : L'email de l'utilisateur
- **Mot de passe** : Le mot de passe défini

Les deux apps (web + mobile) partagent maintenant la **même base de données** et les **mêmes utilisateurs** ! 🚀
