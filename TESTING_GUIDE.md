# 🧪 Guide de Tests - Option A Rapports Inspection

**Date:** ${new Date().toLocaleDateString('fr-FR')}

---

## ✅ Checklist Rapide

### Avant de commencer
- [ ] Backend Laravel accessible (http://localhost:8000)
- [ ] Variables .env configurées (mobile + backend)
- [ ] Supabase configuré et accessible
- [ ] Dépendances mobile installées (`npm install`)

---

## 1️⃣ Test Backend Email

### Test basique
```bash
cd c:\Users\mahdi\Documents\Finality-okok

# Test endpoint simple
curl -X POST http://localhost:8000/api/email/test \
  -H "Content-Type: application/json" \
  -d "{\"to_email\":\"votre-email@example.com\"}"
```

**Résultat attendu:**
```json
{
  "success": true,
  "message": "Email de test envoyé avec succès"
}
```

### Test rapport complet
```bash
curl -X POST http://localhost:8000/api/email/inspection-report \
  -H "Content-Type: application/json" \
  -d @test-report.json
```

**Créer test-report.json:**
```json
{
  "to_email": "client@example.com",
  "sender_name": "Jean Dupont",
  "report": {
    "mission_reference": "MIS-TEST-001",
    "vehicle": "Peugeot 308",
    "is_complete": true,
    "departure": {
      "inspector_name": "Jean Martin",
      "inspection_date": "12/10/2025 14:30",
      "odometer_reading": 50000,
      "fuel_level": 75
    },
    "arrival": {
      "inspector_name": "Marie Dubois",
      "inspection_date": "15/10/2025 09:15",
      "odometer_reading": 50450,
      "fuel_level": 25
    }
  }
}
```

### Test auto-génération PDF
```bash
curl -X POST "http://localhost:8000/api/reports/generate-pdf/test-mission-123?inspection_type=departure"
```

**Vérifier logs Laravel:**
```bash
tail -f storage/logs/laravel.log
# Devrait afficher: "Auto-génération PDF demandée"
```

---

## 2️⃣ Test Mobile - Compilation

### Vérifier imports
```bash
cd mobile

# Nettoyer cache
rm -rf node_modules/.cache
rm -rf .expo

# Réinstaller
npm install
npx expo install expo-file-system expo-sharing
```

### Lancer app
```bash
npm start
# ou
npx expo start --clear
```

**Vérifier dans Metro bundler:**
- [ ] Aucune erreur rouge
- [ ] Imports résolus
- [ ] App démarre sans crash

---

## 3️⃣ Test Mobile - Fonctionnel

### 3.1 Écran Rapports Inspection

**Navigation:**
```
1. Ouvrir app mobile
2. Menu → "Rapports Inspection" (ou navigation directe)
```

**Tests:**
- [ ] Écran s'affiche sans crash
- [ ] Header visible (titre + boutons)
- [ ] Statistiques affichées (3 cartes)
- [ ] Liste rapports chargée
- [ ] Pull-to-refresh fonctionne
- [ ] Si vide: Empty state affiché

### 3.2 Actions sur un rapport

**Sélectionner un rapport:**
- [ ] Carte rapport visible
- [ ] Badge statut (vert = complet, orange = départ)
- [ ] Infos véhicule correctes
- [ ] Date formatée

**Bouton PDF:**
- [ ] Clique → Alert avec 3 options
- [ ] "Annuler" ferme l'alert
- [ ] "Envoyer par email" → Ouvre modal email
- [ ] "Télécharger" → Message "disponible prochainement"

**Bouton Photos:**
- [ ] Clique → Charge photos
- [ ] Modal galerie s'ouvre
- [ ] Photos affichées plein écran
- [ ] Navigation gauche/droite fonctionne
- [ ] Compteur "X / Y" correct
- [ ] Bouton fermeture fonctionne

**Bouton Email:**
- [ ] Clique → Modal email s'ouvre
- [ ] Champ email visible
- [ ] Champ nom visible
- [ ] Bouton "Envoyer" visible

### 3.3 Modal Email

**Validation:**
- [ ] Email vide → Alert "Veuillez entrer une adresse email"
- [ ] Email invalide → (À tester)
- [ ] Email valide → Envoi API

**Envoi:**
- [ ] Loading indicator pendant envoi
- [ ] En cas de succès:
  - [ ] Alert "Succès"
  - [ ] Modal se ferme
  - [ ] Champs réinitialisés
- [ ] En cas d'erreur:
  - [ ] Alert "Erreur"
  - [ ] Modal reste ouverte

---

## 4️⃣ Test Auto-Génération PDF

### Scénario complet

**Étape 1: Créer une mission**
```
1. App mobile → Missions
2. Créer nouvelle mission
3. Assigner véhicule
```

**Étape 2: Inspection départ**
```
1. Ouvrir mission
2. Clique "Inspection Départ"
3. Prendre 6 photos (avant, arrière, gauche, droite, tableau bord, compteur)
4. Remplir détails:
   - Kilométrage: 50000
   - Carburant: 75%
   - État: Bon
   - Notes: "Test auto-PDF"
5. Clique "Compléter"
6. Signature chauffeur (dessiner)
7. Signature client (dessiner)
```

**Étape 3: Vérifier auto-génération**
- [ ] Inspection verrouillée
- [ ] Alert affiche "...PDF sera généré automatiquement"
- [ ] Console Metro affiche:
  ```
  🔄 Démarrage auto-génération PDF...
  ✅ PDF généré automatiquement pour: {mission_id}
  ```
- [ ] Logs Laravel affichent:
  ```
  [INFO] Auto-génération PDF demandée {"mission_id":"..."}
  ```

**Étape 4: Vérifier dans Rapports**
```
1. Navigation → Rapports Inspection
2. Trouver rapport (référence mission)
3. Badge statut: "⏳ Départ uniquement" (orange)
4. Tester envoi email
```

**Étape 5: Inspection arrivée (optionnel)**
```
1. Retour à la mission
2. Clique "Inspection Arrivée"
3. Répéter photos + détails
4. Signer × 2
5. Vérifier auto-PDF déclenché
6. Rapports → Badge devient "✓ Complet" (vert)
```

---

## 5️⃣ Test Email Réception

### Vérifier email reçu

**Headers:**
- [ ] Sujet: "Rapport d'Inspection - {référence}"
- [ ] De: noreply@finality.fr (ou config .env)
- [ ] À: Email saisi

**Contenu:**
- [ ] Template HTML affiché correctement
- [ ] En-tête gradient bleu
- [ ] Badge statut (complet/départ seul)
- [ ] Tableau inspection départ visible
- [ ] Si complet: Tableau arrivée visible
- [ ] Distance calculée (arrivée)
- [ ] Footer avec nom expéditeur

**Pièces jointes:**
- [ ] PDF présent (si disponible)
- [ ] Photos présentes
- [ ] Fichiers téléchargeables
- [ ] Tailles correctes

---

## 6️⃣ Tests de Régression

### Anciennes fonctionnalités

**Missions:**
- [ ] Liste missions s'affiche
- [ ] Création mission fonctionne
- [ ] Détails mission accessibles

**Inspections:**
- [ ] Wizard inspection fonctionne
- [ ] Photos sauvegardées
- [ ] Signatures enregistrées
- [ ] Verrouillage actif

**Navigation:**
- [ ] Tous les écrans accessibles
- [ ] Bouton retour fonctionne
- [ ] Bottom tabs visibles

---

## 7️⃣ Tests de Performance

### Temps de réponse

**Chargement rapports:**
- [ ] < 2s pour 10 rapports
- [ ] < 5s pour 100 rapports
- [ ] Pull-to-refresh < 3s

**Envoi email:**
- [ ] < 5s sans photos
- [ ] < 15s avec 12 photos
- [ ] Loading indicator visible pendant tout le process

**Auto-génération PDF:**
- [ ] Non-bloquant (utilisateur peut continuer)
- [ ] < 10s pour génération
- [ ] Logs visibles

---

## 8️⃣ Tests d'Erreurs

### Cas limites

**Pas de connexion internet:**
- [ ] Alert "Impossible de charger les rapports"
- [ ] Alert "Impossible d'envoyer l'email"
- [ ] Auto-PDF échoue silencieusement (logs uniquement)

**Backend down:**
- [ ] Timeout après 30s
- [ ] Message erreur clair
- [ ] App ne crash pas

**Données invalides:**
- [ ] Email invalide → Validation
- [ ] Rapport sans photos → Empty state photos
- [ ] Mission inexistante → Gestion erreur

---

## 9️⃣ Résumé Tests

### Matrice de validation

| Fonctionnalité | Status | Notes |
|----------------|--------|-------|
| Backend Email Service | ⏳ À tester | |
| Backend API Endpoints | ⏳ À tester | |
| Backend Auto-PDF | ⏳ À tester | |
| Mobile Compilation | ⏳ À tester | |
| Mobile Écran Rapports | ⏳ À tester | |
| Mobile Modal Email | ⏳ À tester | |
| Mobile Modal Photos | ⏳ À tester | |
| Mobile Auto-PDF Trigger | ⏳ À tester | |
| Email Réception | ⏳ À tester | |
| Performance | ⏳ À tester | |
| Gestion Erreurs | ⏳ À tester | |

**Légende:**
- ⏳ À tester
- ✅ Validé
- ❌ Échec
- 🔧 En correction

---

## 🐛 Bugs Connus

### TypeScript Import Error
**Erreur:** `Cannot find module '../services/inspectionReportService'`
**Impact:** Erreur affichée mais fichier existe
**Solution:** Redémarrer TypeScript server
```bash
# VS Code
Ctrl+Shift+P → "TypeScript: Restart TS Server"

# Ou redémarrer Metro
cd mobile
npm start -- --clear
```

---

## 📝 Notes de Test

### Environnements testés
- [ ] iOS Simulator
- [ ] Android Emulator
- [ ] iOS Physical Device
- [ ] Android Physical Device

### Navigateurs (email)
- [ ] Gmail
- [ ] Outlook
- [ ] Apple Mail
- [ ] Thunderbird

---

## ✅ Validation Finale

**Avant de marquer comme COMPLET:**
- [ ] Tous les tests ci-dessus passent
- [ ] Aucun crash
- [ ] Aucune erreur console bloquante
- [ ] Email reçus correctement
- [ ] Performance acceptable
- [ ] Documentation à jour

**Date de validation:** _________________
**Validé par:** _________________
**Environnement:** _________________

---

**Fichier créé:** ${new Date().toLocaleString('fr-FR')}
**Version:** 1.0.0
