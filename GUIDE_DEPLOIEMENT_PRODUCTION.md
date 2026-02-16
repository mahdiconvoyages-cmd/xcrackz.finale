# 🚀 Guide de Déploiement Production - xCrackz

## ✅ Checklist Pré-Déploiement

### 1. Sécurité ✅
- [x] Clés API retirées du code (maintenant en variables d'environnement)
- [x] `.env` dans `.gitignore`
- [x] Logs désactivés en production (via `vite.config.ts`)
- [x] Headers de sécurité configurés (`vercel.json`)

### 2. Performance ✅
- [x] Code splitting par vendor (React, Supabase, Maps, PDF)
- [x] Minification Terser activée
- [x] Cache immutable pour assets (1 an)
- [x] Service Worker pour PWA offline
- [x] Images optimisées

### 3. Configuration ✅
- [x] `vercel.json` optimisé (cache, headers, rewrites)
- [x] `vite.config.ts` production-ready
- [x] Variables d'environnement documentées

---

## 📋 Étapes de Déploiement

### Phase 1: Configuration Variables d'Environnement (CRITIQUE)

#### A. Via Vercel Dashboard (RECOMMANDÉ)

1. **Aller sur:** https://vercel.com/mahdiconvoyages-cmd/xcrackz-finale
2. **Settings** → **Environment Variables**
3. **Ajouter ces variables:**

```bash
# Supabase (OBLIGATOIRE)
VITE_SUPABASE_URL=https://bfrkthzovwpjrvqktdjn.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmcmt0aHpvdndwanJ2cWt0ZGpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5NzgwNzgsImV4cCI6MjA3NTU1NDA3OH0.ml0TkLYk53U6CqP_iCc8XkZMusFCSI-nYOS0WyV43Nc

# Gemini AI - PDF Inspections (OBLIGATOIRE)
VITE_GEMINI_API_KEY=AIzaSyAsIK3J6NSmvEG478oOHbIkRNp4xy4S_50

# OpenRouteService - GPS Routes (OBLIGATOIRE)
VITE_OPENROUTESERVICE_API_KEY=eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImM1YTdjMDg1NGMxNjQ2NDM5NDBhMTZlMDY5YmI4MWM4IiwiaCI6Im11cm11cjY0In0=

# Mapbox - Cartes (OBLIGATOIRE)
VITE_MAPBOX_TOKEN=YOUR_MAPBOX_TOKEN_HERE

# DeepSeek AI - Assistant (OPTIONNEL)
VITE_DEEPSEEK_API_KEY=sk-f091258152ee4d5983ff2431b2398e43

# OpenRouter AI - Assistant (OPTIONNEL)
VITE_OPENROUTER_API_KEY=votre_cle
```

4. **Pour chaque variable:**
   - Cocher **Production**
   - Cliquer **Save**

#### B. Via CLI Vercel (Alternative)

```bash
# Installer Vercel CLI
npm i -g vercel

# Se connecter
vercel login

# Ajouter les variables une par une
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel env add VITE_GEMINI_API_KEY production
vercel env add VITE_OPENROUTESERVICE_API_KEY production
vercel env add VITE_MAPBOX_TOKEN production
```

---

### Phase 2: Build Local (Test)

```bash
# 1. Installer les dépendances
npm install

# 2. Vérifier TypeScript
npm run typecheck

# 3. Build production local
npm run build

# 4. Tester le build
npm run preview
```

**Vérifications:**
- ✅ Build réussit sans erreurs
- ✅ Pas de warnings TypeScript
- ✅ Taille bundle raisonnable (< 2MB)
- ✅ Preview fonctionne (http://localhost:4173)

---

### Phase 3: Déploiement Vercel

#### Option A: Auto-Deploy (Recommandé)

```bash
# Commit et push (déclenche auto-deploy)
git add .
git commit -m "chore: configuration production ready"
git push origin main
```

Vercel détecte automatiquement et déploie.

#### Option B: Deploy Manuel

```bash
# Deploy vers production
vercel --prod

# OU avec variables d'environnement
vercel --prod --env-file=.env.production
```

---

### Phase 4: Vérification Post-Déploiement

#### A. Tests Techniques

1. **Build Success**
   - Aller sur Vercel Dashboard → Deployments
   - Vérifier status "Ready"
   - Durée build < 5 minutes

2. **Lighthouse Score**
   - Ouvrir DevTools → Lighthouse
   - **Performance:** > 90
   - **Accessibility:** > 95
   - **Best Practices:** > 95
   - **SEO:** > 90
   - **PWA:** ✅ Installable

3. **Console Errors**
   - Ouvrir DevTools → Console (F12)
   - ❌ Aucune erreur rouge
   - ⚠️ Warnings acceptables uniquement

#### B. Tests Fonctionnels

- [ ] **Connexion Supabase**
  - Login fonctionne
  - Données chargées

- [ ] **Création Mission**
  - Formulaire OK
  - Sauvegarde BDD

- [ ] **Inspection Photos**
  - Upload fonctionne
  - Descriptions IA générées

- [ ] **PDF Génération**
  - PDF téléchargeable
  - Contenu complet

- [ ] **GPS Tracking**
  - Carte affichée
  - Positions temps réel
  - Tracés itinéraires

- [ ] **PWA Install**
  - Prompt "Installer" apparaît
  - Installation mobile/desktop OK
  - Icône sur écran d'accueil

#### C. Tests Mobile

```bash
# Ouvrir sur mobile (scan QR code)
https://xcrackz-finale.vercel.app

Tests:
- [ ] Responsive design OK
- [ ] Zoom 90% appliqué
- [ ] Scanner webcam fonctionne
- [ ] GPS tracking fluide
- [ ] PWA installable
- [ ] Mode offline (couper réseau)
```

---

## 🐛 Dépannage

### Build Failed

```bash
# Erreur "Module not found"
npm install
npm run build

# Erreur TypeScript
npm run typecheck
# Corriger les erreurs affichées

# Erreur variables env
# Vérifier dans Vercel Dashboard → Settings → Environment Variables
```

### Runtime Errors

#### "API key not found"
➡️ Variable pas configurée dans Vercel
➡️ Solution: Ajouter la variable + re-deploy

#### "Unauthorized" / "Invalid API key"
➡️ Clé API incorrecte ou expirée
➡️ Solution: Vérifier la clé, régénérer si besoin

#### "Cannot connect to Supabase"
➡️ URL ou clé Supabase incorrecte
➡️ Solution: Dashboard Supabase → Settings → API

#### Service Worker Error
➡️ Cache corrompu
➡️ Solution: DevTools → Application → Clear Storage

### Performance Issues

#### Slow Loading
```bash
# Analyser le bundle
npm run build
npx vite-bundle-visualizer

# Vérifier chunks trop gros (> 500KB)
# Re-split si nécessaire dans vite.config.ts
```

#### High Memory Usage
➡️ Vérifier console.log pas désactivés
➡️ Solution: `drop_console: true` dans `vite.config.ts`

---

## 📊 Monitoring Production

### Vercel Analytics

1. **Activer:**
   - Dashboard Vercel → Analytics
   - Gratuit jusqu'à 100k requests/mois

2. **Métriques:**
   - Temps de réponse
   - Taux d'erreur
   - Géographie utilisateurs

### Supabase Logs

```bash
# Voir les erreurs BDD
Supabase Dashboard → Database → Logs

# Filtrer par:
- Failed queries
- Slow queries (> 1s)
- Auth errors
```

### Sentry (Optionnel)

```bash
# Tracking erreurs JavaScript
npm install @sentry/react

# Configurer dans src/main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "votre_dsn_sentry",
  environment: "production"
});
```

---

## 🔄 Mise à Jour Continue

### Workflow Git

```bash
# Développement local
git checkout -b feature/nouvelle-fonctionnalite
# ... développement ...
npm run typecheck
npm run build
git commit -m "feat: nouvelle fonctionnalité"

# Push vers GitHub
git push origin feature/nouvelle-fonctionnalite

# Créer Pull Request
# Review → Merge vers main

# Auto-deploy vers production
```

### Rollback

```bash
# En cas de problème en prod
vercel rollback

# OU via Dashboard
Deployments → Previous Deployment → Promote to Production
```

---

## 📈 Optimisations Futures

### Performance
- [ ] Lazy loading routes (`React.lazy()`)
- [ ] Image CDN (Cloudinary/Imgix)
- [ ] GraphQL Cache (Apollo)

### Monitoring
- [ ] Sentry error tracking
- [ ] Posthog analytics
- [ ] Hotjar heatmaps

### Infrastructure
- [ ] CDN custom (Cloudflare)
- [ ] Edge Functions (Vercel Edge)
- [ ] Redis cache (Upstash)

---

## 🆘 Support

### Erreurs Critiques
1. **Check Vercel Dashboard:** https://vercel.com/dashboard
2. **Check Supabase Status:** https://status.supabase.com
3. **Check GitHub Actions:** https://github.com/mahdiconvoyages-cmd/xcrackz.finale/actions

### Contact
- **GitHub Issues:** Créer un issue avec logs
- **Vercel Support:** support@vercel.com
- **Supabase Support:** Via Dashboard

---

## ✅ Post-Déploiement Checklist

- [ ] Toutes variables env configurées dans Vercel
- [ ] Build réussi (vert dans Deployments)
- [ ] App accessible: https://xcrackz-finale.vercel.app
- [ ] Login fonctionne
- [ ] Missions créées/listées
- [ ] Photos uploadées
- [ ] PDF générés avec IA
- [ ] GPS tracking affiche positions
- [ ] PWA installable (prompt apparaît)
- [ ] Lighthouse score > 90
- [ ] Pas d'erreurs console
- [ ] Tests mobile OK
- [ ] Mode offline fonctionne

---

🎉 **Déploiement Réussi !** L'application est maintenant en production.
