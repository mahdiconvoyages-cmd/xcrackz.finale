# 💰 PLAN D'OPTIMISATION - ÉCONOMIE COÛTS APIs

## 🎯 OBJECTIF
Remplacer les services payants par des alternatives gratuites pour économiser sur les coûts

---

## 📋 CHANGEMENTS À IMPLÉMENTER

### 1️⃣ TRACKING (Public) : Google Maps → Leaflet 🗺️
**Scope** : Cartes de suivi temps réel (pages publiques)

**Fichiers Web à modifier** :
- ✅ `src/components/RealTimeTracking.tsx` (utilise Google Maps)
- ✅ `src/pages/PublicTracking.tsx` (utilise Mapbox)
- ✅ `src/pages/TrackingEnriched.tsx` (utilise MapboxTracking)

**Fichiers Mobile à modifier** :
- ✅ `mobile/src/screens/GPSTrackingScreen.tsx` (utilise Google Maps/PROVIDER_GOOGLE)

**Solution** : 
- **Leaflet.js** (100% gratuit, open-source)
- Tuiles : OpenStreetMap (gratuit)
- Pas de clé API nécessaire
- Performant et léger

**Dépendances** :
```bash
# Web
npm install leaflet react-leaflet
npm install -D @types/leaflet

# Mobile
npm install react-native-leaflet
```

---

### 2️⃣ GPS NAVIGATION : Garder Mapbox (mais optimisé) 🧭
**Scope** : Navigation GPS temps réel (écrans privés)

**Fichiers à conserver Mapbox** :
- ✅ `src/components/MapboxTracking.tsx` (navigation privée)
- ⚠️ Remplacer dans `mobile/src/screens/InspectionGPSScreen.tsx` par Mapbox

**Pourquoi Mapbox pour navigation** :
- ✅ Calcul d'itinéraires optimisé
- ✅ Navigation turn-by-turn
- ✅ Couche gratuite généreuse (50k requêtes/mois)
- ✅ Meilleur que Leaflet pour navigation

**Action** :
- Garder Mapbox UNIQUEMENT pour navigation GPS (usage privé)
- Ajouter Mapbox GL Native pour mobile

---

### 3️⃣ AUTOCOMPLETE ADRESSES : API Adresse Gouv 🇫🇷
**Scope** : Tous les champs d'adresse

**Fichiers à modifier** :
- ✅ Tous les formulaires avec adresses (MissionCreate, etc.)
- ✅ Créer un service d'autocomplete réutilisable

**API Gouv** :
- 🆓 100% GRATUIT
- 🇫🇷 Données françaises officielles (BAN - Base Adresse Nationale)
- 📍 Géocodage inclus (lat/lng)
- ⚡ Rapide et fiable
- 🔓 Pas de clé API nécessaire

**Endpoint** :
```
https://api-adresse.data.gouv.fr/search/?q={query}&limit=5
```

**Response** :
```json
{
  "features": [
    {
      "properties": {
        "label": "8 Boulevard du Port 80000 Amiens",
        "score": 0.95,
        "housenumber": "8",
        "street": "Boulevard du Port",
        "postcode": "80000",
        "city": "Amiens",
        "context": "80, Somme, Hauts-de-France"
      },
      "geometry": {
        "coordinates": [2.29, 49.89]
      }
    }
  ]
}
```

---

## 💰 ÉCONOMIES ESTIMÉES

### Avant (avec APIs payantes)
- Google Maps : ~200€/mois (50k requêtes)
- Mapbox (tracking) : ~50€/mois
- Google Places (autocomplete) : ~150€/mois
- **TOTAL** : ~400€/mois = **4,800€/an**

### Après (APIs gratuites)
- Leaflet : 0€ (open-source)
- Mapbox (navigation uniquement) : 0€ (tier gratuit suffisant)
- API Adresse Gouv : 0€ (service public)
- **TOTAL** : **0€/mois = 0€/an**

### 🎉 ÉCONOMIE : 4,800€/an

