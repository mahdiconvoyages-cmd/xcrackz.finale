# 🎨 xCrackz Design System

## Vue d'ensemble

Ce design system unifie l'apparence de l'application xCrackz avec une palette de couleurs cohérente, des composants réutilisables et des animations fluides.

## 🎨 Palette de Couleurs

### Couleurs Primaires (Teal)
- **Primary-500** : `#14b8a6` - Couleur principale pour CTAs et éléments importants
- Utilisée pour : boutons principaux, liens actifs, accents

### Couleurs Secondaires (Cyan)
- **Secondary-500** : `#06b6d4` - Accents et états hover
- Utilisée pour : gradients, survols, éléments secondaires

### Couleurs d'Accent (Blue)
- **Accent-500** : `#3b82f6` - Liens et actions interactives
- Utilisée pour : liens, icônes informatives

### Couleurs Sémantiques
| Couleur | Code | Usage |
|---------|------|-------|
| Success | `#22c55e` | Confirmations, statuts terminés |
| Warning | `#f59e0b` | Alertes, en attente |
| Error | `#ef4444` | Erreurs, suppressions |
| Info | `#3b82f6` | Informations, aide |

## 📦 Composants UI

### Import
```tsx
import { 
  PageHeader, 
  Button, 
  Card, 
  StatCard, 
  Badge, 
  TabNavigation,
  SearchBar,
  Modal,
  Input,
  Skeleton 
} from '../components/ui';
```

### PageHeader
En-tête de page unifié avec gradient et icône.

```tsx
<PageHeader
  title="Titre de la page"
  description="Description optionnelle"
  icon={IconComponent}
  actions={<Button>Action</Button>}
>
  {/* Contenu additionnel (optionnel) */}
</PageHeader>
```

### Button
Bouton avec variantes et tailles.

```tsx
<Button variant="primary" size="md" icon={Plus}>
  Ajouter
</Button>

// Variantes: primary, secondary, ghost, danger, success, outline
// Tailles: sm, md, lg, xl
```

### Card
Carte avec variantes et hover.

```tsx
<Card variant="default" padding="md" hover>
  <Card.Header>Titre</Card.Header>
  <Card.Body>Contenu</Card.Body>
  <Card.Footer>Actions</Card.Footer>
</Card>

// Variantes: default, glass, gradient, bordered, elevated
```

### StatCard
Carte de statistiques.

```tsx
<StatCard
  title="Missions"
  value={42}
  icon={Truck}
  variant="primary"
  trend={{ value: 12, label: "ce mois" }}
/>
```

### Badge
Badge de statut.

```tsx
<Badge variant="success" dot pulse>Actif</Badge>
<Badge.Status status="in_progress" />
```

### TabNavigation
Navigation par onglets.

```tsx
<TabNavigation
  tabs={[
    { id: 'tab1', label: 'Onglet 1', icon: Icon1, count: 5 },
    { id: 'tab2', label: 'Onglet 2', icon: Icon2 }
  ]}
  activeTab="tab1"
  onChange={(id) => setActiveTab(id)}
  variant="pills" // pills, underline, cards
/>
```

### SearchBar
Barre de recherche stylisée.

```tsx
<SearchBar
  value={search}
  onChange={setSearch}
  placeholder="Rechercher..."
/>
```

### Modal
Modal avec animations.

```tsx
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Titre"
  size="md" // sm, md, lg, xl, full
>
  <p>Contenu</p>
  <Modal.Footer>
    <Button>Confirmer</Button>
  </Modal.Footer>
</Modal>
```

### Input
Champ de saisie stylisé.

```tsx
<Input
  label="Email"
  icon={Mail}
  error="Message d'erreur"
  hint="Texte d'aide"
/>
```

### Skeleton
Placeholder de chargement.

```tsx
<Skeleton variant="text" />
<Skeleton.Card />
<Skeleton.List count={5} />
<Skeleton.Stats />
```

## 🎭 Classes CSS Utilitaires

### Backgrounds
- `.bg-app` - Gradient de fond de l'application
- `.bg-glass` - Effet glassmorphism clair
- `.bg-glass-dark` - Effet glassmorphism sombre

### Ombres
- `.shadow-depth` - Ombre multicouche subtile
- `.shadow-depth-lg` - Ombre multicouche prononcée
- `.shadow-glow-primary` - Halo teal
- `.shadow-glow-success` - Halo vert

### Animations
- `.animate-fade-in` - Fondu en entrée
- `.animate-slide-up` - Glissement vers le haut
- `.animate-slide-down` - Glissement vers le bas
- `.animate-scale-in` - Zoom en entrée
- `.animate-shimmer` - Effet de brillance

## 📱 Responsive

Le design system inclut des breakpoints standardisés :
- `xs`: 475px
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

## 🔧 Utilisation

1. Le fichier `design-system.css` est automatiquement importé via `index.css`
2. Les composants UI sont disponibles via `@/components/ui`
3. Utilisez les variables CSS `var(--color-primary-500)` pour la cohérence

## 📝 Bonnes Pratiques

1. **Toujours** utiliser les composants UI plutôt que du HTML brut
2. **Préférer** les gradients `from-teal-500 to-cyan-500` pour les éléments principaux
3. **Utiliser** `rounded-2xl` (16px) comme radius standard pour les cartes
4. **Appliquer** des transitions de 300ms pour les interactions
5. **Respecter** la hiérarchie typographique (text-4xl pour titres principaux)
