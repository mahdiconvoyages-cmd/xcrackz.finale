# 🍎 Créer IPA iOS avec Codemagic (Sans Mac)

## Étape 1 : Inscription Codemagic (2 minutes)

1. Aller sur https://codemagic.io/signup
2. Cliquer **"Sign up with GitHub"**
3. Autoriser accès à vos repos
4. Confirmer email

**Gratuit** : 500 minutes build/mois (largement suffisant)

---

## Étape 2 : Ajouter Projet Finality (3 minutes)

1. Dashboard Codemagic → **Applications** → **Add application**
2. Sélectionner **Flutter App**
3. Choisir votre repository GitHub (xcrackz.finale)
4. Branch : **main**
5. Codemagic détecte automatiquement : Flutter project ✅

---

## Étape 3 : Configurer Build iOS (5 minutes)

### Dans Codemagic Workflow Editor :

1. Cliquer sur votre app → **Workflow settings**
2. **Build → iOS**

### Configuration Minimal (Sans Certificat) :

```yaml
workflows:
  ios-workflow:
    name: iOS Release Build
    max_build_duration: 60
    instance_type: mac_mini_m1
    environment:
      flutter: stable
      xcode: 15.0
      cocoapods: default
    scripts:
      - name: Flutter packages
        script: |
          cd mobile
          flutter pub get
      
      - name: Build iOS (unsigned)
        script: |
          cd mobile
          flutter build ios --release --no-codesign
      
      - name: Create IPA
        script: |
          cd mobile/build/ios/iphoneos
          mkdir Payload
          mv Runner.app Payload/
          zip -r Finality.ipa Payload
          mv Finality.ipa ../../../
    
    artifacts:
      - mobile/*.ipa
```

3. **Save** → **Start new build**

---

## Étape 4 : Télécharger IPA (10-15 min build)

1. Attendre fin du build (statut : ✅ Success)
2. Onglet **Artifacts**
3. Télécharger **Finality.ipa**
4. Sauvegarder le fichier

**Localisation** : `C:\Users\mahdi\Downloads\Finality.ipa`

---

## 📦 Options Distribution IPA

### Option A : TestFlight (Recommandé, nécessite $99/an)

**Avantages** :
- Lien public simple : `https://testflight.apple.com/join/ABC123`
- 10,000 utilisateurs
- Installation facile (2 clics)

**Requis** :
- Compte Apple Developer ($99/an)
- Upload IPA sur App Store Connect
- Créer lien TestFlight public

**Ajout sur votre page** :
```html
<a href="https://testflight.apple.com/join/VOTRE-CODE" class="download-btn ios">
  📱 Télécharger iOS (TestFlight)
</a>
```

---

### Option B : Diawi (Gratuit temporaire)

**Avantages** :
- GRATUIT
- Upload IPA → Lien direct
- Pas de compte Apple Developer requis

**Limitations** :
- Lien expire 1-7 jours (gratuit)
- Nécessite quand même certificat iOS pour installer (Ad-Hoc profile)

**Workflow** :
1. Aller sur https://www.diawi.com
2. Upload `Finality.ipa`
3. Copier lien : `https://i.diawi.com/XYZ789`

**Ajout sur votre page** :
```html
<a href="https://i.diawi.com/XYZ789" class="download-btn ios">
  📱 Télécharger iOS (Beta)
</a>
```

---

### Option C : Héberger IPA sur Votre Site (Avancé)

**Requis** :
- Certificat Apple Developer ($99/an) OBLIGATOIRE
- HTTPS sur votre site
- Fichier `manifest.plist`

**Workflow** :
1. Copier IPA dans `public/downloads/`
2. Créer `manifest.plist`
3. Lien installation : `itms-services://?action=download-manifest&url=https://votre-site.com/manifest.plist`

**Avantages** :
- Contrôle total
- Pas de service tiers

**Limitations** :
- Configuration complexe
- Certificat Apple OBLIGATOIRE

---

## ⚠️ IMPORTANT : Certificat iOS

**Peu importe l'option choisie, iOS nécessite signature Apple** :

- ❌ **Sans certificat** : IPA créé mais ne peut être installé que pour test Xcode
- ✅ **Avec certificat** ($99/an) : IPA installable via TestFlight/Diawi/OTA

**Exceptions** :
- Simulateur iOS (test développeur uniquement)
- Jailbreak (pas recommandé pour production)

---

## 🎯 Ma Recommandation pour Finality

### **Phase 1 : Maintenant (Test)**

```
1. Build IPA via Codemagic (GRATUIT) ✅
2. Upload sur Diawi pour tests internes (GRATUIT) ✅
3. Lien Diawi sur votre page download temporairement ✅
```

**Résultat** : Vous pouvez tester que le build iOS fonctionne

---

### **Phase 2 : Production (1-2 mois)**

```
1. Payer compte Apple Developer ($99/an) ✅
2. Build IPA signé via Codemagic ✅
3. Upload TestFlight ✅
4. Lien TestFlight sur votre page download ✅
```

**Résultat** : Distribution publique iOS professionnelle

---

## ✅ Checklist Actions

- [ ] Créer compte Codemagic (gratuit)
- [ ] Ajouter projet Finality Flutter
- [ ] Configurer workflow iOS build
- [ ] Lancer premier build (10-15 min)
- [ ] Télécharger Finality.ipa
- [ ] Upload sur Diawi (test gratuit)
- [ ] Copier lien Diawi
- [ ] Ajouter lien sur page download
- [ ] **(Optionnel)** Payer Apple Developer ($99)
- [ ] **(Optionnel)** Setup TestFlight
- [ ] **(Optionnel)** Remplacer lien Diawi par TestFlight

---

## 🔗 Récapitulatif Liens

**Build iOS** : https://codemagic.io/signup  
**Upload Temporaire** : https://www.diawi.com  
**TestFlight Production** : https://appstoreconnect.apple.com  
**Apple Developer** : https://developer.apple.com/programs/enroll/

---

**Temps Total** : 20-30 minutes (premier build)  
**Coût** : $0 (Diawi) ou $99/an (TestFlight)
