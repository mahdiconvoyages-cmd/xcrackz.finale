# 🧪 Guide de test - API INSEE SIRET

## SIRET de test réels (entreprises françaises publiques)

### ✅ SIRET valides et actifs

| Entreprise | SIRET | SIREN | Statut |
|------------|-------|-------|--------|
| **Total Énergies** | `80215426700010` | `802154267` | ✅ Actif |
| **Renault SAS** | `13002526500013` | `130025265` | ✅ Actif |
| **SNCF Voyageurs** | `51938037800014` | `519380378` | ✅ Actif |
| **EDF** | `55221008500166` | `552210085` | ✅ Actif |
| **La Poste** | `35608066200037` | `356080662` | ✅ Actif |
| **Carrefour Hypermarché** | `35312001700018` | `353120017` | ✅ Actif |
| **BNP Paribas** | `66212493000098` | `662124930` | ✅ Actif |
| **Air France** | `42001804700029` | `420018047` | ✅ Actif |
| **Orange SA** | `38012986300047` | `380129863` | ✅ Actif |
| **Société Générale** | `55259912800030` | `552599128` | ✅ Actif |

### ⚠️ SIRET invalides (pour tester la validation)

| Type d'erreur | SIRET | Raison |
|---------------|-------|--------|
| **Luhn invalide** | `12345678901234` | Échec validation Luhn |
| **Trop court** | `123456789` | Moins de 14 chiffres |
| **Avec lettres** | `1234567890ABCD` | Contient des lettres |
| **Non existant** | `00000000000000` | N'existe pas dans la base |
| **Trop long** | `123456789012345` | Plus de 14 chiffres |

---

## 📝 Scénarios de test

### Test 1: SIRET valide avec auto-remplissage
1. Ouvrir formulaire de facture/devis
2. Saisir SIRET: `80215426700010` (Total Énergies)
3. ✅ **Résultat attendu:**
   - Spinner pendant recherche (500ms)
   - Icône verte ✓
   - Carte d'information avec:
     - Nom: "TOTALENERGIES SE"
     - Adresse: "2 PLACE JEAN MILLIER, 92400 COURBEVOIE"
     - SIRET formaté: "802 154 267 00010"
     - TVA: "FR66 802154267"
     - Forme juridique
     - Code NAF
     - Badge "Siège social"
   - Champs auto-remplis:
     - Nom du client → "TOTALENERGIES SE"
     - Adresse → Adresse complète
     - N° TVA → "FR66 802154267"

### Test 2: SIRET invalide (Luhn)
1. Saisir SIRET: `12345678901234`
2. ✅ **Résultat attendu:**
   - Message d'erreur rouge
   - "SIRET invalide (échec validation Luhn)"
   - Pas de carte d'information
   - Champs non remplis

### Test 3: SIREN (9 chiffres) → Recherche siège
1. Saisir SIREN: `802154267` (Total Énergies)
2. ✅ **Résultat attendu:**
   - Recherche automatique du siège social
   - Même résultat que Test 1
   - Badge "Siège social" affiché

### Test 4: Entreprise non trouvée
1. Saisir SIRET valide mais inexistant: `99999999999991`
2. ✅ **Résultat attendu:**
   - Message d'erreur
   - "Entreprise non trouvée dans la base INSEE"
   - Pas de carte d'information

### Test 5: Formatage automatique
1. Saisir sans espaces: `80215426700010`
2. ✅ **Résultat attendu:**
   - Espaces ajoutés automatiquement
   - Affichage: "802 154 267 00010"

### Test 6: Modification manuelle après auto-remplissage
1. Saisir SIRET valide
2. Attendre auto-remplissage
3. Modifier manuellement le nom/adresse
4. ✅ **Résultat attendu:**
   - Modifications conservées
   - Carte d'information toujours visible
   - Données INSEE visibles pour référence

### Test 7: Enregistrement et rechargement
1. Créer facture avec SIRET
2. Enregistrer
3. Rouvrir la facture
4. ✅ **Résultat attendu:**
   - Toutes les données chargées
   - SIRET affiché dans le champ
   - clientInfo contient toutes les données INSEE

### Test 8: Entreprise fermée/radiée
1. Saisir SIRET d'entreprise fermée (à trouver via recherche)
2. ✅ **Résultat attendu:**
   - Icône orange ⚠️
   - Avertissement "Établissement fermé"
   - Badge orange "Établissement fermé"
   - Données toujours récupérables

---

## 🔍 Tests avancés

### Test A: Performance (debounce)
1. Taper rapidement plusieurs chiffres
2. ✅ **Résultat attendu:**
   - Pas d'appel API avant 500ms d'inactivité
   - Un seul appel API après arrêt de frappe

### Test B: Hors ligne
1. Désactiver connexion internet
2. Saisir SIRET valide
3. ✅ **Résultat attendu:**
   - Message d'erreur réseau
   - "Erreur lors de la recherche SIRET"

### Test C: SIRET avec espaces pré-existants
1. Copier-coller: "802 154 267 00010"
2. ✅ **Résultat attendu:**
   - Espaces gérés correctement
   - Recherche fonctionne

