# 📋 Guide Complet - Système d'Inspection & GPS

## 🔍 Problème Identifié : Bouton "Démarrer" Invisible

### Pourquoi le bouton "Démarrer" n'apparaît pas ?

Le bouton **"Démarrer"** n'apparaît que pour les missions avec le statut `pending`. Voici la logique :

```tsx
// src/pages/Missions.tsx - Ligne 598
{mission.status === 'pending' && (
  <>
    <button onClick={() => navigate(`/inspection/departure/${mission.id}`)}>
      Démarrer
    </button>
    <button onClick={() => setShowAssignModal(true)}>
      Assigner
    </button>
  </>
)}
```

### États d'une Mission

```
┌──────────────────────────────────────────────────────────────┐
│  WORKFLOW COMPLET D'UNE MISSION                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  1. PENDING (En attente)                                     │
│     ├─ Boutons visibles:                                     │
│     │  ✅ "Démarrer" → Lance inspection départ              │
│     │  ✅ "Assigner" → Assigne à un contact                 │
│     └─ Action: Créer mission                                │
│                                                              │
│  2. ASSIGNED (Assignée)                                      │
│     ├─ Créée après assignation à un contact                 │
│     └─ Boutons: Même chose que pending                      │
│                                                              │
│  3. IN_PROGRESS (En cours)                                   │
│     ├─ Créée après inspection de départ                     │
│     ├─ Boutons visibles:                                     │
│     │  ✅ "États des lieux" → Voir inspections              │
│     │  ✅ "Inspection d'arrivée" → Terminer mission         │
│     └─ GPS: Actif (suivi en temps réel)                     │
│                                                              │
│  4. COMPLETED (Terminée)                                     │
│     ├─ Créée après inspection d'arrivée                     │
│     ├─ Boutons visibles:                                     │
│     │  ✅ "États des lieux" → Voir rapport complet          │
│     └─ GPS: Arrêté                                          │
│                                                              │
│  5. CANCELLED (Annulée)                                      │
│     └─ Boutons: "Supprimer" seulement                       │
└──────────────────────────────────────────────────────────────┘
```

---

## 🚀 Comment Démarrer une Mission

### Option 1: Via l'Interface Web

**Étape 1: Créer une Mission**
1. Missions → **"+ Nouvelle mission"**
2. Remplir tous les champs:
   - Référence (auto-générée)
   - Véhicule (marque, modèle, plaque, VIN)
   - Adresse départ
   - Adresse livraison
   - Date enlèvement
   - Prix (optionnel)
3. **"Créer la mission"**
4. **Statut initial:** `pending` ✅

**Étape 2: Vérifier le Statut**
```sql
-- Dans Supabase Dashboard → SQL Editor
SELECT id, reference, status FROM missions ORDER BY created_at DESC LIMIT 5;
```

**Attendu:**
| id | reference | status |
|----|-----------|--------|
| abc... | MIS-20251011-001 | **pending** ✅ |

**Étape 3: Démarrer l'Inspection**
1. Aller dans **Missions** → Onglet **"Mes Missions"**
2. Trouver la mission avec statut `pending`
3. Cliquer **"Démarrer"** (bouton bleu avec icône Play)
4. → Redirection vers `/inspection/departure/{missionId}`

---

### Option 2: Via Mobile

**Étape 1: Ouvrir l'App Mobile**
```bash
cd mobile
npx expo start
```

**Étape 2: Navigation**
1. Menu → **Missions**
2. Liste des missions
3. Sélectionner mission avec badge `En attente`
4. Bouton **"Démarrer Inspection"**

**Étape 3: Inspection de Départ**
- Écran avec 3 onglets:
  1. **Départ** (photos)
  2. **GPS** (navigation)
  3. **Arrivée** (photos)

---

## 📸 Processus d'Inspection Complet

### Phase 1: Inspection de Départ

**Objectif:** Documenter l'état du véhicule AVANT le transport

**Photos Requises (6):**
1. ✅ **Vue avant** - Façade complète
2. ✅ **Vue arrière** - Arrière complet
3. ✅ **Côté gauche** - Profil gauche entier
4. ✅ **Côté droit** - Profil droit entier
5. ✅ **Intérieur** - Habitacle + sièges
6. ✅ **Tableau de bord** - Compteur kilométrique visible

