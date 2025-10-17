-- 🔄 SCRIPT DE RÉCUPÉRATION SPÉCIFIQUE - Inspections departure manquantes
-- Basé sur les 4 IDs identifiés: 4 inspections departure sans photos
-- Date: 2025-10-16

-- ===============================================
-- INFORMATIONS IDENTIFIÉES
-- ===============================================

/*
❌ INSPECTIONS SANS PHOTOS (4 inspections departure):
- 996a783c-9902-4c66-837a-dc68951d5051 (departure)
- 0f6afb47-31e6-474b-a20b-cb29d1dfd66a (departure) 
- 0183d859-3260-4b68-bb6f-4b6df2691d0a (departure)
- 09af4fc2-c696-4626-a07e-06f979f5f167 (departure)

Mission ID: 07692609-3770-47e4-9f6d-04efdf628cfc
*/

-- ===============================================
-- 1. VÉRIFICATION DES FICHIERS STORAGE POSSIBLES
-- ===============================================

-- 📁 Noms de fichiers à chercher dans Storage (inspection-photos/inspections/):
/*
PATTERNS ATTENDUS pour ces inspections departure:
- 996a783c-9902-4c66-837a-dc68951d5051-departure_front-*.jpg
- 996a783c-9902-4c66-837a-dc68951d5051-departure_back-*.jpg
- 996a783c-9902-4c66-837a-dc68951d5051-departure_left-*.jpg
- 996a783c-9902-4c66-837a-dc68951d5051-departure_right-*.jpg
- 996a783c-9902-4c66-837a-dc68951d5051-departure_interior-*.jpg
- 996a783c-9902-4c66-837a-dc68951d5051-departure_dashboard-*.jpg

(Même pattern pour les 3 autres IDs)
*/

-- ===============================================
-- 2. TEMPLATE DE RÉCUPÉRATION À PERSONNALISER
-- ===============================================

-- 🔧 Remplacez les URL par celles trouvées dans votre Storage
-- Format: https://VOTRE-PROJET.supabase.co/storage/v1/object/public/inspection-photos/inspections/NOM-FICHIER.jpg

/*
EXEMPLE pour la première inspection (à adapter avec vraies URLs):

INSERT INTO inspection_photos (
  inspection_id,
  photo_type,
  photo_url,
  uploaded_by,
  created_at
) VALUES 
-- Photos pour inspection 996a783c-9902-4c66-837a-dc68951d5051
('996a783c-9902-4c66-837a-dc68951d5051', 'departure_front', 'https://xxx.supabase.co/storage/v1/object/public/inspection-photos/inspections/996a783c-9902-4c66-837a-dc68951d5051-departure_front-1234567890.jpg', 'RECOVERY_SCRIPT', NOW()),
('996a783c-9902-4c66-837a-dc68951d5051', 'departure_back', 'https://xxx.supabase.co/storage/v1/object/public/inspection-photos/inspections/996a783c-9902-4c66-837a-dc68951d5051-departure_back-1234567890.jpg', 'RECOVERY_SCRIPT', NOW()),
('996a783c-9902-4c66-837a-dc68951d5051', 'departure_interior', 'https://xxx.supabase.co/storage/v1/object/public/inspection-photos/inspections/996a783c-9902-4c66-837a-dc68951d5051-departure_interior-1234567890.jpg', 'RECOVERY_SCRIPT', NOW());

-- Répétez pour les 3 autres inspections avec leurs vraies URLs...
*/

-- ===============================================
-- 3. ACTIONS À FAIRE MAINTENANT
-- ===============================================

/*
📋 ÉTAPES SUIVANTES:

1️⃣ VÉRIFIER STORAGE SUPABASE:
   → Dashboard Supabase → Storage → inspection-photos → inspections/
   → Chercher des fichiers commençant par:
     * 996a783c-9902-4c66-837a-dc68951d5051-departure_*
     * 0f6afb47-31e6-474b-a20b-cb29d1dfd66a-departure_*  
     * 0183d859-3260-4b68-bb6f-4b6df2691d0a-departure_*
     * 09af4fc2-c696-4626-a07e-06f979f5f167-departure_*

2️⃣ NOTER LES FICHIERS TROUVÉS:
   → Copier les noms exacts des fichiers
   → Noter lesquels correspondent aux 4 IDs ci-dessus

3️⃣ ME COMMUNIQUER:
   → Liste des fichiers trouvés (ou "aucun fichier")
   → Je créerai le script INSERT exact
*/

-- ===============================================
-- 4. PLAN B - SI AUCUN FICHIER DANS STORAGE
-- ===============================================

/*
❌ Si Storage vide pour ces inspections:
   → Photos définitivement perdues
   → Option: Point-in-time Recovery Supabase vers une date AVANT le cleanup
   → Ou accepter la perte et re-faire les inspections manuellement
   
✅ Si fichiers trouvés dans Storage:
   → Récupération automatique possible
   → Je fournirai les requêtes INSERT exactes
*/