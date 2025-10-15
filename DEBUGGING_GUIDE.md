# 🔍 Guide de Débogage - API INSEE

## ✅ Modifications Effectuées

J'ai ajouté des **logs détaillés** dans le code pour tracer exactement ce qui se passe :

### 📁 Fichiers Modifiés

1. **`src/services/inseeService.ts`**
   - ✅ Logs avant/après chaque étape
   - ✅ Affichage des données brutes de l'API
   - ✅ Affichage de l'adresse formatée

2. **`src/pages/Clients.tsx`**
   - ✅ Logs de la recherche
   - ✅ Logs du résultat
   - ✅ Logs des données formulaire

---

## 🧪 Comment Tester Maintenant

### Étape 1 : Ouvrir la Console

1. **Ouvrir votre navigateur** sur http://localhost:5176/clients
2. **Appuyer sur F12** pour ouvrir les DevTools
3. **Aller dans l'onglet Console**

### Étape 2 : Tester un SIRET

1. **Cliquer** sur "Nouveau client"
2. **Taper** dans le champ SIRET : `55208673700039`
3. **Regarder la console** - vous devriez voir :

```
🔍 Recherche INSEE pour SIRET: 55208673700039
🔍 searchBySiret appelé avec: 55208673700039
🧹 SIRET nettoyé: 55208673700039
📡 Requête API INSEE: https://entreprise.data.gouv.fr/api/sirene/v3/etablissements/55208673700039
📥 Réponse API - Status: 200 OK
📦 Données brutes reçues: {...}
🏢 Établissement trouvé: {...}
📍 Adresse formatée: 8 RUE DE LONDRES 75009 PARIS
✅ Résultat final: {...}
📦 Résultat API INSEE: {...}
✅ Entreprise trouvée: GOOGLE FRANCE
📍 Adresse formatée: 8 RUE DE LONDRES 75009 PARIS
📝 Nouvelles données formulaire: {...}
```

### Étape 3 : Analyser les Logs

#### ✅ Si tout fonctionne :
- Vous verrez tous les emojis ✅ et 📦
- Le nom et l'adresse s'affichent dans la console
- **ET** les champs se remplissent automatiquement

#### ❌ Si ça ne fonctionne pas :
Cherchez ces messages dans la console :

**Cas 1 : SIRET invalide**
```
❌ SIRET invalide (doit contenir 14 chiffres), longueur: XX
```
→ **Solution** : Vérifiez que vous tapez exactement 14 chiffres

**Cas 2 : SIRET non trouvé (404)**
```
📥 Réponse API - Status: 404 Not Found
❌ SIRET non trouvé dans la base INSEE (404)
```
→ **Solution** : Le SIRET n'existe pas, utilisez un des SIRET de test ci-dessous

**Cas 3 : Erreur réseau**
```
❌ Erreur lors de la recherche SIRET: TypeError: Failed to fetch
```
→ **Solution** : Problème de connexion internet ou CORS

**Cas 4 : Données reçues mais champs vides**
```
✅ Résultat final: {...}
📦 Résultat API INSEE: {...}
```
→ **Solution** : Les données sont reçues mais pas appliquées au formulaire
→ Vérifiez que `formData` est bien mis à jour

---

## 🎯 SIRET de Test Garantis

Copiez-collez ces SIRET **exactement** (14 chiffres, sans espaces) :

### Grandes Entreprises
```
55208673700039  →  Google France (Paris)
88091431100019  →  La Poste (Paris)
55200155800027  →  Microsoft France (Issy)
87925905400018  →  SNCF (Saint-Denis)
53080213200025  →  Amazon France (Clichy)
88275018900010  →  EDF (Paris)
```

### Test Rapide
Le plus simple : **Google France**
```
55208673700039
```

---

## 📊 Ce Que Vous Devriez Voir

