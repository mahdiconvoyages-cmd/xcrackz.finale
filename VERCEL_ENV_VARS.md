# Variables d'environnement pour Vercel

## Configuration à ajouter dans Vercel Dashboard

### 🔐 Variables CRITIQUES (à configurer MAINTENANT)

#### Supabase
```bash
VITE_SUPABASE_URL=https://bfrkthzovwpjrvqktdjn.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmcmt0aHpvdndwanJ2cWt0ZGpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5NzgwNzgsImV4cCI6MjA3NTU1NDA3OH0.ml0TkLYk53U6CqP_iCc8XkZMusFCSI-nYOS0WyV43Nc
```

#### Gemini AI (pour descriptions photos inspections)
```bash
VITE_GEMINI_API_KEY=AIzaSyAsIK3J6NSmvEG478oOHbIkRNp4xy4S_50
```

#### OpenRouteService (pour tracés GPS)
```bash
VITE_OPENROUTESERVICE_API_KEY=eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImM1YTdjMDg1NGMxNjQ2NDM5NDBhMTZlMDY5YmI4MWM4IiwiaCI6Im11cm11cjY0In0=
```

#### Mapbox (pour les cartes)
```bash
VITE_MAPBOX_TOKEN=pk.eyJ1IjoieGNyYWNreiIsImEiOiJjbWR3dzV3cDMxdXIxMmxzYTI0c2Z0N2lpIn0.PFh0zoPCQK9UueLrLKWd0w
```

#### DeepSeek AI (optionnel - assistant IA)
```bash
VITE_DEEPSEEK_API_KEY=sk-f091258152ee4d5983ff2431b2398e43
```

#### OpenRouter AI (optionnel - assistant IA alternatif)
```bash
VITE_OPENROUTER_API_KEY=votre_cle_openrouter
```

---

## 📋 Instructions de configuration Vercel

### Méthode 1: Via Dashboard Vercel (RECOMMANDÉ)

1. **Aller sur** https://vercel.com/mahdiconvoyages-cmd/xcrackz-finale
2. **Cliquer sur** Settings → Environment Variables
3. **Ajouter CHAQUE variable** ci-dessus avec:
   - Name: `VITE_SUPABASE_URL` (par exemple)
   - Value: La valeur correspondante
   - Environment: **Production** (cocher)
4. **Cliquer** "Save"
5. **Répéter** pour TOUTES les variables

### Méthode 2: Via CLI Vercel

```bash
# Installer Vercel CLI (si pas déjà fait)
npm i -g vercel

# Se connecter
vercel login

# Ajouter les variables (une par une)
vercel env add VITE_SUPABASE_URL production
# Coller la valeur quand demandé

vercel env add VITE_SUPABASE_ANON_KEY production
# Coller la valeur quand demandé

# ... répéter pour toutes les variables
```

### Méthode 3: Via fichier .env (LOCAL uniquement)

⚠️ **ATTENTION:** Le fichier `.env` n'est PAS déployé sur Vercel (`.gitignore`)

Créer `.env` à la racine:
```bash
# Copier toutes les variables ci-dessus
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_GEMINI_API_KEY=...
VITE_OPENROUTESERVICE_API_KEY=...
VITE_MAPBOX_TOKEN=...
VITE_DEEPSEEK_API_KEY=...
VITE_OPENROUTER_API_KEY=...
```

---

## 🚀 Après configuration

### Re-déployer l'application

```bash
# Forcer un nouveau build avec les nouvelles variables
vercel --prod

# OU faire un nouveau commit (déclenche auto-deploy)
git commit --allow-empty -m "chore: trigger redeploy with env vars"
git push origin main
```

### Vérifier que ça marche

1. Ouvrir https://xcrackz-finale.vercel.app
2. Ouvrir DevTools Console (F12)
3. Vérifier qu'il n'y a PAS d'erreurs:
   - ❌ "API key not found"
   - ❌ "Unauthorized"
   - ❌ "Invalid API key"

---

## 🔒 Sécurité

### Variables sensibles

- ✅ **JAMAIS** commiter les clés API dans Git
- ✅ `.env` est dans `.gitignore`
- ✅ Les clés sont maintenant en `import.meta.env.VITE_*`
- ✅ Vercel injecte les variables au build

### Rotation des clés (si compromises)

1. **Supabase:** Dashboard → Settings → API → Regenerate keys
2. **Gemini:** Google Cloud Console → Credentials → Regenerate
3. **OpenRouteService:** openrouteservice.org → API Keys → Regenerate
4. **Mapbox:** mapbox.com → Account → Access Tokens → Regenerate

---

## ✅ Checklist de déploiement

- [ ] Toutes les variables ajoutées dans Vercel Dashboard
- [ ] Re-déploiement lancé (`vercel --prod` ou `git push`)
- [ ] Build réussi (Vercel → Deployments → Success)
- [ ] App accessible (https://xcrackz-finale.vercel.app)
- [ ] Pas d'erreurs dans Console DevTools
- [ ] Fonctionnalités testées:
  - [ ] Connexion Supabase
  - [ ] Upload photos inspections
  - [ ] Génération PDF avec descriptions IA
  - [ ] Affichage cartes GPS
  - [ ] Tracés itinéraires

---

## 🆘 Dépannage

### Erreur "API key not found"
➡️ Variable pas configurée dans Vercel Dashboard

### Erreur "Unauthorized" / "Invalid API key"
➡️ Clé API incorrecte ou expirée

### Erreur "Cannot read property 'env'"
➡️ Mauvais préfixe (doit être `VITE_` pour Vite)

### Variables pas prises en compte
➡️ Re-déployer l'app après avoir ajouté les variables
