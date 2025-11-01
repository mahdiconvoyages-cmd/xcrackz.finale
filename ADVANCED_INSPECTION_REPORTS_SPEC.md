# Spécification UX Avancée - Rapports d'Inspection

## Vue d'ensemble

Système complet de rapports d'inspection permettant la visualisation, comparaison et gestion des inspections de véhicules (départ/arrivée) avec génération PDF automatique, galerie photo avancée et suivi temps réel.

---

## 🎯 Objectifs principaux

1. **Visualisation intuitive** : Affichage clair et organisé des inspections départ/arrivée
2. **Comparaison intelligente** : Vue côte-à-côte pour identifier rapidement les changements
3. **Galerie photo avancée** : Organisation par type, zoom, lightbox, comparaison
4. **Génération PDF serveur** : Auto-génération avec cache et accès rapide
5. **Performance mobile** : Optimisations thumbnails, lazy loading, offline-ready
6. **Synchronisation temps réel** : Updates instantanées entre web et mobile

---

## 📊 Contrat de données

### Source principale : `v_inspection_reports`
```sql
-- Vue unifiée combinant inspections + photos + PDFs
SELECT 
  vi.id,
  vi.mission_id,
  vi.inspection_type,  -- 'departure' | 'arrival'
  vi.overall_condition,
  vi.mileage_km,
  vi.fuel_level,
  vi.client_signature,
  vi.driver_signature,
  vi.pdf_generated,
  vi.created_at,
  m.reference as mission_reference,
  m.vehicle_brand,
  m.vehicle_model,
  m.vehicle_plate,
  m.pickup_address,
  m.delivery_address,
  -- Photos groupées par type
  json_agg(DISTINCT ip.*) as photos,
  -- PDF en cache (dernière version)
  ipdf.pdf_url,
  ipdf.generated_at as pdf_generated_at
FROM vehicle_inspections vi
LEFT JOIN missions m ON m.id = vi.mission_id
LEFT JOIN inspection_photos_v2 ip ON ip.inspection_id = vi.id
LEFT JOIN LATERAL (
  SELECT pdf_url, generated_at
  FROM inspection_pdfs
  WHERE inspection_id = vi.id
  ORDER BY generated_at DESC
  LIMIT 1
) ipdf ON true
GROUP BY vi.id, m.id, ipdf.pdf_url, ipdf.generated_at;
```

### Types de photos supportés
```typescript
type PhotoType = 
  | 'front'           // Avant
  | 'back'            // Arrière
  | 'left'            // Côté gauche
  | 'right'           // Côté droit
  | 'dashboard'       // Tableau de bord
  | 'interior'        // Intérieur
  | 'damage'          // Dommage spécifique
  | 'other';          // Autre

interface InspectionPhoto {
  id: string;
  inspection_id: string;
  photo_type: PhotoType;
  full_url: string;
  thumbnail_url?: string;
  taken_at: string;
  gps_latitude?: number;
  gps_longitude?: number;
  metadata?: Record<string, any>;
}
```

---

## 🖥️ Spécification Web

### 1. Page Rapports d'Inspection (`/rapports-inspections`)

