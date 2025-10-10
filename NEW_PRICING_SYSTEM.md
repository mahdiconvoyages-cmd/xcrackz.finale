# Nouveau Système de Tarification xCrackz

## Vue d'ensemble

Le nouveau système de tarification de xCrackz utilise un modèle basé sur les crédits avec 5 plans tarifaires différents, des abonnements mensuels et annuels, et des coûts variables par fonctionnalité.

---

## 📋 Les 5 Plans

### 1. 🎯 Starter - 9,99€/mois
**10 crédits par mois**

#### Inclus :
- ✅ 10 missions maximum
- ✅ 1 utilisateur
- ✅ Facturation & Devis illimités
- ✅ Scan de documents illimité
- ✅ Support par email

#### Idéal pour :
- Convoyeurs indépendants débutants
- Petites structures occasionnelles
- Test de la plateforme

---

### 2. ⚡ Basic - 19,99€/mois
**25 crédits par mois**

#### Inclus :
- ✅ 25 missions maximum
- ✅ 2 utilisateurs
- ✅ Facturation & Devis illimités
- ✅ Scan de documents illimité
- ✅ **Covoiturage inclus**
- ✅ Support prioritaire

#### Idéal pour :
- Petites équipes
- Convoyeurs réguliers
- Utilisation du covoiturage

---

### 3. ⭐ Pro - 49,99€/mois (POPULAIRE)
**100 crédits par mois**

#### Inclus :
- ✅ 100 missions maximum
- ✅ 5 utilisateurs
- ✅ Facturation & Devis illimités
- ✅ Scan de documents illimité
- ✅ **Tracking GPS GRATUIT** ⭐
- ✅ Covoiturage inclus
- ✅ Support prioritaire 24/7

#### Idéal pour :
- Professionnels du convoyage
- PME en croissance
- Usage intensif de la plateforme

---

### 4. 🏆 Business - 79,99€/mois
**500 crédits par mois**

#### Inclus :
- ✅ 500 missions maximum
- ✅ 10 utilisateurs
- ✅ Facturation & Devis illimités
- ✅ Scan de documents illimité
- ✅ **Tracking GPS GRATUIT** ⭐
- ✅ **API incluse**
- ✅ Covoiturage illimité
- ✅ Support dédié 24/7

#### Idéal pour :
- Grandes structures
- Intégrations système
- Volume important de missions

---

### 5. 👑 Enterprise - 119,99€/mois
**1500 crédits par mois**

#### Inclus :
- ✅ 1500 missions maximum
- ✅ **Utilisateurs illimités**
- ✅ Facturation & Devis illimités
- ✅ Scan de documents illimité
- ✅ **Tracking GPS GRATUIT** ⭐
- ✅ **API personnalisée**
- ✅ Covoiturage illimité
- ✅ **Formation équipe**
- ✅ **Account manager dédié**
- ✅ Fonctionnalités sur mesure

#### Idéal pour :
- Grands groupes de transport
- Multi-sites
- Besoins spécifiques

---

## 💰 Abonnements Annuels

### Économisez 20% avec l'abonnement annuel !

| Plan | Prix Mensuel | Prix Annuel | Économie |
|------|-------------|-------------|----------|
| Starter | 9,99€ | **95,90€** | 23,98€ |
| Basic | 19,99€ | **191,90€** | 47,98€ |
| Pro | 49,99€ | **479,90€** | 119,98€ |
| Business | 79,99€ | **767,90€** | 191,98€ |
| Enterprise | 119,99€ | **1151,90€** | 287,98€ |

**Avantage** : Payez une fois pour l'année et économisez l'équivalent de 2,4 mois !

---

## 🎮 Coûts des Fonctionnalités en Crédits

### Création de Missions
**Coût : 1 crédit**
- Chaque nouvelle mission créée consomme 1 crédit
- Valable pour tous les plans

### Inspection Véhicule
**Coût : GRATUIT** ✅
- Inclus dans toutes les missions créées
- Inspection avant et après transport
- Photos, signatures, rapports PDF
- Aucun crédit consommé

### Tracking GPS
**Coût : 1 crédit par position**
**GRATUIT à partir du plan Pro** ⭐

