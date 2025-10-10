# 🔍 Accéder à Votre Base de Données Supabase

## 🎯 **Votre Situation**

Vous êtes connecté à Supabase avec : `mahdi.benamor1994@gmail.com`
Mais vous ne voyez pas le projet : `bfrkthzovwpjrvqktdjn`

---

## ❓ **Pourquoi Vous Ne Voyez Pas le Projet ?**

### **Raison 1 : Le projet appartient à une autre organisation**

Le projet `bfrkthzovwpjrvqktdjn` a été créé avec un autre compte email ou dans une autre organisation Supabase.

### **Raison 2 : Le projet a été créé par quelqu'un d'autre**

Si quelqu'un d'autre a créé le projet, vous devez être invité.

### **Raison 3 : Vous avez plusieurs organisations**

Vous pourriez avoir plusieurs organisations/équipes dans Supabase.

---

## ✅ **Solutions**

### **Solution 1 : Vérifier l'Organisation Active**

1. Sur https://supabase.com/dashboard
2. En haut à gauche, cliquez sur le **sélecteur d'organisation**
3. Vérifiez si vous avez plusieurs organisations
4. Changez d'organisation si nécessaire
5. Le projet devrait apparaître

---

### **Solution 2 : Créer un Nouveau Projet**

Si le projet n'existe pas encore ou si vous voulez repartir de zéro :

#### **Étape 1 : Créer le Projet**

1. Allez sur https://supabase.com/dashboard
2. Cliquez sur **"New Project"**
3. Remplissez :
   ```
   Name: xcrackz
   Database Password: [Choisissez un mot de passe fort]
   Region: Europe West (France) ou proche de vous
   Plan: Free (ou Pro si vous voulez)
   ```
4. Cliquez sur **"Create new project"**
5. ⏰ Attendez 2-3 minutes (création du projet)

#### **Étape 2 : Récupérer les Identifiants**

Une fois créé :

1. Allez dans **Settings** → **API**
2. Copiez :
   - **Project URL** (ex: `https://xxxxx.supabase.co`)
   - **anon/public** key

#### **Étape 3 : Mettre à Jour Votre .env**

```bash
# Ouvrir le fichier .env
nano .env

# Remplacer les valeurs:
VITE_SUPABASE_URL=https://VOTRE-NOUVEAU-PROJECT-ID.supabase.co
VITE_SUPABASE_ANON_KEY=VOTRE-NOUVELLE-ANON-KEY
```

#### **Étape 4 : Importer les Migrations**

```bash
# Installer Supabase CLI
npm install -g supabase

# Se connecter
supabase login

# Lier au nouveau projet
supabase link --project-ref VOTRE-NOUVEAU-PROJECT-ID

# Push toutes les migrations
supabase db push
```

OU via le Dashboard :

1. **SQL Editor**
2. Copiez le contenu de chaque fichier dans `supabase/migrations/`
3. Exécutez-les dans l'ordre (par date de création)

---

### **Solution 3 : Être Invité au Projet Existant**

Si le projet `bfrkthzovwpjrvqktdjn` existe et appartient à quelqu'un d'autre :

#### **Si VOUS êtes le propriétaire du projet (créé avec un autre email) :**

1. Connectez-vous avec l'email qui a créé le projet
2. Allez dans **Settings** → **Team**
3. Cliquez sur **"Invite"**
4. Invitez `mahdi.benamor1994@gmail.com`
5. Acceptez l'invitation dans votre email

#### **Si quelqu'un d'autre est propriétaire :**

Demandez au propriétaire de vous inviter :
1. Lui donner votre email : `mahdi.benamor1994@gmail.com`
2. Il doit aller dans Settings → Team → Invite
3. Vous recevrez un email d'invitation
4. Acceptez l'invitation

---

### **Solution 4 : Vérifier les Clés Actuelles**

Les clés dans votre `.env` pointent vers le projet `bfrkthzovwpjrvqktdjn`.

#### **Test : Le projet existe-t-il ?**

```bash
# Tester l'URL Supabase
curl https://bfrkthzovwpjrvqktdjn.supabase.co

# Si ça répond {"msg":"Welcome to Supabase"} → Le projet existe
# Si ça ne répond pas → Le projet n'existe pas/plus
```

#### **Vérifier dans le Dashboard**

1. Allez sur https://supabase.com/dashboard
2. Regardez la liste de vos projets
3. Cherchez `bfrkthzovwpjrvqktdjn` ou un projet nommé `xcrackz`

---