**Informations à Remplir:**
- Kilométrage initial
- Niveau carburant (0-100%)
- État général (Excellent/Bon/Moyen/Mauvais)
- Nombre de clés
- Documents à bord (carte grise, certificat)
- Pare-brise (état)
- Nom du client (signature)
- Notes supplémentaires

**Action Finale:**
- Cliquer **"Finaliser l'inspection"**
- → Mission passe en statut `in_progress` ✅
- → GPS démarre automatiquement 📍

---

### Phase 2: Suivi GPS (Automatique)

**Démarrage:**
- ✅ Automatique après inspection départ
- 📍 Position enregistrée toutes les **2 secondes**
- 🗺️ Trajet visible en temps réel

**Table Supabase:**
```sql
SELECT * FROM gps_location_points 
WHERE mission_id = 'votre-mission-id'
ORDER BY recorded_at DESC;
```

**Résultat attendu:**
| latitude | longitude | speed | altitude | recorded_at |
|----------|-----------|-------|----------|-------------|
| 48.8566 | 2.3522 | 50 | 35 | 2025-10-11 14:30:45 |
| 48.8565 | 2.3523 | 52 | 36 | 2025-10-11 14:30:47 |

**Navigation:**
- Bouton **"Ouvrir dans Waze"**
- Bouton **"Ouvrir dans Google Maps"**
- Adresse de départ → Adresse de livraison

---

### Phase 3: Inspection d'Arrivée

**Objectif:** Documenter l'état du véhicule APRÈS le transport

**Photos Requises (6):**
1. ✅ **Vue avant arrivée**
2. ✅ **Vue arrière arrivée**
3. ✅ **Côté gauche arrivée**
4. ✅ **Côté droit arrivée**
5. ✅ **Intérieur arrivée**
6. ✅ **Tableau de bord arrivée** (kilométrage final)

**Informations:**
- Kilométrage final
- État général à l'arrivée
- Dommages éventuels (comparaison avec départ)
- Nom du destinataire (signature)
- Notes finales

**Action Finale:**
- Cliquer **"Finaliser l'inspection d'arrivée"**
- → Mission passe en statut `completed` ✅
- → GPS arrêté automatiquement 🛑
- → **Rapport PDF généré** 📄

---

## 🗄️ Structure des Tables Supabase

