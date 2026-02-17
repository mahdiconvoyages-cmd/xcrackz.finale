# AUDIT COMPLET — ChecksFleet (Web + Flutter)

> **Date** : Juin 2025  
> **Périmètre** : Tout le parcours utilisateur, de l'inscription jusqu'aux fonctionnalités avancées  
> **Plateformes** : Web (React/TypeScript/Vite) + Mobile (Flutter/Dart)  
> **Total problèmes identifiés** : **~147 points** répartis en 7 catégories

---

## Table des matières

1. [Résumé exécutif](#1-résumé-exécutif)
2. [Inscription / Authentification / Onboarding](#2-inscription--authentification--onboarding)
3. [Navigation & Écrans principaux](#3-navigation--écrans-principaux)
4. [Missions & Inspections](#4-missions--inspections)
5. [Facturation / Devis / Crédits / Abonnements](#5-facturation--devis--crédits--abonnements)
6. [Planning Network / Covoiturage / Chat](#6-planning-network--covoiturage--chat)
7. [CRM / Contacts / Documents / Tracking / Support / Paramètres](#7-crm--contacts--documents--tracking--support--paramètres)
8. [Problèmes transversaux](#8-problèmes-transversaux)
9. [Plan d'action prioritaire](#9-plan-daction-prioritaire)

---

## 1. Résumé exécutif

| Catégorie | CRITIQUE | ÉLEVÉ | MOYEN | FAIBLE | Total |
|-----------|----------|-------|-------|--------|-------|
| Bugs | 18 | 14 | 12 | 5 | **49** |
| UX / Expérience client | 3 | 15 | 18 | 8 | **44** |
| Fonctionnalités manquantes | 2 | 10 | 11 | 5 | **28** |
| Performance | 1 | 8 | 5 | 2 | **16** |
| Sécurité | 3 | 3 | 2 | 0 | **8** |
| Accessibilité | 0 | 2 | 3 | 2 | **7** |
| **Total** | **27** | **52** | **51** | **22** | **~152** |

### Verdict global

L'application a un socle fonctionnel réel mais souffre de **3 problèmes majeurs** qui dégradent fortement l'expérience :

1. **Incohérence entre Web et Flutter** — Les deux plateformes ont divergé en termes de modèles de données, statuts, plans d'abonnement, et fonctionnalités disponibles.
2. **Fonctionnalités factices** — Plusieurs boutons simulent une action sans rien faire (envoi email, export RGPD, suppression de compte, chat support 24/7).
3. **Absence de validation et gestion d'erreurs** — De nombreux formulaires acceptent des données invalides, et les erreurs réseau sont avalées silencieusement.

---

## 2. Inscription / Authentification / Onboarding

### 🔴 BUGS CRITIQUES

| # | Problème | Plateforme | Impact |
|---|----------|------------|--------|
| 1 | **Pas de vérification email Flutter** — Après `signUp()`, l'app navigue directement vers `HomeScreen` sans vérifier l'email | Flutter | Un utilisateur avec un faux email peut utiliser l'app |
| 2 | **Crédits de bienvenue jamais créés** — Le code affiche "10 crédits offerts" dans un SnackBar mais ne les insère jamais en base | Flutter | Le client pense avoir des crédits qu'il n'a pas |
| 3 | **Conflit d'insertion profil** — Le code fait un `insert` dans `profiles` après `signUp()`, mais un trigger Supabase crée déjà le profil → erreur duplicate key possible | Flutter | Inscription échoue silencieusement |
| 4 | **Métadonnées manquantes** — `signUp()` ne passe pas `user_type`, `full_name`, `company` dans `options.data` → le trigger Supabase crée un profil vide | Flutter | Données perdues |

### 🟡 PROBLÈMES UX

| # | Problème | Plateforme | Amélioration proposée |
|---|----------|------------|----------------------|
| 5 | **Pas d'indicateur de force de mot de passe** | Flutter | Ajouter une barre de force comme sur le web |
| 6 | **Pas de toggle visibilité sur "Confirmer mot de passe"** | Flutter | Ajouter l'icône œil |
| 7 | **Validation email faible** — `contains('@')` accepte `a@b` | Les deux | Utiliser un regex standard ou le package `email_validator` |
| 8 | **"Se souvenir de moi" ne fait rien** | Les deux | Implémenter la persistance de session ou retirer la checkbox |
| 9 | **Mot de passe oublié** — Pas de loading state, pas de pré-remplissage de l'email | Les deux | Ajouter un spinner + pré-remplir le champ |
| 10 | **Erreur de login affichée sous le bouton** — Peut être hors écran | Flutter | Afficher l'erreur dans un SnackBar ou en haut du formulaire |
| 11 | **Téléphone sans validation de format** | Flutter | Masque de saisie `+33 X XX XX XX XX` |
| 12 | **Splash screen** — Délai de 2 secondes codé en dur | Flutter | Faire la transition dès que l'auth check est terminé |
| 13 | **Onboarding** — Icônes génériques au lieu d'illustrations | Flutter | Utiliser des illustrations SVG personnalisées |
| 14 | **Inscription Web** — `alert()` au lieu d'un toast au succès | Web | Utiliser le système de toast existant |
| 15 | **Avatar** — Fuite mémoire de blob URLs (jamais révoqués) | Web | `URL.revokeObjectURL()` après utilisation |

### 🔒 SÉCURITÉ

| # | Problème | Impact |
|---|----------|--------|
| 16 | **Device fingerprint stocké dans user metadata** — lisible côté client | Info exposée |
| 17 | **Pas de listener auth state** — Expiration de session non gérée | L'utilisateur peut utiliser l'app avec un token expiré |
| 18 | **Pas de route guard** — Écrans protégés accessibles sans auth | Données visibles sans connexion |

### ❌ MANQUANT

| # | Fonctionnalité |
|---|---------------|
| 19 | Connexion sociale (Google/Apple) — aucune plateforme |
| 20 | Gestion de deep links pour la vérification email |
| 21 | 2FA / Authentification à deux facteurs |

---

## 3. Navigation & Écrans principaux

### 🔴 BUGS CRITIQUES

| # | Problème | Plateforme | Impact |
|---|----------|------------|--------|
| 22 | **Route `/subscription` manquante** dans `main.dart` — crash à la navigation | Flutter | L'app plante |
| 23 | **Lien "Partage public"** pointe vers un ID en dur `'demo-trip-id'` | Flutter | Fonctionnalité cassée |
| 24 | **Double overlay** dans `Layout.tsx` — deux divs backdrop superposés | Web | Bug visuel, clic bloqué |
| 25 | **`@ts-nocheck`** sur `Dashboard.tsx` (626 lignes) — cache toutes les erreurs TypeScript | Web | Bugs masqués |

### 🟡 PROBLÈMES UX

| # | Problème | Plateforme | Amélioration |
|---|----------|------------|-------------|
| 26 | **Pas de badge notifications** sur la barre de navigation du bas | Flutter | Ajouter des points rouges avec compteur |
| 27 | **Drawer affiche le nom depuis auth metadata** au lieu de la table `profiles` | Flutter | Nom potentiellement obsolète |
| 28 | **Icône engrenage** navigue vers le Profil, pas les Paramètres | Flutter | Confusion utilisateur |
| 29 | **Pas d'état sélectionné** sur les items du drawer | Flutter | Highlight l'item actif |
| 30 | **usedCredits = totalCount** — Sémantiquement incorrect sur le Dashboard | Web | Renommer ou calculer correctement |
| 31 | **Pas de skeleton loading** sur le Dashboard | Web | Ajouter des placeholders animés |
| 32 | **Déconnexion** utilise des stratégies de navigation différentes (profil vs drawer) | Flutter | Unifier le comportement |

### ⚡ PERFORMANCE

| # | Problème | Impact |
|---|----------|--------|
| 33 | **IndexedStack** garde les 4 écrans en mémoire avec 4 subscriptions Supabase realtime actives en permanence | Battery drain + bande passante |
| 34 | **Dashboard Web** charge TOUTES les missions/contacts/factures côté client | Lent avec beaucoup de données |

### ❌ MANQUANT

| # | Fonctionnalité |
|---|---------------|
| 35 | Pas de route 404/fallback dans Flutter |
| 36 | Drawer manque : Tracking, Facturation, Support, Boutique, Paramètres |
| 37 | Gap de parité : Flutter a 4 items de navigation vs 8 dans le sidebar web |
| 38 | `/missions` et `/team-missions` rendent le même composant (redondant) |

---

## 4. Missions & Inspections

### 🔴 BUGS CRITIQUES

| # | Problème | Plateforme | Impact |
|---|----------|------------|--------|
| 39 | **`??` au lieu de `\|\|`** — `if (mission.restitutionVehicleBrand != null ?? mission.vehicleBrand != null)` → la logique est cassée | Flutter | Infos véhicule jamais affichées correctement |
| 40 | **Crash upload photo optionnelle** — `optPhoto.file.name.split(...)` sans vérifier `null` | Web | Crash si photo non capturée |
| 41 | **Statut `in_progress` avant inspection** — `_startDepartureInspection()` change le statut AVANT que l'utilisateur fasse l'inspection. S'il annule, la mission est en cours sans inspection | Flutter | Statut incohérent |
| 42 | **Rapport départ = rapport arrivée** — `handleViewDepartureReport` et `handleViewArrivalReport` créent le même rapport `report_type: 'complete'` | Web | Impossible de distinguer les rapports |

### 🟠 BUGS ÉLEVÉS

| # | Problème | Plateforme |
|---|----------|------------|
| 43 | **N+1 queries GPS** — 1 requête par mission dans la liste de tracking | Flutter |
| 44 | **Filtre realtime incorrect** — Ne capte pas les missions `assigned_user_id` | Flutter |
| 45 | **Filtre GPS** utilise `missionId` comme `session_id` → ne match jamais | Web |
| 46 | **Memory leak realtime** — `positions` dans les dépendances du `useEffect` recréé la subscription à chaque position | Web |
| 47 | **Photos optionnelles non compressées** à l'arrivée | Web |
| 48 | **Dead code** — Double `return` dans le `useEffect` de `RapportsInspection.tsx` | Web |
| 49 | **Statut dérivé différemment** — Web re-dérive depuis les inspections, Flutter prend le DB tel quel → même mission = statut différent | Cross |

### 🟡 PROBLÈMES UX

| # | Problème | Plateforme | Amélioration |
|---|----------|------------|-------------|
| 50 | **5 requêtes séquentielles** pour charger le détail mission | Flutter | `Future.wait()` pour -60% de temps |
| 51 | **Code rejoint** — Pas de masque de format, pas de hint de longueur | Flutter | Ajouter un format mask `XXXX-XXXX` |
| 52 | **MissionView.tsx** redirige immédiatement → bookmark perdu | Web | Afficher les détails inline |
| 53 | **Deeplink mobile** — Tente `window.location.href = deeplink` + attente 2.5s aveugle | Web | Détection propre via `visibilitychange` |
| 54 | **Suppression** ne mentionne pas la cascade (inspections, photos, GPS perdus) | Les deux | Avertissement détaillé |
| 55 | **Tracking GPS** invisible après complétion de mission | Flutter | Permettre de revoir le tracé |
| 56 | **Modale détail** de 300 lignes de JSX inline dans `TeamMissions.tsx` | Web | Extraire en composant séparé |

### ❌ MANQUANT

| # | Fonctionnalité | Plateforme manquante |
|---|---------------|---------------------|
| 57 | Édition de mission | Flutter |
| 58 | Archivage de mission | Flutter |
| 59 | Recherche / filtrage dans la liste | Flutter |
| 60 | Scanner de documents à l'inspection | Flutter |
| 61 | État de dommage par photo (RAS/Rayures/Cassé/Abimé) à l'arrivée | Web |
| 62 | Checklist à l'arrivée (clés, kit, roue de secours) | Web |
| 63 | Pagination / lazy loading | Les deux |
| 64 | Mode hors-ligne — données d'inspection perdues si déconnexion | Les deux |
| 65 | Écran Riverpod prêt mais non utilisé (`missions_screen_riverpod.dart`) | Flutter |

---

## 5. Facturation / Devis / Crédits / Abonnements

### 🔴 BUGS CRITIQUES

| # | Problème | Plateforme | Impact |
|---|----------|------------|--------|
| 66 | **Collision numéros de facture** — `F-{year}-{Date.now().slice(-4)}` → deux créations rapides = même numéro | Web | Doublons en base |
| 67 | **`handleConvertToInvoice`** — Copie `total` au lieu de `amount` → montants perdus | Web | Devis converti avec montants à 0 |
| 68 | **Email factice marqué "envoyé"** — `handleSendEmail` affiche "(à implémenter)" mais met le statut à `sent` en BDD | Web | Le client croit que l'email est parti |
| 69 | **Race condition crédits** — `spendCredits` lit le solde puis met à jour → deux appels concurrents = solde négatif | Flutter | Crédits en négatif |
| 70 | **Données devis incompatibles** — `QuoteGenerator.tsx` stocke les items en JSON blob, `Billing.tsx` utilise la table `quote_items` → même table, deux formats | Web | Données corrompues |

### 🟠 BUGS ÉLEVÉS

| # | Problème | Plateforme |
|---|----------|------------|
| 71 | **`handleDuplicate`** envoie `id: undefined` → erreur possible | Web |
| 72 | **Adresse entreprise vide** — `userProfile.company_address` n'existe pas, c'est `billing_meta.billing_address` | Web |
| 73 | **Delete orphelin** — Suppression d'une facture/devis sans supprimer les items | Flutter |
| 74 | **N+1 devis** — `getQuotes()` fait 1 requête par devis pour les items | Flutter |
| 75 | **État `submitted` partagé** entre deux modales dans `Shop.tsx` → fausse validation | Web |

### 🟡 PROBLÈMES UX

| # | Problème | Plateforme | Amélioration |
|---|----------|------------|-------------|
| 76 | **`prompt()` pour choisir une action** — L'utilisateur doit taper un numéro (1-4) ! | Web | Dropdown ou menu contextuel |
| 77 | **~15 `alert()` dans Billing.tsx** au lieu de toasts | Web | Système de notification unifié |
| 78 | **Boutons d'action invisibles au toucher** — `opacity-0 group-hover:opacity-100` ne marche pas sur mobile | Web | Toujours afficher sur mobile |
| 79 | **"Envoyer au client"** — Bouton rendu sans `onClick` | Web | Dead UI |
| 80 | **Pas de loading** pendant la génération PDF | Web | Spinner overlay |
| 81 | **Pas de recherche** dans les listes factures/devis Flutter | Flutter | Barre de recherche |
| 82 | **Pas d'édition** de document existant (Web n'a pas d'edit, Flutter oui) | Web | Pré-remplir le formulaire |

### 🔒 SÉCURITÉ

| # | Problème | Impact |
|---|----------|--------|
| 83 | **Calcul des montants côté client** — Un utilisateur malveillant peut modifier les totaux via DevTools | Fraude |
| 84 | **Suppression sans filtre `user_id`** — Si RLS mal configuré, n'importe qui peut supprimer | Perte de données |
| 85 | **Logo uploadé dans bucket public** `avatars` | Logo entreprise exposé |
| 86 | **Abonnement vérifié côté client uniquement** Flutter | Bypass possible |

### 🔥 INCOHÉRENCE MAJEURE : 3 modèles d'abonnement différents !

| Source | Plans | Prix |
|--------|-------|------|
| **Web `Shop.tsx`** | essentiel / pro / business | 10€ / 20€ / 50€ |
| **Flutter `subscription_screen.dart`** | free / basic / pro / enterprise | 0€ / 9.99€ / 29.99€ / 99.99€ |
| **Flutter `subscription_service.dart`** | free / basic / premium / enterprise | (pas de prix, feature-gated) |

**→ 3 nomenclatures différentes qui frappent la même base de données. C'est une source de bugs certaine.**

### ❌ MANQUANT (les deux plateformes)

| # | Fonctionnalité |
|---|---------------|
| 87 | Intégration paiement réel (Stripe/PayPal) |
| 88 | Envoi email réel (SendGrid/Resend) |
| 89 | Factures récurrentes |
| 90 | Avoirs / notes de crédit |
| 91 | Détection automatique des retards de paiement |
| 92 | Multi-devises (tout est en EUR codé en dur) |

---

## 6. Planning Network / Covoiturage / Chat

### 🔴 BUGS CRITIQUES

| # | Problème | Plateforme | Impact |
|---|----------|------------|--------|
| 93 | **Mutation d'état directe** — `form.origin_lat = geo[0].lat` au lieu de `setForm(...)` → React ne re-render pas | Web | Données incohérentes |
| 94 | **Realtime sans filtre** dans `PublicTracking.tsx` — Si user est null, subscribe à TOUTES les missions | Web | Fuite de données |

### 🟠 BUGS ÉLEVÉS

| # | Problème | Plateforme |
|---|----------|------------|
| 95 | **`_respondToMatch` orElse: () => {}** — Type mismatch silencieux | Flutter |
| 96 | **Bot messages** créés avec le `sender_id` de l'utilisateur dans `Support.tsx` | Web |
| 97 | **Dropdown géocodage** ne se ferme pas au clic extérieur | Web |
| 98 | **Distance en ligne droite** (Haversine) au lieu de distance routière → Paris-Marseille = 660km au lieu de 775km | Les deux |

### 🟡 PROBLÈMES UX

| # | Problème | Plateforme | Amélioration |
|---|----------|------------|-------------|
| 99 | **Pas de validation de date** — On peut créer un planning dans le passé | Les deux | `min` date = aujourd'hui |
| 100 | **Pas de validation horaire** — Heure de fin avant heure de début acceptée | Les deux | Vérifier `end_time > start_time` |
| 101 | **Pas de reçus de lecture** dans le chat | Les deux | Champ `is_read` existe mais jamais utilisé |
| 102 | **Indicateur "en train d'écrire" factice** — `setTimeout` de 2s dans Support | Web | Trompeur, à supprimer |
| 103 | **Chat support "Disponible 24/7"** affiche "En cours de développement" | Flutter | Mensonger |

### ⚡ PERFORMANCE

| # | Problème | Impact |
|---|----------|--------|
| 104 | **N+1 enrichissement matchs** — 2 requêtes par match dans une boucle → 50 matchs = 100 requêtes | Les deux |
| 105 | **Realtime déclenche un rechargement complet** → inclut le N+1 à chaque événement | Web |
| 106 | **Location uploadée toutes les 30s** même sans mouvement | Flutter (batterie) |
| 107 | **Classes Tailwind dynamiques** `bg-${color}-100` → purgées en production | Web (visuel) |

### ❌ MANQUANT

| # | Fonctionnalité | Plateforme manquante |
|---|---------------|---------------------|
| 108 | Vue carte du réseau (Leaflet) | Flutter |
| 109 | Vue carte du tracking en temps réel | Flutter |
| 110 | Chat support complet | Flutter |
| 111 | API de routage réel (OSRM, GraphHopper) | Les deux |
| 112 | Notifications push FCM (seules les notifications locales existent) | Flutter |

---

## 7. CRM / Contacts / Documents / Tracking / Support / Paramètres

### 🔴 BUGS

| # | Problème | Plateforme | Impact |
|---|----------|------------|--------|
| 113 | **`loadClientStats` sans filtre `user_id`** — Fuite de données si RLS mal configuré | Web | Sécurité |
| 114 | **`filterClients` crash sur email null** — `client.email.toLowerCase()` sans `?.` | Web | Crash |
| 115 | **`profile.subscription_plan`** référencé mais n'existe pas dans le type → affiche `undefined` | Web | UX cassée |
| 116 | **Classes CSS dupliquées** dans Settings → `border border-slate-200 border border-slate-200` | Web | Code sale |

### 🟡 PROBLÈMES UX

| # | Problème | Plateforme | Amélioration |
|---|----------|------------|-------------|
| 117 | **Export RGPD factice** — `Future.delayed(2s)` + "Données exportées" sans rien faire | Flutter | Implémenter ou avouer |
| 118 | **Suppression de compte factice** — Affiche "Email envoyé" sans envoyer | Flutter | Implémenter Edge Function |
| 119 | **Tracking `onTap`** n'ouvre qu'un SnackBar au lieu d'une vue détail/carte | Flutter | Naviguer vers une carte |
| 120 | **Pas d'avertissement "modifications non sauvegardées"** dans Settings/Profil | Web | `beforeunload` event |
| 121 | **Pas de validation SIRET/téléphone** dans les paramètres | Web | Utiliser `isValidSiret()` déjà existant |
| 122 | **Section abonnement dupliquée** dans Settings | Web | Supprimer le doublon |
| 123 | **Settings GPS sauvées mais jamais lues** — `PlanningLocationService` ignore `SharedPreferences` | Flutter | Lire les réglages au démarrage |

### ⚡ PERFORMANCE

| # | Problème | Impact |
|---|----------|--------|
| 124 | **N+1 grilles tarifaires** — 1 requête par client dans une boucle | Web |
| 125 | **N+1 listing stockage** — 1 requête par sous-dossier dans Documents | Web |
| 126 | **N+1 GPS tracking** par mission dans le listing Flutter | Flutter |
| 127 | **Stats factures calculées côté client** à partir de TOUTES les factures | Flutter |
| 128 | **`getPublicUrl`** appelé inline pendant le rendu | Web |

### ❌ MANQUANT

| # | Fonctionnalité | Plateforme manquante |
|---|---------------|---------------------|
| 129 | CRM complet (SIRET autocomplete, grilles tarifaires, stats client) | Flutter |
| 130 | Scanner OCR de documents | Web (normal en navigateur) |
| 131 | Vraie fonctionnalité 2FA | Les deux |
| 132 | Mode hors-ligne avec synchronisation | Les deux |

---

## 8. Problèmes transversaux

### 📛 `@ts-nocheck` sur 8+ fichiers majeurs

Les fichiers suivants désactivent TOUT le contrôle TypeScript :
- `Dashboard.tsx` (626 lignes)
- `Billing.tsx` (1604 lignes)
- `QuoteGenerator.tsx` (625 lignes)
- `Shop.tsx` (725 lignes)
- `PlanningNetwork.tsx`
- `Clients.tsx`
- `Settings.tsx`
- `Support.tsx`
- `RapportsInspection.tsx`

**→ Plus de 5000 lignes sans aucune vérification de type.** C'est comme coder en JavaScript avec de la dette technique invisible.

### 🌐 Internationalisation inexistante

- **Flutter** importe `app_localizations.dart` mais **ne l'utilise jamais** — tous les textes sont en français codé en dur
- **Web** n'a aucun système i18n — tout est en français inline
- Impossible de supporter d'autres langues sans réécrire tous les textes

### 🔁 Incohérence de statuts entre plateformes

| Donnée | Web | Flutter |
|--------|-----|---------|
| Statut tracking | `pending` + `in_progress` | `active` + `in_progress` |
| Statut mission `assigned` | N'existe pas | Existe mais sans tab |
| Plans d'abonnement | `essentiel/pro/business` | `free/basic/pro/enterprise` |
| Model facture | Colonnes plates `client_name` | JSONB `client_info` |

### 🖨️ `console.log` et `print()` partout

Quasi tous les fichiers contiennent des logs de debug avec des emojis (`📄`, `🚗`, `🔄`) qui s'affichent en production. Aucun système de logging structuré.

### ♿ Accessibilité insuffisante

- Pas de `aria-label` sur les boutons avec uniquement des icônes
- Pas de piège de focus (`focus trap`) dans les modales
- Indicateurs de statut uniquement par couleur (inaccessible aux daltoniens)
- Pas de support `prefers-reduced-motion`
- Flutter : pas de widgets `Semantics` sur les cartes custom

---

## 9. Plan d'action prioritaire

### 🔴 P0 — Corriger immédiatement (Bloquant / Sécurité / Données)

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 1 | Corriger `??` → `\|\|` dans les null checks Flutter | 5 min | Bug logique corrigé |
| 2 | Corriger crash upload photo optionnelle (vérifier null) | 5 min | Crash corrigé |
| 3 | Ajouter vérification email dans le flux signup Flutter | 30 min | Sécurité auth |
| 4 | Créer vraiment les crédits de bienvenue en BDD | 15 min | Promesse tenue |
| 5 | Corriger statut `in_progress` avant inspection | 30 min | Cohérence données |
| 6 | Corriger la mutation d'état directe dans PlanningNetwork | 10 min | Bug React corrigé |
| 7 | Filtrer le realtime dans PublicTracking (user null) | 5 min | Fuite données corrigée |
| 8 | Ajouter filtre `user_id` dans `loadClientStats` | 5 min | Sécurité données |
| 9 | Corriger race condition crédits (RPC atomique) | 1h | Intégrité financière |
| 10 | Retirer le marquage "envoyé" de l'email factice | 5 min | Honnêteté UX |
| **Total P0** | | **~3h** | |

### 🟠 P1 — Corriger cette semaine (Performance / UX majeur)

| # | Action | Effort |
|---|--------|--------|
| 11 | Paralléliser les 5 requêtes séquentielles du détail mission | 30 min |
| 12 | Batcher les requêtes N+1 d'enrichissement des matchs (les deux plateformes) | 1h |
| 13 | Batcher les N+1 grilles tarifaires et tracking GPS | 1h |
| 14 | Remplacer TOUS les `alert()` / `confirm()` / `prompt()` par des toasts/modales | 2h |
| 15 | Ajouter la route `/subscription` dans Flutter | 10 min |
| 16 | Corriger `handleConvertToInvoice` (field mapping `total` → `amount`) | 15 min |
| 17 | Unifier le format des données devis (JSON blob vs table séparée) | 2h |
| 18 | Ajouter `compressImage()` sur les photos optionnelles d'arrivée | 5 min |
| 19 | Corriger le filtre realtime pour les missions assignées | 15 min |
| 20 | Corriger le filtre GPS `session_id` et retirer `positions` des deps | 15 min |
| **Total P1** | | **~8h** |

### 🟡 P2 — Corriger ce mois (Parité / Features essentielles)

| # | Action | Effort |
|---|--------|--------|
| 21 | Supprimer `@ts-nocheck` et corriger les types (8 fichiers) | 8-12h |
| 22 | Unifier les plans d'abonnement (un seul modèle) | 3h |
| 23 | Ajouter l'édition de mission sur Flutter | 4-6h |
| 24 | Ajouter recherche/filtrage dans les listes Flutter | 3h |
| 25 | Ajouter pagination sur toutes les listes | 4-6h |
| 26 | Vue carte Planning Network sur Flutter (`flutter_map`) | 4-6h |
| 27 | Vue carte Tracking sur Flutter | 3-4h |
| 28 | Implémenter le chat support sur Flutter | 4-6h |
| 29 | Statistiques factures côté serveur (RPC PostgreSQL) | 2h |
| 30 | Retirer/corriger les fonctionnalités factices (export, delete account, 24/7) | 2h |
| **Total P2** | | **~40-50h** |

### 🟢 P3 — Backlog (Amélioration continue)

| # | Action | Effort |
|---|--------|--------|
| 31 | Intégration paiement réel (Stripe) | 16-24h |
| 32 | Envoi email réel (Resend/SendGrid) | 4-8h |
| 33 | API routage réel (OSRM) pour distances routières | 4-6h |
| 34 | Mode hors-ligne avec SQLite/Hive + sync | 16-24h |
| 35 | Connexion sociale (Google/Apple) | 4-8h |
| 36 | Internationalisation complète (fr/en) | 8-16h |
| 37 | Accessibilité ARIA + Semantics | 8-12h |
| 38 | Push notifications FCM | 4-6h |
| 39 | Vrai 2FA | 4-8h |
| 40 | Système de logs structuré (retirer console.log/print) | 2-4h |
| **Total P3** | | **~70-116h** |

---

## Estimation globale

| Phase | Effort | Délai estimé (1 dev) |
|-------|--------|---------------------|
| **P0 — Critique** | ~3h | 1 jour |
| **P1 — Urgent** | ~8h | 2-3 jours |
| **P2 — Important** | ~45h | 2-3 semaines |
| **P3 — Backlog** | ~90h | 1-2 mois |
| **TOTAL** | **~150h** | **~2 mois** |

---

*Ce rapport est généré à partir d'une analyse statique du code source. Certains bugs peuvent être mitigés par les RLS Supabase ou des triggers non visibles dans le code client.*
