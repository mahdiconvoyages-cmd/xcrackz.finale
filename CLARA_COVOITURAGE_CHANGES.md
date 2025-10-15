# 🔧 Modifications Techniques - Clara Covoiturage

## 📁 Fichiers Modifiés

### `src/services/aiServiceEnhanced.ts`

#### Ligne 13 - Type AIAction
```typescript
// AVANT
export interface AIAction {
  type: 'create_mission' | 'assign_mission' | 'suggest_driver' | 'analyze_mission' | ... | 'get_monthly_revenue';
  ...
}

// APRÈS
export interface AIAction {
  type: 'create_mission' | 'assign_mission' | 'suggest_driver' | 'analyze_mission' | ... | 'get_monthly_revenue' | 'search_carpooling' | 'publish_carpooling' | 'book_carpooling' | 'list_my_trips';
  ...
}
```

**Ajouté:** 4 nouvelles actions covoiturage

---

#### Lignes 146-176 - Capacités Covoiturage
```typescript
7. **COVOITURAGE** 🚗💨 ⭐ NOUVEAU !
   - **Rechercher des trajets** disponibles
   - **Publier un trajet** (coût: 2 crédits)
   - **Réserver un trajet** (coût: 2 crédits + prix au conducteur)
   - Lister mes trajets (conducteur ou passager)
   
   **Recherche de trajets:**
   - Utilisateur: "Cherche trajets Paris-Lyon le 15 octobre"
   - Tu affiches: conducteurs, prix, places, horaires
   - Filtres: animaux acceptés, réservation instantanée
   
   **Publication de trajet:**
   - Coût: **2 crédits** (déduits automatiquement)
   - Infos nécessaires: départ, arrivée, date/heure, places, prix par place
   - Prix minimum: 2€ par place (règle BlaBlaCar)
   - Places: entre 1 et 8
   - Options: animaux, musique, niveau bavardage
   
   **Réservation de trajet:**
   - Coût: **2 crédits bloqués** jusqu'à confirmation + prix en espèces au conducteur
   - Message obligatoire au conducteur (min 20 caractères)
   - Vérification places disponibles
   - Confirmation par le conducteur requise
   
   **Règles des crédits:**
   - Publication: 2 crédits déduits immédiatement
   - Réservation: 2 crédits bloqués (remboursés si refus/annulation >24h)
   - Si crédits insuffisants: proposer d'acheter des crédits
```

**Ajouté:** 30 lignes de description des capacités

---