## 🆘 **Diagnostic Rapide**

### **Cas 1 : Vous voyez d'autres projets**

→ Le projet `bfrkthzovwpjrvqktdjn` n'est pas dans votre compte
→ **Action :** Créez un nouveau projet (Solution 2)

### **Cas 2 : Vous ne voyez AUCUN projet**

→ C'est votre premier projet
→ **Action :** Créez un nouveau projet (Solution 2)

### **Cas 3 : Vous voyez des projets dans une autre organisation**

→ Changez d'organisation en haut à gauche
→ **Action :** Vérifiez toutes vos organisations (Solution 1)

---

## 🔧 **Commandes pour Migrer vers un Nouveau Projet**

Si vous créez un nouveau projet, voici les commandes :

```bash
# 1. Tester l'ancien projet
curl https://bfrkthzovwpjrvqktdjn.supabase.co

# 2. Créer un nouveau projet sur supabase.com
# (via le Dashboard)

# 3. Récupérer le nouvel ID (ex: abcdefghijklmnop)

# 4. Mettre à jour .env
cat > .env << 'ENVFILE'
VITE_SUPABASE_URL=https://NOUVEL-ID.supabase.co
VITE_SUPABASE_ANON_KEY=NOUVELLE-ANON-KEY
VITE_MAPBOX_TOKEN=pk.eyJ1IjoieGNyYWNreiIsImEiOiJjbWR3dzV3cDMxdXIxMmxzYTI0c2Z0N2lpIn0.PFh0zoPCQK9UueLrLKWd0w
VITE_ONESIGNAL_APP_ID=b284fe02-642c-40e5-a05f-c50e07edc86d
VITE_GOOGLE_CLIENT_ID=695959395673-d24r9sj6sj9805h072kndsho8ij0dkgo.apps.googleusercontent.com
ENVFILE

# 5. Installer Supabase CLI
npm install -g supabase

# 6. Login
supabase login

# 7. Lier au projet
supabase link --project-ref NOUVEL-ID

# 8. Push les migrations
supabase db push

# 9. Tester
npm run dev
```

---

## 📋 **Checklist de Vérification**

```
[ ] Connecté sur https://supabase.com/dashboard
[ ] Email mahdi.benamor1994@gmail.com utilisé
[ ] Vérifié toutes les organisations (sélecteur en haut à gauche)
[ ] Cherché le projet bfrkthzovwpjrvqktdjn
[ ] Testé curl https://bfrkthzovwpjrvqktdjn.supabase.co
```

Si tout est ❌ :
```
[ ] Créer un nouveau projet
[ ] Copier URL et anon key
[ ] Mettre à jour .env
[ ] Push les migrations
[ ] Tester l'application
```

---

## 🎯 **Recommandation**

### **Option A : Vous voulez utiliser le projet existant**

1. Vérifiez si `bfrkthzovwpjrvqktdjn` est accessible via curl
2. Si oui : Cherchez dans quelle organisation il est
3. Si non : Le projet n'existe plus → Créez-en un nouveau

### **Option B : Vous voulez un projet frais (Recommandé)**

1. Créez un nouveau projet sur supabase.com
2. Mettez à jour `.env`
3. Push les migrations avec Supabase CLI
4. Tout sera prêt en 10 minutes

---

## 💡 **Astuce : URL Directe**

Essayez d'accéder directement au projet :

```
https://supabase.com/dashboard/project/bfrkthzovwpjrvqktdjn
```

**Si ça dit "Project not found" :**
→ Le projet n'existe pas/plus dans votre compte
→ Créez un nouveau projet

**Si ça charge :**
→ Le projet existe !
→ Vous pouvez l'utiliser

---

## 🔗 **Liens Utiles**

```
Dashboard Supabase:
https://supabase.com/dashboard

Créer un nouveau projet:
https://supabase.com/dashboard/new/project

Documentation Supabase CLI:
https://supabase.com/docs/guides/cli

Support Supabase:
https://supabase.com/support
```

---

## 🎉 **Une Fois le Projet Accessible**

Vous pourrez :

✅ Voir toutes vos tables dans **Table Editor**
✅ Exécuter du SQL dans **SQL Editor**
✅ Gérer les utilisateurs dans **Authentication**
✅ Voir les logs dans **Logs**
✅ Configurer les settings dans **Settings**

---

**🚀 Suivez la solution qui correspond à votre situation !**

**Besoin d'aide ? Partagez ce que vous voyez dans le Dashboard et je vous guiderai.**
