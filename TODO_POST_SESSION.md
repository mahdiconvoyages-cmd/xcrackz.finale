# ✅ TODO - Actions Post-Session

## 🔴 URGENT (À Faire Maintenant)

### 1. Tester Fix Duplicate Keys (NOUVEAU)
**Temps:** 2 min | **Priorité:** CRITIQUE

- [x] Fix implémenté dans `MissionsScreen.tsx` (filtre par `contact_id`)
- [ ] Relancer app mobile sur Android/iOS
- [ ] Vérifier aucune erreur "Duplicate keys" dans logs
- [ ] Tester onglet "Reçues" : seulement missions assignées au contact de l'user
- [ ] Confirmer isolation : user A ne voit pas missions de user B

**Référence:** `FIX_DUPLICATE_KEYS_ERROR.md`

---

### 2. Appliquer Migrations SQL
**Temps:** 5 min | **Priorité:** CRITIQUE

- [ ] Ouvrir Supabase Dashboard → SQL Editor
- [ ] Copier `supabase/migrations/20251011_fix_rls_assignments_for_contacts.sql`
- [ ] Exécuter dans SQL Editor
- [ ] Vérifier policies créées:
  ```sql
  SELECT policyname FROM pg_policies WHERE tablename = 'mission_assignments';
  ```

**Résultat attendu:** 
```
✅ Users and contacts can view assignments
✅ Users and contacts can update assignments
```

---

### 2. Créer Contacts pour Utilisateurs Existants
**Temps:** 2 min | **Priorité:** CRITIQUE

- [ ] Ouvrir Supabase Dashboard → SQL Editor
- [ ] Exécuter:
  ```sql
  INSERT INTO contacts (user_id, type, name, email, is_active)
  SELECT 
    u.id,
    'driver' as type,
    COALESCE(
      u.raw_user_meta_data->>'full_name',
      SPLIT_PART(u.email, '@', 1)
    ) as name,
    u.email,
    true
  FROM auth.users u
  WHERE NOT EXISTS (
    SELECT 1 FROM contacts c WHERE c.user_id = u.id
  );
  ```

- [ ] Vérifier:
  ```sql
  SELECT COUNT(*) FROM contacts;
  SELECT COUNT(*) FROM auth.users;
  -- Les 2 nombres doivent être égaux ou proches
  ```

---

### 3. Vérifier Statut Missions pour Bouton "Démarrer"
**Temps:** 2 min | **Priorité:** HAUTE

**Problème:** Bouton "Démarrer" invisible car missions ont mauvais statut.

**Diagnostic:**
- [ ] Ouvrir Supabase Dashboard → SQL Editor
- [ ] Exécuter:
  ```sql
  SELECT id, reference, status FROM missions ORDER BY created_at DESC LIMIT 10;
  ```

**Si status ≠ 'pending':**
```sql
-- Forcer le statut pour voir le bouton
UPDATE missions SET status = 'pending' WHERE id = 'id-de-la-mission';
```

- [ ] Recharger page Missions
- [ ] Bouton bleu "Démarrer" devrait apparaître ✅

**Référence:** Consulter `FIX_BOUTON_DEMARRER.md` pour détails complets.

---

### 4. Tester Assignation Mission
**Temps:** 5 min | **Priorité:** HAUTE

**Setup:**
- [ ] Avoir 2 comptes : Admin (A) + Chauffeur (B)
- [ ] Vérifier que Chauffeur (B) a un contact dans `contacts`

**Test Web (Admin):**
- [ ] Connexion avec compte Admin
- [ ] Aller dans Missions → Onglet "Équipe"
- [ ] Cliquer "Assigner" sur une mission
- [ ] Sélectionner le chauffeur
- [ ] Remplir paiement: 100€, commission: 10€
- [ ] Valider
- [ ] **Attendu:** "Mission assignée avec succès"

**Test Mobile (Chauffeur):**
- [ ] Connexion avec compte Chauffeur
- [ ] Ouvrir écran Missions
- [ ] **Attendu:** Mission assignée visible avec badge "Assigné à moi"

**Si échec:**
- Vérifier logs console
- Relancer étape 1 et 2
- Consulter `FIX_ASSIGNATIONS_INVISIBLES.md`

---

## 🟠 IMPORTANT (Cette Semaine)

### 4. Tester Covoiturage Mobile (Optionnel)
**Temps:** 10 min | **Priorité:** MOYENNE

**Si vous voulez activer le covoiturage:**

- [ ] Appliquer migration `20251011_create_covoiturage_tables.sql`
- [ ] Vérifier tables créées:
  ```sql
  SELECT table_name FROM information_schema.tables 
  WHERE table_name LIKE 'covoiturage%';
  ```

**Test Publication:**
- [ ] Mobile app → Covoiturage → Publier
- [ ] Remplir formulaire complet:
  - Départ: Paris
  - Destination: Lyon  
  - Date: Demain
  - Heure: 14:30
  - Prix: 25€
  - Places: 2
  - Confort: Confort
  - Features: Climatisation + Musique
- [ ] Cliquer "Publier le trajet"
- [ ] **Attendu:** 
  - Alert "Succès"
  - Formulaire réinitialisé
  - Navigation vers onglet "Mes trajets"
  - Trajet visible dans la liste

**Vérification DB:**
```sql
SELECT * FROM covoiturage_trips 
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 1;
```

---

### 5. Intégrer getAllAssignments() dans Mobile
**Temps:** 15 min | **Priorité:** MOYENNE

**Fichier:** `mobile/src/screens/MissionsScreen.tsx` (ou équivalent)

**Changement:**
```typescript
// AVANT
const assignments = await getMissionAssignments(user.id);

// APRÈS
const assignments = await getAllAssignments(user.id);
```

