# 🆓 Guide Gratuit : Build iOS + Diawi (Sans Mac)

## 🎯 Objectif
Créer l'application iOS et la rendre téléchargeable via Diawi (service gratuit).

---

## ⏱️ Temps Total : 15-20 minutes

---

## ÉTAPE 1 : Créer Compte Codemagic (2 min)

### Actions :
1. Aller sur https://codemagic.io/signup
2. Cliquer **"Sign up with GitHub"**
3. Autoriser Codemagic à accéder à vos repos
4. Confirmer email

**Plan gratuit** : 500 minutes/mois ✅

---

## ÉTAPE 2 : Ajouter Projet Flutter (3 min)

### Dans Codemagic Dashboard :

1. Cliquer **"Add application"**
2. Sélectionner **"Flutter"**
3. Choisir votre repository GitHub
4. Branch : **main**
5. Codemagic détecte automatiquement Flutter ✅

---

## ÉTAPE 3 : Configurer Build iOS (5 min)

### Dans Workflow Editor :

1. Cliquer sur votre app
2. **Workflow settings** → **iOS**
3. Copier cette configuration :

```yaml
workflows:
  ios-build:
    name: iOS Build (Unsigned)
    max_build_duration: 60
    instance_type: mac_mini_m1
    environment:
      flutter: stable
      xcode: latest
      cocoapods: default
    scripts:
      - name: Get packages
        script: |
          cd mobile
          flutter pub get
      
      - name: Build iOS
        script: |
          cd mobile
          flutter build ios --release --no-codesign
      
      - name: Create IPA
        script: |
          cd mobile/build/ios/iphoneos
          mkdir Payload
          cp -r Runner.app Payload/
          zip -r ../../../Finality.ipa Payload
    
    artifacts:
      - mobile/Finality.ipa
```

4. **Save**

---

## ÉTAPE 4 : Lancer le Build (10-15 min)

### Actions :
1. Cliquer **"Start new build"**
2. Attendre (progress bar visible)
3. ☕ Prendre un café (build ~10-15 min)

**Résultat** : ✅ Build Success (vert)

---

## ÉTAPE 5 : Télécharger IPA (1 min)

### Actions :
1. Onglet **"Artifacts"**
2. Cliquer sur **"Finality.ipa"**
3. Télécharger le fichier

**Localisation** : `C:\Users\mahdi\Downloads\Finality.ipa`

---

## ÉTAPE 6 : Upload sur Diawi (2 min)

### Actions :
1. Aller sur https://www.diawi.com
2. **Glisser-déposer** `Finality.ipa` sur la page
3. Cliquer **"Send"**
4. Attendre upload (30 sec - 1 min)

**Résultat** : Lien généré `https://i.diawi.com/ABC123`

### Options Diawi (gratuites) :
- **Title** : Finality iOS
- **More options** :
  - ✅ Find by UDID (pour tests devices)
  - ✅ Password protect (optionnel)
  - **Expires** : 1 day (gratuit)

---

## ÉTAPE 7 : Copier le Lien (1 min)

### Sur la page Diawi résultat :

```
Your file is ready!
https://i.diawi.com/XYZ789

[QR Code]

Download link will expire in:
1 day
```

**Copier** : `https://i.diawi.com/XYZ789`

---

## ÉTAPE 8 : Ajouter sur Votre Site (2 min)

### Créer/Éditer `.env.local` :

```bash
# iOS Diawi
VITE_IOS_TESTFLIGHT_URL=https://i.diawi.com/XYZ789
VITE_IOS_VERSION=1.0.0
```

**Remplacer** `XYZ789` par votre code réel

---

## ÉTAPE 9 : Redémarrer Serveur

```powershell
# Dans le terminal VS Code
npm run dev
```

---

## ÉTAPE 10 : Tester la Page

1. Ouvrir http://localhost:5173/mobile-download
2. Section iOS devrait afficher :
   - ✅ Bouton violet/rose **actif** "Installer via TestFlight"
   - ✅ Instructions installation
3. Cliquer bouton → Ouvre Diawi

---

## 🎉 Résultat Final

### Votre page `/mobile-download` affiche maintenant :

**Android** :
- ✅ Téléchargement APK depuis votre site

**iOS** :
- ✅ Lien vers Diawi (installation directe)

---

## ⚠️ Limitations Diawi Gratuit

### 1️⃣ **Expiration 1 Jour**
- Lien expire après 24h
- **Solution** : Re-upload IPA tous les jours si besoin
- Ou passer à Diawi Pro ($20/mois) = liens 1 an

