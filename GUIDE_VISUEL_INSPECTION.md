# 📸 GUIDE VISUEL - NOUVELLE INTERFACE INSPECTION

## 🎨 Avant / Après

### AVANT (Ancien système)
```
┌──────────────────────────┐
│ [Caméra]                 │
│ Prendre photo            │
│                          │
│ ✅ Photo prise           │
│                          │
│ → Alerte IA (dommage)    │
│ → Continuer              │
└──────────────────────────┘

Formulaire:
- Kilométrage
- Carburant
- État
- Notes
- [Terminer]
```

### APRÈS (Nouveau système)
```
┌──────────────────────────┐
│ [Caméra]                 │
│ Prendre photo            │
│                          │
│ 🤖 Analyse IA...         │
│                          │
│ ┌──────────────────────┐ │
│ │ 🤖 Description       │ │
│ │ "La vue avant..."    │ │
│ │ [Modifier] [Approuver]│ │
│ └──────────────────────┘ │
└──────────────────────────┘

Formulaire:
┌──────────────────────────┐
│ 📸 Photos et descriptions│
│                          │
│ ┌─[Photo 1]───────────┐ │
│ │ [Image 200px]       │ │
│ │ Vue avant   │Appr.  │ │
│ │ Description IA...   │ │
│ │ [Modifier][Approuver]│ │
│ │ ⚠️ Dommage (si oui) │ │
│ └─────────────────────┘ │
│                          │
│ ┌─[Photo 2]───────────┐ │
│ └─────────────────────┘ │
│ ... (6 photos total)     │
└──────────────────────────┘

- Kilométrage
- Carburant
- État
- Résumé dommages
- [Terminer]
```

---

## 🎬 Flux utilisateur détaillé

### 1️⃣ PRISE DE PHOTO
```
User ouvre inspection
  ↓
┌─────────────────────────────┐
│  📸 Photo 1 sur 6           │
│  0/6 terminées              │
├─────────────────────────────┤
│                             │
│      Vue avant              │
│  Positionnez le véhicule    │
│   de face, centré           │
│                             │
│    ┌──────────┐             │
│    │  📷      │             │
│    │  CAMERA  │             │
│    └──────────┘             │
│                             │
│  [Prendre la photo]         │
│                             │
└─────────────────────────────┘
```

### 2️⃣ UPLOAD + ANALYSE
```
Photo prise
  ↓
┌─────────────────────────────┐
│  ⏳ Upload en cours...      │
│                             │
│  [===========    ] 75%      │
└─────────────────────────────┘
  ↓
┌─────────────────────────────┐
│  🤖 Analyse IA en cours...  │
│                             │
│  [Spinner animation]        │
│                             │
│  Détection des dommages     │
└─────────────────────────────┘
```

### 3️⃣ DESCRIPTION GÉNÉRÉE
```
┌─────────────────────────────┐
│ 🤖 Description générée      │
├─────────────────────────────┤
│                             │
│ La vue avant montre une     │
│ carrosserie en bon état     │
│ général. La peinture est    │
│ propre sans rayures         │
│ visibles. Le pare-brise est │
│ intact. Les phares sont     │
│ fonctionnels.               │
│                             │
├─────────────────────────────┤
│  [Modifier]  [Approuver ✓]  │
└─────────────────────────────┘
```

### 4️⃣ OPTION A: APPROBATION
```
User clique "Approuver ✓"
  ↓
Badge "Approuvée" ajouté
  ↓
Si dommage:
┌─────────────────────────────┐
│ ⚠️ Attention                │
├─────────────────────────────┤
│ Dommage détecté:            │
│ Rayure profonde côté avant  │
│ droit                       │
│                             │
│ Gravité: 🟠 Modérée         │
├─────────────────────────────┤
│         [Compris]           │
└─────────────────────────────┘
  ↓
Photo suivante
```

### 5️⃣ OPTION B: MODIFICATION
```
User clique "Modifier"
  ↓
┌─────────────────────────────┐
│ 📝 Modifier la description  │ [X]
├─────────────────────────────┤
│                             │
│ Description de la photo     │
│                             │
│ ┌─────────────────────────┐ │
│ │ La vue avant montre une │ │
│ │ carrosserie en bon état │ │
│ │ général. La peinture... │ │
│ │                         │ │
│ │                         │ │
│ │ [Curseur text]          │ │
│ └─────────────────────────┘ │
│                             │
│  [Annuler] [Enregistrer]    │
└─────────────────────────────┘
  ↓
User édite
  ↓
Clique "Enregistrer"
  ↓
Modal se ferme
  ↓
Badge "Approuvée" ajouté
  ↓
Photo suivante
```

### 6️⃣ FORMULAIRE DÉTAILS (6 photos terminées)
```
┌─────────────────────────────┐
│ ← Détails du véhicule       │
├─────────────────────────────┤
│                             │
│ 📸 Photos et descriptions   │
│                             │
│ ┌─────────────────────────┐ │
│ │ [Photo Vue avant]       │⚠││
│ ├─────────────────────────┤ │
│ │ Vue avant    │ Approuvée││ │
│ │                         │ │
│ │ La vue avant montre une │ │
│ │ carrosserie en bon état │ │
│ │ général...              │ │
│ │                         │ │
│ │ ⚠️ Rayure détectée      │ │
│ │ Gravité: Modérée        │ │
│ │ Description: Rayure...  │ │
│ └─────────────────────────┘ │
│                             │
│ ┌─────────────────────────┐ │
│ │ [Photo Vue arrière]     │ │
│ ├─────────────────────────┤ │
│ │ Vue arrière │ Approuvée │ │
│ │                         │ │
│ │ La vue arrière présente │ │
│ │ un hayon propre...      │ │
│ │                         │ │
│ │ ✅ Aucun dommage        │ │
│ └─────────────────────────┘ │
│                             │
│ [4 autres cards...]         │
│                             │
│ ─────────────────────────── │
│                             │
│ Informations complémentaires│
│                             │
│ Niveau de carburant (%)     │
│ [0%] [25%] [50%] [75%] [100%]│
│                             │
│ Kilométrage                 │
│ [125000] km                 │
│                             │
│ État général                │
│ [Excellent][Bon][Moyen][Abîmé]│
│                             │
│ ─────────────────────────── │
│                             │
│ [Terminer l'inspection]     │
└─────────────────────────────┘
```

