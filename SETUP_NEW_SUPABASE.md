# 🚀 Configuration Nouveau Projet Supabase pour xCrackz

## ✅ **Étape par Étape - 10 Minutes**

---

## **Étape 1 : Créer le Projet Supabase** (3 min)

### **1. Aller sur Supabase**
```
https://supabase.com/dashboard
```

### **2. Cliquer sur "New Project"**

Vous verrez un bouton vert "New project" en haut à droite.

### **3. Remplir le Formulaire**

```
Organization: [Sélectionnez votre organisation personnelle]
Name: xcrackz
Database Password: [CHOISISSEZ UN MOT DE PASSE FORT ET NOTEZ-LE]
Region: Europe West (France) - ou le plus proche de vous
Pricing Plan: Free (suffisant pour commencer)
```

**⚠️ IMPORTANT : Notez bien le mot de passe de la base de données !**

### **4. Cliquer sur "Create new project"**

⏰ **Attendez 2-3 minutes** - Le projet est en cours de création...

---

## **Étape 2 : Récupérer les Identifiants** (2 min)

Une fois le projet créé :

### **1. Aller dans Settings → API**

Dans le menu de gauche : **Settings** ⚙️ → **API**

### **2. Copier ces 3 informations :**

#### **Project URL** (en haut)
```
Exemple: https://abcdefghijklmnop.supabase.co
```

#### **Project API keys → anon/public**
```
Exemple: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
(C'est une TRÈS longue clé, copiez TOUT)
```

#### **Project Reference ID**
```
Exemple: abcdefghijklmnop
(Les lettres après https:// et avant .supabase.co)
```

---

## **Étape 3 : Mettre à Jour le Fichier .env** (1 min)

### **Ouvrez le fichier .env à la racine du projet**

Remplacez les 2 premières lignes par vos nouvelles valeurs :

```env
VITE_SUPABASE_URL=https://VOTRE-NOUVEAU-PROJECT-ID.supabase.co
VITE_SUPABASE_ANON_KEY=VOTRE-NOUVELLE-ANON-KEY

# Configuration Mapbox (gardez celle-ci)
VITE_MAPBOX_TOKEN=YOUR_MAPBOX_TOKEN_HERE

# Configuration OneSignal (gardez celle-ci)
VITE_ONESIGNAL_APP_ID=b284fe02-642c-40e5-a05f-c50e07edc86d

# Configuration Google OAuth (gardez celle-ci)
VITE_GOOGLE_CLIENT_ID=695959395673-d24r9sj6sj9805h072kndsho8ij0dkgo.apps.googleusercontent.com
```

**💾 Sauvegardez le fichier !**

---

## **Étape 4 : Importer les Migrations** (4 min)

Maintenant il faut créer toutes les tables dans votre nouvelle base de données.

### **Méthode A : Via Supabase CLI (Recommandé)**

```bash
# 1. Installer Supabase CLI (si pas déjà fait)
npm install -g supabase

# 2. Se connecter à Supabase
supabase login

# 3. Lier votre projet (remplacez par votre Project Reference ID)
supabase link --project-ref VOTRE-PROJECT-ID

# 4. Pousser toutes les migrations
supabase db push

# ✅ Terminé ! Toutes vos tables sont créées
```

### **Méthode B : Via Dashboard SQL Editor (Manuel)**

Si la CLI ne fonctionne pas, vous pouvez le faire manuellement :

1. **Allez dans SQL Editor** (dans le menu de gauche)

2. **Ouvrez et exécutez ces fichiers dans l'ordre** :

```bash
# Ordre d'exécution (IMPORTANT) :

1. supabase/migrations/20251007202039_create_fleetcheck_schema.sql
2. supabase/migrations/20251007232540_create_shop_and_credits_system.sql
3. supabase/migrations/20251007233052_add_admin_role_system_v2.sql
4. supabase/migrations/20251007233646_add_first_last_name_to_profiles.sql
5. supabase/migrations/20251008001931_create_inspections_system.sql
6. supabase/migrations/20251008033053_create_gps_tracking_system.sql
7. supabase/migrations/20251009104959_complete_fleetcheck_schema.sql
8. supabase/migrations/20251009110444_add_clients_table.sql
9. supabase/migrations/20251009142554_add_driver_system_to_contacts_v2.sql
10. supabase/migrations/20251009144826_add_user_type_and_address_to_profiles.sql
... (continuez avec tous les fichiers)
```

Pour chaque fichier :
- Ouvrez-le dans votre éditeur de code
- Copiez TOUT le contenu
- Collez dans SQL Editor
- Cliquez sur **"Run"**
- Attendez ✅ "Success"
- Passez au suivant

---

## **Étape 5 : Vérifier que Tout Fonctionne** (1 min)

### **1. Vérifier les Tables**

Dans Supabase Dashboard :
- **Table Editor** (menu de gauche)
- Vous devriez voir toutes vos tables : `profiles`, `missions`, `contacts`, etc.

### **2. Tester l'Application**

```bash
# Démarrer l'application
npm run dev

# Ouvrir http://localhost:5173
```

**Si la page d'accueil s'affiche → ✅ Tout marche !**

### **3. Créer un Compte Test**

```bash
# Allez sur http://localhost:5173/register
# Créez un compte avec :

Email: admin@xcrackz.com
Nom: Admin xCrackz
Mot de passe: [votre choix]
```

