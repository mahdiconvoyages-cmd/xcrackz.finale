# 📋 Ordre d'exécution des migrations SQL

⚠️ **IMPORTANT** : Les migrations doivent être exécutées dans cet ordre car il y a des dépendances entre les tables.

## 🔢 Ordre correct d'exécution

### 1️⃣ **create_pricing_grids.sql** (À exécuter EN PREMIER)
```sql
-- Crée la table pricing_grids
-- Cette table est référencée par quotes.pricing_grid_id
-- Donc elle DOIT exister avant de créer la table quotes
```

**Exécution** :
```powershell
# Dans Supabase SQL Editor, copier-coller le contenu de:
supabase/migrations/create_pricing_grids.sql
```

### 2️⃣ **create_quotes.sql** (À exécuter EN SECOND)
```sql
-- Crée la table quotes
-- Cette table référence pricing_grids.id via pricing_grid_id
-- Elle référence aussi clients.id via client_id
```

**Exécution** :
```powershell
# Dans Supabase SQL Editor, copier-coller le contenu de:
supabase/migrations/create_quotes.sql
```

## ✅ Vérification après exécution

### Vérifier que les tables existent :
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('pricing_grids', 'quotes')
ORDER BY table_name;
```

**Résultat attendu** :
```
table_name
--------------
pricing_grids
quotes
```

### Vérifier les contraintes de clés étrangères :
```sql
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'quotes';
```

**Résultat attendu** :
```
table_name | column_name      | foreign_table_name | foreign_column_name
-----------|------------------|-------------------|-------------------
quotes     | user_id          | users             | id
quotes     | client_id        | clients           | id
quotes     | pricing_grid_id  | pricing_grids     | id
```

## 🔧 Si vous avez déjà tenté de créer quotes :

### Supprimer la table quotes (si elle existe avec erreurs) :
```sql
DROP TABLE IF EXISTS quotes CASCADE;
DROP VIEW IF EXISTS quote_statistics CASCADE;
DROP FUNCTION IF EXISTS expire_old_quotes() CASCADE;
DROP FUNCTION IF EXISTS get_expiring_quotes(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS convert_quote_to_mission(UUID) CASCADE;
```

### Puis réexécuter dans l'ordre :
1. ✅ `create_pricing_grids.sql`
2. ✅ `create_quotes.sql`

## 📊 Tables pré-requises

Avant d'exécuter ces migrations, assurez-vous que ces tables existent déjà :

- ✅ `auth.users` (table Supabase par défaut)
- ✅ `clients` (vos clients)

### Vérifier que la table clients existe :
```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'clients'
);
```

Si `clients` n'existe pas, créez-la d'abord :
```sql
CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  company VARCHAR(255),
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own clients"
  ON clients FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own clients"
  ON clients FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clients"
  ON clients FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own clients"
  ON clients FOR DELETE
  USING (auth.uid() = user_id);
```

## 🎯 Résumé de l'ordre complet

```
1. auth.users (existe déjà dans Supabase)
2. clients (créer si n'existe pas)
3. pricing_grids ⬅️ EXÉCUTER EN PREMIER
4. quotes ⬅️ EXÉCUTER EN SECOND
```

## 💡 Astuce

Pour éviter les erreurs à l'avenir, nommez vos fichiers de migration avec un préfixe numérique :

```
001_create_clients.sql
002_create_pricing_grids.sql
003_create_quotes.sql
```

Ainsi Supabase les exécutera automatiquement dans le bon ordre avec :
```powershell
supabase db push
```
