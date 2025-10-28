# 📦 Héberger l'APK v3 sur Supabase Storage

## 🎯 Instructions

L'APK est trop volumineux pour GitHub (118 MB > 100 MB limite).  
Solution : héberger sur **Supabase Storage**.

---

## 📋 Étapes pour Upload Manuel

### 1. Accéder à Supabase Storage
1. Aller sur https://supabase.com/dashboard
2. Sélectionner votre projet: `bfrkthzovwpjrvqktdjn`
3. Menu latéral: **Storage**

### 2. Créer/Vérifier le Bucket `mobile-apps`
- Si le bucket n'existe pas, le créer:
  - Nom: `mobile-apps`
  - **Public**: ✅ Cocher (important!)
  - File size limit: 150 MB (ou plus)

### 3. Uploader l'APK
1. Ouvrir le bucket `mobile-apps`
2. Cliquer **Upload file**
3. Sélectionner: `C:\Users\mahdi\Downloads\xcrackzv3.apk`
4. Attendre la fin de l'upload (118 MB)

### 4. Récupérer l'URL Publique
Après upload, cliquer sur le fichier `xcrackzv3.apk` et copier l'URL:
```
https://bfrkthzovwpjrvqktdjn.supabase.co/storage/v1/object/public/mobile-apps/xcrackzv3.apk
```

### 5. Configurer Vercel (Optionnel)
Pour pointer directement vers cette URL en production:

1. Aller sur https://vercel.com
2. Sélectionner votre projet
3. **Settings** → **Environment Variables**
4. Ajouter:
   - **Name:** `VITE_ANDROID_APK_URL`
   - **Value:** `https://bfrkthzovwpjrvqktdjn.supabase.co/storage/v1/object/public/mobile-apps/xcrackzv3.apk`
   - **Name:** `VITE_ANDROID_VERSION`
   - **Value:** `3.0.0`
5. **Redéployer** le projet

---

## ✅ Vérification

Après l'upload Supabase et le redéploiement Vercel:

1. Ouvrir votre site: https://votre-site.vercel.app/mobile-download
2. Cliquer sur **Télécharger APK Android**
3. L'APK v3 (118 MB) devrait se télécharger depuis Supabase

---

## 🔧 Alternative: Utiliser le Fichier Local (Dev uniquement)

Le fichier est déjà copié dans `public/xcrackzv3.apk`.

En **dev local** (npm run dev), il sera accessible à `/xcrackzv3.apk`.

**MAIS:** Ne fonctionne PAS en production Vercel (fichier trop gros).

---

## 📊 URLs Finales

| Environnement | URL de l'APK |
|---------------|--------------|
| **Dev local** | `http://localhost:5173/xcrackzv3.apk` |
| **Production (Supabase)** | `https://bfrkthzovwpjrvqktdjn.supabase.co/storage/v1/object/public/mobile-apps/xcrackzv3.apk` |

---

## 🚨 Important

- L'APK **N'EST PAS** versionné dans Git (trop volumineux)
- L'APK **DOIT** être hébergé sur Supabase Storage ou service externe
- Le code web pointe déjà vers `/xcrackzv3.apk` en dev et vers Supabase en prod
- **Action requise:** Uploader manuellement l'APK sur Supabase Storage

---

## 🎉 Résumé

✅ Code web mis à jour (version 3.0.0, URL xcrackzv3.apk)  
✅ Poussé sur GitHub (sans l'APK)  
✅ Vercel va auto-déployer  
⏳ **À faire:** Uploader `xcrackzv3.apk` sur Supabase Storage bucket `mobile-apps`

Une fois l'upload Supabase terminé, le téléchargement fonctionnera en production ! 🚀