### Dans la Console
```javascript
🔍 Recherche INSEE pour SIRET: 55208673700039
📡 Requête API INSEE: https://...
📥 Réponse API - Status: 200 OK
📦 Données brutes reçues: {
  etablissement: {
    siret: "55208673700039",
    unite_legale: {
      denomination: "GOOGLE FRANCE"
    },
    adresse: {
      numero_voie: "8",
      type_voie: "RUE",
      libelle_voie: "DE LONDRES",
      code_postal: "75009",
      libelle_commune: "PARIS 9"
    }
  }
}
✅ Entreprise trouvée: GOOGLE FRANCE
📍 Adresse formatée: 8 RUE DE LONDRES 75009 PARIS
```

### Dans le Formulaire
- ✅ Badge vert : "Entreprise trouvée !"
- ✅ Icône ✓ verte dans le champ SIRET
- ✅ Champ **Nom** : `GOOGLE FRANCE`
- ✅ Champ **Adresse** : `8 RUE DE LONDRES 75009 PARIS`

---

## 🐛 Problèmes Possibles

### 1. Les logs apparaissent mais les champs ne se remplissent pas

**Diagnostic** : Problème dans `setFormData`

**Actions** :
1. Cherchez dans la console : `📝 Nouvelles données formulaire:`
2. Vérifiez que `name` et `address` sont remplis
3. Si oui, c'est un problème React (state pas mis à jour)
4. Si non, c'est un problème de formatage des données

**Solution temporaire** :
- Activer le mode "✍️ Saisie manuelle"
- Copier le nom et l'adresse depuis la console
- Les coller manuellement

### 2. Aucun log n'apparaît

**Diagnostic** : La fonction `handleSiretSearch` n'est pas appelée

**Actions** :
1. Vérifiez que vous tapez bien dans le champ SIRET
2. Vérifiez que vous avez tapé exactement 14 chiffres
3. Rafraîchissez la page (Ctrl+Shift+R)

### 3. Erreur CORS

**Message** :
```
Access to fetch at 'https://entreprise.data.gouv.fr/...' 
has been blocked by CORS policy
```

**Diagnostic** : Bloqueur de pub ou extension navigateur

**Solutions** :
1. Désactiver les extensions (ad-blocker, privacy badger)
2. Essayer en navigation privée
3. Essayer un autre navigateur

### 4. L'API retourne 404 pour tous les SIRET

**Diagnostic** : L'API INSEE est peut-être en panne

**Actions** :
1. Testez directement dans le navigateur :
   ```
   https://entreprise.data.gouv.fr/api/sirene/v3/etablissements/55208673700039
   ```
2. Si ça ne charge pas → API down
3. Vérifiez https://status.data.gouv.fr/

**Solution temporaire** :
- Utilisez le mode "✍️ Saisie manuelle"

---

## 🛠️ Test de l'API en Direct

J'ai créé une **page de test** : `test-insee.html`

**Comment l'utiliser** :
1. Ouvrir http://localhost:5176/test-insee.html
2. Cliquer sur un des boutons (Google, La Poste, etc.)
3. Observer le résultat

**Avantages** :
- Test isolé (sans React)
- Logs détaillés
- Affichage JSON complet
- Boutons de test rapides

---

## 📞 Que Me Dire

Après avoir testé, dites-moi **exactement** ce que vous voyez :

### Option A : Ça fonctionne ✅
> "Les logs apparaissent et les champs se remplissent automatiquement"

### Option B : Logs OK mais pas de remplissage ⚠️
> "Je vois '✅ Entreprise trouvée: GOOGLE FRANCE' dans la console mais les champs restent vides"

### Option C : Erreur 404 ❌
> "Je vois '❌ SIRET non trouvé' même avec 55208673700039"

### Option D : Erreur réseau 🌐
> "Je vois 'Failed to fetch' dans la console"

### Option E : Aucun log 🤔
> "Rien ne s'affiche dans la console quand je tape le SIRET"

---

## 🎯 Prochaines Étapes

**Si les logs fonctionnent** :
→ On corrige le problème de `setFormData`

**Si l'API ne répond pas** :
→ On cherche une API alternative (pappers.fr, infogreffe)

**Si tout fonctionne** :
→ On passe à la suite (lier ClientSelector aux Clients)

---

**Date** : 11 octobre 2025  
**Version** : 2.1 (avec logs de débogage)  
**Status** : En cours de débogage