#### Lignes 360-445 - Workflows Covoiturage
```typescript
**COVOITURAGE - Recherche de trajets:** 🚗💨 ⭐ NOUVEAU !
1. Utilisateur: "Cherche trajets Paris-Lyon le 15 octobre" ou "Y a-t-il des covoiturages pour Marseille ?"
2. **Récupérer les infos nécessaires:**
   - Ville de départ (ex: Paris)
   - Ville d'arrivée (ex: Lyon)
   - Date de départ (ex: 2025-10-15)
   - (Optionnel) Nombre de places min
   - (Optionnel) Prix max par place
   - (Optionnel) Animaux acceptés
3. Rechercher dans carpooling_trips
4. **Afficher les résultats:**
   - Nombre de trajets trouvés
   - Pour chaque trajet (max 5):
     * Conducteur + rating
     * Départ → Arrivée
     * Date et heure
     * Places disponibles
     * Prix par place
     * Options (animaux, musique, bavardage)
     * ID du trajet
5. Proposer: "Pour réserver, dis-moi 'Réserve [nb] place(s) pour le trajet [ID]'"

**COVOITURAGE - Publication de trajet:** 🚗💨 ⭐ NOUVEAU !
1. Utilisateur: "Publie un trajet Paris-Lyon" ou "Je veux proposer un covoiturage"
2. **Vérifier crédits: ≥2 crédits requis**
   - Si insuffisant: "❌ Il te faut 2 crédits pour publier un trajet. Solde: [X] crédits. Veux-tu acheter des crédits ? 💳"
3. **Demander les informations obligatoires:**
   - "Adresse de départ complète ?" (ex: 10 Rue de Rivoli, 75001 Paris)
   - "Ville de départ ?" (ex: Paris)
   - "Adresse d'arrivée complète ?" (ex: 5 Place Bellecour, 69002 Lyon)
   - "Ville d'arrivée ?" (ex: Lyon)
   - "Date et heure de départ ?" (ex: 2025-10-15 à 14:00)
   - "Nombre de places disponibles ?" (entre 1 et 8)
   - "Prix par place ?" (min 2€, règle BlaBlaCar)
4. **Demander les options (facultatif):**
   - "Animaux acceptés ?" (oui/non, défaut: non)
   - "Fumeurs acceptés ?" (oui/non, défaut: non)
   - "Musique autorisée ?" (oui/non, défaut: oui)
   - "Niveau bavardage ?" (bla=silencieux, blabla=normal, blablabla=bavard, défaut: blabla)
   - "Max 2 à l'arrière ?" (oui/non, défaut: non)
   - "Taille bagage ?" (small/medium/large/xl, défaut: medium)
   - "Réservation instantanée ?" (oui/non, défaut: non)
   - "Description/Note ?" (optionnel)
5. **Publier le trajet:**
   - Créer dans carpooling_trips
   - Déduire 2 crédits immédiatement
   - Confirmer avec récapitulatif complet + ID trajet

**COVOITURAGE - Réservation de trajet:** 🚗💨 ⭐ NOUVEAU !
1. Utilisateur: "Réserve 2 places pour le trajet [ID]" ou "Je veux réserver ce trajet"
2. **Vérifier crédits: ≥2 crédits requis**
   - Si insuffisant: "❌ Il te faut 2 crédits pour réserver un trajet. Solde: [X] crédits. Veux-tu acheter des crédits ? 💳"
3. **Récupérer les infos du trajet:**
   - Vérifier que le trajet existe
   - Vérifier places disponibles
   - Vérifier que ce n'est pas son propre trajet
4. **Demander les informations:**
   - "Combien de places veux-tu réserver ?" (si pas spécifié)
   - "Message au conducteur ?" (OBLIGATOIRE, min 20 caractères - règle BlaBlaCar)
5. **Validation message:**
   - Si < 20 caractères: "❌ Le message doit contenir au moins 20 caractères (règle BlaBlaCar). Actuel: [X]/20. Peux-tu donner plus de détails ?"
6. **Créer la réservation:**
   - Insérer dans carpooling_bookings
   - Bloquer 2 crédits (blocked_credits)
   - Calculer prix total: places × prix_par_place
7. **Confirmer:**
   - "✅ Réservation envoyée au conducteur, ${userName} ! 🎉"
   - Détails: trajet, places, prix total
   - "💳 2 crédits bloqués (remboursés si refus)"
   - "💰 Prix à payer au conducteur: [X]€ en espèces"
   - "⏳ En attente de confirmation du conducteur"

**COVOITURAGE - Lister mes trajets:** 🚗💨 ⭐ NOUVEAU !
1. Utilisateur: "Mes trajets" ou "Liste mes covoiturages"
2. **Récupérer:**
   - Trajets où je suis conducteur (carpooling_trips.driver_id = userId)
   - Trajets où je suis passager (carpooling_bookings.passenger_id = userId)
3. **Afficher:**
   - Section "En tant que conducteur" (si applicable)
   - Section "En tant que passager" (si applicable)
   - Statut, date, ville départ/arrivée, prix, places
```

**Ajouté:** 85 lignes de workflows détaillés

---

