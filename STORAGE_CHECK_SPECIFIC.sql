-- 🔍 VÉRIFICATION STORAGE CIBLÉE - Fichiers à chercher
-- Date: 2025-10-16

-- ===============================================
-- RÉSUMÉ DE LA SITUATION
-- ===============================================

/*
✅ INSPECTION AVEC PHOTOS (OK):
ID: a7ed782e-87fc-4804-a1ab-399a30a0469d
Mission: 292f7226-5d09-4021-a591-9d60b8cbbcc0
Photos: 6 (front, back, left_side, right_side, interior, dashboard)

❌ INSPECTIONS SANS PHOTOS (4 à récupérer):
Mission: 07692609-3770-47e4-9f6d-04efdf628cfc

1. 996a783c-9902-4c66-837a-dc68951d5051
2. 0f6afb47-31e6-474b-a20b-cb29d1dfd66a  
3. 0183d859-3260-4b68-bb6f-4b6df2691d0a
4. 09af4fc2-c696-4626-a07e-06f979f5f167
*/

-- ===============================================
-- FICHIERS À CHERCHER DANS STORAGE
-- ===============================================

/*
📁 ALLER DANS: Dashboard Supabase → Storage → inspection-photos → inspections/

🔍 CHERCHER CES PATTERNS DE FICHIERS:

INSPECTION 1: 996a783c-9902-4c66-837a-dc68951d5051
- 996a783c-9902-4c66-837a-dc68951d5051-departure_front-*.jpg
- 996a783c-9902-4c66-837a-dc68951d5051-departure_back-*.jpg  
- 996a783c-9902-4c66-837a-dc68951d5051-departure_left-*.jpg
- 996a783c-9902-4c66-837a-dc68951d5051-departure_right-*.jpg
- 996a783c-9902-4c66-837a-dc68951d5051-departure_interior-*.jpg
- 996a783c-9902-4c66-837a-dc68951d5051-departure_dashboard-*.jpg

INSPECTION 2: 0f6afb47-31e6-474b-a20b-cb29d1dfd66a
- 0f6afb47-31e6-474b-a20b-cb29d1dfd66a-departure_*

INSPECTION 3: 0183d859-3260-4b68-bb6f-4b6df2691d0a  
- 0183d859-3260-4b68-bb6f-4b6df2691d0a-departure_*

INSPECTION 4: 09af4fc2-c696-4626-a07e-06f979f5f167
- 09af4fc2-c696-4626-a07e-06f979f5f167-departure_*

OU PATTERN ALTERNATIF (comme inspection existante):
- inspection_996a783c-9902-4c66-837a-dc68951d5051_*_front.jpg
- inspection_996a783c-9902-4c66-837a-dc68951d5051_*_back.jpg
- etc.
*/

-- ===============================================
-- TEMPLATE DE RÉCUPÉRATION PRÊT
-- ===============================================

/*
✅ Si vous trouvez des fichiers, utilisez ce template:

INSERT INTO inspection_photos (
  inspection_id,
  photo_type,
  photo_url,
  uploaded_by,
  created_at
) VALUES 

-- EXEMPLE pour inspection 996a783c-9902-4c66-837a-dc68951d5051:
('996a783c-9902-4c66-837a-dc68951d5051', 'front', 'https://bfrkthzovwpjrvqktdjn.supabase.co/storage/v1/object/public/inspection-photos/inspections/FICHIER_TROUVÉ.jpg', 'RECOVERY', NOW()),

-- Répétez pour chaque fichier trouvé...
-- Adaptez le photo_type selon le nom du fichier (front, back, left_side, right_side, interior, dashboard)
*/

-- ===============================================
-- CHECKLIST DE VÉRIFICATION
-- ===============================================

/*
☐ 1. Ouvrir Dashboard Supabase
☐ 2. Storage → inspection-photos → inspections/
☐ 3. Chercher fichiers avec les 4 IDs ci-dessus
☐ 4. Noter les noms exacts des fichiers trouvés
☐ 5. Me communiquer la liste (ou "aucun fichier trouvé")

RÉSULTATS POSSIBLES:
🟢 Fichiers trouvés → Récupération automatique possible
🔴 Aucun fichier → Point-in-time Recovery ou perte définitive
*/