#### Layout principal
```
┌─────────────────────────────────────────────────────┐
│  📊 Rapports d'Inspection                           │
│  ┌─────────────────────┐  ┌──────────────────────┐ │
│  │ Stats Cards         │  │ Filtres/Recherche    │ │
│  │ - Total rapports    │  │ - Mission ref        │ │
│  │ - Complets          │  │ - Type inspection    │ │
│  │ - En attente        │  │ - Date range         │ │
│  └─────────────────────┘  └──────────────────────┘ │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │ Rapport Mission #MISS-001          [Complet] │  │
│  │ Renault Clio • AB-123-CD           [PDF ✓]   │  │
│  │ ├─ Départ: 15/10 10:30                       │  │
│  │ ├─ Arrivée: 15/10 14:45                      │  │
│  │ └─ Actions: [Comparaison] [PDF] [Email]      │  │
│  │                                                │  │
│  │ [Détails ▼]                                   │  │
│  │   ┌─ Mode: [○ Standard  ● Avancé]            │  │
│  │   └─ [Galerie avancée s'affiche ici]         │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

#### Vue Standard (mode simple)
- Liste verticale : Départ → Arrivée
- Infos clés : kilométrage, carburant, état général, notes
- Photos en grille 3 colonnes, clic → lightbox
- Actions : PDF, Email, Photos ZIP

#### Vue Avancée (mode comparaison)
```
┌──────────────────────────────────────────────────────┐
│  🔄 Comparaison Départ / Arrivée                     │
│  ┌────────────────────┬────────────────────┐        │
│  │ 📍 DÉPART          │ 🏁 ARRIVÉE          │        │
│  ├────────────────────┼────────────────────┤        │
│  │ 12,345 km          │ 12,789 km (+444)   │        │
│  │ Carburant: 75%     │ Carburant: 25%     │        │
│  │ État: Bon          │ État: Bon          │        │
│  └────────────────────┴────────────────────┘        │
│                                                      │
│  📸 Photos par type                                  │
│  ┌──────────────────────────────────────────┐       │
│  │ [Avant]                                   │       │
│  │  ┌─────────┬─────────┐                   │       │
│  │  │ Départ  │ Arrivée │ ← comparaison     │       │
│  │  └─────────┴─────────┘                   │       │
│  │ [Arrière]                                 │       │
│  │  ┌─────────┬─────────┐                   │       │
│  │  │ Départ  │ Arrivée │                   │       │
│  │  └─────────┴─────────┘                   │       │
│  │ [Gauche] [Droite] [Tableau de bord]...   │       │
│  └──────────────────────────────────────────┘       │
└──────────────────────────────────────────────────────┘
```

#### Interactions clés (Web)
- **Clic photo** → Lightbox plein écran avec :
  - Navigation clavier (←/→)
  - Zoom (molette/pinch)
  - Métadonnées (GPS, date/heure)
  - Actions : Download, Share
- **Bouton "PDF serveur"** → 
  - Si cache : ouverture immédiate
  - Sinon : génération + polling + ouverture
  - Badge "PDF ✓" si disponible
- **Toggle mode** → Switch Standard ↔ Avancé (persisté par utilisateur)
- **Filtres dynamiques** → Mise à jour instantanée de la liste
- **Sync temps réel** → Toast notification sur nouvelle inspection

---

## 📱 Spécification Mobile

### 1. Écran Rapports (`InspectionReportsScreen`)

#### Layout principal (liste)
```
┌─────────────────────────┐
│ ← Rapports d'Inspection │
│ [🔍 Rechercher...]      │
│ [Filtres ▼]             │
├─────────────────────────┤
│ ┌─────────────────────┐ │
│ │ MISS-001   [Complet]│ │
│ │ Renault Clio        │ │
│ │ AB-123-CD  [PDF ✓]  │ │
│ │ 15/10 10:30→14:45   │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ MISS-002  [Départ]  │ │
│ │ Peugeot 208         │ │
│ │ ...                 │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

#### Écran Détails (`InspectionReportAdvanced`)
```
┌─────────────────────────┐
│ ← MISS-001              │
│ Renault Clio • AB-123-CD│
├─────────────────────────┤
│ [○ Standard ● Avancé]   │
├─────────────────────────┤
│ 📊 Résumé               │
│ Départ: 12,345 km       │
│ Arrivée: 12,789 km      │
│ Δ +444 km               │
├─────────────────────────┤
│ 📸 Photos (18)          │
│ ┌─────┬─────┬─────┐    │
│ │     │     │     │    │ <- Grille 3 col
│ └─────┴─────┴─────┘    │
│ ┌─────┬─────┬─────┐    │
│ │     │     │     │    │
│ └─────┴─────┴─────┘    │
├─────────────────────────┤
│ [Générer PDF] [Partager]│
└─────────────────────────┘
```