#### Lignes 810-990 - Exemples de Conversations
```typescript
**COVOITURAGE - Recherche de trajets:** 🚗💨 ⭐ NOUVEAU !
"Utilisateur: Cherche trajets Paris-Lyon le 15 octobre
Toi: Parfait Mahdi ! Je cherche des covoiturages Paris → Lyon pour le 15/10/2025... 🔍

✅ **3 trajets disponibles** 🚗

**1. Paris → Lyon**
   🕐 Départ: 15/10/2025 à 14:00
   👤 Conducteur: Jean Dupont ⭐ 4.8/5
   💺 Places disponibles: 3/4
   💰 Prix par place: 25€
   ✨ ⚡ Réservation instantanée, 🐕 Animaux acceptés, 🎵 Musique
   📝 "Trajet sympa, je m'arrête pour une pause café vers Dijon"
   🆔 ID: \`trip-abc-123\`
   
[... 8 scénarios supplémentaires ...]
```

**Ajouté:** 180 lignes d'exemples de conversations

---

#### Lignes 1040-1055 - Rappels Importants
```typescript
- ⚠️ **NOUVEAU: COVOITURAGE:** 🚗💨
  - **Recherche:** Vérifier ville départ, ville arrivée, date
  - **Publication:** Vérifier 2 crédits disponibles, prix ≥2€, places 1-8
  - **Réservation:** Vérifier 2 crédits disponibles, message ≥20 caractères
  - **Crédits:**
    * Publication: 2 crédits déduits IMMÉDIATEMENT
    * Réservation: 2 crédits BLOQUÉS (remboursés si refus/annulation >24h)
  - **Prix:** Passager paie en espèces au conducteur (pas par l'app)
  - **Message conducteur:** OBLIGATOIRE et min 20 caractères (règle BlaBlaCar)
  - Si crédits insuffisants: proposer d'acheter des crédits
```

**Ajouté:** 15 lignes de rappels

---

## 📊 Statistiques des Modifications

| Fichier | Lignes ajoutées | Sections ajoutées | Actions ajoutées |
|---------|-----------------|-------------------|------------------|
| `aiServiceEnhanced.ts` | ~310 lignes | 4 sections majeures | 4 actions |
| `CLARA_COVOITURAGE_GUIDE.md` | ~1100 lignes | 12 sections | - |
| `CLARA_COVOITURAGE_RECAP.md` | ~350 lignes | 10 sections | - |
| `CLARA_COVOITURAGE_QUICKSTART.md` | ~380 lignes | 8 sections | - |
| **TOTAL** | **~2140 lignes** | **34 sections** | **4 actions** |

---

## 🔗 Intégration avec Services Existants

### Services utilisés (déjà existants)

```typescript
// src/services/carpoolingService.ts

1. searchTrips(userId, criteria)
   - Input: TripSearchCriteria
   - Output: { success, trips, message }
   - Utilisé par: search_carpooling

2. formatTripsForClara(trips)
   - Input: CarpoolingTrip[]
   - Output: string (formaté pour affichage)
   - Utilisé par: search_carpooling

3. publishTrip(userId, tripData)
   - Input: TripPublishData
   - Output: { success, tripId, message }
   - Vérifications: crédits, validation prix/places
   - Utilisé par: publish_carpooling

4. bookTrip(userId, bookingData)
   - Input: BookingData
   - Output: { success, bookingId, message }
   - Vérifications: crédits, message ≥20, places disponibles
   - Utilisé par: book_carpooling

5. getUserTripsAsDriver(userId)
   - Output: { success, trips }
   - Utilisé par: list_my_trips

6. getUserBookingsAsPassenger(userId)
   - Output: { success, bookings }
   - Utilisé par: list_my_trips
```

**Aucune modification nécessaire** dans `carpoolingService.ts` - Clara utilise les services existants !

---

## 🗄️ Tables Supabase Utilisées

### `carpooling_trips`
```sql
- id: UUID
- driver_id: UUID (référence profiles)
- departure_address: TEXT
- departure_city: TEXT
- departure_datetime: TIMESTAMP
- arrival_address: TEXT
- arrival_city: TEXT
- total_seats: INTEGER (1-8)
- available_seats: INTEGER
- price_per_seat: NUMERIC (≥2€)
- status: TEXT (active/cancelled/completed/full)
- allows_pets: BOOLEAN
- allows_smoking: BOOLEAN
- allows_music: BOOLEAN
- chat_level: TEXT (bla/blabla/blablabla)
- max_two_back: BOOLEAN
- luggage_size: TEXT (small/medium/large/xl)
- instant_booking: BOOLEAN
- description: TEXT
```

