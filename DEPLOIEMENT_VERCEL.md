# 🚀 Déploiement xCrackz sur Vercel

## Variables d'Environnement à Configurer

Avant de déployer, configurez ces variables d'environnement dans Vercel :

### 1. Supabase
```
VITE_SUPABASE_URL=https://bfrkthzovwpjrvqktdjn.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmcmt0aHpvdndwanJ2cWt0ZGpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5NzgwNzgsImV4cCI6MjA3NTU1NDA3OH0.ml0TkLYk53U6CqP_iCc8XkZMusFCSI-nYOS0WyV43Nc
```

### 2. DeepSeek AI
```
VITE_DEEPSEEK_API_KEY=sk-f091258152ee4d5983ff2431b2398e43
```

### 3. Mapbox
```
VITE_MAPBOX_TOKEN=YOUR_MAPBOX_TOKEN_HERE
```

### 4. OneSignal
```
VITE_ONESIGNAL_APP_ID=b284fe02-642c-40e5-a05f-c50e07edc86d
```

### 5. Google OAuth
```
VITE_GOOGLE_CLIENT_ID=695959395673-d24r9sj6sj9805h072kndsho8ij0dkgo.apps.googleusercontent.com
```

### 6. Application URL
```
VITE_APP_URL=https://xcrackz.com
```

---

## Commandes Vercel CLI

### Installation
```bash
npm install -g vercel
```

### Login
```bash
vercel login
```

### Déploiement Initial
```bash
vercel --prod
```

### Ajout Variables d'Environnement (via CLI)
```bash
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel env add VITE_DEEPSEEK_API_KEY production
vercel env add VITE_MAPBOX_TOKEN production
vercel env add VITE_ONESIGNAL_APP_ID production
vercel env add VITE_GOOGLE_CLIENT_ID production
vercel env add VITE_APP_URL production
```

---

## Configuration Domaine

### 1. Dans Vercel Dashboard
- Aller dans Settings → Domains
- Ajouter : `xcrackz.com` et `www.xcrackz.com`

### 2. Configuration DNS (chez votre registrar)
Ajouter ces enregistrements :

**Type A (pour xcrackz.com):**
```
Type: A
Name: @
Value: 76.76.21.21
```

**Type CNAME (pour www.xcrackz.com):**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

---

## Vérification Post-Déploiement

### 1. Tester l'application
```
https://xcrackz.com
https://www.xcrackz.com
```

### 2. Vérifier les variables d'environnement
Dans Vercel Dashboard → Settings → Environment Variables

### 3. Vérifier les logs
```bash
vercel logs
```

---

## Redéploiement

### Automatique (via Git)
Poussez sur la branche main/master :
```bash
git add .
git commit -m "Update"
git push origin main
```

### Manuel
```bash
vercel --prod
```

---

## Rollback (en cas de problème)

```bash
vercel rollback
```

---

## URLs de Production

- **Principal** : https://xcrackz.com
- **WWW** : https://www.xcrackz.com
- **Preview** : https://xcrackz-git-*.vercel.app

---

## Support

En cas de problème :
1. Vérifier les logs : `vercel logs`
2. Vérifier les builds : Vercel Dashboard → Deployments
3. Vérifier les variables d'env : Settings → Environment Variables

---

**Créé le** : 15 octobre 2025  
**Domaine** : xcrackz.com  
**Framework** : Vite + React + TypeScript  
**Hosting** : Vercel
