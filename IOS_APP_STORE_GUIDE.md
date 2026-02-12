# ChecksFleet - Guide iOS App Store (Flutter)

> **L'app mobile est en Flutter** (identique à Android). Pas de Mapbox, pas de Google Maps.

## Informations Apple Developer

| Champ | Valeur |
|-------|--------|
| Apple ID | mahdi.convoyages@gmail.com |
| Team ID | P35Y6M742T |
| Bundle ID | com.checksfleet.app |
| Nom | ChecksFleet |
| Version | 3.6.0 |

---

## Étape 1 : Créer l'app sur App Store Connect

1. Aller sur [App Store Connect](https://appstoreconnect.apple.com)
2. **"Apps"** → **"+"** → **"Nouvelle app"**
3. Remplir :
   - **Plateformes** : iOS
   - **Nom** : ChecksFleet
   - **Langue** : Français
   - **Bundle ID** : com.checksfleet.app
   - **SKU** : checksfleet-ios
4. **Noter l'App Apple ID** (numéro à 10 chiffres)

---

## Étape 2 : Configurer Codemagic (recommandé - pas besoin de Mac)

### 2.1 Connecter Apple Developer à Codemagic

1. Aller sur [Codemagic](https://codemagic.io)
2. **Teams** → **Integrations** → **App Store Connect**
3. Créer une clé API App Store Connect :
   - Aller sur [App Store Connect → Users & Access → Keys](https://appstoreconnect.apple.com/access/api)
   - Cliquer **"+"** → nom : "Codemagic" → accès : **Admin**
   - Télécharger le fichier `.p8`
   - Noter le **Key ID** et l'**Issuer ID**
4. Dans Codemagic, ajouter l'intégration "ChecksFleet" avec ces infos

### 2.2 Lancer le build iOS signé

Dans Codemagic :
1. Sélectionner le workflow **"iOS Build (App Store)"**
2. Cliquer **"Start new build"**
3. Codemagic va automatiquement :
   - Créer les certificats de distribution
   - Créer le provisioning profile
   - Builder l'app Flutter en .ipa
   - Signer l'app pour l'App Store

### 2.3 Alternative : Build non signé (pour tester)

Sélectionner le workflow **"iOS Build (Unsigned - Test)"** pour un build rapide sans signature.

---

## Étape 3 : Build local (si vous avez un Mac)

### 3.1 Prérequis

```bash
# Installer Xcode depuis le Mac App Store
# Installer CocoaPods
sudo gem install cocoapods
```

### 3.2 Préparer le projet

```bash
cd mobile_flutter/finality_app

# Installer les dépendances Flutter
flutter pub get

# Installer les pods iOS
cd ios
pod install
cd ..
```

### 3.3 Générer les icônes iOS

```bash
flutter pub run flutter_launcher_icons
```

### 3.4 Builder pour l'App Store

```bash
# Build IPA signé pour l'App Store
flutter build ipa --release --build-name=3.6.0 --build-number=37

# Le fichier IPA sera dans : build/ios/ipa/checksfleet_app.ipa
```

### 3.5 Ouvrir dans Xcode (optionnel)

```bash
open ios/Runner.xcworkspace
```

Dans Xcode :
- Vérifier **Signing & Capabilities** → Team = P35Y6M742T
- Vérifier Bundle Identifier = com.checksfleet.app
- **Product** → **Archive** → **Distribute App** → **App Store Connect**

---

## Étape 4 : Soumettre sur l'App Store

### Via Codemagic (automatique)
Codemagic peut publier automatiquement sur TestFlight/App Store après le build.

### Via Transporter (manuel)
1. Télécharger [Transporter](https://apps.apple.com/app/transporter/id1450874784) sur Mac
2. Ouvrir le fichier .ipa
3. Cliquer **"Deliver"**

---

## Étape 5 : Fiche App Store

### Description
```
ChecksFleet - Gestion complète de convoyages et inspections véhicules.

Fonctionnalités :
• Suivi GPS en temps réel des missions
• Inspection véhicule avec photos et états des lieux  
• Scanner de documents (permis, carte grise)
• Rapports d'inspection détaillés avec partage
• Gestion des missions de convoyage
• Facturation et devis automatisés
• Mode hors ligne

Application professionnelle pour les entreprises de convoyage automobile.
```

### Infos requises
- **Catégorie** : Business
- **Mots-clés** : convoyage, véhicule, inspection, transport, GPS, flotte, automobile
- **Captures d'écran** : iPhone 6.7" (1290×2796), iPhone 6.5" (1242×2688)
- **Politique de confidentialité** : URL obligatoire
- **Notes pour review** : Fournir un compte de test

---

## Dépendances de l'app (pas de maps tierces)

L'app utilise **uniquement** :
- `geolocator` → GPS natif (pas de Mapbox/Google)
- `supabase_flutter` → Backend
- `cunning_document_scanner` → Scanner documents
- `google_mlkit_text_recognition` → OCR (reconnaissance de texte, pas maps)
- `image_picker` → Photos
- `flutter_local_notifications` → Notifications
- `pdf` / `printing` → Génération PDF

**Aucune dépendance Mapbox ou Google Maps.**

---

## Checklist

- [ ] Créer l'app sur App Store Connect
- [ ] Configurer l'intégration Apple sur Codemagic  
- [ ] Lancer le build iOS via Codemagic
- [ ] Préparer captures d'écran iPhone
- [ ] Rédiger la description
- [ ] Ajouter politique de confidentialité
- [ ] Soumettre pour review Apple (24-48h)
