# 🚀 DÉMARRAGE RAPIDE - INSPECTION ARRIVÉE

## 1️⃣ SQL (5 min)

Ouvrir Supabase SQL Editor → Exécuter `ADD_INSPECTION_DOCUMENTS_EXPENSES.sql`

✅ Résultat: Tables + Bucket créés

---

## 2️⃣ Test Mobile (10 min)

1. **Photos**: 8 obligatoires (6 ext + dashboard + intérieur)
2. **Documents**: Scanner PV livraison, constats
3. **Frais**: Carburant, péages avec justificatifs  
4. **Signatures**: Client + Convoyeur
5. **Terminer**

---

## 3️⃣ Vérification (2 min)

```sql
SELECT * FROM inspection_documents ORDER BY scanned_at DESC LIMIT 5;
SELECT * FROM inspection_expenses ORDER BY created_at DESC LIMIT 5;
```

---

## 📁 Documentation complète

- `RESUME_INSPECTION_ARRIVEE.md` ← **Lire en premier**
- `INSPECTION_ARRIVEE_DOCUMENTS_FRAIS_COMPLETE.md` ← Documentation technique
- `QUICKSTART_INSPECTION_ARRIVEE.sql` ← Tests SQL

---

## ✅ Nouveautés

- 📄 Scanner documents (ML intégré)
- 💰 Frais de mission (4 types)
- 📸 8 photos obligatoires (au lieu de 6)
- 🗑️ Champs inutiles retirés

**Prêt à utiliser !** 🎉