- Enregistrement d'une position GPS
- **Plans Starter et Basic** : 1 crédit par position
- **Plans Pro, Business, Enterprise** : GRATUIT illimité

### Publier Trajet Covoiturage
**Coût : 2 crédits**
- Créer une offre de covoiturage
- Définir le trajet, date, prix
- Gestion des réservations

### Réserver Covoiturage
**Coût : 2 crédits**
- Réserver un trajet publié
- Accès à la messagerie avec le conducteur
- Confirmation de réservation

### Facturation & Devis
**Coût : GRATUIT** ✅
- Accès illimité
- Création de factures
- Création de devis
- Export PDF
- Inclus dans tous les plans

### Scan de Documents
**Coût : GRATUIT** ✅
- Scanner des documents en illimité
- OCR automatique
- Stockage sécurisé
- Inclus dans tous les plans

---

## 🔄 Renouvellement des Crédits

### Fonctionnement
- **Période** : Tous les 30 jours
- **Date** : À partir de la date de souscription
- **Crédits** : Remis à zéro et rechargés au niveau du plan
- **Non cumulables** : Les crédits non utilisés ne sont pas reportés

### Exemple
```
Souscription : 1er janvier
Plan : Pro (100 crédits)

1er janvier : 100 crédits
15 janvier : Utilise 40 crédits → Reste 60 crédits
31 janvier : Reste 60 crédits
1er février : Renouvellement → 100 crédits (pas 160)
```

---

## 🗄️ Architecture Technique

### Tables de Base de Données

#### `credits_packages`
Stocke les plans tarifaires
```sql
- id: uuid
- name: text (Starter, Basic, Pro, Business, Enterprise)
- description: text
- credits: integer (10, 25, 100, 500, 1500)
- price: numeric (9.99, 19.99, 49.99, 79.99, 119.99)
- is_popular: boolean
- billing_period: text (monthly, annual)
- discount_percent: integer (20% pour annuel)
- free_tracking: boolean (Pro+)
```

#### `feature_costs`
Coûts des fonctionnalités
```sql
- id: uuid
- feature_name: text
- feature_key: text (mission_create, tracking_location, etc.)
- description: text
- credit_cost: integer
- free_from_plan: text (pro, business, enterprise)
```

#### `credit_usage_log`
Historique d'utilisation
```sql
- id: uuid
- user_id: uuid
- feature_key: text
- credits_used: integer
- was_free: boolean
- reference_id: uuid (mission_id, covoiturage_id)
- created_at: timestamptz
```

### Fonction SQL `deduct_credits()`

Fonction intelligente qui :
1. Vérifie le coût de la fonctionnalité
2. Vérifie le plan de l'utilisateur
3. Détermine si la fonctionnalité est gratuite pour ce plan
4. Déduit les crédits si nécessaire
5. Log l'utilisation

```sql
SELECT deduct_credits(
  'user-uuid',
  'mission_create',
  'mission-uuid'
);

-- Retourne:
{
  "success": true,
  "credits_used": 1,
  "was_free": false,
  "new_balance": 99
}
```

---

## 🎯 Logique de Gratuité

### Tracking GPS Gratuit

**Conditions :**
```
Plan >= Pro ET feature_key = 'tracking_location'
→ Tracking GRATUIT
```

**Implémentation :**
```typescript
if (userPlan === 'Pro' || userPlan === 'Business' || userPlan === 'Enterprise') {
  // Tracking gratuit, pas de déduction de crédits
  tracking_free = true;
}
```

### Fonctionnalités Toujours Gratuites

- Inspections véhicule (si mission créée)
- Facturation & Devis
- Scan de documents

**Raison :** Ces fonctionnalités sont essentielles au service et ne doivent pas limiter l'utilisation.

---

## 💳 Intégration Paiement

### Processeur : Mollie

**Flux de paiement :**
1. Utilisateur choisit un plan (mensuel ou annuel)
2. Clic sur "Commencer"
3. Appel à l'edge function `create-payment`
4. Création session de paiement Mollie
5. Redirection vers Mollie
6. Paiement sécurisé
7. Webhook Mollie → `mollie-webhook`
8. Activation de l'abonnement
9. Crédits ajoutés automatiquement

