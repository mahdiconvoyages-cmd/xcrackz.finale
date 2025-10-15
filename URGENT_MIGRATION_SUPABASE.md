# 🚨 ERREUR CRITIQUE : Tables Supabase Manquantes

## ❌ Problème Identifié

```
Error: column missions.title does not exist
Error: column support_messages.conversation_id does not exist
```

**Diagnostic** : Les tables n'existent PAS dans votre base Supabase.  
**Cause** : Migrations SQL jamais exécutées.

---

## ✅ SOLUTION RAPIDE (5 minutes)

### Étape 1 : Aller sur Supabase Dashboard

1. **Ouvrir** : https://supabase.com/dashboard/project/bfrkthzovwpjrvqktdjn
2. **Se connecter** avec votre compte Supabase
3. Cliquer sur **SQL Editor** (menu gauche)

---

### Étape 2 : Exécuter la Migration Support (PRIORITAIRE)

**Copier ce SQL complet** et l'exécuter dans SQL Editor :

```sql
-- =========================================
-- MIGRATION : Système Support Complet
-- =========================================

-- Table des conversations de support
CREATE TABLE IF NOT EXISTS support_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  subject text NOT NULL,
  category text NOT NULL CHECK (category IN ('technique', 'facturation', 'compte', 'feature', 'autre')),
  status text DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed', 'resolved')),
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Table des messages de support
CREATE TABLE IF NOT EXISTS support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES support_conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  sender_type text DEFAULT 'user' CHECK (sender_type IN ('user', 'admin', 'bot')),
  message text NOT NULL,
  is_automated boolean DEFAULT false,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Table des réponses automatiques
CREATE TABLE IF NOT EXISTS support_auto_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keywords text[] NOT NULL,
  response text NOT NULL,
  category text NOT NULL,
  priority integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_support_conversations_user_id ON support_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_support_conversations_status ON support_conversations(status);
CREATE INDEX IF NOT EXISTS idx_support_messages_conversation_id ON support_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_created_at ON support_messages(created_at);

-- Trigger pour mettre à jour last_message_at
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE support_conversations 
  SET last_message_at = NEW.created_at 
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversation_timestamp
  AFTER INSERT ON support_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();

-- Row Level Security (RLS)
ALTER TABLE support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_auto_responses ENABLE ROW LEVEL SECURITY;

-- Policies pour support_conversations
CREATE POLICY "Users can view own conversations"
  ON support_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all conversations"
  ON support_conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can create conversations"
  ON support_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update conversations"
  ON support_conversations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policies pour support_messages
CREATE POLICY "Users can view messages in own conversations"
  ON support_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM support_conversations
      WHERE support_conversations.id = support_messages.conversation_id
      AND support_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all messages"
  ON support_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can send messages in own conversations"
  ON support_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_conversations
      WHERE support_conversations.id = support_messages.conversation_id
      AND support_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can send messages"
  ON support_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policies pour auto_responses (admin only)
CREATE POLICY "Admins can manage auto responses"
  ON support_auto_responses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

**Actions** :
1. Copier tout le SQL ci-dessus
2. Coller dans SQL Editor
3. Cliquer **RUN** (ou F5)
4. Vérifier : "Success. No rows returned"

---

### Étape 3 : Vérifier la Table Missions

**Exécuter ce SQL** pour voir si `missions` existe :

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'missions';
```

**Si la table n'existe PAS** (0 rows) :

```sql
-- Créer table missions minimale
CREATE TABLE IF NOT EXISTS missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  departure_address text,
  arrival_address text,
  scheduled_date timestamptz,
  driver_id uuid REFERENCES contacts(id),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_missions_status ON missions(status);
CREATE INDEX IF NOT EXISTS idx_missions_user_id ON missions(user_id);
CREATE INDEX IF NOT EXISTS idx_missions_scheduled_date ON missions(scheduled_date);

-- RLS
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own missions"
  ON missions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all missions"
  ON missions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

---

### Étape 4 : Vérifier Tables Créées

**Exécuter dans SQL Editor** :

```sql
-- Lister toutes les tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

**Vous devez voir** :
```
✅ contacts
✅ invoices
✅ invoice_items
✅ missions
✅ profiles
✅ quotes
✅ quote_items
✅ support_conversations
✅ support_messages
✅ support_auto_responses
✅ transactions
```

---

### Étape 5 : Redémarrer l'Application

```powershell
# Dans votre terminal
npm run dev
```

Puis dans le navigateur :
```
Ctrl + F5 (hard refresh)
```

---

## 🧪 Test de Validation

### Test 1 : Vérifier Support
```
1. Aller sur /support
2. Console F12 : Ne doit PAS voir "conversation_id does not exist"
3. Créer une conversation
4. Envoyer un message
5. Vérifier affichage
```

### Test 2 : Vérifier Admin
```
1. Aller sur /admin
2. Console F12 : Ne doit PAS voir "missions.title does not exist"
3. Section Tracking doit charger sans erreur
```

---

## 📊 Checklist Migration

- [ ] SQL Editor ouvert sur Supabase
- [ ] Migration Support exécutée (support_conversations, support_messages)
- [ ] Migration Missions exécutée (missions table)
- [ ] Tables vérifiées avec SELECT table_name
- [ ] Application redémarrée (npm run dev)
- [ ] Cache navigateur vidé (Ctrl+F5)
- [ ] Tests /support et /admin OK

---

## 🚨 Si Erreurs Persistent

### Erreur : "relation already exists"
```
→ Normal, cela signifie que la table existe déjà
→ Passer à la table suivante
```

### Erreur : "permission denied"
```
→ Vérifier que vous êtes connecté avec le bon compte Supabase
→ Vérifier que vous êtes sur le bon projet (bfrkthzovwpjrvqktdjn)
```

### Erreur : "syntax error"
```
→ Copier TOUT le SQL d'un seul bloc
→ Ne pas copier par morceaux
→ Vérifier qu'il n'y a pas de caractères cachés
```

---

## 📖 Documentation Supabase

**Dashboard** : https://supabase.com/dashboard/project/bfrkthzovwpjrvqktdjn  
**SQL Editor** : https://supabase.com/dashboard/project/bfrkthzovwpjrvqktdjn/sql  
**Table Editor** : https://supabase.com/dashboard/project/bfrkthzovwpjrvqktdjn/editor

---

## ✅ Après Migration

Une fois les migrations exécutées :

1. ✅ Toutes les erreurs 400 disparaîtront
2. ✅ Page Support fonctionnera complètement
3. ✅ Page Admin affichera les missions
4. ✅ Vous pourrez créer des conversations support
5. ✅ Les messages s'enverront sans erreur

---

**🔥 PRIORITÉ MAXIMALE : Exécuter les migrations SQL MAINTENANT !**
