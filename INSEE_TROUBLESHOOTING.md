# 🔧 Dépannage API INSEE - SIRET Non Trouvé

## ❌ Problème Rencontré

**Message d'erreur** : "SIRET non trouvé dans la base INSEE. Vérifiez le numéro ou activez la saisie manuelle"

---

## ✅ Solutions

### Solution 1 : Utiliser des SIRET Valides

**⚠️ Important** : L'API INSEE ne contient que les entreprises **françaises actives**.

#### 🎯 SIRET de Test Garantis (Grandes Entreprises)

Copiez-collez ces SIRET exacts (14 chiffres sans espaces) :

```
55208673700039  →  Google France (Paris)
88091431100019  →  La Poste (Paris)
55200155800027  →  Microsoft France (Issy-les-Moulineaux)
87925905400018  →  SNCF (Saint-Denis)
53080213200025  →  Amazon France Logistique (Clichy)
88275018900010  →  EDF (Paris)
```

#### 📋 Comment tester :

1. **Copiez un SIRET ci-dessus**
2. Ouvrez le formulaire client
3. **Collez dans le champ SIRET** (sans espaces)
4. Attendez 1-2 secondes
5. **Résultat attendu** : Badge vert + nom/adresse pré-remplis

---

### Solution 2 : Vérifier le Format du SIRET

#### Format Correct
- ✅ **14 chiffres exactement**
- ✅ Que des chiffres (0-9)
- ✅ Pas d'espaces (l'app les nettoie automatiquement)

