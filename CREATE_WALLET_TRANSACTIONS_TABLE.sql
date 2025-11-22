-- ============================================
-- Migration: CREATE WALLET_TRANSACTIONS TABLE
-- ============================================
-- Cette table gère les transactions du portefeuille covoiturage
-- Compatible avec le système mobile Flutter

-- Supprimer la table si elle existe
DROP TABLE IF EXISTS public.wallet_transactions CASCADE;

-- Créer la table wallet_transactions
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Type de transaction
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'refund', 'payment', 'earning')),
  
  -- Montant (positif pour dépôt, négatif pour retrait)
  amount NUMERIC NOT NULL,
  
  -- Description de la transaction
  description TEXT,
  
  -- Solde après transaction
  balance_after NUMERIC NOT NULL,
  
  -- Statut (pour les retraits qui nécessitent validation)
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled', 'failed')),
  
  -- Référence liée (ride_id, booking_id, etc.)
  reference_type TEXT CHECK (reference_type IN ('ride', 'booking', 'payment', 'refund', 'manual')),
  reference_id UUID,
  
  -- Métadonnées additionnelles
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes pour performance
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON public.wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON public.wallet_transactions(type);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_status ON public.wallet_transactions(status);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_reference ON public.wallet_transactions(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON public.wallet_transactions(created_at DESC);

-- Ajouter la colonne wallet_balance dans profiles si elle n'existe pas
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC DEFAULT 0 NOT NULL;

-- Index sur wallet_balance
CREATE INDEX IF NOT EXISTS idx_profiles_wallet_balance ON public.profiles(wallet_balance);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Les utilisateurs peuvent voir leurs propres transactions
DROP POLICY IF EXISTS "Users can view own wallet transactions" ON public.wallet_transactions;
CREATE POLICY "Users can view own wallet transactions"
ON public.wallet_transactions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Les utilisateurs peuvent créer leurs propres transactions
-- Note: En prod, limiter cette policy ou passer par des fonctions RPC
DROP POLICY IF EXISTS "Users can insert own wallet transactions" ON public.wallet_transactions;
CREATE POLICY "Users can insert own wallet transactions"
ON public.wallet_transactions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Les admins peuvent tout voir
DROP POLICY IF EXISTS "Admins can view all wallet transactions" ON public.wallet_transactions;
CREATE POLICY "Admins can view all wallet transactions"
ON public.wallet_transactions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Policy: Les admins peuvent tout modifier
DROP POLICY IF EXISTS "Admins can update wallet transactions" ON public.wallet_transactions;
CREATE POLICY "Admins can update wallet transactions"
ON public.wallet_transactions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- ============================================
-- FONCTION: Créer une transaction et mettre à jour le solde
-- ============================================

CREATE OR REPLACE FUNCTION public.process_wallet_transaction(
  p_user_id UUID,
  p_type TEXT,
  p_amount NUMERIC,
  p_description TEXT DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
  v_transaction_id UUID;
BEGIN
  -- Vérifier que l'utilisateur existe
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Obtenir le solde actuel
  SELECT COALESCE(wallet_balance, 0) INTO v_current_balance
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;  -- Lock la ligne pour éviter les race conditions

  -- Calculer le nouveau solde
  v_new_balance := v_current_balance + p_amount;

  -- Vérifier que le solde ne devient pas négatif
  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- Mettre à jour le solde dans profiles
  UPDATE public.profiles
  SET 
    wallet_balance = v_new_balance,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Créer la transaction
  INSERT INTO public.wallet_transactions (
    user_id,
    type,
    amount,
    description,
    balance_after,
    reference_type,
    reference_id,
    metadata,
    status
  ) VALUES (
    p_user_id,
    p_type,
    p_amount,
    p_description,
    v_new_balance,
    p_reference_type,
    p_reference_id,
    p_metadata,
    'completed'
  )
  RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$$;

-- Permission pour utiliser la fonction
GRANT EXECUTE ON FUNCTION public.process_wallet_transaction TO authenticated;

-- ============================================
-- FONCTION: Obtenir le solde actuel
-- ============================================

CREATE OR REPLACE FUNCTION public.get_wallet_balance(p_user_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance NUMERIC;
BEGIN
  SELECT COALESCE(wallet_balance, 0) INTO v_balance
  FROM public.profiles
  WHERE id = p_user_id;

  RETURN COALESCE(v_balance, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_wallet_balance TO authenticated;

-- ============================================
-- TRIGGER: Update updated_at automatiquement
-- ============================================

CREATE OR REPLACE FUNCTION public.update_wallet_transaction_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wallet_transactions_updated_at ON public.wallet_transactions;
CREATE TRIGGER wallet_transactions_updated_at
  BEFORE UPDATE ON public.wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_wallet_transaction_timestamp();

-- ============================================
-- DONNÉES DE TEST (optionnel)
-- ============================================

-- Initialiser le solde à 0 pour tous les utilisateurs existants
UPDATE public.profiles
SET wallet_balance = 0
WHERE wallet_balance IS NULL;

-- ============================================
-- VÉRIFICATION
-- ============================================

-- Vérifier que la table existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wallet_transactions') THEN
    RAISE EXCEPTION 'Table wallet_transactions was not created';
  END IF;
  
  RAISE NOTICE 'Table wallet_transactions created successfully';
END;
$$;

-- Vérifier que la colonne wallet_balance existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'wallet_balance'
  ) THEN
    RAISE EXCEPTION 'Column wallet_balance was not added to profiles';
  END IF;
  
  RAISE NOTICE 'Column wallet_balance exists in profiles';
END;
$$;

-- ============================================
-- FIN DE LA MIGRATION
-- ============================================
