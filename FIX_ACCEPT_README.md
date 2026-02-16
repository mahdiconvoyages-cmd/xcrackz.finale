# 🔧 FIX - Acceptation d'invitation

## ✅ Problème identifié

```
Error: column "company" does not exist
```

La fonction `accept_contact_invitation` essayait de lire `profiles.company`, mais cette colonne n'existe pas dans la table `profiles`.

## 🎯 Solution

Le script `FIX_ACCEPT_FUNCTION.sql` corrige les fonctions :
- ✅ `accept_contact_invitation` : N'utilise plus `profiles.company`
- ✅ `reject_contact_invitation` : Vérification et simplification

### Changement clé

**AVANT** (❌ incorrect) :
```sql
SELECT company FROM profiles WHERE id = v_contact.invited_by
```

**APRÈS** (✅ correct) :
```sql
COALESCE(v_contact.company, '') -- Utilise company du contact, pas de profiles
```

## 📋 À faire MAINTENANT

1. **Ouvrir SQL Editor** Supabase
2. **Copier/Coller** tout le contenu de `FIX_ACCEPT_FUNCTION.sql`
3. **Exécuter** (Run)
4. **Attendre 10 secondes**
5. **Rafraîchir la page web** (Ctrl + F5)
6. **Tester l'acceptation** d'une invitation

## ✅ Résultat attendu

```
✅ "Contact ajouté avec succès !"
```

Le contact inverse sera créé automatiquement pour établir la relation bidirectionnelle.

---

**Temps estimé** : 1 minute
**Urgence** : Moyenne (envoi fonctionne, seulement acceptation bloquée)