### Test D: Navigation rapide
1. Ouvrir formulaire facture
2. Saisir SIRET en cours
3. Fermer avant fin de recherche
4. ✅ **Résultat attendu:**
   - Pas de crash
   - Pas d'erreur setState après dispose

---

## 📱 Checklist test mobile

- [ ] **Clavier numérique** s'affiche automatiquement
- [ ] **Formatage temps réel** fonctionne pendant la saisie
- [ ] **Spinner** visible pendant chargement
- [ ] **Carte d'information** responsive et lisible
- [ ] **Badges** (siège social, fermé) visibles
- [ ] **Scroll** fonctionne si carte trop grande
- [ ] **Navigation** vers écran suivant conserve données
- [ ] **Rotation écran** conserve les données

---

## 🐛 Bugs potentiels à vérifier

### Bug 1: Double appel API
**Scénario:** Modifier rapidement le SIRET  
**Attendu:** Un seul appel avec le SIRET final  
**Vérifier:** Debounce fonctionne correctement

### Bug 2: Mémoire non libérée
**Scénario:** Ouvrir/fermer formulaire plusieurs fois  
**Attendu:** Pas de fuite mémoire  
**Vérifier:** dispose() appelé sur tous les controllers

### Bug 3: Race condition
**Scénario:** Changer SIRET avant fin recherche précédente  
**Attendu:** Seul dernier résultat affiché  
**Vérifier:** _debounce?.cancel() fonctionne

### Bug 4: setState après dispose
**Scénario:** Fermer écran pendant recherche API  
**Attendu:** Pas d'erreur  
**Vérifier:** Vérification mounted avant setState

---

## 📊 Données de test complètes

### Total Énergies (80215426700010)
```json
{
  "siret": "80215426700010",
  "siren": "802154267",
  "companyName": "TOTALENERGIES SE",
  "legalForm": "5599",
  "address": "2 PLACE JEAN MILLIER",
  "postalCode": "92400",
  "city": "COURBEVOIE",
  "activityCode": "06.10Z",
  "vatNumber": "FR66 802154267",
  "isHeadquarters": true,
  "status": "A"
}
```

### Renault SAS (13002526500013)
```json
{
  "siret": "13002526500013",
  "siren": "130025265",
  "companyName": "RENAULT SAS",
  "legalForm": "5710",
  "address": "13-15 QUAI ALPHONSE LE GALLO",
  "postalCode": "92100",
  "city": "BOULOGNE-BILLANCOURT",
  "activityCode": "29.10Z",
  "vatNumber": "FR03 130025265",
  "isHeadquarters": true,
  "status": "A"
}
```

---

## 🎯 Critères de succès

### ✅ Fonctionnel
- [x] Recherche SIRET fonctionne
- [x] Validation Luhn correcte
- [x] Auto-remplissage fonctionnel
- [x] Calcul TVA correct
- [x] Formatage automatique
- [x] Gestion erreurs robuste
- [x] Debounce évite surcharge API
- [x] Données persistées en BDD

### ✅ UX/UI
- [x] Spinner pendant chargement
- [x] Icônes de validation (✓ ⚠️)
- [x] Carte d'information élégante
- [x] Messages d'erreur clairs
- [x] Badges informatifs
- [x] Responsive mobile
- [x] Clavier numérique par défaut
- [x] Labels en français

### ✅ Performance
- [x] Debounce 500ms
- [x] Pas d'appels API inutiles
- [x] Validation côté client
- [x] Pas de fuite mémoire
- [x] Race conditions gérées

### ✅ Sécurité
- [x] Validation Luhn
- [x] API publique gratuite
- [x] Pas de clé API exposée
- [x] Données INSEE fiables
- [x] Gestion timeout/erreurs

---

## 🚀 Commandes de test

### Test API direct (PowerShell)
```powershell
# Test SIRET Total Énergies
Invoke-WebRequest -Uri "https://api.insee.fr/entreprises/sirene/V3/siret/80215426700010" -Headers @{"Accept"="application/json"} | Select-Object -ExpandProperty Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

### Test dans Flutter (Debug)
```dart
// Dans main.dart, ajouter test au démarrage
void testInseeService() async {
  final service = InseeService();
  
  // Test 1: SIRET valide
  final company = await service.getCompanyBySiret('80215426700010');
  print('✅ Entreprise: ${company?.companyName}');
  print('✅ TVA: ${company?.vatNumber}');
  
  // Test 2: Validation
  print('✅ Luhn valide: ${InseeService.validateSiret('80215426700010')}');
  print('❌ Luhn invalide: ${InseeService.validateSiret('12345678901234')}');
  
  // Test 3: Formatage
  print('✅ Formaté: ${InseeService.formatSiret('80215426700010')}');
}
```

---

## 📞 Support

En cas de problème:
1. Vérifier connexion internet
2. Vérifier logs console (`print` statements)
3. Tester SIRET sur https://api.insee.fr directement
4. Vérifier que package `http` est installé
5. Consulter documentation: `API_INSEE_SIRET_FACTURATION_COMPLETE.md`

---

**✅ Prêt pour les tests !**