### 1. `missions`
```sql
CREATE TABLE missions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  reference TEXT UNIQUE,
  status TEXT DEFAULT 'pending',  -- ⭐ CLEF DU PROBLÈME
  vehicle_brand TEXT,
  vehicle_model TEXT,
  vehicle_plate TEXT,
  pickup_address TEXT,
  delivery_address TEXT,
  pickup_date DATE,
  price DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Statuts possibles:**
- `pending` → Bouton "Démarrer" visible ✅
- `assigned` → Assignée à un contact
- `in_progress` → Inspection départ faite, GPS actif
- `completed` → Inspection arrivée faite
- `cancelled` → Annulée

---

### 2. `vehicle_inspections`
```sql
CREATE TABLE vehicle_inspections (
  id UUID PRIMARY KEY,
  mission_id UUID REFERENCES missions(id),
  inspector_id UUID REFERENCES auth.users,
  inspection_type TEXT,  -- 'departure' ou 'arrival'
  overall_condition TEXT,
  fuel_level DECIMAL(5,2),
  mileage_km INTEGER,
  notes TEXT,
  status TEXT DEFAULT 'in_progress',  -- ou 'completed'
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Workflow:**
1. Clic "Démarrer" → INSERT inspection avec `inspection_type = 'departure'`, `status = 'in_progress'`
2. Pendant inspection → UPDATE avec photos, notes, etc.
3. Clic "Finaliser" → UPDATE `status = 'completed'`, `completed_at = NOW()`
4. Puis UPDATE `missions.status = 'in_progress'`

---

### 3. `inspection_photos`
```sql
CREATE TABLE inspection_photos (
  id UUID PRIMARY KEY,
  inspection_id UUID REFERENCES vehicle_inspections(id),
  photo_type TEXT,  -- 'front', 'back', 'left_side', etc.
  photo_url TEXT,   -- URL Supabase Storage
  uploaded_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Types de photos:**
- **Départ:** `front`, `back`, `left_side`, `right_side`, `interior`, `dashboard`
- **Arrivée:** `arrival_front`, `arrival_back`, `arrival_left`, `arrival_right`, `arrival_interior`, `arrival_dashboard`

---

### 4. `gps_tracking_sessions`
```sql
CREATE TABLE gps_tracking_sessions (
  id UUID PRIMARY KEY,
  mission_id UUID REFERENCES missions(id),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  total_distance_km DECIMAL(10,2),
  average_speed_kmh DECIMAL(5,2),
  status TEXT  -- 'active', 'paused', 'completed'
);
```

---

### 5. `gps_location_points`
```sql
CREATE TABLE gps_location_points (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES gps_tracking_sessions(id),
  mission_id UUID REFERENCES missions(id),
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  altitude DECIMAL(8,2),
  speed DECIMAL(5,2),
  accuracy DECIMAL(6,2),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Fréquence d'enregistrement:**
- Mobile: Toutes les **2 secondes** (configurable)
- Web: Toutes les **5 secondes**

---

## 🔧 Résolution des Problèmes

### Problème 1: Bouton "Démarrer" Invisible

**Cause:** Mission n'a pas le statut `pending`

**Solution:**
```sql
-- Vérifier le statut actuel
SELECT id, reference, status FROM missions 
WHERE reference = 'MIS-20251011-001';

-- Si status != 'pending', forcer:
UPDATE missions 
SET status = 'pending' 
WHERE id = 'votre-mission-id';
```

**Puis recharger la page** → Bouton "Démarrer" devrait apparaître ✅

---

### Problème 2: Mission Bloquée en "in_progress"

**Cause:** Inspection de départ commencée mais pas terminée

**Diagnostic:**
```sql
SELECT * FROM vehicle_inspections 
WHERE mission_id = 'votre-mission-id' 
  AND inspection_type = 'departure'
  AND status = 'in_progress';
```

**Solution 1 (Terminer manuellement):**
```sql
UPDATE vehicle_inspections 
SET status = 'completed', 
    completed_at = NOW(),
    overall_condition = 'good',
    fuel_level = 50,
    mileage_km = 50000
WHERE id = 'inspection-id';
```

**Solution 2 (Réinitialiser):**
```sql
-- Supprimer l'inspection incomplète
DELETE FROM vehicle_inspections WHERE id = 'inspection-id';

-- Remettre mission en pending
UPDATE missions SET status = 'pending' WHERE id = 'mission-id';
```

---

### Problème 3: GPS ne Démarre Pas

**Causes possibles:**
1. Permissions GPS refusées
2. Service GPS désactivé
3. Inspection de départ pas terminée

**Vérifications:**
```sql
-- 1. Vérifier session GPS existe
SELECT * FROM gps_tracking_sessions WHERE mission_id = 'mission-id';

-- 2. Vérifier points GPS enregistrés
SELECT COUNT(*) FROM gps_location_points WHERE mission_id = 'mission-id';
```

**Solution Mobile:**
```typescript
// mobile/src/services/gpsTrackingService.ts
const { status } = await Location.requestForegroundPermissionsAsync();
if (status !== 'granted') {
  Alert.alert('Permission requise', 'Activez la localisation');
}
```

**Solution Web:**
```typescript
// src/services/gpsTrackingService.ts
navigator.geolocation.getCurrentPosition(
  (position) => console.log('GPS OK:', position),
  (error) => console.error('GPS Error:', error),
  { enableHighAccuracy: true }
);
```

---

### Problème 4: Photos ne s'Uploadent Pas

**Cause:** Permissions Supabase Storage ou bucket inexistant

**Vérification:**
```sql
-- Vérifier le bucket existe
SELECT * FROM storage.buckets WHERE name = 'inspection-photos';
```

**Si bucket manquant:**
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('inspection-photos', 'inspection-photos', true);
```

**Permissions RLS:**
```sql
-- Autoriser upload
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'inspection-photos');

-- Autoriser lecture publique
CREATE POLICY "Allow public reads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'inspection-photos');
```

---

## 📊 Dashboard Inspection

### Voir Toutes les Inspections

```sql
SELECT 
  m.reference,
  m.status,
  m.vehicle_brand || ' ' || m.vehicle_model AS vehicle,
  vi_dep.created_at AS inspection_depart,
  vi_arr.created_at AS inspection_arrivee,
  gps.total_distance_km,
  gps.average_speed_kmh
FROM missions m
LEFT JOIN vehicle_inspections vi_dep 
  ON m.id = vi_dep.mission_id AND vi_dep.inspection_type = 'departure'
LEFT JOIN vehicle_inspections vi_arr 
  ON m.id = vi_arr.mission_id AND vi_arr.inspection_type = 'arrival'
LEFT JOIN gps_tracking_sessions gps 
  ON m.id = gps.mission_id
WHERE m.user_id = auth.uid()
ORDER BY m.created_at DESC;
```

---

## 🎯 Checklist de Démarrage

### Pour Démarrer une Inspection

- [ ] Mission créée avec **statut = `pending`** ✅
- [ ] Permissions GPS accordées (mobile)
- [ ] Connexion internet active
- [ ] Supabase accessible (pas d'erreur réseau)
- [ ] Tables créées (migrations appliquées)
- [ ] Storage bucket `inspection-photos` existe
- [ ] RLS policies actives

### Pendant l'Inspection

- [ ] Photos prises (6 minimum)
- [ ] Kilométrage renseigné
- [ ] Niveau carburant indiqué
- [ ] État général sélectionné
- [ ] Nom client/signature capturée
- [ ] Notes ajoutées (si besoin)

### Après Finalisation Départ

- [ ] Mission passe en `in_progress` ✅
- [ ] GPS démarre automatiquement 📍
- [ ] Bouton "Inspection d'arrivée" visible
- [ ] Points GPS enregistrés dans DB

### Après Finalisation Arrivée

- [ ] Mission passe en `completed` ✅
- [ ] GPS arrêté 🛑
- [ ] Rapport PDF généré 📄
- [ ] Bouton "États des lieux" visible

---

## 🚀 Tests Rapides

### Test 1: Créer et Démarrer une Mission (Web)

```bash
# 1. Accéder à l'app
http://localhost:5174/missions

# 2. Créer mission
- Cliquer "+ Nouvelle mission"
- Référence: MIS-TEST-001
- Véhicule: Toyota Corolla
- Plaque: AB-123-CD
- Départ: Paris
- Livraison: Lyon
- Date: Demain
- Créer

# 3. Vérifier statut
SELECT reference, status FROM missions WHERE reference = 'MIS-TEST-001';
# Attendu: status = 'pending'

# 4. Démarrer
- Cliquer "Démarrer" (bouton bleu)
- → Redirection vers /inspection/departure/...

# 5. Remplir inspection
- Prendre 6 photos
- Kilométrage: 50000
- Carburant: 75%
- État: Bon
- Nom: Test Client
- Finaliser

# 6. Vérifier changement statut
SELECT status FROM missions WHERE reference = 'MIS-TEST-001';
# Attendu: status = 'in_progress'
```

### Test 2: GPS Tracking (Mobile)

```bash
# 1. Lancer app mobile
npx expo start

# 2. Créer mission + Démarrer inspection
# 3. Finaliser inspection départ

# 4. Vérifier GPS dans Supabase
SELECT COUNT(*) FROM gps_location_points 
WHERE mission_id = 'mission-test-id';
# Attendu: > 0 (points GPS enregistrés)

# 5. Ouvrir navigation
- Cliquer "Ouvrir dans Waze"
- Vérifier redirection
```

---

## 📞 Support

### Si Problème Persiste

1. **Vérifier logs console:**
   - Web: F12 → Console
   - Mobile: Metro Bundler output

2. **Vérifier Supabase:**
   ```sql
   -- Missions
   SELECT * FROM missions WHERE user_id = auth.uid();
   
   -- Inspections
   SELECT * FROM vehicle_inspections ORDER BY created_at DESC LIMIT 10;
   
   -- GPS
   SELECT * FROM gps_tracking_sessions ORDER BY started_at DESC LIMIT 5;
   ```

3. **Réinitialiser une mission:**
   ```sql
   -- Supprimer inspections liées
   DELETE FROM vehicle_inspections WHERE mission_id = 'mission-id';
   
   -- Supprimer points GPS
   DELETE FROM gps_location_points WHERE mission_id = 'mission-id';
   DELETE FROM gps_tracking_sessions WHERE mission_id = 'mission-id';
   
   -- Remettre en pending
   UPDATE missions SET status = 'pending' WHERE id = 'mission-id';
   ```

---

**Temps de lecture:** ~15 minutes  
**Difficulté:** Moyenne  
**Prérequis:** Migrations SQL appliquées, compte Supabase actif

🚀 **Prêt à démarrer vos inspections !**