---

## 🎨 DESIGN SYSTEM

### Couleurs principales
```
Background principal:  #0f172a (Slate 900)
Background cards:      #1E293B (Slate 800)
Borders:               #334155 (Slate 700)
Text primary:          #FFFFFF (White)
Text secondary:        #E2E8F0 (Slate 200)
Text tertiary:         #94a3b8 (Slate 400)

Accent (Teal):         #14b8a6
Accent dark:           #0d9488
Success (Green):       #10b981
Warning (Orange):      #f59e0b
Error (Red):           #ef4444
```

### Typographie
```
Titres sections:       20px, Bold, White
Titres photos:         18px, Bold, White
Descriptions:          15px, Regular, Slate 200 (line-height: 22px)
Boutons:               14-16px, SemiBold
Badges:                12-13px, SemiBold
```

### Espacements
```
Padding cards:         16px
Margin bottom cards:   16px
Gap boutons:           10-12px
Border radius cards:   16px
Border radius buttons: 10-12px
```

### Icônes (Feather)
```
📸 image          - Section photos
🤖 cpu           - IA / Analyse
✅ check-circle  - Approuvé
⚠️ alert-triangle - Warning dommage
✏️ edit-2        - Modifier
❌ x             - Fermer
🔒 lock          - Verrouillé
```

---

## 🔄 ÉTATS DES CARDS

### État 1: Photo avec description non approuvée
```
┌─────────────────────────┐
│ [Photo]                 │
├─────────────────────────┤
│ Vue avant               │ ← Titre
│                         │
│ Description IA...       │ ← Description
│                         │
│ [Modifier] [Approuver]  │ ← Actions visibles
└─────────────────────────┘
```

### État 2: Photo avec description approuvée
```
┌─────────────────────────┐
│ [Photo]                 │
├─────────────────────────┤
│ Vue avant  │ Approuvée  │ ← Badge vert
│                         │
│ Description IA...       │
│                         │
│ (pas de boutons)        │ ← Actions cachées
└─────────────────────────┘
```

### État 3: Photo avec dommage (non approuvée)
```
┌─────────────────────────┐
│ [Photo]              ⚠️ │ ← Badge warning
├─────────────────────────┤
│ Vue avant               │
│                         │
│ Description IA...       │
│                         │
│ [Modifier] [Approuver]  │
│                         │
│ ⚠️ Rayure détectée      │ ← Mini-card
│ Gravité: Modérée        │    dommage
│ Description: ...        │
└─────────────────────────┘
```

### État 4: Photo avec dommage (approuvée)
```
┌─────────────────────────┐
│ [Photo]              ⚠️ │ ← Badge warning
├─────────────────────────┤
│ Vue avant  │ Approuvée  │ ← Badge vert
│                         │
│ Description IA...       │
│                         │
│ ⚠️ Rayure détectée      │ ← Mini-card
│ Gravité: Modérée        │    dommage
│ Description: ...        │
└─────────────────────────┘
```

---

## 🎭 ANIMATIONS

### Modal slide-in (description edit)
```
Départ:  translateY(100%) + opacity(0)
Arrivée: translateY(0)    + opacity(1)
Durée:   300ms
Easing:  ease-out
```

### Badge "Approuvée" apparition
```
Départ:  scale(0)
Arrivée: scale(1)
Durée:   200ms
Easing:  spring
```

### Spinner analyse IA
```
Rotation: 360deg infinie
Durée:    1s
Easing:   linear
```

---

## 📱 RESPONSIVE

### Largeur écran
```
Mobile S (320px):  1 colonne, padding 12px
Mobile M (375px):  1 colonne, padding 16px
Mobile L (425px):  1 colonne, padding 20px
Tablet (768px):    2 colonnes (future)
```

### Images
```
Mobile:  200px height, 100% width
Ratio:   16:9 ou 4:3 selon orientation
Cover:   object-fit: cover
```

---

## ✅ CHECKLIST QUALITÉ

### Design
- [x] Cards cohérentes
- [x] Espacement harmonieux
- [x] Couleurs accessibles (contraste WCAG AA)
- [x] Icônes claires
- [x] Typographie lisible

### UX
- [x] Feedback visuel immédiat
- [x] Actions évidentes
- [x] États clairs (approuvé/non approuvé)
- [x] Messages d'erreur explicites
- [x] Confirmations pour actions destructives

### Performance
- [x] Images optimisées (quality: 0.8)
- [x] Lazy loading (ScrollView)
- [x] Pas de re-render inutile
- [x] State minimal

### Accessibilité
- [x] Labels descriptifs
- [x] Boutons suffisamment grands (44x44px min)
- [x] Contraste texte/fond
- [ ] TODO: Screen reader support

---

**Créé par**: GitHub Copilot  
**Documentation**: GUIDE_VISUEL_INSPECTION.md  
**Version**: 1.0  
**Dernière mise à jour**: 11 octobre 2025
