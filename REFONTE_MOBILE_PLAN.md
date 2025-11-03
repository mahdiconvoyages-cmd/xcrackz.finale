# 🎯 PLAN D'ACTION - REFONTE COMPLÈTE MOBILE

## ✅ OBJECTIFS

### 1. Supprimer la Facturation Mobile
- ❌ Écran FacturationScreen.tsx
- ❌ Navigation Facturation
- ❌ Tab Facturation dans MainNavigator
- ❌ Tous les composants liés

### 2. Recréer Missions Mobile = Web
- ✅ Structure identique à `src/pages/TeamMissions.tsx` (web)
- ✅ Même tables Supabase
- ✅ Même logique de données
- ✅ Onglets : Missions | Reçues
- ✅ Modes d'affichage : Grid | List
- ✅ Filtres et recherche

### 3. Optimiser le PDF Scanner
- ✅ Comparaison départ/arrivée
- ✅ Affichage des signatures
- ✅ Photos téléchargeables séparément

---

## 📋 ÉTAPE 1 : SUPPRESSION FACTURATION

### Fichiers à Supprimer
```
src/screens/FacturationScreen.tsx
src/components/CreateInvoiceModal.tsx (si existe)
src/services/pdfGeneratorMobile.ts (facturation)
```

### Fichiers à Modifier
```
src/types/navigation.ts
  - Retirer FacturationStackParamList
  - Retirer Facturation de MainTabParamList

src/navigation/MainNavigator.tsx
  - Retirer le Tab Facturation
```

---

## 📋 ÉTAPE 2 : CRÉER NOUVEAU MISSIONS MOBILE

### Structure Web à Copier
```tsx
// src/pages/TeamMissions.tsx (WEB)
- Onglet "Missions" : Mes missions créées
- Onglet "Reçues" : Missions assignées à moi
- ViewMode : Grid / List
- Filtres : Status, Search, Archived
- Statuts calculés basés sur inspections :
  - pending : Aucune inspection
  - in_progress : Inspection départ seulement
  - completed : Départ + Arrivée (MASQUÉ)
```

### Nouveau Fichier Mobile
```
src/screens/MissionsScreen.tsx (NOUVEAU)
  - Onglets : Missions | Reçues
  - Modes : Grid | List
  - Recherche et filtres
  - Statuts basés sur inspections
  - EXACTEMENT comme TeamMissions.tsx web
```

### Tables Utilisées (Identiques Web)
```sql
missions
  - id, reference, pickup_address, delivery_address
  - pickup_date, delivery_date
  - vehicle_brand, vehicle_model, vehicle_plate, vehicle_image_url
  - status (calculé), price, notes
  - user_id (créateur)
  - assigned_user_id (assigné à)
  - archived, share_code

vehicle_inspections
  - id, mission_id, inspection_type (departure/arrival)
  - photos, signatures, etc.
```

---

## 📋 ÉTAPE 3 : OPTIMISER PDF SCANNER

### Modifications dans `src/services/missionPdfGeneratorMobile.ts`

**Ajouter :**
1. Section "Comparaison Départ/Arrivée"
   - Photos côte-à-côte
   - Signatures côte-à-côte
   
2. Option téléchargement photos
   - Bouton "Télécharger photos séparément"
   - Export en ZIP ou images individuelles

### Structure PDF
```
┌─────────────────────────────────┐
│ MISSION #REF-XXX                │
├─────────────────────────────────┤
│ INFORMATIONS MISSION            │
│ - Adresses                      │
│ - Véhicule                      │
│ - Dates                         │
├─────────────────────────────────┤
│ INSPECTION DÉPART               │
│ - Photos (grille)               │
│ - Signature conducteur          │
│ - Signature client              │
├─────────────────────────────────┤
│ INSPECTION ARRIVÉE              │
│ - Photos (grille)               │
│ - Signature conducteur          │
│ - Signature client              │
├─────────────────────────────────┤
│ 📊 COMPARAISON                  │
│ ┌──────────┬──────────┐        │
│ │  DÉPART  │ ARRIVÉE  │        │
│ ├──────────┼──────────┤        │
│ │ [Photo1] │ [Photo1] │        │
│ │ [Photo2] │ [Photo2] │        │
│ ├──────────┼──────────┤        │
│ │  Sign.   │  Sign.   │        │
│ └──────────┴──────────┘        │
└─────────────────────────────────┘
```

---

## 🔧 IMPLÉMENTATION DÉTAILLÉE

### PHASE 1 : Nettoyage Facturation (15 min)

1. Supprimer fichiers
2. Mettre à jour navigation
3. Vérifier pas d'erreurs

### PHASE 2 : Nouveau MissionsScreen (45 min)

1. Créer `src/screens/MissionsScreen.tsx`
2. Copier logique de TeamMissions.tsx web
3. Adapter UI pour React Native
4. Ajouter Material Top Tabs
5. Implémenter filtres et recherche
6. Tester avec données réelles

### PHASE 3 : PDF Optimisé (30 min)

1. Modifier missionPdfGeneratorMobile.ts
2. Ajouter section comparaison
3. Ajouter export photos
4. Tester génération PDF

---

## 📊 CHECKLIST FINALE

### Facturation
- [ ] FacturationScreen.tsx supprimé
- [ ] Navigation mise à jour
- [ ] Aucune référence restante
- [ ] Build sans erreurs

### Missions
- [ ] MissionsScreen.tsx créé
- [ ] Logique identique au web
- [ ] Onglets Missions/Reçues
- [ ] Modes Grid/List
- [ ] Filtres fonctionnels
- [ ] Statuts calculés corrects
- [ ] Photos missions affichées
- [ ] Navigation vers détails

### PDF
- [ ] Section comparaison ajoutée
- [ ] Signatures visibles
- [ ] Photos téléchargeables
- [ ] Test génération OK

---

## 🎯 RÉSULTAT ATTENDU

### Mobile Après Refonte
```
Tabs Bottom Navigation:
  ├─ Dashboard
  ├─ Missions (NOUVEAU - comme TeamMissions web)
  ├─ Inspections
  ├─ Covoiturage
  ├─ Scanner
  └─ Plus/Profil

(FACTURATION SUPPRIMÉE)
```

### Écran Missions
```
┌───────────────────────────────┐
│ 🎯 Mes Missions              │
├───────────────────────────────┤
│ [Missions] [Reçues]          │
│ [🔲 Grid] [📋 List]          │
│ [🔍 Recherche...]            │
│ [Filtres: Statut]            │
├───────────────────────────────┤
│ ┌─────────┐ ┌─────────┐     │
│ │Mission 1│ │Mission 2│     │
│ │ [Image] │ │ [Image] │     │
│ │ #REF-001│ │ #REF-002│     │
│ │ Status  │ │ Status  │     │
│ └─────────┘ └─────────┘     │
└───────────────────────────────┘
```

C'est parti !
