# 🔍 ANALYSE INSPECTION - MOBILE vs WEB

## ❌ PROBLÈMES IDENTIFIÉS

### 1. **Champs manquants dans le mobile**

Le web enregistre dans `vehicle_inspections` :
```typescript
- inspector_id (vs user_id sur mobile)
- has_vehicle_documents ❌
- has_registration_card ❌
- vehicle_is_full ❌
- windshield_condition ❌
- external_cleanliness ❌
- internal_cleanliness ❌
- has_spare_wheel ❌
- has_repair_kit ❌
- photo_time ❌
- photo_location ❌
- photo_weather ❌
- client_name ❌
- client_signature ❌
```

### 2. **Étapes manquantes dans le mobile**

**Web (3 étapes complètes) :**
- ✅ Étape 1 : Photos obligatoires (6 extérieures)
- ✅ Étape 2 : Formulaire détaillé (15+ champs)
- ✅ Étape 3 : Signature client + notes

**Mobile (simplifié) :**
- ✅ Photos (6 obligatoires)
- ⚠️ Formulaire basique (5 champs seulement)
- ❌ Pas de signature client
- ❌ Pas de conditions photo
- ❌ Pas de vérification documents

### 3. **Photos optionnelles**

**Web :**
- Photos intérieur/dashboard (optionnelles)
- Photos dommages additionnelles (illimitées)

**Mobile :**
- ❌ Pas de photos optionnelles

## ✅ SOLUTION : Aligner le mobile sur le web

### Changements à apporter :

#### A. Ajouter l'étape 2 complète
```typescript
// Documents et équipement
- has_vehicle_documents (checkbox)
- has_registration_card (checkbox)
- vehicle_is_full (checkbox)
- has_spare_wheel (checkbox)
- has_repair_kit (checkbox)

// Propreté
- external_cleanliness (select: propre/sale/très sale)
- internal_cleanliness (select: propre/sale/très sale)

// État
- windshield_condition (select: bon/fissuré/cassé)

// Conditions de prise de vue
- photo_time (select: jour/nuit/aube/crépuscule)
- photo_location (select: parking/rue/garage/autre)
- photo_weather (select: beau-temps/pluie/neige/brouillard)
```

#### B. Ajouter l'étape 3 - Signature
```typescript
- client_name (input text)
- client_signature (canvas signature ou photo)
- notes (textarea)
```

#### C. Photos optionnelles
- Ajouter possibilité de prendre photos intérieur
- Ajouter bouton "Ajouter photo dommage"

#### D. Corriger le champ
```typescript
// Remplacer
user_id: user.id

// Par
inspector_id: user.id
```

## 📊 STRUCTURE COMPLÈTE À IMPLÉMENTER

### Étape 1 : Photos obligatoires (6)
- Face avant
- Face arrière
- Latéral gauche avant
- Latéral gauche arrière
- Latéral droit avant
- Latéral droit arrière

### Étape 2 : Informations véhicule
```typescript
// Mesures
- fuel_level: number (0-100)
- mileage_km: number

// État général
- overall_condition: 'excellent' | 'good' | 'fair' | 'poor'
- windshield_condition: 'bon' | 'fissuré' | 'cassé'

// Propreté
- external_cleanliness: 'propre' | 'sale' | 'très sale'
- internal_cleanliness: 'propre' | 'sale' | 'très sale'

// Documents et équipement
- keys_count: number
- has_vehicle_documents: boolean
- has_registration_card: boolean
- has_spare_wheel: boolean
- has_repair_kit: boolean
- vehicle_is_full: boolean

// Conditions photo
- photo_time: 'jour' | 'nuit' | 'aube' | 'crépuscule'
- photo_location: 'parking' | 'rue' | 'garage' | 'autre'
- photo_weather: 'beau-temps' | 'pluie' | 'neige' | 'brouillard'
```

### Étape 3 : Photos optionnelles
- Interior (optionnel)
- Dashboard (optionnel)
- Dommages additionnels (illimités)

### Étape 4 : Validation et signature
```typescript
- notes: string
- client_name: string
- client_signature: string (base64 ou URL)
```

## 🎯 ACTIONS REQUISES

1. ✅ Modifier `InspectionDepartureNew.tsx` (mobile)
2. ✅ Ajouter composant `SignaturePad` (mobile)
3. ✅ Ajouter étapes 2, 3, 4
4. ✅ Corriger champ `inspector_id`
5. ✅ Ajouter photos optionnelles
6. ✅ Tester synchronisation avec web
7. ✅ Vérifier rapports affichent toutes les données

## 📝 NOTES

- Le web utilise `inspector_id`, pas `user_id`
- La signature est stockée en base64 ou URL publique
- Les photos optionnelles ne bloquent pas la validation
- Les 6 photos extérieures restent obligatoires
