# 📱 SYNCHRONISATION WEB ↔️ MOBILE - PLAN D'ACTION

## 🎯 OBJECTIF
Mettre à jour l'app mobile pour avoir **TOUTES les fonctionnalités** de la version web.

---

## ✅ NOUVELLES FONCTIONNALITÉS WEB À INTÉGRER DANS MOBILE

### 1. 🎯 **SYSTÈME D'ASSIGNATION DE MISSIONS**
**Statut Web:** ✅ Complété  
**Statut Mobile:** ❌ À implémenter

**Fonctionnalités:**
- [x] Voir la liste de tous les utilisateurs (profiles)
- [x] Assigner une mission à un autre utilisateur
- [x] Recevoir des missions assignées (onglet "Mes Missions")
- [x] Voir qui a assigné quelle mission et quand
- [x] Réassigner une mission si le chauffeur se désiste
- [x] Annulation automatique de l'ancienne assignation lors de réassignation
- [x] Paiement HT + Commission pour chaque assignation

**Fichiers Web de référence:**
- `src/pages/TeamMissions.tsx` (1571 lignes) - Interface complète
- `src/services/missionPdfGenerator.ts` - Génération PDF mission

**À créer sur Mobile:**
- `mobile/src/screens/TeamMissionsScreen.tsx` - Équivalent TeamMissions
- `mobile/src/screens/ReceivedMissionsScreen.tsx` - Mes Missions
- `mobile/src/services/missionPdfGenerator.ts` - PDF mobile

---

### 2. 📞 **CONTACTS DÉPART/ARRIVÉE DANS MISSIONS**
**Statut Web:** ✅ Complété  
**Statut Mobile:** ❌ À implémenter

**Fonctionnalités:**
- [x] Afficher contact départ (nom + téléphone)
- [x] Afficher contact arrivée (nom + téléphone)
- [x] Numéros de téléphone cliquables pour appeler directement
- [x] Affichage dans les détails de mission
- [x] Affichage dans le PDF

**Modification nécessaire:**
- Ajouter champs `pickup_contact_name`, `pickup_contact_phone`, `delivery_contact_name`, `delivery_contact_phone` dans interface Mission mobile
- Afficher ces infos dans les écrans de mission
- Boutons "Appeler" pour tel:// links

---

### 3. 📄 **GÉNÉRATION PDF MISSION COMPLÈTE**
**Statut Web:** ✅ Complété  
**Statut Mobile:** ❌ À implémenter

**Fonctionnalités:**
- [x] Bouton "Détails & PDF" dans liste missions
- [x] Modal avec tous les détails de la mission
- [x] Génération PDF professionnel avec:
  - En-tête avec référence
  - Infos véhicule
  - Itinéraire complet (départ/arrivée)
  - Contacts avec téléphones
  - Infos d'assignation (qui, quand, combien)
  - Notes
  - Footer avec date

**Package nécessaire:**
- `react-native-pdf` ou `react-native-html-to-pdf`
- `react-native-share` pour partager le PDF

---

### 4. 👥 **GESTION CONTACTS/ÉQUIPE**
**Statut Web:** ✅ Complété  
**Statut Mobile:** ⚠️ Partiellement (à moderniser)

**Fonctionnalités Web:**
- [x] Liste de tous les utilisateurs (profiles)
- [x] Plus de système d'invitation compliqué
- [x] Direct: voir tous les profiles = contacts possibles
- [x] Assigner directement à n'importe quel utilisateur

**À simplifier sur Mobile:**
- Supprimer système d'invitation contact
- Charger directement depuis `profiles` table
- Interface simple: liste users avec email

---

### 5. 🔔 **NOTIFICATIONS D'ASSIGNATION**
**Statut Web:** ❌ Pas de notifs (browser)  
**Statut Mobile:** ⚠️ OneSignal installé mais pas configuré pour assignations

**À implémenter:**
- [ ] Notification push quand mission assignée
- [ ] Notification quand mission réassignée
- [ ] Notification quand mission annulée
- [ ] Badge sur onglet "Mes Missions" avec nombre

**Fichier à créer:**
- Edge Function: `supabase/functions/send-assignment-notification`
- Trigger: Envoyer notif sur INSERT/UPDATE mission_assignments

---

### 6. 📊 **STATISTIQUES ÉQUIPE**
**Statut Web:** ✅ Complété (onglet Statistiques)  
**Statut Mobile:** ❌ À implémenter

**Fonctionnalités:**
- [x] Nombre total de missions
- [x] Missions par statut
- [x] Missions assignées vs reçues
- [x] Performance équipe

---

## 🗂️ STRUCTURE MOBILE À CRÉER/MODIFIER

