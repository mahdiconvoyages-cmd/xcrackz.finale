# 🏢 API INSEE Auto-complétion - Guide Complet

## ✨ Nouveautés

### 🎯 Fonctionnalités
- ✅ **Auto-complétion SIRET** : Recherche automatique dans la base INSEE
- ✅ **Remplissage automatique** : Nom, adresse pré-remplis
- ✅ **Saisie manuelle** : Toggle pour désactiver l'auto-complétion
- ✅ **API gratuite** : Utilise `entreprise.data.gouv.fr` (sans token)
- ✅ **Design moderne** : Gradients, animations, feedback visuel

---

## 🚀 Utilisation

### Mode Auto-complétion (par défaut)

1. **Ouvrir le formulaire client**
   - Cliquer sur "Nouveau client"
   - Badge vert "✨ Auto-complétion INSEE" visible en haut à droite

2. **Saisir le SIRET** (14 chiffres)
   - Taper les 14 chiffres dans le champ SIRET
   - Format accepté : `12345678901234` ou `123 456 789 01234`

3. **Recherche automatique**
   - Dès que 14 chiffres sont saisis : Recherche automatique
   - Loader animé pendant la recherche
   - ✅ **Entreprise trouvée** :
     * Champs **Nom** et **Adresse** pré-remplis automatiquement
     * Badge vert avec message de confirmation
     * Icône ✓ verte dans le champ SIRET
   - ❌ **Entreprise non trouvée** :
     * Message d'erreur en rouge
     * Icône ⚠️ rouge dans le champ SIRET
     * Possibilité de passer en saisie manuelle

4. **Compléter les autres champs**
   - Email (obligatoire) - à saisir manuellement
   - Téléphone (optionnel)
   - Modifier l'adresse si nécessaire

### Mode Saisie Manuelle

1. **Activer le mode manuel**
   - Cliquer sur "✍️ Saisie manuelle" en haut du formulaire
   - Badge disparaît, auto-complétion désactivée

2. **Remplir tous les champs manuellement**
   - SIRET (optionnel, mais sans recherche)
   - Nom (obligatoire)
   - Email (obligatoire)
   - Téléphone, Adresse (optionnels)

3. **Réactiver l'auto-complétion**
   - Cliquer sur "✨ Activer auto-complétion"

---

## 🎨 Design Modernisé

### Cartes de statistiques (en haut)
```
┌──────────────────────────────────────────────────────────┐
│ [Gradient Teal→Cyan]  [Gradient Green→Emerald]          │
│ Total clients: 42     Nouveaux ce mois: 5                │
│                                                           │
│ [Gradient Blue→Indigo] [Gradient Purple→Pink]            │
│ Avec email: 38        Avec SIRET: 15                     │
└──────────────────────────────────────────────────────────┘
```
- **Gradients colorés** : Teal, Green, Blue, Purple
- **Icônes animées** : Zoom au survol
- **Ombres portées** : Hover effect avec shadow-2xl
- **Chiffres énormes** : text-5xl font-black

### Cartes clients
```
┌──────────────────────────────────────────────────────────┐
│ [A] ACME Corporation              📅 12 jan. 2025       │
│                                                           │
│ 📧 contact@acme.com                                      │
│ 📞 06 12 34 56 78                                        │
│ 📍 123 Rue de la Paix, 75001 Paris                       │
│ 🏢 123 456 789 01234                                     │
│                                                           │
│ [Gradient Blue] Modifier  [Gradient Red] Supprimer      │
└──────────────────────────────────────────────────────────┘
```
- **Avatar circulaire** : Première lettre avec gradient
- **Badges colorés** : Chaque info dans une box avec icône
- **Hover effect** : -translate-y-1 (monte au survol)
- **Border hover** : border-teal-400
- **Boutons gradients** : Blue→Indigo (Modifier), Red→Pink (Supprimer)

