# 📱 Déploiement de l'APK Mobile

## Situation Actuelle

L'APK `xcrackz.apk` (115 MB) est **trop volumineux** pour GitHub (limite 100 MB).

**En local** : 
- ✅ L'APK est dans `public/xcrackz.apk`
- ✅ Accessible via `http://localhost:5173/xcrackz.apk`
- ✅ Ignoré par git (`.gitignore`)

**En production** :
- ❌ L'APK n'est PAS déployé sur Vercel
- 🔄 Il faut héberger l'APK ailleurs

---

## Solutions pour Héberger l'APK en Production

### Option 1 : GitHub Releases (Recommandé ✨)

**Avantages** :
- ✅ Gratuit
- ✅ Limite 2 GB par fichier
- ✅ Versionning automatique
- ✅ URL stable

**Étapes** :
1. Aller sur https://github.com/mahdiconvoyages-cmd/xcrackz.finale/releases
2. Cliquer "Create a new release"
3. Tag : `v1.0.0-mobile`
4. Titre : "xCrackz Mobile v1.0.0"
5. Uploader `xcrackz.apk`
6. Publish release

**URL finale** :
```
https://github.com/mahdiconvoyages-cmd/xcrackz.finale/releases/download/v1.0.0-mobile/xcrackz.apk
```

**Mise à jour du code** :
```typescript
// src/pages/MobileDownload.tsx
const ANDROID_APK_URL = 'https://github.com/mahdiconvoyages-cmd/xcrackz.finale/releases/download/v1.0.0-mobile/xcrackz.apk';
```

---

### Option 2 : Firebase Storage

**Avantages** :
- ✅ Gratuit jusqu'à 5 GB
- ✅ CDN mondial
- ✅ URL personnalisée

**Étapes** :
1. Créer projet Firebase : https://console.firebase.google.com
2. Activer Storage
3. Uploader `xcrackz.apk`
4. Rendre public
5. Copier l'URL

**URL exemple** :
```
https://firebasestorage.googleapis.com/v0/b/xcrackz-app.appspot.com/o/xcrackz.apk?alt=media
```

---

### Option 3 : Cloudinary

**Avantages** :
- ✅ Gratuit 10 GB
- ✅ CDN rapide
- ✅ Facile à utiliser

**Étapes** :
1. Créer compte : https://cloudinary.com
2. Upload l'APK
3. Copier l'URL

**URL exemple** :
```
https://res.cloudinary.com/xcrackz/raw/upload/xcrackz.apk
```

---

### Option 4 : Supabase Storage

**Avantages** :
- ✅ Déjà utilisé dans le projet
- ✅ Gratuit 1 GB
- ✅ Intégré avec Supabase

**Étapes** :
1. Aller sur Supabase Dashboard
2. Storage → Create bucket "mobile-apps"
3. Upload `xcrackz.apk`
4. Rendre public
5. Copier l'URL

**URL exemple** :
```
https://bfrkthzovwpjrvqktdjn.supabase.co/storage/v1/object/public/mobile-apps/xcrackz.apk
```

**Code de mise à jour** :
```typescript
// src/pages/MobileDownload.tsx
const ANDROID_APK_URL = 'https://bfrkthzovwpjrvqktdjn.supabase.co/storage/v1/object/public/mobile-apps/xcrackz.apk';
```

---

## Recommandation

**Pour ce projet : Supabase Storage** 🎯

**Pourquoi ?**
1. Déjà configuré dans le projet
2. URL cohérente avec le reste de l'app
3. Facile à mettre à jour
4. Pas besoin de compte supplémentaire

**Installation rapide** :
```bash
# 1. Uploader via Supabase Dashboard
# 2. Mettre à jour l'URL dans MobileDownload.tsx
# 3. Commit et push
# 4. ✅ Terminé !
```

---

## Mise à jour de l'APK

Quand vous créez un nouveau build APK :

1. **Générer le nouveau build** :
   ```bash
   cd mobile
   eas build -p android --profile production
   ```

2. **Télécharger l'APK depuis EAS** :
   - Lien fourni après le build
   - Ou depuis : https://expo.dev/accounts/xcrackz123/projects/xcrackz-mobile/builds

3. **Remplacer l'APK** :
   - Sur Supabase Storage : Delete → Upload new
   - Ou GitHub Release : Create new release avec nouvelle version

4. **Pas de changement de code nécessaire** si l'URL reste la même !

---

## Configuration Locale vs Production

**Fichier** : `src/pages/MobileDownload.tsx`

```typescript
// Mode développement (local)
const isDev = import.meta.env.DEV;

const ANDROID_APK_URL = isDev
  ? '/xcrackz.apk' // Local: public/xcrackz.apk
  : 'https://bfrkthzovwpjrvqktdjn.supabase.co/storage/v1/object/public/mobile-apps/xcrackz.apk'; // Production
```

Ainsi :
- ✅ En **local** (`npm run dev`) : Utilise `/xcrackz.apk` depuis `public/`
- ✅ En **production** (Vercel) : Utilise l'URL Supabase

---

## Checklist de Déploiement

- [x] APK généré avec EAS Build
- [x] APK copié dans `public/` pour dev local
- [x] APK ajouté au `.gitignore`
- [x] Page `/mobile-download` créée
- [ ] **APK uploadé sur Supabase Storage**
- [ ] **URL mise à jour dans `MobileDownload.tsx`**
- [ ] Code committé et pushé
- [ ] Testé en production

---

**Date de création** : 27 octobre 2025  
**Version APK actuelle** : 1.0.0 (Build 13)  
**Taille** : 115 MB
