# 🗺️ Intégration OpenRouteService - Tracé GPS Temps Réel

## ✅ Configuration Terminée

L'API OpenRouteService a été intégrée avec succès dans votre application de tracking!

### 🔑 Clé API Configurée

```
eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImM1YTdjMDg1NGMxNjQ2NDM5NDBhMTZlMDY5YmI4MWM4IiwiaCI6Im11cm11cjY0In0=
```

Cette clé est maintenant intégrée dans:
- ✅ `src/lib/services/openRouteService.ts` (Service côté client)
- ✅ `supabase/functions/calculate-distance/index.ts` (Edge Function Supabase)

## 📦 Fichiers Créés/Modifiés

### 1. **Service OpenRouteService** (`src/lib/services/openRouteService.ts`)
Service TypeScript pour interagir avec l'API OpenRouteService:
- `getRouteFromOpenRouteService()` - Récupère le tracé GPS réel
- `formatDistance()` - Formatte la distance (ex: "12.5 km")
- `formatDuration()` - Formatte la durée (ex: "2h 30min")
- `calculateDistance()` - Calcul de distance en fallback (Haversine)

### 2. **Composant LeafletTracking Amélioré** (`src/components/LeafletTracking.tsx`)
Votre composant de carte a été mis à jour avec:
- ✅ **Tracé GPS réel** via OpenRouteService (au lieu d'une ligne droite)
- ✅ **Affichage de la distance** calculée par l'API
- ✅ **Affichage de la durée** estimée du trajet
- ✅ **Loader** pendant le chargement du tracé
- ✅ **Fallback automatique** en ligne droite si l'API échoue
- ✅ **Badge d'information** montrant la distance et la durée

### 3. **Edge Function Supabase** (`supabase/functions/calculate-distance/index.ts`)
Fonction serverless pour les calculs côté serveur:
- API key sécurisée côté serveur
- Support des profils véhicules (voiture/poids lourd)
- Gestion des erreurs robuste

## 🚀 Fonctionnalités Implémentées

### 1. Tracé GPS Réel
- Le composant `LeafletTracking` affiche maintenant le **tracé GPS réel** de la route
- Calcul automatique au chargement de la carte
- Mise à jour en temps réel si les coordonnées changent

### 2. Informations de Route
- **Distance totale** affichée en bas de la carte
- **Durée estimée** du trajet
- Formatage automatique (km/m pour distance, h/min pour durée)

### 3. Gestion d'Erreurs
- Si OpenRouteService échoue, affichage d'une **ligne droite en pointillés**
- Logs d'erreur dans la console pour debugging
- Pas de blocage de l'interface

### 4. Performance
- Chargement asynchrone du tracé
- Indicateur de chargement pendant le calcul
- Cache du tracé une fois chargé

## 🎨 Utilisation dans Vos Pages

### Page de Tracking (`src/pages/MissionTracking.tsx`)

Le composant `LeafletTracking` est déjà utilisé dans vos pages de tracking. Il affichera automatiquement le tracé GPS!

```tsx
<LeafletTracking
  pickupLat={mission.pickup_lat}
  pickupLng={mission.pickup_lng}
  pickupAddress={mission.pickup_address}
  deliveryLat={mission.delivery_lat}
  deliveryLng={mission.delivery_lng}
  deliveryAddress={mission.delivery_address}
  driverLat={currentPosition?.latitude}
  driverLng={currentPosition?.longitude}
  driverName={driverName}
  vehiclePlate={mission.vehicle_plate}
  status={mission.status}
  showControls={true}
  height="600px"
/>
```

### Pages Affectées (Mise à Jour Automatique)
- ✅ `/tracking` - TrackingList.tsx
- ✅ `/missions/:id/tracking` - MissionTracking.tsx
- ✅ `/tracking/public/:token` - PublicTracking.tsx

## 📊 Exemple Visuel

### Avant (Ligne Droite)
```
Départ -------- ligne droite -------- Arrivée
```

### Après (Tracé GPS Réel)
```
Départ 
   ↘️
     → (suit les routes réelles)
       ↗️
         → Arrivée
```

### Badge d'Information
```
┌─────────────────────────────────────────────┐
│ 📍 OpenStreetMap • Tracé GPS OpenRouteService│
│ 🛣️ 45.2 km  •  ⏱️ 1h 15min                  │
└─────────────────────────────────────────────┘
```

## 🔧 Profils de Véhicules Supportés

### Actuellement Utilisé
- `driving-car` - Pour tous les véhicules (légers, utilitaires)

### Disponible (à activer si besoin)
- `driving-hgv` - Pour poids lourds (Heavy Goods Vehicle)

Pour activer le profil poids lourd, modifiez dans `LeafletTracking.tsx`:
```typescript
const routeData = await getRouteFromOpenRouteService(
  pickupLat,
  pickupLng,
  deliveryLat,
  deliveryLng,
  'driving-hgv' // Au lieu de 'driving-car'
);
```

## 📈 Limites de l'API (Gratuit)

Avec votre clé API gratuite:
- ✅ **2 000 requêtes par jour**
- ✅ **40 requêtes par minute**
- ✅ Parfait pour une application moyenne

Si vous dépassez ces limites, vous verrez automatiquement un fallback vers la ligne droite.

## 🧪 Tests

### Test 1: Vérifier le Tracé GPS
1. Ouvrir une mission avec tracking actif
2. Aller sur `/missions/:id/tracking`
3. Vérifier que la ligne **suit les routes** (pas une ligne droite)
4. Vérifier l'affichage de la **distance et durée** en bas à gauche

### Test 2: Vérifier le Fallback
1. Mettre une mauvaise API key temporairement
2. Recharger la page
3. Vérifier qu'une **ligne droite en pointillés** s'affiche
4. Remettre la bonne API key

### Test 3: Performance
1. Ouvrir la console développeur
2. Charger une page de tracking
3. Vérifier que le message "Calcul du tracé GPS..." apparaît brièvement
4. Vérifier qu'aucune erreur n'apparaît

## 🔍 Debugging

### Console Logs Utiles

```typescript
// Dans LeafletTracking.tsx, déjà implémenté:
console.log('Route loaded:', routeData); // Affiche les données de route
console.error('Error loading route:', error); // Affiche les erreurs
```

### Vérifier l'API Key
```bash
# Test direct avec curl (PowerShell)
$headers = @{
  "Authorization" = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImM1YTdjMDg1NGMxNjQ2NDM5NDBhMTZlMDY5YmI4MWM4IiwiaCI6Im11cm11cjY0In0="
  "Content-Type" = "application/json"
}

$body = @{
  coordinates = @(
    @(2.3522, 48.8566),  # Paris
    @(5.3698, 43.2965)   # Marseille
  )
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://api.openrouteservice.org/v2/directions/driving-car/geojson" `
  -Method POST -Headers $headers -Body $body
```

## 🎯 Prochaines Étapes (Optionnel)

### 1. Calcul de Prix avec Distance Réelle
Utilisez la distance OpenRouteService pour calculer les prix:

```typescript
import { getRouteFromOpenRouteService } from '@/lib/services/openRouteService';
import { calculatePrice } from '@/lib/services/distanceService';

// Récupérer la distance réelle
const routeData = await getRouteFromOpenRouteService(startLat, startLng, endLat, endLng);
const distanceKm = routeData.distance / 1000;

// Calculer le prix avec la grille tarifaire
const price = calculatePrice(distanceKm, pricingGrid, 'light');
```

### 2. Sauvegarder le Tracé en BDD
Ajoutez une colonne `route_geometry` dans la table `missions`:

```sql
ALTER TABLE missions ADD COLUMN route_geometry JSONB;
```

Puis sauvegardez le tracé:
```typescript
const routeData = await getRouteFromOpenRouteService(...);
await supabase.from('missions').update({
  route_geometry: routeData.geometry
}).eq('id', missionId);
```

### 3. Afficher le Temps Restant (ETA)
Calculez l'ETA en fonction de la position actuelle du chauffeur.

### 4. Notifications de Position
Envoyez des notifications quand le chauffeur approche de la destination.

## 📚 Ressources

- [OpenRouteService API Docs](https://openrouteservice.org/dev/#/api-docs)
- [Leaflet Documentation](https://leafletjs.com/reference.html)
- [OpenStreetMap](https://www.openstreetmap.org/)

## ✨ Résumé

Vous avez maintenant:
- ✅ Tracé GPS réel dans toutes vos pages de tracking
- ✅ Distance et durée affichées automatiquement
- ✅ Fallback automatique en cas d'erreur
- ✅ API gratuite avec 2 000 req/jour
- ✅ Map Leaflet + OpenStreetMap (100% gratuit)

**Tout est prêt! Testez vos pages de tracking pour voir le tracé GPS en action! 🎉**
