# 🧪 Guide de Test - Page Clients avec API INSEE

## 🎯 SIRET de Test (Entreprises Réelles)

### Grandes Entreprises
```
55208673700039  →  Google France
88091431100019  →  La Poste
55200155800027  →  Microsoft France
87925905400018  →  SNCF
53080213200025  →  Amazon France Logistique
55208067400011  →  Apple France
```

### PME / Startups
```
84980388700019  →  OVH (hébergement web)
82423778700019  →  Blablacar
53879664200063  →  Deezer
79978758100019  →  Criteo
```

---

## 📋 Scénarios de Test

### ✅ Test 1 : Auto-complétion réussie

**Étapes** :
1. Aller sur `/clients`
2. Cliquer **"+ Nouveau client"**
3. Vérifier badge **"✨ Auto-complétion INSEE"** visible
4. Taper SIRET : `55208673700039`
5. Attendre 1-2 secondes

**Résultat attendu** :
- ✅ Loader animé pendant recherche
- ✅ Badge vert : **"Entreprise trouvée ! Les champs ont été remplis automatiquement."**
- ✅ Icône **✓** verte dans champ SIRET
- ✅ Champ **Nom** pré-rempli : "GOOGLE FRANCE"
- ✅ Champ **Adresse** pré-rempli : "8 RUE DE LONDRES 75009 PARIS"
- ✅ Champs **Email** et **Téléphone** vides (à compléter manuellement)

**Actions suivantes** :
6. Ajouter email : `contact@google.fr`
7. Ajouter téléphone : `01 42 68 53 00`
8. Cliquer **"Créer le client"**
9. Vérifier carte client créée dans la liste
10. Vérifier SIRET formaté : `552 086 737 00039`

---

### ❌ Test 2 : SIRET invalide

**Étapes** :
1. Nouveau client
2. Taper SIRET invalide : `99999999999999`
3. Attendre 1-2 secondes

**Résultat attendu** :
- ❌ Message rouge : **"SIRET non trouvé dans la base INSEE. Vérifiez le numéro ou activez la saisie manuelle."**
- ❌ Icône **⚠️** rouge dans champ SIRET
- ❌ Border rouge : `border-red-500`
- ❌ Background rouge : `bg-red-50`
- ❌ Champs Nom et Adresse vides

**Actions suivantes** :
4. Cliquer **"✍️ Saisie manuelle"**
5. Remplir tous les champs manuellement
6. Créer le client

---

### ✍️ Test 3 : Mode Saisie Manuelle

**Étapes** :
1. Nouveau client
2. Cliquer **"✍️ Saisie manuelle"** (en haut à droite)
3. Vérifier badge **"✨ Auto-complétion INSEE"** disparu
4. Taper SIRET : `12345678901234`
5. Observer : **Pas de recherche automatique**

**Résultat attendu** :
- ✅ Pas de loader
- ✅ Pas de badge vert/rouge
- ✅ Champs Nom et Adresse restent vides
- ✅ Lien devient : **"✨ Activer auto-complétion"**

**Actions suivantes** :
6. Remplir manuellement :
   - Nom : `ACME Corporation`
   - Email : `contact@acme.com`
   - Téléphone : `06 12 34 56 78`
   - Adresse : `123 Rue de la Paix, 75001 Paris`
   - SIRET : `12345678901234`
7. Créer le client
8. Vérifier sauvegarde

---

### 🔄 Test 4 : Réactivation Auto-complétion

**Étapes** :
1. Mode manuel activé (test 3)
2. Cliquer **"✨ Activer auto-complétion"**
3. Effacer SIRET et retaper : `88091431100019`

**Résultat attendu** :
- ✅ Badge **"✨ Auto-complétion INSEE"** réapparaît
- ✅ Recherche automatique se lance
- ✅ Pré-remplissage fonctionne à nouveau
- ✅ Nom : "LA POSTE"
- ✅ Adresse : "9 RUE DU COLONEL PIERRE AVIA 75015 PARIS"

---

### 🎨 Test 5 : Design Moderne

**Vérifier Stats Cards** :
1. Observer les 4 cartes en haut :
   - ✅ **Gradient Teal→Cyan** : Total clients
   - ✅ **Gradient Green→Emerald** : Nouveaux ce mois
   - ✅ **Gradient Blue→Indigo** : Avec email
   - ✅ **Gradient Purple→Pink** : Avec SIRET
2. Passer la souris sur une carte :
   - ✅ Ombre plus grande : `shadow-2xl`
   - ✅ Carte monte : `-translate-y-1`
   - ✅ Icône grossit : `scale-110`

**Vérifier Client Cards** :
1. Observer une carte client :
   - ✅ Avatar avec première lettre (gradient teal→cyan)
   - ✅ 4 info boxes colorées (email, phone, address, siret)
   - ✅ SIRET formaté : `XXX XXX XXX XXXXX`
   - ✅ 2 boutons gradients (Modifier : blue→indigo, Supprimer : red→pink)
2. Passer la souris :
   - ✅ Carte monte
   - ✅ Border devient teal : `border-teal-400`
   - ✅ Ombre colorée : `shadow-teal-500/20`

**Vérifier Formulaire** :
1. Ouvrir modal nouveau client :
   - ✅ Titre gradient : teal→cyan
   - ✅ Badge auto-complétion : fond teal-50
   - ✅ Icônes colorées par champ (teal, blue, purple, green, orange)
   - ✅ Border-2 + focus ring-4