#### Vue Avancée Mobile
- **Tabs horizontaux** : Départ | Arrivée | Comparaison
- **Photos groupées** : Accordion par type (Avant, Arrière, etc.)
- **Grille optimisée** : 3 colonnes, thumbnails 120x120
- **Lazy loading** : Chargement progressif au scroll
- **Pull-to-refresh** : Actualisation des données
- **Lightbox natif** : react-native-image-viewing
  - Swipe horizontal entre photos
  - Pinch-to-zoom
  - Double-tap zoom rapide
  - Partage système iOS/Android

#### Performance Mobile
```typescript
// Stratégie de chargement
1. Charger métadonnées inspection (texte, stats)
2. Charger thumbnails (WebP 120x120)
3. Précharger full images des 3 premières photos
4. Lazy load le reste au scroll (IntersectionObserver)
5. Cache local avec AsyncStorage (7 jours)
6. Offline mode: afficher cache + sync au retour réseau
```

---

## 🎨 Design System

### Couleurs
```typescript
const InspectionColors = {
  // Statuts
  complete: { bg: '#f3e8ff', text: '#7c3aed', border: '#c4b5fd' },  // Purple
  departure: { bg: '#d1fae5', text: '#059669', border: '#6ee7b7' }, // Green
  arrival: { bg: '#dbeafe', text: '#2563eb', border: '#93c5fd' },   // Blue
  pending: { bg: '#fef3c7', text: '#d97706', border: '#fcd34d' },   // Amber
  
  // PDF
  pdfAvailable: { bg: '#d1fae5', text: '#059669', border: '#6ee7b7' },
  pdfGenerating: { bg: '#fef3c7', text: '#d97706', border: '#fcd34d' },
  
  // Comparaison
  unchanged: '#94a3b8',
  increased: '#ef4444',
  decreased: '#10b981',
};
```

### Composants réutilisables

#### `<InspectionCard>` (Web/Mobile)
```typescript
interface InspectionCardProps {
  report: InspectionReport;
  mode?: 'compact' | 'expanded';
  onExpand?: () => void;
  onPdfClick?: () => void;
  onCompareClick?: () => void;
}
```

#### `<PhotoGallery>` (Web)
```typescript
interface PhotoGalleryProps {
  photos: InspectionPhoto[];
  groupBy?: 'type' | 'inspection' | 'none';
  showComparison?: boolean;
  onPhotoClick?: (index: number) => void;
}
```

#### `<PhotoGrid>` (Mobile)
```typescript
interface PhotoGridProps {
  photos: InspectionPhoto[];
  columns?: 2 | 3 | 4;
  thumbnailSize?: number;
  onPhotoPress?: (photo: InspectionPhoto, index: number) => void;
  renderOverlay?: (photo: InspectionPhoto) => ReactNode;
}
```

#### `<ComparisonView>` (Web/Mobile)
```typescript
interface ComparisonViewProps {
  departure: InspectionData;
  arrival: InspectionData;
  highlightDifferences?: boolean;
  onPhotoCompare?: (type: PhotoType) => void;
}
```

#### `<PdfActions>` (Web/Mobile)
```typescript
interface PdfActionsProps {
  inspectionId: string;
  cachedUrl?: string;
  onGenerate?: () => Promise<void>;
  onOpen?: (url: string) => void;
  onShare?: (url: string) => void;
}
```

---

## 🔄 Flux utilisateur

### Parcours Web

1. **Arrivée sur la page**
   - Chargement des rapports (API)
   - Vérification PDFs en cache (parallèle)
   - Affichage stats + liste filtrée
   - Setup realtime listeners

2. **Consultation rapport**
   - Clic sur carte → Expansion
   - Mode standard par défaut
   - Toggle "Vue avancée" → Comparaison + galerie groupée
   - Clic photo → Lightbox plein écran

3. **Génération PDF**
   - Clic "PDF serveur" → 
   - Si cache : ouverture directe
   - Sinon : RPC `regenerate_inspection_pdf()` → polling cache → ouverture
   - Badge "PDF ✓" apparaît après génération

4. **Envoi email**
   - Clic "Email" → Modal
   - Saisie destinataire
   - Génération auto PDF + ZIP photos
   - Ouverture client email avec brouillon pré-rempli

### Parcours Mobile

1. **Liste rapports**
   - Pull-to-refresh au lancement
   - Scroll infini (pagination 20/page)
   - Filtres sticky en haut