**Si la création fonctionne → ✅ La base de données est connectée !**

---

## **Étape 6 : Donner les Droits Admin** (1 min)

Pour accéder au panneau admin :

1. **Dans Supabase Dashboard → SQL Editor**

2. **Exécutez ce SQL** (remplacez l'email si nécessaire) :

```sql
-- Donner les droits admin
UPDATE profiles 
SET is_admin = true 
WHERE email = 'admin@xcrackz.com';

-- Vérifier
SELECT email, is_admin FROM profiles WHERE email = 'admin@xcrackz.com';
```

3. **Rafraîchissez votre application**

4. **Allez sur http://localhost:5173/admin**

**Si vous voyez le panneau admin → ✅ Parfait !**

---

## **Étape 7 : Configurer Google OAuth** (Optionnel - 5 min)

Pour activer la connexion Google :

### **1. Mettre à Jour Google Cloud Console**

```
https://console.cloud.google.com/apis/credentials
```

**Dans "URI de redirection autorisés", REMPLACEZ l'ancienne URL par :**
```
https://VOTRE-NOUVEAU-PROJECT-ID.supabase.co/auth/v1/callback
```

### **2. Activer Google dans Supabase**

1. **Authentication** → **Providers** → **Google**
2. **Enable Google provider** ✅
3. **Client ID** : [Copiez depuis Google Cloud Console]
4. **Client Secret** : [Copiez depuis Google Cloud Console]
5. **Save**

### **3. Tester**

```
http://localhost:5173/login
→ Cliquer "Continuer avec Google"
→ Se connecter
→ Devrait rediriger vers /dashboard
```

---

## 📋 **Checklist Complète**

```
Supabase:
[ ] Projet créé sur supabase.com
[ ] Mot de passe de la base noté
[ ] Project URL copié
[ ] anon/public key copié
[ ] Project ID copié

Projet Local:
[ ] Fichier .env mis à jour
[ ] .env sauvegardé

Migrations:
[ ] Supabase CLI installé (npm i -g supabase)
[ ] supabase login connecté
[ ] supabase link exécuté
[ ] supabase db push exécuté
[ ] Tables visibles dans Dashboard

Tests:
[ ] npm run dev fonctionne
[ ] Page d'accueil accessible
[ ] Création de compte fonctionne
[ ] Connexion fonctionne
[ ] Droits admin donnés
[ ] Accès /admin OK

Google OAuth (Optionnel):
[ ] Google Cloud Console mis à jour
[ ] Nouvelle callback URL configurée
[ ] Google provider activé dans Supabase
[ ] Test connexion Google OK
```

---

## 🆘 **Problèmes Fréquents**

### **Erreur : "supabase: command not found"**

```bash
# Solution :
npm install -g supabase

# Si ça ne marche toujours pas, utilisez npx :
npx supabase login
npx supabase link --project-ref VOTRE-ID
npx supabase db push
```

### **Erreur lors du push des migrations**

```bash
# Vérifiez que vous êtes bien lié au bon projet :
supabase projects list

# Reliez-vous si nécessaire :
supabase link --project-ref VOTRE-ID

# Réessayez :
supabase db push
```

### **"Invalid API key" dans l'application**

→ Vérifiez que vous avez bien copié la **anon/public** key (pas la service_role)
→ Vérifiez qu'il n'y a pas d'espace au début ou à la fin
→ Redémarrez l'app : Ctrl+C puis `npm run dev`

### **Les tables ne sont pas créées**

→ Utilisez la Méthode B (SQL Editor manuel)
→ Exécutez les migrations une par une dans l'ordre
→ Si une migration échoue, lisez l'erreur et corrigez

---

## 💡 **Astuces**

### **Sauvegarder vos Identifiants**

Créez un fichier `.env.backup` avec vos identifiants :
```bash
cp .env .env.backup
```

### **Vérifier la Connexion**

```bash
# Test rapide de connexion
curl https://VOTRE-PROJECT-ID.supabase.co/rest/v1/ \
  -H "apikey: VOTRE-ANON-KEY"

# Devrait retourner du JSON avec "swagger"
```

### **Voir les Logs d'Erreur**

Dans Supabase Dashboard :
- **Logs** → **API Logs**
- **Logs** → **Auth Logs**

---

## 🎉 **Une Fois Terminé**

Vous aurez :

✅ **Nouveau projet Supabase fonctionnel**
✅ **Toutes les tables créées**
✅ **Application connectée**
✅ **Compte admin créé**
✅ **Accès complet au Dashboard**
✅ **Google OAuth configuré (si fait)**

---

## 🚀 **Prêt pour le Déploiement**

Une fois que tout fonctionne en local :

1. **Déployez sur Vercel** : `vercel --prod`
2. **Configurez le domaine** : `vercel domains add www.xcrackz.com`
3. **Ajoutez les variables d'environnement** dans Vercel Dashboard
4. **Configurez le DNS** chez votre hébergeur
5. **Mettez à jour Supabase** : Site URL = `https://www.xcrackz.com`

Voir **QUICK_SETUP_xcrackz.md** pour les détails du déploiement.

---

**⏱️ Temps Total : 10-15 minutes**

**📧 Besoin d'aide ? Suivez ce guide étape par étape et ça va marcher !**