#### Exemples de SIRET Invalides
- ❌ `1234567890123` (13 chiffres - trop court)
- ❌ `ABC12345678901` (contient des lettres)
- ❌ `99999999999999` (n'existe pas dans INSEE)

#### Conversion SIREN → SIRET
- **SIREN** = 9 chiffres (entreprise)
- **SIRET** = SIREN + 5 chiffres (établissement)
- **Exemple** : SIREN `552086737` → SIRET `55208673700039`

---

### Solution 3 : Tester l'API Manuellement

#### Via Navigateur
Ouvrez cette URL dans votre navigateur :
```
https://entreprise.data.gouv.fr/api/sirene/v3/etablissements/55208673700039
```

**Résultat attendu** : JSON avec données Google France

#### Vérifier la Réponse
```json
{
  "etablissement": {
    "siret": "55208673700039",
    "siren": "552086737",
    "unite_legale": {
      "denomination": "GOOGLE FRANCE"
    },
    "adresse": {
      "numero_voie": "8",
      "type_voie": "RUE",
      "libelle_voie": "DE LONDRES",
      "code_postal": "75009",
      "libelle_commune": "PARIS 9"
    }
  }
}
```

Si vous obtenez **404 Not Found** :
- ✅ L'API fonctionne (elle répond)
- ❌ Le SIRET n'existe pas dans la base

---

### Solution 4 : Mode Saisie Manuelle

Si vous avez un SIRET qui n'est pas dans l'INSEE (rare) :

1. **Cliquez** sur "✍️ Saisie manuelle" (en haut du formulaire)
2. Remplissez **tous les champs manuellement** :
   - Nom *
   - Email *
   - Téléphone
   - Adresse
   - SIRET (optionnel)
3. **Créer le client**

---

## 🔍 Cas Particuliers

### SIRET non trouvé - Pourquoi ?

#### Raisons possibles :

1. **Entreprise trop récente** (< 1 mois)
   - L'INSEE met à jour la base quotidiennement
   - Délai possible de quelques jours

2. **Entreprise radiée/fermée**
   - Les entreprises fermées sont parfois retirées
   - Solution : Mode manuel

3. **Établissement secondaire récent**
   - Le siège social existe mais pas l'établissement
   - Essayez le SIRET du siège (SIREN + 00001)

4. **Erreur de frappe**
   - Vérifiez sur https://www.societe.com/
   - Ou https://annuaire-entreprises.data.gouv.fr/

5. **SIRET étranger**
   - L'API INSEE ne contient que les entreprises françaises
   - Solution : Mode manuel

---

## 🧪 Test de Dépannage

### Étape 1 : Vérifier l'API fonctionne

**Test avec Google France** :
```
SIRET : 55208673700039
```

**Résultat attendu** :
- ✅ Loader pendant 1-2s
- ✅ Badge vert : "Entreprise trouvée"
- ✅ Nom : "GOOGLE FRANCE"
- ✅ Adresse : "8 RUE DE LONDRES 75009 PARIS"

**Si ça ne fonctionne pas** :
- Problème de connexion internet
- API INSEE temporairement down
- Blocker/firewall qui bloque l'API

### Étape 2 : Vérifier le SIRET exact

Si vous avez un SIRET d'entreprise :

1. **Aller sur** : https://annuaire-entreprises.data.gouv.fr/
2. **Rechercher** le nom de l'entreprise
3. **Copier** le SIRET exact (14 chiffres)
4. **Tester** dans l'application

### Étape 3 : Vérifier la console

1. **Ouvrir DevTools** : F12
2. **Onglet Console**
3. Taper un SIRET
4. **Observer** :
   - Requête vers `entreprise.data.gouv.fr`
   - Réponse 200 (OK) ou 404 (Non trouvé)
   - Erreurs CORS (si bloqué)

---

## 📊 SIRET de Test par Secteur

### Tech
```
55208673700039  →  Google France
55200155800027  →  Microsoft France
44323652500055  →  OVH SAS
53879664200063  →  Deezer
```

### Retail
```
33014556000048  →  Carrefour France
30821779101506  →  Auchan
50182657300029  →  Fnac Darty
```

### Services Publics
```
88091431100019  →  La Poste
88275018900010  →  EDF
87925905400018  →  SNCF
```

### PME (exemples)
```
84980388700019  →  OVH
82423778700019  →  Blablacar
79978758100019  →  Criteo
```

---

## 🛠️ Debugging Avancé

### Vérifier dans le Code

Ouvrir **DevTools → Console**, puis :

```javascript
// Test manuel de l'API
fetch('https://entreprise.data.gouv.fr/api/sirene/v3/etablissements/55208673700039')
  .then(r => r.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));
```

**Résultat attendu** :
```javascript
{
  etablissement: {
    siret: "55208673700039",
    unite_legale: {
      denomination: "GOOGLE FRANCE"
    },
    // ... autres données
  }
}
```

### Erreurs Possibles

#### 1. CORS Error
```
Access to fetch at 'https://...' has been blocked by CORS policy
```
**Solution** : L'API `entreprise.data.gouv.fr` autorise CORS, donc ce n'est pas normal. Vérifier extensions navigateur (ad-blocker).

#### 2. 404 Not Found
```json
{
  "error": "Établissement non trouvé"
}
```
**Solution** : SIRET invalide, essayer un autre.

#### 3. Network Error
```
TypeError: Failed to fetch
```
**Solution** : Problème connexion internet ou API down.

#### 4. Timeout
```
Request timeout
```
**Solution** : API lente, attendre ou réessayer.

---

## ✅ Checklist de Validation

Avant de signaler un bug :

- [ ] J'ai testé avec un SIRET de la liste ci-dessus
- [ ] Le SIRET contient exactement 14 chiffres
- [ ] J'ai attendu 2-3 secondes après saisie
- [ ] J'ai vérifié ma connexion internet
- [ ] J'ai ouvert la console (F12) pour voir les erreurs
- [ ] J'ai testé l'URL API dans le navigateur
- [ ] J'ai essayé le mode saisie manuelle

---

## 🚀 Si Tout Échoue

### Option 1 : Mode Manuel
Cliquez "✍️ Saisie manuelle" et remplissez tout manuellement.

### Option 2 : Vérifier le SIRET
Allez sur https://annuaire-entreprises.data.gouv.fr/ et cherchez l'entreprise.

### Option 3 : Utiliser un SIRET de Test
Prenez `55208673700039` (Google France) pour tester que l'API fonctionne.

---

## 📞 Support

**API INSEE en panne ?**
- Vérifier : https://status.data.gouv.fr/
- Alternative : https://recherche-entreprises.api.gouv.fr/

**Besoin d'aide ?**
- Consulter : `INSEE_API_GUIDE.md`
- Tests : `CLIENTS_TESTING_GUIDE.md`

---

**Date** : 11 octobre 2025  
**API** : entreprise.data.gouv.fr  
**Version** : 1.0