### Formulaire auto-complétion
```
┌──────────────────────────────────────────────────────────┐
│ ✨ Nouveau client        [✨ Auto-complétion INSEE]     │
│                          [✍️ Saisie manuelle]            │
│                                                           │
│ 🏢 SIRET (recherche automatique)                         │
│ [123 456 789 01234                             ✓]       │
│ ✅ Entreprise trouvée ! Les champs ont été remplis.     │
│                                                           │
│ 🏢 Nom du client *                                       │
│ [ACME Corporation                               ]        │
│                                                           │
│ 📧 Email *                                               │
│ [contact@acme.com                               ]        │
│                                                           │
│ 📞 Téléphone                                             │
│ [06 12 34 56 78                                 ]        │
│                                                           │
│ 📍 Adresse                                               │
│ [123 Rue de la Paix                             ]        │
│ [75001 Paris                                     ]        │
│                                                           │
│ [Annuler]                   [Créer le client]           │
└──────────────────────────────────────────────────────────┘
```
- **Icônes colorées** : Teal, Blue, Purple, Green, Orange
- **Focus states** : Ring coloré + border-2
- **Feedback visuel** :
  * ✅ Green : Entreprise trouvée
  * ❌ Red : SIRET invalide/non trouvé
  * ⏳ Loader : Recherche en cours
- **Disabled states** : Champs grisés pendant recherche

### Modal détails client
```
┌──────────────────────────────────────────────────────────┐
│ [A] ACME Corporation                          [✕]       │
│     Client depuis le 12 jan. 2025                        │
│                                                           │
│ ┌────────────────┐  ┌────────────────┐                  │
│ │ 📧 Email       │  │ 📞 Téléphone   │                  │
│ │ contact@...    │  │ 06 12 34...    │                  │
│ └────────────────┘  └────────────────┘                  │
│                                                           │
│ 📊 Statistiques & Performances                           │
│                                                           │
│ [Blue Card]   [Purple Card]  [Green Card]  [Orange Card]│
│ 📄 Factures   📝 Devis       💶 CA Total   ⏰ Attente   │
│ 15            8              25 000 €      5 000 €      │
│                                                           │
│ 📅 Dernière facture : 08 jan. 2025                       │
│                                                           │
│ [Fermer]                                                 │
└──────────────────────────────────────────────────────────┘
```
- **Avatar XL** : 20x20, text-3xl
- **Info boxes** : Gradients pastel (purple, green, orange, blue)
- **Stats cards** : Gradients full color avec ombres
- **Animations** : fade-in, hover:-translate-y-1

---

## 🔧 API INSEE - Détails Techniques

### Endpoint utilisé
```
https://entreprise.data.gouv.fr/api/sirene/v3/etablissements/{SIRET}
```

### Avantages
- ✅ **100% gratuit** (pas de token requis)
- ✅ **Base officielle** : Données INSEE à jour
- ✅ **Pas de limite** : API publique
- ✅ **CORS friendly** : Fonctionne depuis le navigateur

### Données récupérées
- `siret` : Numéro SIRET (14 chiffres)
- `siren` : Numéro SIREN (9 chiffres)
- `denomination` : Nom officiel de l'entreprise
- `enseigne` : Nom commercial (si différent)
- `adresse` : Adresse complète formatée
- `activite_principale` : Code NAF/APE
- `date_creation` : Date de création

### Fonction principale : `searchBySiret()`
```typescript
const company = await searchBySiret('12345678901234');

if (company) {
  console.log(company.denomination); // "ACME Corporation"
  console.log(formatInseeAddress(company.adresse)); // "123 Rue de la Paix 75001 Paris"
}
```

### Helpers
- `formatSiret(siret)` : Formate avec espaces (XXX XXX XXX XXXXX)
- `isValidSiret(siret)` : Valide le format (14 chiffres)
- `formatInseeAddress(adresse)` : Concatène les champs d'adresse

---

## 📊 Flux de Données

### Scénario 1 : Auto-complétion réussie
```
1. User tape SIRET : "12345678901234"
2. handleSiretSearch() appelé
3. isValidSiret() → true
4. setSiretSearching(true) → Loader affiché
5. searchBySiret() → Appel API INSEE
6. API retourne données entreprise
7. setFormData() → Nom + Adresse pré-remplis
8. setSiretFound(true) → Badge vert + icône ✓
9. setSiretSearching(false) → Loader caché
10. User complète Email
11. Submit → Client créé avec toutes les infos
```

### Scénario 2 : SIRET non trouvé
```
1-5. (identique)
6. API retourne 404
7. setSiretFound(false) → Message d'erreur rouge + icône ⚠️
8. User peut :
   → Vérifier le SIRET
   → Passer en saisie manuelle
   → Corriger le numéro
```

### Scénario 3 : Saisie manuelle
```
1. User clique "✍️ Saisie manuelle"
2. setManualMode(true) → Auto-complétion désactivée
3. User tape SIRET → Pas de recherche
4. User remplit tous les champs manuellement
5. Submit → Client créé
```

---

## ✅ Checklist de Test