2. **Détails rapport**
   - Tap carte → Navigation vers `InspectionReportAdvanced`
   - Tabs Départ | Arrivée | Comparaison
   - Grille photos 3 colonnes, thumbnails lazy
   - Tap photo → Lightbox natif (react-native-image-viewing)

3. **Actions offline**
   - Cache photos/métadonnées (AsyncStorage)
   - Mode offline : lecture seule
   - Bouton "Sync" visible si données en attente
   - Auto-sync au retour réseau

---

## 🚀 Optimisations Performance

### Web
```typescript
// Lazy loading images
<img 
  src={photo.thumbnail_url} 
  loading="lazy" 
  onLoad={() => preloadFullImage(photo.full_url)}
/>

// Virtualisation liste (react-window)
<FixedSizeList
  height={600}
  itemCount={reports.length}
  itemSize={200}
  overscanCount={2}
>
  {ReportRow}
</FixedSizeList>

// Memoization
const MemoizedGallery = React.memo(PhotoGallery, (prev, next) => 
  prev.photos.length === next.photos.length &&
  prev.groupBy === next.groupBy
);
```

### Mobile
```typescript
// FlatList optimisée
<FlatList
  data={photos}
  numColumns={3}
  initialNumToRender={9}
  maxToRenderPerBatch={9}
  windowSize={5}
  removeClippedSubviews
  getItemLayout={(data, index) => ({
    length: ITEM_SIZE,
    offset: ITEM_SIZE * index,
    index,
  })}
  renderItem={({ item }) => (
    <FastImage
      source={{ uri: item.thumbnail_url, priority: FastImage.priority.normal }}
      resizeMode={FastImage.resizeMode.cover}
    />
  )}
/>

// Cache stratégique
await AsyncStorage.setItem(
  `inspection_${id}`, 
  JSON.stringify(data),
  { ttl: 7 * 24 * 60 * 60 } // 7 jours
);
```

---

## 📡 Synchronisation Temps Réel

### Web (Supabase Realtime)
```typescript
useEffect(() => {
  const channel = supabase
    .channel('inspection_changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'vehicle_inspections',
    }, (payload) => {
      if (payload.eventType === 'INSERT') {
        toast.success('🔄 Nouvelle inspection synchronisée');
        loadReports();
      } else if (payload.eventType === 'UPDATE') {
        // Mise à jour partielle
        setReports(prev => prev.map(r => 
          r.id === payload.new.id ? { ...r, ...payload.new } : r
        ));
      }
    })
    .subscribe();

  return () => channel.unsubscribe();
}, []);
```

### Mobile (Polling + Push Notifications)
```typescript
// Polling intelligent (foreground)
useInterval(() => {
  if (appState === 'active') {
    syncReports();
  }
}, 30000); // 30s

// Push notification (background)
onBackgroundMessage(async (remoteMessage) => {
  if (remoteMessage.data?.type === 'inspection_complete') {
    await syncReports();
    showNotification({
      title: 'Inspection terminée',
      body: `Mission ${remoteMessage.data.reference} complète`,
    });
  }
});
```

---

## 🧪 Cas limites & Edge Cases

### Photos
- ❌ **Aucune photo** : Afficher placeholder + message "Aucune photo disponible"
- ❌ **Upload échoué** : Badge "⚠️ Upload partiel" + retry manuel
- ❌ **Image corrompue** : Fallback image + log erreur
- ✅ **Album volumineux (>50 photos)** : Pagination galerie + lazy load

### PDF
- ❌ **Génération échoue** : Toast erreur + retry + log serveur
- ❌ **Timeout (>20s)** : Message "Génération en cours, vérifiez plus tard"
- ✅ **Cache expiré** : Régénération automatique si >30j

### Réseau
- ❌ **Offline** : Mode lecture seule, sync à la reconnexion
- ❌ **Timeout API** : Retry exponentiel (1s, 2s, 4s, 8s)
- ✅ **Latence élevée** : Loading skeletons + optimistic UI