### 2️⃣ **Installation Limitée**
- **Sans certificat Apple** : Ne peut être installé que sur simulateur/Xcode
- **Avec certificat Apple** ($99/an) : Installable sur devices réels (max 100)

### 3️⃣ **Pas de Mise à Jour Auto**
- Utilisateurs doivent re-télécharger manuellement
- Pas de notification push nouvelle version

---

## 🔄 Workflow Quotidien

### Tous les jours (si lien expire) :

```powershell
# 1. Re-build IPA (ou réutiliser IPA existant)
# Pas besoin si pas de changement code

# 2. Upload sur Diawi
# https://www.diawi.com

# 3. Copier nouveau lien
# https://i.diawi.com/NOUVEAU-CODE

# 4. Mettre à jour .env.local
VITE_IOS_TESTFLIGHT_URL=https://i.diawi.com/NOUVEAU-CODE

# 5. Redémarrer serveur
npm run dev
```

**Temps** : 3 minutes/jour

---

## 💡 Optimisation

### Script Auto-Upload Diawi (Avancé)

Créer `scripts/upload-diawi.ps1` :

```powershell
# Upload automatique sur Diawi

$IPA_PATH = "mobile\Finality.ipa"
$DIAWI_TOKEN = "" # Optionnel: Obtenir sur diawi.com/profile

Write-Host "📤 Upload IPA sur Diawi..."

$response = Invoke-RestMethod `
  -Uri "https://upload.diawi.com/" `
  -Method Post `
  -InFile $IPA_PATH `
  -ContentType "application/octet-stream"

$job = $response.job

Write-Host "⏳ Attente processing..."
Start-Sleep -Seconds 30

$result = Invoke-RestMethod `
  -Uri "https://upload.diawi.com/status?job=$job"

$link = $result.link

Write-Host "✅ Lien Diawi: https://i.diawi.com/$link"

# Auto-update .env.local
$envContent = Get-Content .env.local
$envContent = $envContent -replace "VITE_IOS_TESTFLIGHT_URL=.*", "VITE_IOS_TESTFLIGHT_URL=https://i.diawi.com/$link"
$envContent | Set-Content .env.local

Write-Host "✅ .env.local mis à jour!"
```

**Usage** :
```powershell
.\scripts\upload-diawi.ps1
```

---

## 🆙 Upgrade vers TestFlight (Plus Tard)

### Quand vous serez prêt :

1. **Payer** Apple Developer ($99/an)
2. **Build IPA signé** avec certificat Apple
3. **Upload** sur App Store Connect
4. **Générer** lien TestFlight public
5. **Remplacer** lien Diawi par TestFlight

**Avantages upgrade** :
- ✅ Lien permanent (pas d'expiration)
- ✅ 10,000 utilisateurs (vs 100 Diawi)
- ✅ Mise à jour auto push
- ✅ Analytics complets

---

## ✅ Checklist Complète

- [ ] Compte Codemagic créé (gratuit)
- [ ] Projet Flutter ajouté
- [ ] Workflow iOS configuré
- [ ] Build IPA réussi (10-15 min)
- [ ] IPA téléchargé (~50 MB)
- [ ] Upload Diawi effectué
- [ ] Lien Diawi copié
- [ ] `.env.local` mis à jour
- [ ] Serveur redémarré
- [ ] Page `/mobile-download` testée
- [ ] Bouton iOS actif et fonctionnel

---

## 🎯 Prochaines Étapes

### Maintenant :
1. ✅ Build IPA avec Codemagic (gratuit)
2. ✅ Upload sur Diawi (gratuit)
3. ✅ Lien sur votre page download

### Dans 1-2 mois (si business fonctionne) :
1. ⏳ Acheter compte Apple Developer ($99/an)
2. ⏳ Passer à TestFlight (lien permanent)
3. ⏳ Publier App Store (optionnel)

---

## 📞 Support

**Problème d'upload Diawi ?**
- Vérifier taille IPA < 2 GB
- Utiliser navigateur Chrome/Firefox
- Réessayer si timeout

**Build Codemagic échoue ?**
- Vérifier logs dans onglet "Logs"
- Chercher erreur Flutter/iOS
- Vérifier `pubspec.yaml` valide

**Lien Diawi ne fonctionne pas ?**
- Vérifier pas expiré (24h)
- Re-upload nouveau IPA
- Générer nouveau lien

---

## 🎉 Félicitations !

Vous avez maintenant :
- ✅ App Android téléchargeable (APK direct)
- ✅ App iOS téléchargeable (via Diawi)
- ✅ Page download unifiée
- ✅ 100% GRATUIT

**Coût total** : $0/mois 🎊