### `carpooling_bookings`
```sql
- id: UUID
- trip_id: UUID (référence carpooling_trips)
- passenger_id: UUID (référence profiles)
- seats_booked: INTEGER
- total_price: NUMERIC
- trip_price: NUMERIC
- credit_cost: INTEGER (2)
- status: TEXT (pending/confirmed/rejected/cancelled/completed/no_show)
- message: TEXT (≥20 caractères)
```

### `profiles` (colonnes crédits)
```sql
- credits: INTEGER
- blocked_credits: INTEGER
```

**Aucune modification de schéma nécessaire** - Tables déjà existantes !

---

## ⚙️ Logique de Gestion des Crédits

### Publication
```typescript
// Avant publication
if (credits < 2) {
  return "❌ Crédits insuffisants";
}

// Publier trajet
await supabase.from('carpooling_trips').insert(tripData);

// Déduire crédits
await supabase
  .from('profiles')
  .update({ credits: credits - 2 })
  .eq('id', userId);
```

### Réservation
```typescript
// Avant réservation
const availableCredits = credits - blocked_credits;
if (availableCredits < 2) {
  return "❌ Crédits insuffisants";
}

// Créer réservation
await supabase.from('carpooling_bookings').insert(bookingData);

// Bloquer crédits
await supabase
  .from('profiles')
  .update({ blocked_credits: blocked_credits + 2 })
  .eq('id', userId);

// Quand conducteur accepte
await supabase
  .from('profiles')
  .update({ 
    credits: credits - 2,
    blocked_credits: blocked_credits - 2 
  })
  .eq('id', userId);

// Quand conducteur refuse
await supabase
  .from('profiles')
  .update({ blocked_credits: blocked_credits - 2 })
  .eq('id', userId);
```

---

## 🧪 Points de Test Critiques

### 1. Validation des crédits
- [ ] Vérifier blocage si < 2 crédits (publication)
- [ ] Vérifier blocage si disponibles < 2 crédits (réservation)
- [ ] Vérifier déduction correcte après publication
- [ ] Vérifier blocage/déblocage correct après réservation

### 2. Validation des règles BlaBlaCar
- [ ] Prix minimum 2€ (publication)
- [ ] Places entre 1 et 8 (publication)
- [ ] Message ≥ 20 caractères (réservation)

### 3. Validation des places
- [ ] Vérifier places disponibles avant réservation
- [ ] Bloquer si places demandées > places disponibles

### 4. Validation des trajets
- [ ] Bloquer si utilisateur réserve son propre trajet
- [ ] Vérifier que le trajet existe avant réservation

---

## 📝 Résumé des Changements

### Actions Clara
- ✅ `search_carpooling` - Recherche de trajets
- ✅ `publish_carpooling` - Publication de trajet (2 crédits)
- ✅ `book_carpooling` - Réservation de trajet (2 crédits bloqués)
- ✅ `list_my_trips` - Lister mes trajets

### Workflows
- ✅ 4 workflows complets (recherche, publication, réservation, liste)
- ✅ Gestion complète des crédits (déduction, blocage, remboursement)
- ✅ Validation selon règles BlaBlaCar

### Documentation
- ✅ Guide complet (1100+ lignes)
- ✅ Récapitulatif technique (350+ lignes)
- ✅ Quick Start (380+ lignes)
- ✅ Modifications techniques (ce fichier)

### Total
- **~310 lignes** de code ajoutées à `aiServiceEnhanced.ts`
- **~1830 lignes** de documentation créées
- **0 ligne** modifiée dans `carpoolingService.ts` (réutilisation services existants)

---

**Clara Covoiturage est maintenant opérationnelle ! 🚗💨**

Prochaine étape: Tests avec de vraies conversations