### Test Auto-complétion
- [ ] Taper un SIRET valide (14 chiffres)
- [ ] Vérifier le loader pendant recherche
- [ ] Vérifier badge vert "Entreprise trouvée"
- [ ] Vérifier nom + adresse pré-remplis
- [ ] Modifier l'adresse (doit être possible)
- [ ] Ajouter email + téléphone
- [ ] Créer le client
- [ ] Vérifier données sauvegardées

### Test SIRET invalide
- [ ] Taper SIRET inexistant
- [ ] Vérifier message d'erreur rouge
- [ ] Vérifier icône ⚠️ rouge
- [ ] Passer en saisie manuelle
- [ ] Compléter le formulaire
- [ ] Créer le client

### Test Saisie manuelle
- [ ] Cliquer "✍️ Saisie manuelle"
- [ ] Taper SIRET → Pas de recherche
- [ ] Remplir tous les champs
- [ ] Créer le client
- [ ] Réactiver auto-complétion
- [ ] Taper nouveau SIRET → Recherche active

### Test Design moderne
- [ ] Stats cards : Gradients + hover effects
- [ ] Client cards : Hover -translate-y-1
- [ ] Avatar : Première lettre, gradient
- [ ] Boutons : Gradients blue/red avec shadows
- [ ] Modal formulaire : Icons colorées, rings
- [ ] Modal détails : Cards pastel + stats colorées

---

## 🐛 Troubleshooting

### L'auto-complétion ne fonctionne pas
**Cause** : SIRET invalide (< 14 chiffres)
**Solution** : Taper exactement 14 chiffres

### Entreprise trouvée mais nom vide
**Cause** : Entreprise sans dénomination dans INSEE
**Solution** : Vérifier `nomCommercial` ou saisir manuellement

### Erreur CORS
**Cause** : Blocage navigateur (rare avec entreprise.data.gouv.fr)
**Solution** : Utiliser un proxy ou backend

### Recherche trop lente
**Cause** : API INSEE peut être lente (rare)
**Solution** : Patienter, le loader s'affiche

### Champs ne se pré-remplissent pas
**Cause** : Mode manuel activé
**Solution** : Cliquer "✨ Activer auto-complétion"

---

## 🎯 Prochaines Améliorations

### 1. Recherche par nom d'entreprise
- Endpoint : `/api/sirene/v3/unites_legales?q=NOM`
- Dropdown avec suggestions
- Sélection → Remplissage SIRET

### 2. Cache des résultats
- Stocker résultats dans localStorage
- Éviter recherches répétées
- TTL : 24h

### 3. Validation avancée
- Vérifier clé de Luhn (SIRET valide mathématiquement)
- Alerter si entreprise fermée/radiée
- Afficher statut (actif/fermé)

### 4. Données enrichies
- Afficher code NAF + libellé
- Date de création
- Nombre d'employés
- Forme juridique (SARL, SAS, etc.)

### 5. Export SIRET
- Bouton "Copier SIRET" dans carte client
- Format avec espaces

---

## 📞 Support API INSEE

### Documentation officielle
- **Base Sirene** : https://api.insee.fr/catalogue/
- **Data.gouv** : https://entreprise.data.gouv.fr/
- **Format SIRET** : https://www.sirene.fr/

### Limites connues
- Pas de limite de requêtes
- Base mise à jour quotidiennement
- Données depuis 2017 (entreprises anciennes peuvent manquer)

### Alternative (si problème)
- **API Pappers** : https://www.pappers.fr/api (token requis)
- **API Infogreffe** : https://www.infogreffe.fr/ (payant)

---

**Date de création** : 11 octobre 2025  
**Version** : 1.0  
**Status** : ✅ Auto-complétion INSEE opérationnelle + Design moderne

## 🎨 Captures d'écran

### Stats Cards (Gradients)
- Teal→Cyan : Total clients
- Green→Emerald : Nouveaux ce mois
- Blue→Indigo : Avec email
- Purple→Pink : Avec SIRET

### Formulaire Auto-complétion
- Badge vert : ✨ Auto-complétion INSEE
- Loader : Recherche en cours
- ✅ Green : Entreprise trouvée
- ❌ Red : SIRET invalide

### Client Cards
- Avatar avec première lettre (gradient)
- 4 boxes colorées (email, phone, address, siret)
- 2 boutons gradients (modifier, supprimer)
- Hover effect : monte + border teal

### Modal Détails
- Avatar XL (20x20)
- 4 info boxes (gradients pastel)
- 4 stats cards (gradients full)
- Dernière facture (date)
