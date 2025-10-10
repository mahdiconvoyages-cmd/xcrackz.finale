# 👤 Créer un Compte Admin sur xCrackz

## 🚀 **Option 1 : Via l'Interface (Recommandé)**

1. Allez sur http://localhost:5173/register (en local)
2. Remplissez le formulaire :
   ```
   Nom complet: Admin xCrackz
   Email: admin@xcrackz.com
   Mot de passe: [votre mot de passe sécurisé]
   ```
3. Cliquez sur "Créer un compte"
4. ✅ Vous êtes maintenant inscrit !

---

## 🔧 **Option 2 : Via Supabase Dashboard**

### **Créer un Utilisateur**

1. Allez sur https://supabase.com/dashboard/project/bfrkthzovwpjrvqktdjn
2. **Authentication** → **Users**
3. Cliquez sur **"Add user"** → **"Create new user"**
4. Remplissez :
   ```
   Email: admin@xcrackz.com
   Password: [votre mot de passe]
   Auto Confirm User: ✅ (cochez cette case)
   ```
5. Cliquez sur **"Create user"**
6. Copiez l'**UUID** de l'utilisateur créé (ex: `abc123-def456-...`)

### **Créer le Profil**

7. Allez dans **SQL Editor**
8. Collez ce SQL (remplacez les valeurs) :

```sql
-- Créer le profil
INSERT INTO profiles (id, email, full_name, user_type, created_at)
VALUES (
  'UUID-COPIÉ-DEPUIS-AUTH-USERS',  -- Remplacez par l'UUID
  'admin@xcrackz.com',              -- Votre email
  'Admin xCrackz',                  -- Votre nom
  'company',                         -- Type d'utilisateur
  NOW()
);

-- Donner les droits admin
UPDATE profiles 
SET is_admin = true 
WHERE email = 'admin@xcrackz.com';

-- Donner des crédits initiaux
INSERT INTO user_credits (user_id, balance, created_at)
VALUES (
  'UUID-COPIÉ-DEPUIS-AUTH-USERS',  -- Remplacez par l'UUID
  1000,                              -- 1000 crédits initiaux
  NOW()
);
```

9. Cliquez sur **"Run"**
10. ✅ Compte admin créé !

---

## 👨‍💼 **Option 3 : Via SQL Direct (Expert)**

Si vous avez accès à la base de données directement :

```sql
-- 1. Créer l'utilisateur dans auth.users (Supabase le fait automatiquement via l'interface)
-- Vous devez passer par Dashboard → Authentication → Add user

-- 2. Une fois l'UUID créé, créer le profil complet
INSERT INTO profiles (id, email, full_name, user_type, is_admin, created_at)
VALUES (
  'VOTRE-UUID',
  'admin@xcrackz.com',
  'Admin xCrackz',
  'company',
  true,
  NOW()
);

-- 3. Créer les crédits
INSERT INTO user_credits (user_id, balance)
VALUES ('VOTRE-UUID', 1000);

-- 4. (Optionnel) Créer un abonnement
INSERT INTO subscriptions (user_id, plan, status, current_period_end)
VALUES (
  'VOTRE-UUID',
  'premium',
  'active',
  NOW() + INTERVAL '1 year'
);
```

---

## 🔐 **Se Connecter Ensuite**

Une fois le compte créé, connectez-vous sur :

**En local :**
```
http://localhost:5173/login
```

**En production (après déploiement) :**
```
https://www.xcrackz.com/login
```

Avec :
```
Email: admin@xcrackz.com
Mot de passe: [celui que vous avez défini]
```

---

## 🛡️ **Vérifier les Droits Admin**

Une fois connecté, vérifiez que vous êtes admin :

1. Allez sur `/admin`
2. Si vous voyez le panneau admin → ✅ Vous êtes admin
3. Si "Accès refusé" → Exécutez :

```sql
UPDATE profiles 
SET is_admin = true 
WHERE email = 'admin@xcrackz.com';
```

---

## 📊 **Crédits de Test**

Pour tester le système de crédits, ajoutez des crédits :

```sql
-- Vérifier le solde actuel
SELECT * FROM user_credits 
WHERE user_id = (
  SELECT id FROM profiles WHERE email = 'admin@xcrackz.com'
);

-- Ajouter des crédits
UPDATE user_credits 
SET balance = balance + 1000 
WHERE user_id = (
  SELECT id FROM profiles WHERE email = 'admin@xcrackz.com'
);
```

---

## 🎯 **Compte de Test Rapide**

Pour tester rapidement, utilisez ces identifiants :

```
Email: test@xcrackz.com
Password: Test123456!
```

Créez-le via l'interface de register ou le Dashboard.

---

## 🆘 **Problèmes Fréquents**

### **"Email not confirmed"**

Si vous créez un compte via l'interface et voyez cette erreur :

**Solution 1 : Auto-confirm dans Supabase**
1. Dashboard → **Authentication** → **Users**
2. Trouvez votre utilisateur
3. Cliquez sur les 3 points → **"Confirm email"**

**Solution 2 : Désactiver la confirmation email**
1. Dashboard → **Authentication** → **Settings**
2. **Email Confirmation** → Désactivez "Enable email confirmations"

### **"User not found" ou "Invalid credentials"**

Vérifiez que :
1. L'utilisateur existe dans **Authentication** → **Users**
2. Le profil existe dans la table `profiles`
3. L'email est correct (pas d'espace)
4. Le mot de passe est correct

### **Pas d'accès au panneau Admin**

```sql
-- Vérifier si admin
SELECT email, is_admin FROM profiles WHERE email = 'votre@email.com';

-- Donner les droits
UPDATE profiles SET is_admin = true WHERE email = 'votre@email.com';
```

---

## ✅ **Checklist Compte Admin**

```
[ ] Utilisateur créé dans Authentication → Users
[ ] Email confirmé (auto-confirm ou manual)
[ ] Profil créé dans table profiles
[ ] is_admin = true dans profiles
[ ] Crédits créés dans user_credits
[ ] Test connexion sur /login
[ ] Test accès /admin
[ ] Test accès /dashboard
```

---

## 🎉 **Compte Admin Prêt !**

Une fois créé, vous pouvez :

✅ Vous connecter à l'application
✅ Accéder au panneau admin
✅ Gérer les utilisateurs
✅ Voir les statistiques
✅ Gérer les missions
✅ Exporter les données

---

**📧 Email recommandé : admin@xcrackz.com**
**🔐 Mot de passe : [Choisissez un mot de passe sécurisé]**