### Méthodes de Paiement
- Cartes bancaires (Visa, Mastercard, Amex)
- PayPal
- Virement bancaire SEPA
- Apple Pay / Google Pay

---

## 📊 Interface Utilisateur

### Page Shop (`/shop`)

**Fonctionnalités :**
- Toggle Mensuel / Annuel
- Badge -20% sur abonnement annuel
- Badge POPULAIRE sur plan Pro
- 5 cartes de tarifs côte à côte
- Section "Coûts des fonctionnalités"
- Section Paiement sécurisé
- Section Garanties

**Affichage dynamique :**
- Charge les plans depuis la base de données
- Affiche les features selon le plan
- Calcule automatiquement le prix mensuel pour l'annuel

### Landing Page (`/`)

**Section Tarifs :**
- Présentation des 5 plans
- Features principales
- Coûts en crédits explicites
- CTA "Commencer"
- Note sur économie annuelle

---

## 🔐 Sécurité & RLS

### Policies Row Level Security

**`credits_packages`** : Lecture publique (plans actifs seulement)
**`feature_costs`** : Lecture publique (fonctionnalités actives)
**`credit_usage_log`** : Utilisateurs voient leur propre historique, admins voient tout
**`user_credits`** : Utilisateurs gèrent leurs propres crédits

---

## 📈 Analytics & Reporting

### Données à Tracker

**Par utilisateur :**
- Crédits consommés par fonctionnalité
- Fonctionnalités gratuites utilisées
- Historique de renouvellement
- Taux d'utilisation (crédits utilisés / crédits disponibles)

**Globalement :**
- Plans les plus populaires
- Fonctionnalités les plus utilisées
- Taux de conversion annuel vs mensuel
- Churn rate par plan

---

## 🚀 Migration depuis Ancien Système

### Étapes

1. **Anciens utilisateurs gratuits**
   - Migrer vers plan Starter (9,99€)
   - Offrir 1 mois gratuit

2. **Anciens utilisateurs Pro (29€)**
   - Migrer vers plan Pro (49,99€)
   - Communication des nouveaux avantages (tracking gratuit)
   - Offre de transition : premier mois à 29€

3. **Données à migrer**
   - Solde de crédits actuel
   - Historique de transactions
   - Date d'expiration

### Communication

Email à tous les utilisateurs avec :
- Comparaison ancien vs nouveau plan
- Bénéfices du nouveau système
- Guide des nouveaux coûts en crédits
- FAQ

---

## 📞 Support

### Questions Fréquentes

**Q : Que se passe-t-il si je manque de crédits ?**
R : Vous ne pouvez plus créer de missions/trajets jusqu'au prochain renouvellement ou upgrade de plan.

**Q : Puis-je acheter des crédits supplémentaires ?**
R : Non, les crédits sont fixes par plan. Vous pouvez upgrader votre plan à tout moment.

**Q : Les crédits non utilisés sont-ils reportés ?**
R : Non, les crédits sont renouvelés tous les 30 jours et ne sont pas cumulables.

**Q : Le tracking GPS est-il vraiment gratuit pour Pro+ ?**
R : Oui, totalement illimité sans consommation de crédits.

**Q : Puis-je changer de plan en cours de mois ?**
R : Oui, upgrade immédiat avec prorata. Downgrade effectif au prochain renouvellement.

---

## 📋 Checklist de Déploiement

- [x] Migration base de données créée
- [x] 5 nouveaux plans insérés
- [x] Plans annuels générés (-20%)
- [x] Table feature_costs créée
- [x] Fonction deduct_credits() créée
- [x] Page Shop mise à jour
- [x] Landing page mise à jour
- [x] RLS policies configurées
- [x] Build réussi
- [ ] Tests de paiement en sandbox
- [ ] Communication aux utilisateurs existants
- [ ] Documentation client mise à jour
- [ ] Formation support client

---

## 🎉 Résumé

Le nouveau système de tarification xCrackz offre :
- **5 plans flexibles** de 9,99€ à 119,99€
- **Abonnements annuels** avec 20% de réduction
- **Tracking GPS gratuit** pour plans Pro+
- **Coûts transparents** par fonctionnalité
- **Renouvellement automatique** tous les 30 jours
- **Système de crédits** clair et prévisible

✅ Prêt pour le déploiement en production !
