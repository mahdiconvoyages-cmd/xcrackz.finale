# 🧪 Clara CRM - Guide de Test Rapide

**Objectif :** Valider les 4 fonctionnalités automation en 10 minutes

---

## ⚡ Tests Express (2 min chacun)

### 1️⃣ Génération Devis

**Commandes à tester :**

```
✅ Cas nominal
"Génère un devis pour TotalEnergies avec 5 missions transport à Paris"

✅ Paramètres manquants  
"Génère un devis"
→ Doit demander client + services

✅ Client inexistant
"Crée un devis pour ClientInconnu123"
→ Doit signaler erreur + proposer création

✅ Avec grille custom (si existante)
"Génère un devis pour Carrefour avec 3 livraisons"
→ Doit appliquer tarifs personnalisés si grille existe
```

**Résultat attendu :**
- ✅ Numéro devis unique (format 2025-XXXX)
- ✅ Total HT + TVA 20% + Total TTC
- ✅ Items avec quantité × prix unitaire
- ✅ Date validité (30 jours par défaut)
- ✅ 4 actions proposées (email, PDF, modifier, facturer)

---

### 2️⃣ Grille Tarifaire

**Commandes à tester :**

```
✅ Remise globale
"Crée une grille tarifaire pour Carrefour avec -15% de remise"

✅ Nom personnalisé
"Crée une grille VIP pour TotalEnergies avec -20%"

✅ Sans remise (paramètre manquant)
"Crée une grille pour Orange"
→ Doit demander % remise

✅ Remise extrême
"Grille pour ClientX avec -99%"
→ Doit accepter (ou valider limite si implémenté)
```

**Résultat attendu :**
- ✅ Liste services avec prix avant/après
- ✅ % remise calculé par service
- ✅ Confirmation grille active
- ✅ Message: "sera utilisée automatiquement pour ce client"

---

### 3️⃣ Analytics

**Commandes à tester :**

```
✅ Période courte
"Quel est mon CA cette semaine ?"

✅ Période mois (défaut)
"Analyse mes performances ce mois"

✅ Période longue
"CA de l'année"

✅ Top clients
"Qui sont mes meilleurs clients ce trimestre ?"
```

**Résultat attendu :**
- ✅ CA total + croissance vs période précédente
- ✅ Nombre clients (total, actifs, inactifs)
- ✅ Top 5 clients par CA avec montants
- ✅ Taux conversion devis (%)
- ✅ Top 3 services vendus

---

### 4️⃣ Planning

**Commandes à tester :**

```
✅ Date relative
"Optimise le planning de demain"

✅ Aujourd'hui
"Planifie les missions d'aujourd'hui"

✅ Date précise
"Optimise le planning du 20/01/2025"

✅ Sans missions (jour vide)
"Planning du 31/12/2030"
→ Doit signaler aucune mission
```

**Résultat attendu :**
- ✅ Score optimisation (0-100%)
- ✅ Liste affectations par équipe
- ✅ Durée totale + distance par équipe
- ✅ Missions non assignées si capacité insuffisante

---

## 🎯 Checklist Validation Globale

### Détection Intention
- [ ] Mots-clés "devis" détectés → type = 'quote'
- [ ] Mots-clés "grille tarifaire" → type = 'pricing'
- [ ] Mots-clés "CA" / "chiffre" → type = 'analytics'
- [ ] Mots-clés "planning" / "optimise" → type = 'planning'
- [ ] Confiance > 0.7 → Action exécutée
- [ ] Confiance < 0.7 → Fallback IA standard

### Extraction Paramètres
- [ ] Client extrait: "pour X" ou "client X"
- [ ] Quantité extraite: "5 missions", "3 transports"
- [ ] Ville extraite: "à Paris", "sur Lyon"
- [ ] Remise extraite: "-15%", "20%", "remise 10"
- [ ] Période extraite: "semaine", "mois", "trimestre"
- [ ] Date extraite: "aujourd'hui", "demain", "15/01/2025"

### Formatage Réponses
- [ ] Emojis présents (✅, 📋, 💰, etc.)
- [ ] Structure claire (titres, listes, totaux)
- [ ] Actions proposées (boutons cliquables si implémenté)
- [ ] Pas d'erreurs affichage (markdown valide)

### Gestion Erreurs
- [ ] Params manquants → Message aide + exemple
- [ ] Client introuvable → Erreur claire
- [ ] Erreur BDD → Fallback gracieux
- [ ] Try/catch empêche crash chat

---

## 🐛 Bugs Connus / Edge Cases

### À vérifier

**Devis :**
- [ ] Client avec accents (é, è, à)
- [ ] Noms composés ("La Poste", "Total Energies")
- [ ] Quantité = 0 (doit refuser)
- [ ] Services inexistants dans pricing

**Grille :**
- [ ] Remise négative (doit refuser)
- [ ] Remise > 100% (doit limiter ou refuser)
- [ ] Client sans grille custom → OK (utilise défaut)
- [ ] Écrasement grille existante (créer nouvelle ou update ?)

**Analytics :**
- [ ] Période sans données (retourne 0)
- [ ] Division par zéro (taux conversion si 0 devis)
- [ ] Top clients si < 5 (afficher disponibles)

**Planning :**
- [ ] Date passée (doit accepter ou refuser ?)
- [ ] 0 missions (message clair)
- [ ] 0 équipes (erreur)
- [ ] Toutes équipes occupées (unassigned)

---

## 📸 Screenshots Attendus

### Devis généré
```
✅ Devis 2025-0042 créé avec succès !

📋 Détails :
- Client : TotalEnergies
- Nombre de services : 1
- Total HT : 750.00€
- TVA (20%) : 150.00€
- Total TTC : 900.00€
```

### Grille créée
```
✅ Grille tarifaire "Grille VIP Carrefour" créée !

📊 Récapitulatif :
- Client : abc123
- Remise moyenne : 15.0%
- Services : 8
```

### Analytics
```
📊 Analyse de vos performances

💰 Chiffre d'Affaires :
- Total : 45,230.00€
- Croissance : 📈 12.5%
```

### Planning
```
📅 Planning optimisé avec succès !

Score d'optimisation : 85%

Affectations :
👨‍💼 Équipe Alpha :
  - 6 missions assignées
```

---

## ⏱️ Temps Exécution

| Action | Temps max acceptable |
|--------|---------------------|
| Détection intention | < 100ms |
| Génération devis | < 500ms |
| Grille tarifaire | < 300ms |
| Analytics | < 1s |
| Planning | < 500ms |

**Si > temps max :** Optimiser queries Supabase (indexes, select minimal).

---

## ✅ Validation Finale

**Clara CRM est prête si :**

- [x] 4/4 features fonctionnent sans crash
- [ ] Détection intention > 90% précision
- [ ] Paramètres extraits correctement
- [ ] Réponses formatées lisibles
- [ ] Erreurs gérées gracieusement
- [ ] Performance < temps max
- [ ] Tests edge cases OK

**Status actuel :** Backend 100% ✅ | Frontend intégré ✅ | Tests utilisateurs en attente ⏳

---

## 🚀 Commandes Test Copy-Paste

Pour tester rapidement dans le chat :

```
# Devis
Génère un devis pour TotalEnergies avec 5 missions transport à Paris

# Grille
Crée une grille tarifaire VIP pour Carrefour avec -20% de remise

# Analytics
Quel est mon chiffre d'affaires ce mois ?

# Planning
Optimise le planning de demain
```

**Temps total test :** ~8 minutes pour 4 commandes + vérification résultats.
