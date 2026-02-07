# 🚀 Configuration Liens Téléchargement iOS

## Étape 1 : Obtenir le Lien iOS

### Option A : TestFlight (Recommandé, nécessite $99/an)

1. **Build IPA avec Codemagic** (voir CODEMAGIC_IOS_BUILD.md)
2. **Upload sur App Store Connect** :
   - https://appstoreconnect.apple.com
   - My Apps → Finality → TestFlight
   - Upload IPA
3. **Créer lien public** :
   - TestFlight → External Testing
   - Create Public Link
   - Copier : `https://testflight.apple.com/join/VOTRE-CODE`

### Option B : Diawi (Gratuit temporaire)

1. **Build IPA avec Codemagic** (voir CODEMAGIC_IOS_BUILD.md)
2. **Upload sur Diawi** :
   - https://www.diawi.com
   - Upload Finality.ipa
   - Copier : `https://i.diawi.com/VOTRE-CODE`

---

## Étape 2 : Ajouter le Lien dans `.env.local`

Créer/éditer `.env.local` à la racine du projet :

```bash
# Android (déjà configuré)
VITE_ANDROID_APK_URL=https://expo.dev/artifacts/eas/qteFd2oCGibKVEaNE9hLKD.apk
VITE_ANDROID_VERSION=6.0.0

# iOS - Ajouter ces lignes
VITE_IOS_TESTFLIGHT_URL=https://testflight.apple.com/join/VOTRE-CODE
VITE_IOS_VERSION=1.0.0
```

**Remplacer** :
- `VOTRE-CODE` par votre vrai code TestFlight ou Diawi
- `1.0.0` par votre version réelle

---

## Étape 3 : Redémarrer le Serveur

```powershell
# Arrêter le serveur (Ctrl+C)
# Redémarrer
npm run dev
```

---

## Étape 4 : Tester

1. Ouvrir http://localhost:5173/mobile-download
2. La section iOS devrait maintenant afficher un bouton **actif** :
   - "Installer via TestFlight" (violet/rose)
   - Instructions d'installation visibles
3. Cliquer sur le bouton → Ouvre TestFlight ou Diawi

---

## 📊 Alternative : Stocker dans Supabase (Optionnel)

Si vous voulez gérer les liens depuis votre admin panel :

### 1. Ajouter colonnes dans `app_versions` :

```sql
ALTER TABLE app_versions 
ADD COLUMN ios_testflight_url TEXT,
ADD COLUMN ios_version TEXT;
```

### 2. Insérer lien iOS :

```sql
UPDATE app_versions 
SET 
  ios_testflight_url = 'https://testflight.apple.com/join/VOTRE-CODE',
  ios_version = '1.0.0'
WHERE is_active = true;
```

**Avantage** : 
- Mise à jour en temps réel sans redéployer
- Gestion depuis admin panel
- Historique des versions

---

## ✅ Checklist Complète

- [ ] IPA iOS buildé via Codemagic
- [ ] Compte Apple Developer créé ($99/an) OU Diawi utilisé (gratuit)
- [ ] IPA uploadé sur TestFlight ou Diawi
- [ ] Lien public copié
- [ ] `.env.local` mis à jour avec `VITE_IOS_TESTFLIGHT_URL`
- [ ] Serveur redémarré (`npm run dev`)
- [ ] Page `/mobile-download` testée
- [ ] Bouton iOS actif et fonctionnel
- [ ] Installation testée sur iPhone réel

---

## 🎯 Exemple Complet `.env.local`

```bash
# ===========================================
# CONFIGURATION TÉLÉCHARGEMENT MOBILE
# ===========================================

# Android APK
VITE_ANDROID_APK_URL=https://github.com/user/repo/releases/download/v1.0.0/finality.apk
VITE_ANDROID_VERSION=1.0.5

# iOS TestFlight
VITE_IOS_TESTFLIGHT_URL=https://testflight.apple.com/join/ABC123XYZ
VITE_IOS_VERSION=1.0.3

# Supabase (déjà configuré)
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-clé-anon
```

---

## 🚨 Troubleshooting

### Bouton iOS reste désactivé

**Cause** : `VITE_IOS_TESTFLIGHT_URL` vide ou non définie

**Solution** :
1. Vérifier `.env.local` contient la variable
2. Vérifier pas d'espace avant/après l'URL
3. Redémarrer le serveur (`npm run dev`)

### Lien TestFlight ne fonctionne pas

**Cause** : Code TestFlight invalide ou expiré

**Solution** :
1. Vérifier lien TestFlight dans App Store Connect
2. Régénérer lien public si expiré
3. Tester lien dans navigateur Safari iOS

### Diawi lien expiré

**Cause** : Lien gratuit valide 1 jour seulement

**Solution** :
1. Re-upload IPA sur Diawi
2. Copier nouveau lien
3. Mettre à jour `.env.local`
4. OU passer à TestFlight (permanent)

---

## 📱 Résultat Final Attendu

### Page `/mobile-download` affiche :

**Section Android** :
- ✅ Bouton vert "Télécharger APK" actif
- ✅ Lien direct APK fonctionnel
- ✅ Instructions installation

**Section iOS** :
- ✅ Bouton violet/rose "Installer via TestFlight" actif
- ✅ Lien ouvre TestFlight ou Diawi
- ✅ Instructions installation 4 étapes

---

## 🎉 Félicitations !

Votre page de téléchargement est maintenant **100% fonctionnelle** pour Android ET iOS !

**Prochaines étapes** :
1. Partager lien page : `https://votre-site.com/mobile-download`
2. Ajouter lien dans email confirmation
3. Ajouter QR Code pour scan mobile
4. Promouvoir sur réseaux sociaux
