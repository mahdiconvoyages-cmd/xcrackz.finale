# 🐛 Fix Urgent : Erreur "Duplicate Keys" + Architecture Assignations

## ⚡ Résumé Ultra-Rapide (30 secondes)

**Problème 1** : Erreur React "Duplicate keys" dans les logs Expo  
**Problème 2** : User voyait missions de TOUS les autres users (faille sécurité!)  
**Cause** : Requête `mission_assignments` chargeait **TOUTES** les assignations sans filtre  
**Solution V1** : ❌ Filtre par `contact_id` (mauvaise compréhension architecture)  
**Solution V2** : ✅ Filtre par `contacts.email = auth.email()` (CORRECT)  

---

## �️ Architecture Clé (À Comprendre ABSOLUMENT)

### ⚠️ Confusion Fréquente

```
Table contacts:
├─ user_id → ❌ PAS "qui reçoit la mission"
│            ✅ MAIS "qui possède ce contact dans son carnet"
└─ email   → ✅ Email du contact CIBLE (qui reçoit la mission)
```

### Exemple Concret

```
Admin A crée contact pour Chauffeur B:
INSERT INTO contacts (user_id, email, name)
VALUES ('admin-A-id', 'chauffeurB@mail.com', 'Chauffeur B');
                      ↑                ↑
                      Admin            Chauffeur

Admin A assigne mission:
INSERT INTO mission_assignments (contact_id, ...)
VALUES ('contact-123', ...);

Chauffeur B se connecte:
→ Doit chercher avec contacts.email = 'chauffeurB@mail.com'
→ PAS avec contacts.user_id = 'chauffeur-B-id' ❌
```

---

## 🎯 Qu'est-ce qui a été corrigé ?

### AVANT ❌ (V1 - Incorrecte)
```tsx
// Cherchait contact avec user_id = userId
// → Ne trouvait RIEN car contacts.user_id = Admin (propriétaire)
const { data: contactData } = await supabase
  .from('contacts')
  .select('id')
  .eq('user_id', userId)  // ❌ FAUX
  .single();
```

### APRÈS ✅ (V2 - Correcte)
```tsx
// Filtre directement par email du user connecté
const { data: userProfile } = await supabase.auth.getUser();
const userEmail = userProfile.user.email;

const { data: assignmentsData } = await supabase
  .from('mission_assignments')
  .select(`
    missions(*),
    contacts!inner(email)  // ✅ JOIN obligatoire
  `)
  .eq('contacts.email', userEmail)  // ✅ VRAI
  .order('assigned_at', { ascending: false});
```

---

## 🔍 Pourquoi c'était urgent ?

### Problème de Sécurité Critique
- ❌ User A voyait missions assignées à user B, C, D...
- ❌ Violation de confidentialité (RGPD)
- ❌ Possible fuite d'infos commerciales (prix, clients)

### Problème Fonctionnel
- ❌ Chauffeurs ne voyaient PAS leurs missions assignées
- ❌ Système d'assignation totalement cassé
- ❌ Admin créait assignations mais chauffeurs ne recevaient rien

### Problème Technique
- ❌ Erreur React "Duplicate keys"
- ❌ Rendu UI instable
- ❌ Performance dégradée

---

## ✅ Tests à Faire (5 min)

### 1. Redémarrer Expo
```powershell
cd mobile
npx expo start --clear
```

### 2. Vérifier Logs
- [ ] ✅ Aucune erreur "Duplicate keys"
- [ ] ✅ "Supabase Config" affiche bonne URL
- [ ] ✅ Pas d'erreur auth

### 3. Tester Onglet "Reçues"
- [ ] Connexion avec user qui a contact
- [ ] Aller sur écran Missions
- [ ] Cliquer onglet "Missions Reçues"
- [ ] Vérifier : SEULEMENT missions assignées à CE user

### 4. Tester Isolation
- [ ] Créer 2 comptes : Admin + Contact
- [ ] Admin assigne mission A au contact
- [ ] Contact se connecte : voit mission A ✅
- [ ] Admin crée mission B sans l'assigner
- [ ] Contact ne voit PAS mission B ✅

---

## 📁 Fichiers Modifiés

| Fichier | Action | Lignes |
|---------|--------|--------|
| `mobile/src/screens/MissionsScreen.tsx` | Ajout filtre `contact_id` | 64-96 |
| `FIX_DUPLICATE_KEYS_ERROR.md` | Documentation complète | 400+ |
| `TODO_POST_SESSION.md` | Ajout tâche urgente | +10 |

---

## 🎯 Prochaine Action

**Maintenant** : Tester sur device Android/iOS pour confirmer que l'erreur disparaît

**Si erreur persiste** :
1. Vérifier que contact existe : `SELECT * FROM contacts WHERE user_id = 'your-id'`
2. Si pas de contact, exécuter SQL de création (voir TODO_POST_SESSION.md)
3. Vérifier RLS policies (voir FIX_DUPLICATE_KEYS_ERROR.md)

---

**Status** : ✅ Code fixé, en attente test device  
**Date** : 11 octobre 2025  
**Impact** : CRITIQUE (sécurité + UX)  
**Référence complète** : `FIX_DUPLICATE_KEYS_ERROR.md`
