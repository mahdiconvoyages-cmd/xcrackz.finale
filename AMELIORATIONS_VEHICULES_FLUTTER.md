# ✅ SUPPORT 2D - CAMIONNETTE & POIDS LOURD

## 1. Nouveaux Dessins 2D Implémentés

Le système de `CustomPainter` a été étendu pour supporter 3 types de véhicules distincts avec des dessins vectoriels "Premium" :

### 🚐 Véhicule Utilitaire (Van, Master, Traffic)
- **Design** : Forme carrée, hauteur importante, pare-brise vertical.
- **Détails** : 
  - Grands rétroviseurs verticaux.
  - Portes arrières battantes (2 vitres).
  - Rail de porte latérale coulissante visible sur le profil.
  - Protection latérales (baguettes).

### 🚛 Poids Lourd (Camion, Porteur)
- **Design** : Cabine distincte de la caisse (box).
- **Détails** : 
  - Cabine avancée haute.
  - Caisse cargo volumineuse à l'arrière.
  - Roues doubles à l'arrière (visuellement).
  - Façade avant plate et massive.

### 🚗 Véhicule Léger (Déjà existant)
- **Design** : Berline fluide, courbes aérodynamiques.
- **Rappel** : Utilisé par défaut pour "Berline" et "SUV".

## 2. Architecture Technique

Le widget `VehicleBodyMap` utilise maintenant un **Strategy Pattern** via le `_VehiclePainter` :

```dart
void _paintTopView(...) {
  if (vehicleType == VehicleType.utilitaire) {
    _paintTopViewVan(...); // Nouveau
  } else if (vehicleType == VehicleType.camion) {
    _paintTopViewTruck(...); // Nouveau
  } else {
    _paintTopViewSedan(...); // Existant
  }
}
```

## 3. Comment Tester

1. Lancer l'application mobile.
2. Créer ou éditer une mission.
3. Sélectionner le type de véhicule :
   - **"Utilitaire"** -> Affiche le Van blanc.
   - **"Camion / PL"** -> Affiche le Camion (Cabine blanche + Caisse grise).
   - **"Berline" / "SUV"** -> Affiche la voiture standard.
