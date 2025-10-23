# Comparaison Formulaire de Création de Mission

## Champs Web (MissionCreate.tsx)

### Étape 1 - Informations véhicule
- ✅ `reference` (auto-généré)
- ✅ `vehicle_brand` (Marque)
- ✅ `vehicle_model` (Modèle)
- ✅ `vehicle_type` (VL/VU/PL) - **MANQUANT MOBILE**
- ✅ `vehicle_plate` (Immatriculation)
- ✅ `vehicle_vin` (Numéro VIN) - **MANQUANT MOBILE**
- ✅ `vehicle_image_url` (Photo du véhicule) - **MANQUANT MOBILE**

### Étape 2 - Enlèvement
- ✅ `pickup_address` (avec autocomplete API Adresse)
- ✅ `pickup_lat` / `pickup_lng` (coordonnées GPS) - **MANQUANT MOBILE**
- ✅ `pickup_date`
- ✅ `pickup_contact_name`
- ✅ `pickup_contact_phone`

### Étape 3 - Livraison
- ✅ `delivery_address` (avec autocomplete API Adresse)
- ✅ `delivery_lat` / `delivery_lng` (coordonnées GPS) - **MANQUANT MOBILE**
- ✅ `delivery_date`
- ✅ `delivery_contact_name`
- ✅ `delivery_contact_phone`

### Étape 4 - Notes et récapitulatif
- ✅ `notes`
- ✅ Prévisualisation PDF

## Champs Mobile (MissionCreateScreen.tsx)

- ✅ `pickup_address` (simple TextInput sans autocomplete)
- ✅ `delivery_address` (simple TextInput sans autocomplete)
- ✅ `pickup_contact_name`
- ✅ `pickup_contact_phone`
- ✅ `delivery_contact_name`
- ✅ `delivery_contact_phone`
- ✅ `vehicle_brand`
- ✅ `vehicle_model`
- ✅ `vehicle_plate`
- ✅ `pickupDate` / `deliveryDate` (avec DateTimePicker)
- ⚠️ `price` - **PAS DANS WEB** (calculé automatiquement selon type)
- ✅ `notes`

## Différences Majeures

### ❌ Manquants dans Mobile
1. **Type de véhicule** (VL/VU/PL) - Important pour tarification
2. **VIN** - Identification unique du véhicule
3. **Photo du véhicule** - Upload image
4. **Coordonnées GPS** - lat/lng pour pickup et delivery
5. **Autocomplete d'adresses** - API Adresse du gouvernement français
6. **Système de steps/wizard** (4 étapes sur web vs 1 page sur mobile)
7. **Prévisualisation PDF**

### ⚠️ Champs en trop dans Mobile
1. **Price** - Sur le web, le prix n'est pas dans le formulaire de création

## Actions Requises

1. ✅ Ajouter `vehicle_type` avec sélection VL/VU/PL
2. ✅ Ajouter `vehicle_vin`
3. ✅ Ajouter upload photo véhicule (expo-image-picker)
4. ✅ Intégrer API Adresse gouv.fr pour autocomplete
5. ✅ Ajouter capture GPS lors de sélection adresse
6. ✅ Supprimer le champ `price`
7. ✅ Organiser en steps/pages (ou gardait ScrollView bien structuré)