### Données
- ❌ **Mission supprimée** : Griser le rapport + badge "Mission archivée"
- ❌ **Inspection partielle** : Badge "⏳ En attente arrivée" ou "⏳ En attente départ"
- ✅ **Signatures manquantes** : Désactiver génération PDF + message explicatif

---

## 📈 Métriques & Analytics

### Events à tracker
```typescript
analytics.track('inspection_report_viewed', {
  mission_id,
  inspection_type,
  has_pdf,
  view_mode: 'standard' | 'advanced',
});

analytics.track('pdf_generated', {
  inspection_id,
  generation_time_ms,
  file_size_bytes,
  source: 'auto' | 'manual',
});

analytics.track('photo_lightbox_opened', {
  photo_type,
  inspection_type,
  from_screen: 'reports' | 'advanced_view',
});
```

### KPIs
- Temps moyen de génération PDF
- Taux d'utilisation vue avancée vs standard
- Nombre de photos par inspection (moyenne)
- Taux de complétion (départ + arrivée)
- Temps passé sur la page rapports

---

## ✅ Checklist Implémentation

### Backend ✅
- [x] Table `inspection_photos_v2` avec metadata
- [x] Table `inspection_pdfs` pour cache
- [x] Vue `v_inspection_reports` unifiée
- [x] Fonction `is_inspection_complete()`
- [x] Edge Function `generate-inspection-pdf`
- [x] Trigger auto-génération PDF
- [x] RPC `regenerate_inspection_pdf()`
- [x] Storage buckets + RLS policies

### Web ✅
- [x] Page `RapportsInspection.tsx` refonte
- [x] Composant `InspectionReportAdvanced`
- [x] Composant `PhotoGallery` avec lightbox
- [x] Composant `InspectionComparison`
- [x] Service `inspectionPdfEdgeService`
- [x] Badge "PDF ✓" en cache
- [x] Bouton "PDF serveur"
- [x] Realtime sync

### Mobile 🔄
- [x] Screen `InspectionReportAdvanced` scaffold
- [ ] Navigation integration
- [ ] PhotoGrid component
- [ ] Lightbox natif (react-native-image-viewing)
- [ ] PDF actions (generate/open/share)
- [ ] Offline cache (AsyncStorage)
- [ ] Pull-to-refresh
- [ ] Push notifications

### Performance & Polish 🔄
- [ ] Lazy loading images (web + mobile)
- [ ] Thumbnails WebP generation
- [ ] Request batching/debouncing
- [ ] Memoization composants lourds
- [ ] Loading skeletons
- [ ] Error boundaries
- [ ] Tests E2E critiques

---

## 🎯 Roadmap Future

### Phase 2 (Court terme)
- [ ] Filtres avancés (date range, véhicule, client)
- [ ] Export multi-rapports (ZIP de PDFs)
- [ ] Annotations photos (markup, notes)
- [ ] Historique versions PDF
- [ ] Recherche full-text

### Phase 3 (Moyen terme)
- [ ] Comparaison multi-inspections (même véhicule)
- [ ] Détection automatique dommages (ML)
- [ ] OCR plaques d'immatriculation
- [ ] Timeline interactive mission
- [ ] Carte GPS des trajets

### Phase 4 (Long terme)
- [ ] Rapport vocal (synthèse audio)
- [ ] AR preview damages (réalité augmentée)
- [ ] Intégration assurance directe
- [ ] Blockchain proof of inspection
- [ ] API publique rapports

---

## 📚 Références Techniques

### Librairies utilisées
- **Web**: React, Vite, Supabase JS, jsPDF, JSZip, react-image-lightbox
- **Mobile**: React Native, Expo, react-native-image-viewing, react-native-fast-image
- **Backend**: Supabase (Postgres, Storage, Edge Functions, Realtime)
- **PDF**: pdf-lib (Deno), jsPDF (client)

### Documentation
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [React Native Image Viewing](https://github.com/jobtoday/react-native-image-viewing)
- [pdf-lib](https://pdf-lib.js.org/)

---

**Version**: 1.0  
**Dernière mise à jour**: 31 octobre 2025  
**Auteur**: Équipe Finality Transport
