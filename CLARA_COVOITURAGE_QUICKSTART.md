# 🚀 Quick Start - Clara Covoiturage

## 🎯 Pour Démarrer Immédiatement

### 1️⃣ Rechercher un trajet
```
Toi: "Clara, cherche trajets Paris-Lyon demain"

Clara: "✅ 3 trajets disponibles
        1. Jean Dupont - 25€/place - 14h00
        2. Marie Martin - 30€/place - 09h30
        3. Pierre Dubois - 20€/place - 18h00"
```

### 2️⃣ Réserver un trajet
```
Toi: "Réserve 2 places pour le trajet 1"

Clara: "Message au conducteur ?"

Toi: "Bonjour ! J'arrive à l'heure avec un sac. Merci !"

Clara: "✅ Réservation envoyée !
        💳 2 crédits bloqués
        💰 50€ à payer au conducteur
        ⏳ En attente de confirmation"
```

### 3️⃣ Publier un trajet
```
Toi: "Publie un trajet Paris-Lyon"

Clara: "⚠️ Coût: 2 crédits
        Adresse de départ ?"

Toi: "10 Rue de Rivoli, 75001 Paris"

[... Clara pose toutes les questions ...]

Clara: "✅ Trajet publié !
        💳 -2 crédits
        🆔 ID: trip-xyz-999"
```

### 4️⃣ Voir mes trajets
```
Toi: "Mes trajets"

Clara: "🚗 EN TANT QUE CONDUCTEUR:
        - Paris → Lyon (2/3 places)
        
        💺 EN TANT QUE PASSAGER:
        - Lyon → Paris (1 place, en attente)"
```

---

## 💳 Système de Crédits

| Action | Coût | Type |
|--------|------|------|
| Rechercher | Gratuit | - |
| Lister trajets | Gratuit | - |
| **Publier** | **2 crédits** | Déduction immédiate |
| **Réserver** | **2 crédits** | Bloqués (remboursés si refus) |

---

## ⚠️ Règles Importantes

### Prix
- ✅ Minimum: **2€** par place (règle BlaBlaCar)
- ✅ Pas de maximum

### Places
- ✅ Minimum: **1** place
- ✅ Maximum: **8** places (règle BlaBlaCar)

### Message conducteur
- ✅ Minimum: **20 caractères** (règle BlaBlaCar)
- ✅ Exemples acceptés:
  - "Bonjour ! J'arrive à l'heure avec un petit sac."
  - "Salut ! Content de voyager avec toi. Pas de bagages lourds."
- ❌ Exemples refusés:
  - "Salut !" (7 caractères)
  - "OK merci" (8 caractères)

---

## 🧪 Tests Rapides

### Test 1: Recherche
```bash
"Clara, cherche trajets Paris-Lyon le 15 octobre"
```
**Attendu:** Liste des trajets avec détails

### Test 2: Publication (crédits OK)
```bash
"Clara, publie un trajet Paris-Lyon"
# Solde: 5 crédits
```
**Attendu:** Trajet publié, crédits: 5 → 3

### Test 3: Publication (crédits KO)
```bash
"Clara, publie un trajet Paris-Lyon"
# Solde: 1 crédit
```
**Attendu:** Erreur + proposition achat crédits

### Test 4: Réservation (message OK)
```bash
"Clara, réserve 1 place pour trip-abc-123"
# Message: "Bonjour ! J'arrive à l'heure avec un sac."
```
**Attendu:** Réservation créée, 2 crédits bloqués

### Test 5: Réservation (message KO)
```bash
"Clara, réserve 1 place pour trip-abc-123"
# Message: "Salut !" (7 caractères)
```
**Attendu:** Erreur + demande message plus long

---

## 📝 Templates de Messages

### Pour passagers (≥20 caractères)
```
✅ "Bonjour ! J'arrive à l'heure au point de rendez-vous. J'ai juste un sac à dos."
✅ "Salut ! Content de voyager avec toi. Pas de bagages lourds. À demain !"
✅ "Bonjour, je confirme ma présence. Un petit sac uniquement. Merci beaucoup !"
✅ "Hello ! Je serai là à 13h50. J'ai une valise cabine. Au plaisir de te rencontrer !"
```

