-- 🗑️ SUPPRIMER GOOGLE MAPS (Optionnel)
-- 
-- Si vous voulez complètement retirer Google Maps de mobile
-- et utiliser UNIQUEMENT OpenStreetMap/Apple Maps (GRATUIT)

-- ✅ Ce script est OPTIONNEL
-- Mobile fonctionne déjà sans Google Maps API Key avec PROVIDER_DEFAULT

-- 📱 MOBILE : Modifications à faire

-- 1. Dans mobile/app.json, SUPPRIMER ces lignes :

/*
"android": {
  "config": {
    "googleMaps": {
      "apiKey": "VOTRE_GOOGLE_MAPS_API_KEY"  // ❌ À SUPPRIMER
    }
  }
}
*/

-- 2. Dans mobile/src/screens/TeamMapScreen.tsx :

-- AVANT (avec Google) :
/*
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

<MapView
  provider={PROVIDER_GOOGLE}  // ❌ Google Maps (payant)
  ...
/>
*/

-- APRÈS (sans Google, GRATUIT) :
/*
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';

<MapView
  provider={PROVIDER_DEFAULT}  // ✅ Apple Maps (iOS) ou OSM (Android)
  ...
/>
*/

-- 3. RÉSULTAT :
-- iOS → Utilise Apple Maps (100% gratuit)
-- Android → Utilise OpenStreetMap (100% gratuit)
-- Pas besoin d'API Key Google !

-- 💡 NOTES :
-- - PROVIDER_DEFAULT est déjà utilisé dans TeamMapScreen.tsx ✅
-- - Aucune modification nécessaire, déjà GRATUIT !
-- - Google Maps API Key n'est PAS nécessaire
-- - Économie : ~200€/mois

-- 🌐 WEB : Utiliser OpenStreetMap

-- Remplacer tous les Google Maps par OpenStreetMap component :

/*
// AVANT (Google Maps - payant)
import GoogleMapReact from 'google-map-react';

<GoogleMapReact
  bootstrapURLKeys={{ key: 'GOOGLE_API_KEY' }}
  ...
/>

// APRÈS (OpenStreetMap - GRATUIT)
import { OpenStreetMap } from '../components/OpenStreetMap';

<OpenStreetMap
  markers={[...]}
  routes={[...]}
  height="600px"
/>
*/

-- ✅ RÉSULTAT FINAL

-- Web :
--   - OpenStreetMap (Leaflet) → 0€
--   - Pas d'API key nécessaire
--   - Qualité identique

-- Mobile :
--   - iOS : Apple Maps → 0€
--   - Android : OpenStreetMap → 0€
--   - Pas d'API key nécessaire

-- ÉCONOMIES : ~200-300€ par mois ! 💰

-- 🎯 AUCUNE ACTION REQUISE
-- Le système mobile utilise déjà PROVIDER_DEFAULT (gratuit)
-- Juste utiliser OpenStreetMap component pour le web
