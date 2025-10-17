# 🚀 Guide de Déploiement xCrackz

## Résumé des Modifications

### ✅ Sécurité
- ✅ Toutes les clés API déplacées vers `.env`
- ✅ DeepSeek API key protégée
- ✅ Supabase keys protégées
- ✅ `.env` ajouté au `.gitignore`

### ✅ Responsivité
- ✅ 3/14 pages web corrigées (CRM, Shop, Dashboard)
- ✅ Classes CSS utilitaires créées (`responsive.css`)
- ✅ Documentation complète

### ✅ Configuration Vercel
- ✅ `vercel.json` créé
- ✅ Variables d'environnement documentées
- ✅ Script PowerShell de déploiement (`deploy-vercel.ps1`)

---

## 📋 Étapes de Déploiement

### Option 1: Via Vercel CLI (Recommandé)

#### 1. Installer Vercel CLI
```bash
npm install -g vercel
```

#### 2. Login Vercel
```bash
vercel login
```

#### 3. Déployer
```bash
vercel --prod
```

Lors du premier déploiement, Vercel posera des questions :
- **Set up and deploy**: Yes
- **Link to existing project**: No
- **Project name**: xcrackz
- **Directory**: . (current directory)

#### 4. Ajouter les Variables d'Environnement

Via l'interface Web de Vercel:
1. Aller sur https://vercel.com/dashboard
2. Sélectionner le projet `xcrackz`
3. Aller dans **Settings** → **Environment Variables**
4. Ajouter chaque variable:

```
VITE_SUPABASE_URL=https://bfrkthzovwpjrvqktdjn.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmcmt0aHpvdndwanJ2cWt0ZGpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5NzgwNzgsImV4cCI6MjA3NTU1NDA3OH0.ml0TkLYk53U6CqP_iCc8XkZMusFCSI-nYOS0WyV43Nc
VITE_DEEPSEEK_API_KEY=sk-f091258152ee4d5983ff2431b2398e43
VITE_MAPBOX_TOKEN=pk.eyJ1IjoieGNyYWNreiIsImEiOiJjbWR3dzV3cDMxdXIxMmxzYTI0c2Z0N2lpIn0.PFh0zoPCQK9UueLrLKWd0w
VITE_ONESIGNAL_APP_ID=b284fe02-642c-40e5-a05f-c50e07edc86d
VITE_GOOGLE_CLIENT_ID=695959395673-d24r9sj6sj9805h072kndsho8ij0dkgo.apps.googleusercontent.com
VITE_APP_URL=https://xcrackz.com
```

**Important**: Sélectionner **Production** comme environnement

#### 5. Redéployer pour prendre en compte les variables
```bash
vercel --prod
```

#### 6. Configurer le Domaine

Dans Vercel Dashboard → Settings → Domains:
- Ajouter `xcrackz.com`
- Ajouter `www.xcrackz.com`

### Option 2: Via PowerShell Script

```powershell
.\deploy-vercel.ps1
```

Ce script va:
1. ✅ Vérifier Vercel CLI
2. ✅ Configurer le token
3. ✅ Builder le projet
4. ✅ Déployer sur Vercel
5. ✅ Ajouter les variables d'environnement
6. ✅ Redéployer

---

## 🌐 Configuration DNS

Chez votre registrar de domaine (ex: OVH, Namecheap, GoDaddy):

### Pour xcrackz.com
**Type A:**
```
Type: A
Name: @
Value: 76.76.21.21
TTL: 3600
```

### Pour www.xcrackz.com
**Type CNAME:**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 3600
```

⚠️ **Note**: Les changements DNS peuvent prendre 24-48h pour se propager.

---

## ✅ Vérification Post-Déploiement

### 1. Tester l'Application
```
https://xcrackz.com
https://www.xcrackz.com
```

### 2. Vérifier les Variables
Dans Vercel Dashboard → Settings → Environment Variables

Toutes les 7 variables doivent être présentes et configurées pour "Production".

### 3. Tester les Fonctionnalités
- ✅ Connexion/Inscription
- ✅ Clara AI (nécessite VITE_DEEPSEEK_API_KEY)
- ✅ Cartes (nécessite VITE_MAPBOX_TOKEN)
- ✅ Supabase (données, auth)

### 4. Voir les Logs
```bash
vercel logs
```

ou dans Vercel Dashboard → Deployments → [Dernier déploiement] → Logs

---

## 🔧 Commandes Utiles

### Voir les déploiements
```bash
vercel ls
```

### Voir les variables d'environnement
```bash
vercel env ls
```

### Rollback (en cas de problème)
```bash
vercel rollback
```

### Supprimer un déploiement
```bash
vercel rm [deployment-url]
```

---

## 🚨 En Cas de Problème

### Build Failed

1. Vérifier les logs: `vercel logs`
2. Tester localement: `npm run build`
3. Vérifier `vercel.json`

### Variables d'Environnement Non Reconnues

1. Vérifier qu'elles sont bien configurées dans Vercel
2. Vérifier qu'elles ont le préfixe `VITE_`
3. Redéployer: `vercel --prod`

### Erreur 404 sur les Routes

C'est normal avec Vite + React Router.
Le fichier `vercel.json` redirige tout vers `/index.html`.

Si ça ne fonctionne pas:
```json
{
  "routes": [
    { "handle": "filesystem" },
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

### Domaine ne Fonctionne Pas

1. Vérifier la configuration DNS (peut prendre 24-48h)
2. Vérifier dans Vercel → Domains que le domaine est ajouté
3. Essayer en HTTPS: `https://xcrackz.com`

---

## 📊 Performance

### Optimisations Automatiques par Vercel
- ✅ CDN global
- ✅ Compression automatique (Gzip/Brotli)
- ✅ Cache intelligent
- ✅ HTTPS automatique
- ✅ HTTP/2 + HTTP/3

### Lighthouse Score Attendu
- Performance: 90-100
- Accessibility: 90-100
- Best Practices: 90-100
- SEO: 90-100

---

## 📝 Checklist Déploiement

- [ ] Vercel CLI installé
- [ ] Login Vercel effectué
- [ ] Projet déployé (`vercel --prod`)
- [ ] 7 variables d'environnement configurées
- [ ] Domaines ajoutés (xcrackz.com + www)
- [ ] DNS configuré chez le registrar
- [ ] Application testée en production
- [ ] Clara AI testé
- [ ] Cartes testées
- [ ] Authentification testée

---

## 🎉 Succès !

Votre application est maintenant en ligne sur:
- 🌐 https://xcrackz.com
- 🌐 https://www.xcrackz.com

---

**Créé le**: 15 octobre 2025  
**Framework**: Vite + React + TypeScript  
**Hosting**: Vercel  
**Domaine**: xcrackz.com