---

## 🎬 Conversation Complète Type

```
Toi: "Bonjour Clara !"

Clara: "Bonjour Mahdi ! 😊 Comment puis-je t'aider aujourd'hui ?"

Toi: "Je cherche un covoiturage pour Lyon demain"

Clara: "Parfait Mahdi ! De quelle ville pars-tu ?"

Toi: "Paris"

Clara: "Super ! Je cherche des covoiturages Paris → Lyon pour le 13/10/2025... 🔍

✅ **2 trajets disponibles** 🚗

**1. Paris → Lyon**
   🕐 Départ: 13/10/2025 à 14:00
   👤 Conducteur: Jean Dupont ⭐ 4.8/5
   💺 Places disponibles: 3/4
   💰 Prix par place: 25€
   ✨ ⚡ Réservation instantanée, 🐕 Animaux acceptés
   🆔 ID: `trip-abc-123`

**2. Paris → Lyon**
   🕐 Départ: 13/10/2025 à 09:30
   👤 Conducteur: Marie Martin ⭐ 4.5/5
   💺 Places disponibles: 2/3
   💰 Prix par place: 30€
   🆔 ID: `trip-def-456`

💡 Lequel t'intéresse ?"

Toi: "Le premier, réserve 1 place"

Clara: "Super Mahdi ! Je vais réserver 1 place pour le trajet de Jean Dupont. 🚗

📋 Détails du trajet:
- Paris → Lyon
- Départ: 13/10/2025 à 14:00
- Prix: 25€ par place
- **Total: 25€** (1 place × 25€)

⚠️ **Coût: 2 crédits bloqués** + 25€ à payer au conducteur en espèces

Message au conducteur ? (minimum 20 caractères)"

Toi: "Bonjour ! Je serai à l'heure au point de rendez-vous. J'ai juste un sac à dos. Merci !"

Clara: "✅ **Réservation envoyée au conducteur !** 🎉

📋 Récapitulatif:
👤 Conducteur: Jean Dupont
🚗 Paris → Lyon
🕐 13/10/2025 à 14:00
💺 1 place réservée
💰 25€ à payer au conducteur en espèces
💳 2 crédits bloqués (remboursés si refus)
✉️ Ton message: "Bonjour ! Je serai à l'heure..."

⏳ **En attente de confirmation du conducteur**
Tu seras notifié(e) quand il acceptera ! 🔔

🆔 Réservation: `booking-xxx-111`"

Toi: "Merci !"

Clara: "Avec plaisir Mahdi ! 😊 Bon voyage ! 🚗💨"
```

---

## 🆘 Problèmes Courants

### "Crédits insuffisants"
**Problème:** Tu as moins de 2 crédits
**Solution:** Achète des crédits via la boutique
```
Clara: "❌ Il te faut 2 crédits. Solde actuel: 1 crédit.
        Veux-tu acheter des crédits ? 🛒"
```

### "Message trop court"
**Problème:** Ton message fait moins de 20 caractères
**Solution:** Ajoute plus de détails
```
Clara: "❌ Message trop court: 7/20 caractères.
        Ajoute des détails (heure d'arrivée, bagages, etc.)"
```

### "Places insuffisantes"
**Problème:** Tu demandes plus de places que disponible
**Solution:** Réserve le nombre de places disponibles
```
Clara: "❌ Il n'y a que 2 places disponibles.
        Veux-tu réserver 2 places au lieu de 3 ?"
```

### "Prix trop bas"
**Problème:** Prix < 2€
**Solution:** Fixe un prix ≥ 2€
```
Clara: "❌ Prix minimum: 2€ (règle BlaBlaCar).
        Quel prix veux-tu fixer ?"
```

---

## 📚 Documentation Complète

- **Guide détaillé:** `CLARA_COVOITURAGE_GUIDE.md`
- **Récapitulatif:** `CLARA_COVOITURAGE_RECAP.md`
- **Quick Start:** `CLARA_COVOITURAGE_QUICKSTART.md` (ce fichier)

---

**Prêt à démarrer ! Dis simplement:**
```
"Clara, cherche trajets Paris-Lyon demain"
```

🚗💨 **Bon voyage !**