### Nouveaux écrans nécessaires:
```
mobile/src/screens/
├── TeamMissionsScreen.tsx      (NEW) - Gestion équipe + assignations
├── ReceivedMissionsScreen.tsx  (NEW) - Mes missions reçues
├── MissionDetailsScreen.tsx    (UPDATE) - Ajouter contacts + PDF
├── TeamStatsScreen.tsx         (NEW) - Statistiques équipe
└── ContactsScreen.tsx          (SIMPLIFY) - Liste profiles directe
```

### Services à créer:
```
mobile/src/services/
├── missionPdfGenerator.ts      (NEW) - Génération PDF mission
├── assignmentService.ts        (NEW) - Gestion assignations
└── profileService.ts           (NEW) - Chargement profiles
```

### Components à créer:
```
mobile/src/components/
├── AssignmentCard.tsx          (NEW) - Card mission assignée
├── UserSelector.tsx            (NEW) - Sélecteur d'utilisateur
├── ContactInfo.tsx             (NEW) - Affichage contact (nom + tel)
└── MissionPDFPreview.tsx       (NEW) - Aperçu avant génération PDF
```

---

## 📋 CHECKLIST IMPLÉMENTATION

### Phase 1: Backend & Data (DÉJÀ FAIT ✅)
- [x] RLS policies mission_assignments
- [x] Trigger réassignation automatique
- [x] contact_id nullable
- [x] Champs contacts dans missions

### Phase 2: Screens Core
- [ ] TeamMissionsScreen (liste missions + assigner)
- [ ] ReceivedMissionsScreen (mes missions reçues)
- [ ] Moderniser ContactsScreen (profiles direct)

### Phase 3: Fonctionnalités Avancées
- [ ] Génération PDF mission
- [ ] Modal détails mission complète
- [ ] Contacts téléphone cliquables

### Phase 4: Notifications
- [ ] Edge function notification assignation
- [ ] Trigger sur mission_assignments
- [ ] Badge sur tab "Mes Missions"

### Phase 5: UI/UX Polish
- [ ] Animations
- [ ] Loading states
- [ ] Error handling
- [ ] Refresh pull-to-refresh

---

## 🎨 DESIGN COHÉRENCE WEB ↔️ MOBILE

### Couleurs (identiques):
```typescript
const colors = {
  primary: '#3B82F6',      // Blue
  secondary: '#10B981',    // Green
  accent: '#F59E0B',       // Orange
  danger: '#EF4444',       // Red
  success: '#22C55E',      // Green success
};
```

### Composants similaires:
- **Card mission**: Même layout (ref, véhicule, adresses, prix)
- **Badges statut**: Mêmes couleurs par statut
- **Boutons actions**: Mêmes icônes (Play, FileText, etc.)

---

## 🚀 ORDRE D'IMPLÉMENTATION RECOMMANDÉ

### Sprint 1: Core Assignation (2-3h)
1. Créer `TeamMissionsScreen.tsx` - Liste missions
2. Créer `ReceivedMissionsScreen.tsx` - Mes missions
3. Simplifier `ContactsScreen` - Load profiles
4. Tester assignation basique

### Sprint 2: Détails & PDF (2h)
1. Ajouter contacts dans `MissionDetailsScreen`
2. Créer `missionPdfGenerator.ts`
3. Bouton "Générer PDF"
4. Partage PDF

### Sprint 3: Notifications (1-2h)
1. Edge function notification
2. Trigger Supabase
3. Badge tab

### Sprint 4: Polish & Tests (1h)
1. Animations
2. Loading states
3. Tests utilisateur

**TEMPS TOTAL ESTIMÉ: 6-8 heures**

---

## 📝 NOTES IMPORTANTES

### Différences Web vs Mobile acceptables:
- **Navigation**: Tab bar mobile vs sidebar web
- **Modals**: Fullscreen mobile vs modal web
- **Formulaires**: Inputs natifs mobile vs web inputs

### À garder identique:
- **Logique métier**: Exactement pareil
- **Data flow**: Même queries Supabase
- **RLS policies**: Identiques
- **Statuts**: Mêmes états

---

## ✅ VALIDATION

Une fois implémenté, vérifier:
- [ ] Créer mission depuis web → visible sur mobile
- [ ] Assigner mission web → notif mobile + visible "Mes Missions"
- [ ] Assigner mission mobile → visible web
- [ ] Générer PDF mobile → même format que web
- [ ] Contacts téléphone cliquables mobile
- [ ] Réassignation fonctionne mobile

---

**🎯 READY TO START!**

Dis-moi par quelle partie on commence ! 🚀