**Avantages:**
- Affiche missions créées + reçues
- Pas de code dupliqué
- Tri automatique par date

**Test:**
- [ ] Ouvrir app mobile → Missions
- [ ] Vérifier que les 2 types d'assignations s'affichent:
  - Badge "Créé par moi" (admin)
  - Badge "Assigné à moi" (contact)

---

### 6. Afficher Badges dans Liste Assignations
**Temps:** 10 min | **Priorité:** BASSE

**Objectif:** Différencier visuellement missions créées vs reçues

**Mobile (MissionsScreen.tsx):**
```tsx
{assignments.map(assignment => (
  <View key={assignment.id}>
    {/* Badge si assigné à moi */}
    {assignment.contact_id === myContactId && (
      <View style={styles.badge}>
        <Text>Assigné à moi</Text>
      </View>
    )}
    
    {/* Badge si créé par moi */}
    {assignment.user_id === user.id && (
      <View style={[styles.badge, styles.badgeCreated]}>
        <Text>Créé par moi</Text>
      </View>
    )}
    
    {/* Reste de la carte mission */}
  </View>
))}
```

**Web (Missions.tsx):**
```tsx
{assignments.map(assignment => (
  <div key={assignment.id} className="mission-card">
    {/* Badge conditionnel */}
    {assignment.contact?.user_id === user.id ? (
      <span className="badge bg-blue-500">Assigné à moi</span>
    ) : (
      <span className="badge bg-green-500">Créé par moi</span>
    )}
    
    {/* Reste de la carte */}
  </div>
))}
```

---

## 🟡 OPTIONNEL (Ce Mois)

### 7. Notifications Push pour Assignations
**Temps:** 2-3h | **Priorité:** BASSE

**Technologies:**
- Expo Notifications (mobile)
- Firebase Cloud Messaging (FCM)
- Supabase Edge Functions (backend)

**Étapes:**
- [ ] Configurer FCM dans Expo
- [ ] Créer Edge Function `notify-assignment`
- [ ] Trigger on INSERT `mission_assignments`
- [ ] Envoyer push au `contact.user_id`
- [ ] Afficher notification dans app

**Référence:** Consulter doc Expo Notifications

---

### 8. Chat Covoiturage
**Temps:** 4-5h | **Priorité:** BASSE

**Tables déjà créées:**
- `covoiturage_messages` ✅

**À Faire:**
- [ ] Créer composant ChatScreen (mobile + web)
- [ ] Hook useMessages avec subscription temps réel
- [ ] UI liste messages + input
- [ ] Badge "non lu" sur icône chat

---

### 9. Paiements Stripe Covoiturage
**Temps:** 6-8h | **Priorité:** BASSE

**Étapes:**
- [ ] Compte Stripe créé
- [ ] Intégrer Stripe SDK (web + mobile)
- [ ] Créer Payment Intent lors réservation
- [ ] Webhook Stripe → Confirm réservation
- [ ] Historique transactions

---

### 10. Tests E2E
**Temps:** 8-10h | **Priorité:** BASSE

**Mobile (Detox):**
- [ ] Installer Detox
- [ ] Scénario: Publier trajet
- [ ] Scénario: Réserver trajet
- [ ] CI/CD avec GitHub Actions

**Web (Playwright):**
- [ ] Installer Playwright
- [ ] Scénario: Assigner mission
- [ ] Scénario: Contact voit mission
- [ ] CI/CD

---

## 📊 Progression

```
URGENT (3 tâches)
█████░░░░░  3/3  → 🔴 À FAIRE MAINTENANT

IMPORTANT (4 tâches)
██░░░░░░░░  0/4  → 🟠 CETTE SEMAINE

OPTIONNEL (4 tâches)
░░░░░░░░░░  0/4  → 🟡 CE MOIS
```

---

## 🎯 Ordre Recommandé

```
1. ✅ Migrations SQL (CRITIQUE)
2. ✅ Créer contacts (CRITIQUE)  
3. ✅ Tester assignation (HAUTE)
4. ⏳ Covoiturage test (MOYENNE)
5. ⏳ getAllAssignments mobile (MOYENNE)
6. ⏳ Badges assignations (BASSE)
7. ⏳ Notifications push (OPTIONNEL)
8. ⏳ Chat (OPTIONNEL)
9. ⏳ Paiements (OPTIONNEL)
10. ⏳ Tests E2E (OPTIONNEL)
```

---

## 📞 Aide

### Si Problème avec Assignations
1. Consulter `FIX_ASSIGNATIONS_INVISIBLES.md`
2. Vérifier logs SQL:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'mission_assignments';
   SELECT * FROM contacts WHERE user_id = auth.uid();
   ```

### Si Problème avec Covoiturage
1. Consulter `SESSION_COMPLETE_11OCT2025.md`
2. Vérifier logs mobile (Expo)
3. Tester hook `useCovoiturage` isolément

### Si Bloqué
- Relire `GUIDE_MIGRATIONS_RAPIDE.md`
- Checker `RESUME_VISUEL_11OCT2025.md`
- Logs: Console browser (web) + `npx expo start` (mobile)

---

## ✅ Checklist Finale

Avant de considérer cette session terminée :

- [ ] Migrations SQL appliquées ✅
- [ ] Contacts créés ✅
- [ ] Assignation testée et fonctionnelle ✅
- [ ] Covoiturage testé (si activé) ✅
- [ ] Documentation lue ✅
- [ ] Aucune erreur en production ✅

---

**Temps Total Estimé (Urgent + Important):** ~40 minutes  
**Bloqueurs:** Aucun (tout est documenté)

🚀 **LET'S GO!**
