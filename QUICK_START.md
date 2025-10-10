# ⚡ DÉMARRAGE RAPIDE - xCrackz

## 🎯 **Vous Êtes Ici**

Vous êtes connecté sur Supabase avec `mahdi.benamor1994@gmail.com`
Mais le projet dans le `.env` n'existe pas dans votre compte.

---

## ✅ **Solution : Créer un Nouveau Projet (10 min)**

### **📍 Étape 1 : Créer le Projet**

1. Allez sur : **https://supabase.com/dashboard**
2. Cliquez sur **"New Project"** (bouton vert)
3. Remplissez :
   ```
   Name: xcrackz
   Password: [CHOISISSEZ UN MOT DE PASSE FORT - NOTEZ-LE]
   Region: Europe West (France)
   Plan: Free
   ```
4. Cliquez **"Create new project"**
5. ⏰ Attendez 2-3 minutes...

---

### **📍 Étape 2 : Copier les Identifiants**

Une fois créé, allez dans **Settings** → **API** et copiez :

1. **Project URL** :
   ```
   https://xxxxxxxxxx.supabase.co
   ```

2. **anon public key** :
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   (très longue clé - copiez TOUT)
   ```

3. **Project Reference ID** :
   ```
   xxxxxxxxxx
   (les lettres de l'URL)
   ```

---

### **📍 Étape 3 : Mettre à Jour .env**

Ouvrez le fichier `.env` et remplacez les 2 premières lignes :

```env
VITE_SUPABASE_URL=https://VOTRE-NOUVEAU-ID.supabase.co
VITE_SUPABASE_ANON_KEY=VOTRE-NOUVELLE-CLÉ

# Gardez le reste identique
VITE_MAPBOX_TOKEN=pk.eyJ1IjoieGNyYWNreiIsImEiOiJjbWR3dzV3cDMxdXIxMmxzYTI0c2Z0N2lpIn0.PFh0zoPCQK9UueLrLKWd0w
VITE_ONESIGNAL_APP_ID=b284fe02-642c-40e5-a05f-c50e07edc86d
VITE_GOOGLE_CLIENT_ID=695959395673-d24r9sj6sj9805h072kndsho8ij0dkgo.apps.googleusercontent.com
```

💾 **Sauvegardez !**

---

### **📍 Étape 4 : Importer les Tables**

```bash
# Installer Supabase CLI
npm install -g supabase

# Se connecter
supabase login

# Lier au projet (remplacez par votre ID)
supabase link --project-ref VOTRE-PROJECT-ID

# Créer toutes les tables
supabase db push
```

⏰ Attendez 1-2 minutes...

✅ **"Finished supabase db push"** → C'est bon !

---

### **📍 Étape 5 : Tester**

```bash
# Démarrer l'app
npm run dev

# Ouvrir http://localhost:5173
```

✅ **Si la page s'affiche → Tout marche !**

---

### **📍 Étape 6 : Créer un Compte Admin**

1. Allez sur **http://localhost:5173/register**
2. Remplissez :
   ```
   Email: admin@xcrackz.com
   Nom: Admin xCrackz
   Mot de passe: [votre choix]
   ```
3. Cliquez **"Créer un compte"**

✅ **Si le compte est créé → La base fonctionne !**

---

### **📍 Étape 7 : Donner les Droits Admin**

Dans **Supabase Dashboard** → **SQL Editor**, exécutez :

```sql
UPDATE profiles 
SET is_admin = true 
WHERE email = 'admin@xcrackz.com';
```

Cliquez **"Run"** ✅

---

## 🎉 **TERMINÉ !**

Vous pouvez maintenant :

✅ Vous connecter sur **http://localhost:5173/login**
✅ Accéder au panneau admin sur **/admin**
✅ Créer des missions, contacts, etc.
✅ Déployer en production

---

## 🆘 **Problème ?**

### **"supabase: command not found"**
```bash
# Utilisez npx à la place :
npx supabase login
npx supabase link --project-ref VOTRE-ID
npx supabase db push
```

### **Erreur lors du push**
→ Consultez **SETUP_NEW_SUPABASE.md** (guide détaillé)
→ Ou utilisez SQL Editor manuel (voir le guide)

### **"Invalid API key"**
→ Vérifiez que vous avez copié la clé **anon/public** (pas service_role)
→ Redémarrez : `npm run dev`

---

## 📚 **Guides Disponibles**

```
QUICK_START.md              ⚡ Ce fichier (démarrage rapide)
SETUP_NEW_SUPABASE.md       📖 Guide détaillé complet
CREATE_ADMIN_ACCOUNT.md     👤 Créer un compte admin
QUICK_SETUP_xcrackz.md      🌐 Configuration domaine
COMMANDS_TO_RUN.md          💻 Commandes à copier
```

---

## 🚀 **Prochaines Étapes**

Une fois que tout marche en local :

1. **Déployer sur Vercel** (voir QUICK_SETUP_xcrackz.md)
2. **Configurer www.xcrackz.com**
3. **Activer Google OAuth**
4. **Lancer en production !**

---

**⏱️ Temps Total : 10-15 minutes**

**🎯 Commencez par l'Étape 1 ci-dessus !**