2. Taper SIRET valide :
   - ✅ Loader : icône qui tourne
   - ✅ Badge vert + icône ✓
   - ✅ Border verte : `border-green-500`
   - ✅ Background vert clair : `bg-green-50`

**Vérifier Modal Détails** :
1. Cliquer sur une carte client :
   - ✅ Avatar XL : 20x20, text-3xl
   - ✅ Titre géant : text-4xl font-black
   - ✅ 4 info boxes pastel (gradients purple→pink, green→emerald, etc.)
   - ✅ Icon badges : w-10 h-10 avec couleurs
   - ✅ 4 stats cards : gradients full (blue, purple, green, orange)
   - ✅ SIRET formaté : font-mono font-black
   - ✅ Dernière facture : box avec icône Calendar

---

## 🐛 Tests de Robustesse

### Test 6 : SIRET < 14 chiffres
**Input** : `1234567890`  
**Résultat** : Pas de recherche (attend 14 chiffres)

### Test 7 : SIRET avec espaces
**Input** : `552 086 737 00039`  
**Résultat** : Espaces nettoyés automatiquement → Recherche OK

### Test 8 : SIRET avec lettres
**Input** : `ABC12345678901`  
**Résultat** : Lettres nettoyées → Recherche avec chiffres seulement

### Test 9 : Modification après auto-complétion
**Étapes** :
1. SIRET trouvé → Nom pré-rempli "GOOGLE FRANCE"
2. Modifier nom : "Google France SARL"
3. Créer client
**Résultat** : Nom modifié sauvegardé (pas écrasé)

### Test 10 : API lente / timeout
**Simulation** : Débrancher internet pendant recherche  
**Résultat attendu** :
- ❌ Message d'erreur après timeout
- ❌ Icône ⚠️ rouge
- ✅ Possibilité de passer en manuel

---

## 📊 Checklist Complète

### Auto-complétion
- [ ] Recherche automatique à 14 chiffres
- [ ] Loader pendant requête
- [ ] Badge vert si trouvé
- [ ] Message rouge si non trouvé
- [ ] Pré-remplissage nom + adresse
- [ ] Icône ✓ verte (trouvé)
- [ ] Icône ⚠️ rouge (non trouvé)
- [ ] Border + background colorés

### Mode Manuel
- [ ] Toggle "Saisie manuelle" fonctionne
- [ ] Pas de recherche en mode manuel
- [ ] Badge disparaît
- [ ] Réactivation fonctionne

### Design Stats
- [ ] 4 gradients colorés
- [ ] Chiffres énormes (text-5xl)
- [ ] Hover : shadow + translate + scale
- [ ] Icônes dans badges blancs

### Design Client Cards
- [ ] Avatar gradient XL
- [ ] 4 info boxes colorées
- [ ] SIRET formaté (espaces)
- [ ] Boutons gradients (blue, red)
- [ ] Hover : translate + border + shadow

### Design Formulaire
- [ ] Titre gradient
- [ ] Badge auto-complétion teal
- [ ] Icônes colorées par champ
- [ ] Border-2 + ring-4 au focus
- [ ] Feedback vert (trouvé)
- [ ] Feedback rouge (erreur)
- [ ] Loader animé

### Design Modal Détails
- [ ] Avatar XL (20x20)
- [ ] Titre géant (4xl)
- [ ] Info boxes pastel
- [ ] Icon badges (10x10)
- [ ] Stats cards gradients
- [ ] SIRET mono font-black
- [ ] Dernière facture box

### Fonctionnel
- [ ] Création client OK
- [ ] Modification client OK
- [ ] Suppression client OK
- [ ] Recherche client OK
- [ ] Stats affichées OK
- [ ] Détails client OK

---

## 🎯 Résultats Attendus

### Performance
- **Recherche INSEE** : < 2 secondes
- **Affichage liste** : Instantané (< 100ms)
- **Ouverture modal** : Instantané (< 100ms)
- **Animations** : Fluides 60fps

### UX
- **Intuitivité** : Badge auto-complétion explicite
- **Feedback** : Couleurs + icônes + messages clairs
- **Erreurs** : Messages en français, solutions proposées
- **Accessibilité** : Labels, placeholders, focus visible

### Visuel
- **Cohérence** : Palette teal→cyan partout
- **Hiérarchie** : Tailles de texte logiques (5xl → 4xl → 2xl → xl)
- **Espacement** : Padding généreux (p-6, gap-4, etc.)
- **Contraste** : WCAG AA (blanc sur gradients colorés)

---

## 📞 Support

### Si auto-complétion ne fonctionne pas :
1. Vérifier connexion internet
2. Vérifier SIRET (14 chiffres exactement)
3. Essayer un autre SIRET (voir liste en haut)
4. Passer en mode manuel

### Si design cassé :
1. Vider cache navigateur (Ctrl+Shift+R)
2. Vérifier console (F12) pour erreurs
3. Relancer `npm run dev`

### Si erreur API INSEE :
- Code 404 : SIRET inexistant
- Code 429 : Trop de requêtes (attendre 1 min)
- Code 500 : API INSEE down (utiliser mode manuel)

---

**Date de test** : 11 octobre 2025  
**Version testée** : 2.0  
**Navigateur** : Chrome 119+, Firefox 120+, Safari 17+