---

## 🔧 IMPLÉMENTATION

### Phase 1 : Créer les services réutilisables
1. ✅ Service API Adresse Gouv (`src/services/addressService.ts`)
2. ✅ Composant AddressAutocomplete (`src/components/AddressAutocomplete.tsx`)
3. ✅ Composant LeafletMap pour tracking (`src/components/LeafletTracking.tsx`)

### Phase 2 : Web - Remplacer tracking par Leaflet
1. ✅ Remplacer `RealTimeTracking.tsx` (Google Maps → Leaflet)
2. ✅ Remplacer `PublicTracking.tsx` (Mapbox → Leaflet)
3. ✅ Adapter `TrackingEnriched.tsx`

### Phase 3 : Mobile - Remplacer tracking par Leaflet
1. ✅ Remplacer `GPSTrackingScreen.tsx` (Google Maps → Leaflet)

### Phase 4 : Navigation GPS - Utiliser Mapbox
1. ✅ Adapter `InspectionGPSScreen.tsx` pour Mapbox
2. ✅ Garder MapboxTracking.tsx pour navigation privée

### Phase 5 : Autocomplete - API Adresse Gouv
1. ✅ Intégrer dans tous les formulaires d'adresse
2. ✅ Web : MissionCreate, ContactsForm, etc.
3. ✅ Mobile : CreateMissionWizard, etc.

---

## ✅ AVANTAGES

### Leaflet (Tracking)
- ✅ 100% gratuit, open-source
- ✅ Léger (~40KB gzipped vs 200KB+ Google Maps)
- ✅ Pas de clé API (pas de limite)
- ✅ Support offline possible
- ✅ Hautement personnalisable
- ✅ Grande communauté

### API Adresse Gouv (Autocomplete)
- ✅ 100% gratuit (service public)
- ✅ Données officielles à jour
- ✅ Géocodage inclus
- ✅ Pas de quota
- ✅ RGPD compliant
- ✅ Très rapide

### Mapbox (Navigation seulement)
- ✅ Tier gratuit généreux
- ✅ Navigation optimisée
- ✅ Turn-by-turn
- ✅ Meilleur routing que Leaflet

---

## 📦 DÉPENDANCES À INSTALLER

### Web
```bash
npm install leaflet react-leaflet
npm install -D @types/leaflet
```

### Mobile
```bash
cd mobile
npm install react-native-webview
# Utiliser Leaflet via WebView pour tracking
# Garder expo-location pour géolocalisation
```

---

## 🚀 ORDRE D'EXÉCUTION

1. ✅ Créer service API Adresse Gouv
2. ✅ Créer composant AddressAutocomplete
3. ✅ Créer composant LeafletTracking (web)
4. ✅ Remplacer tracking web (3 fichiers)
5. ✅ Remplacer tracking mobile (1 fichier)
6. ✅ Adapter navigation GPS Mapbox
7. ✅ Intégrer autocomplete partout
8. ✅ Tests complets
9. ✅ Documentation

---

## ⚠️ POINTS D'ATTENTION

### Leaflet
- Nécessite CSS (`leaflet.css`)
- Markers personnalisés à créer
- Animations à gérer manuellement

### API Adresse Gouv
- Adresses françaises uniquement
- Pour international : fallback vers autre API ou saisie manuelle

### Mapbox (navigation)
- Garder la clé API dans .env
- Surveiller quotas (50k/mois gratuit)
- Utiliser uniquement pour navigation privée

---

## 📊 STATUT

- [ ] Phase 1 : Services réutilisables
- [ ] Phase 2 : Web tracking → Leaflet
- [ ] Phase 3 : Mobile tracking → Leaflet
- [ ] Phase 4 : Navigation GPS → Mapbox
- [ ] Phase 5 : Autocomplete → API Gouv
- [ ] Tests et validation
- [ ] Documentation finale

---

**Début** : 12 octobre 2025  
**Estimation** : 2-3 heures  
**Économie annuelle** : 4,800€ 💰
