# 🎯 PLAN MASTER - Clone Parfait Web → Mobile

## 📋 OBJECTIF GLOBAL

Transformer l'app mobile en **copie EXACTE** de l'app web avec :
- ✅ Mêmes écrans
- ✅ Mêmes fonctionnalités
- ✅ Mêmes images/SVG
- ✅ Mêmes formulaires
- ✅ Synchronisation temps réel
- ❌ SANS : Boutique, Inscription

---

## 🗺️ ARCHITECTURE COMPLÈTE

### WEB (Source)
```
src/pages/
├── Dashboard.tsx ✅ (601 lignes)
├── TeamMissions.tsx ✅ (1572 lignes)
├── Covoiturage.tsx ✅ (1608 lignes)
├── InspectionWizard.tsx
├── TeamMapScreen.tsx
└── ScannerPro.tsx
```

### MOBILE (Destination)
```
mobile/src/screens/
├── DashboardScreen.tsx ❌ (801 lignes - incomplet)
├── TeamMissionsScreen.tsx ❌ (à créer)
├── CovoiturageScreen.tsx ❌ (incomplet)
├── InspectionScreen.tsx ❌ (incomplet)
├── TeamMapScreen.tsx ❌ (à créer)
└── ScannerProScreen.tsx ❌ (725 lignes - limité)
```

---

## 📊 ANALYSE PAR PAGE

### 1. 🏠 DASHBOARD

#### WEB (Dashboard.tsx - 601 lignes)
**Stats affichées :**
- ✅ Total missions
- ✅ Missions actives
- ✅ Missions complétées
- ✅ Missions annulées
- ✅ Total contacts
- ✅ Total chauffeurs
- ✅ Total clients
- ✅ Factures en attente
- ✅ Factures payées
- ✅ Revenu total
- ✅ Revenu mensuel
- ✅ Revenu hebdomadaire
- ✅ Prix moyen mission
- ✅ Taux de complétion
- ✅ Taux d'annulation
- ✅ Crédits disponibles
- ✅ Missions cette semaine
- ✅ Missions aujourd'hui
- ✅ Temps de livraison moyen
- ✅ Distance totale

**Composants visuels :**
```tsx
// Cards de stats avec icons Lucide
<div className="grid grid-cols-4 gap-6">
  <StatCard icon={Truck} label="Total Missions" value={stats.totalMissions} />
  <StatCard icon={Users} label="Total Contacts" value={stats.totalContacts} />
  <StatCard icon={DollarSign} label="Revenu Total" value={formatMoney(stats.totalRevenue)} />
  {/* ... */}
</div>

// Graphique mensuel
<ResponsiveContainer width="100%" height={300}>
  <BarChart data={monthlyData}>
    <Bar dataKey="missions" fill="#3b82f6" />
    <Bar dataKey="revenue" fill="#10b981" />
  </BarChart>
</ResponsiveContainer>

// Recent missions table
<table>
  {recentMissions.map(mission => (
    <tr key={mission.id}>
      <td>{mission.reference}</td>
      <td>{mission.vehicle_brand} {mission.vehicle_model}</td>
      <td><StatusBadge status={mission.status} /></td>
    </tr>
  ))}
</table>
```

#### MOBILE (DashboardScreen.tsx - 801 lignes)
**Ce qui manque :**
- ❌ Graphiques mensuels (pas de charting library)
- ❌ Stats avancées (crédits, distance, temps moyen)
- ❌ Recent missions list
- ❌ Quick actions grid
- ❌ Design identique au web

**Action requise :**
```tsx
// Ajouter react-native-chart-kit
npm install react-native-chart-kit react-native-svg

// Refonte complète DashboardScreen.tsx
import { BarChart, LineChart } from 'react-native-chart-kit';

const chartConfig = {
  backgroundGradientFrom: '#0b1220',
  backgroundGradientTo: '#1e293b',
  color: (opacity = 1) => `rgba(14, 165, 233, ${opacity})`,
  strokeWidth: 2,
};

<BarChart
  data={{
    labels: monthlyData.map(m => m.month),
    datasets: [{
      data: monthlyData.map(m => m.missions)
    }]
  }}
  width={width - 40}
  height={220}
  chartConfig={chartConfig}
/>
```

---

### 2. 👥 TEAM MISSIONS

#### WEB (TeamMissions.tsx - 1572 lignes)
**Fonctionnalités complètes :**
- ✅ Tabs : missions / team / assignments / received / stats
- ✅ View modes : grid / list
- ✅ Filtres : status, role, search
- ✅ Assignment modal (assigner mission à contact)
- ✅ Inspection viewer
- ✅ PDF generator
- ✅ Edit mission modal
- ✅ Reassign modal
- ✅ Details modal
- ✅ Stats dashboard

**Interface :**
```tsx
// Tabs navigation
<div className="flex gap-4 border-b">
  <Tab active={activeTab === 'missions'}>Missions</Tab>
  <Tab active={activeTab === 'team'}>Équipe</Tab>
  <Tab active={activeTab === 'assignments'}>Assignations</Tab>
  <Tab active={activeTab === 'received'}>Reçues</Tab>
  <Tab active={activeTab === 'stats'}>Statistiques</Tab>
</div>

// Grid/List toggle
<div className="flex gap-2">
  <button onClick={() => setViewMode('grid')}><Grid /></button>
  <button onClick={() => setViewMode('list')}><List /></button>
</div>

// Mission cards with images
{viewMode === 'grid' ? (
  <div className="grid grid-cols-3 gap-6">
    {missions.map(mission => (
      <MissionCard key={mission.id} mission={mission} />
    ))}
  </div>
) : (
  <table>
    {missions.map(mission => (
      <MissionRow key={mission.id} mission={mission} />
    ))}
  </table>
)}
```

#### MOBILE (TeamMissionsScreen.tsx)
**État actuel :**
- ❌ N'EXISTE PAS

**Action requise :**
- ✅ Créer TeamMissionsScreen.tsx from scratch
- ✅ React Native Bottom Tabs pour navigation
- ✅ FlatList avec refreshControl
- ✅ Modal bottom sheets (react-native-bottom-sheet)
- ✅ Image viewer (react-native-image-viewing)

```tsx
// Structure à créer
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { BottomSheetModal } from '@gorhom/bottom-sheet';

const Tab = createMaterialTopTabNavigator();

export default function TeamMissionsScreen() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Missions" component={MissionsTab} />
      <Tab.Screen name="Équipe" component={TeamTab} />
      <Tab.Screen name="Assignations" component={AssignmentsTab} />
      <Tab.Screen name="Reçues" component={ReceivedTab} />
      <Tab.Screen name="Stats" component={StatsTab} />
    </Tab.Navigator>
  );
}

function MissionsTab() {
  return (
    <FlatList
      data={missions}
      renderItem={({ item }) => <MissionCard mission={item} />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}
    />
  );
}
```

---

### 3. 🚗 COVOITURAGE

#### WEB (Covoiturage.tsx - 1608 lignes)
**Fonctionnalités :**
- ✅ Search trips avec filtres avancés
- ✅ My trips (conducteur)
- ✅ My bookings (passager)
- ✅ Messages/Chat
- ✅ BlaBlaCar hero image
- ✅ Trip details modal
- ✅ Booking modal
- ✅ Rating system
- ✅ User profile viewer

**Image Hero :**
```tsx
import blablacarImg from '../assets/blablacar.png';

<div className="relative h-64 rounded-2xl overflow-hidden mb-8">
  <img src={blablacarImg} alt="Covoiturage" className="w-full h-full object-cover" />
  <div className="absolute inset-0 bg-gradient-to-r from-blue-900/80 to-transparent">
    <h1>Trouvez votre trajet</h1>
    <p>Économique • Écologique • Convivial</p>
  </div>
</div>
```

**Filtres avancés :**
```tsx
interface Filters {
  departureCity: string;
  arrivalCity: string;
  date: string;
  passengers: number;
  priceMax: number;
  instantBooking: boolean;
  allowsPets: boolean;
  allowsSmoking: boolean;
  allowsMusic: boolean;
  chatLevel: 'bla' | 'blabla' | 'blablabla';
  maxTwoBack: boolean;
  luggageSize: 'small' | 'medium' | 'large' | 'xl';
}
```

#### MOBILE (CovoiturageScreen.tsx)
**État actuel :**
- ⚠️ Existe mais incomplet (CovoiturageScreenBlaBlaCar.tsx)

**Action requise :**
- ✅ Port complet de Covoiturage.tsx → CovoiturageScreen.tsx
- ✅ Ajouter blablacar.png dans mobile/assets/
- ✅ React Native Image pour hero
- ✅ Bottom Sheet pour filtres
- ✅ KeyboardAwareScrollView pour formulaires

```tsx
import { Image } from 'react-native';
import blablacarImg from '../../assets/blablacar.png';

<View style={styles.heroContainer}>
  <Image 
    source={blablacarImg} 
    style={styles.heroImage}
    resizeMode="cover"
  />
  <LinearGradient
    colors={['rgba(30, 58, 138, 0.8)', 'transparent']}
    style={styles.heroOverlay}
  >
    <Text style={styles.heroTitle}>Trouvez votre trajet</Text>
    <Text style={styles.heroSubtitle}>Économique • Écologique • Convivial</Text>
  </LinearGradient>
</View>

const styles = StyleSheet.create({
  heroContainer: {
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
});
```

---

### 4. 🔍 INSPECTION

#### WEB (InspectionWizard.tsx)
**Flow complet :**
1. ✅ Sélection type (departure/arrival)
2. ✅ Choix mode (AI/Manual)
3. ✅ Capture photos (23 angles prédéfinis)
4. ✅ Annotations AI par angle
5. ✅ Validation descriptions
6. ✅ État général + carburant + kilométrage
7. ✅ Signatures (chauffeur + client)
8. ✅ Génération PDF rapport

**Photos requises :**
```tsx
const PHOTO_STEPS = [
  { id: 1, name: 'Avant face', icon: 'CarFront', required: true },
  { id: 2, name: 'Avant gauche', icon: 'CarFront', required: true },
  { id: 3, name: 'Avant droit', icon: 'CarFront', required: true },
  { id: 4, name: 'Côté gauche', icon: 'CarSide', required: true },
  { id: 5, name: 'Côté droit', icon: 'CarSide', required: true },
  { id: 6, name: 'Arrière face', icon: 'CarBack', required: true },
  { id: 7, name: 'Arrière gauche', icon: 'CarBack', required: true },
  { id: 8, name: 'Arrière droit', icon: 'CarBack', required: true },
  { id: 9, name: 'Roue avant gauche', icon: 'CircleDot', required: true },
  { id: 10, name: 'Roue avant droite', icon: 'CircleDot', required: true },
  { id: 11, name: 'Roue arrière gauche', icon: 'CircleDot', required: true },
  { id: 12, name: 'Roue arrière droite', icon: 'CircleDot', required: true },
  { id: 13, name: 'Tableau de bord', icon: 'Gauge', required: true },
  { id: 14, name: 'Compteur kilométrique', icon: 'Gauge', required: true },
  { id: 15, name: 'Niveau carburant', icon: 'Fuel', required: true },
  { id: 16, name: 'Intérieur avant', icon: 'Car', required: true },
  { id: 17, name: 'Intérieur arrière', icon: 'Car', required: true },
  { id: 18, name: 'Coffre ouvert', icon: 'Package', required: true },
  { id: 19, name: 'Capot ouvert', icon: 'Package', required: true },
  { id: 20, name: 'VIN (numéro châssis)', icon: 'Hash', required: true },
  { id: 21, name: 'Carte grise', icon: 'FileText', required: true },
  { id: 22, name: 'Assurance', icon: 'Shield', required: true },
  { id: 23, name: 'Photo libre', icon: 'Camera', required: false },
];
```

**AI Annotations :**
```tsx
// Appel DeepSeek après chaque photo
const analyzePhoto = async (photoUri: string, angle: string) => {
  const response = await fetch(DEEPSEEK_API, {
    method: 'POST',
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'Vous êtes expert en inspection automobile...'
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: `Analysez cette photo de "${angle}"...` },
            { type: 'image_url', image_url: { url: photoUri } }
          ]
        }
      ]
    })
  });
  return response.json();
};
```

#### MOBILE (InspectionScreen.tsx)
**État actuel :**
- ⚠️ Existe mais limité (558 lignes)

**Action requise :**
- ✅ Port complet InspectionWizard.tsx → InspectionScreen.tsx
- ✅ Utiliser expo-camera pour photos
- ✅ Ajouter signature pad (react-native-signature-canvas)
- ✅ Intégrer AI annotations (même API DeepSeek)
- ✅ Génération PDF mobile (react-native-pdf-lib)

```tsx
import { Camera } from 'expo-camera';
import SignatureCanvas from 'react-native-signature-canvas';
import { PDFDocument, rgb } from 'pdf-lib';

// Camera pour photos
const [hasPermission, requestPermission] = Camera.useCameraPermissions();

const takePhoto = async (stepIndex: number) => {
  if (cameraRef.current) {
    const photo = await cameraRef.current.takePictureAsync();
    const updatedSteps = [...photoSteps];
    updatedSteps[stepIndex].photo = photo.uri;
    setPhotoSteps(updatedSteps);
    
    // Analyse AI
    if (useAI) {
      const annotation = await analyzePhoto(photo.uri, updatedSteps[stepIndex].name);
      updatedSteps[stepIndex].description = annotation;
      setPhotoSteps(updatedSteps);
    }
  }
};

// Signature pad
<SignatureCanvas
  onOK={(signature) => handleSignatureComplete(signature)}
  descriptionText="Signez ici"
  clearText="Effacer"
  confirmText="Valider"
/>

// PDF generation mobile
const generatePDF = async () => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();
  
  // Add images
  for (const step of photoSteps) {
    if (step.photo) {
      const imageBytes = await FileSystem.readAsStringAsync(step.photo, {
        encoding: FileSystem.EncodingType.Base64
      });
      const image = await pdfDoc.embedPng(`data:image/png;base64,${imageBytes}`);
      page.drawImage(image, { x: 50, y: 700, width: 200, height: 150 });
    }
  }
  
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
};
```

---

### 5. 🗺️ TEAM MAP TRACKING

#### WEB (TeamMapScreen.tsx)
**Fonctionnalités :**
- ✅ Mapbox GL JS
- ✅ Markers temps réel (positions chauffeurs)
- ✅ Clustering markers
- ✅ Mission routes (pickup → delivery)
- ✅ Live tracking updates (socket.io ou polling)
- ✅ Info panels avec stats
- ✅ Filtres par statut mission

**Mapbox Integration :**
```tsx
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const map = new mapboxgl.Map({
  container: mapRef.current,
  style: 'mapbox://styles/mapbox/dark-v11',
  center: [2.3522, 48.8566], // Paris
  zoom: 12,
});

// Add markers
drivers.forEach(driver => {
  const marker = new mapboxgl.Marker({ color: '#3b82f6' })
    .setLngLat([driver.longitude, driver.latitude])
    .setPopup(new mapboxgl.Popup().setHTML(`
      <h3>${driver.name}</h3>
      <p>Mission: ${driver.currentMission}</p>
    `))
    .addTo(map);
});

// Draw routes
const route = {
  type: 'Feature',
  geometry: {
    type: 'LineString',
    coordinates: mission.routeCoordinates,
  },
};

map.addSource('route', { type: 'geojson', data: route });
map.addLayer({
  id: 'route',
  type: 'line',
  source: 'route',
  paint: {
    'line-color': '#10b981',
    'line-width': 4,
  },
});
```

#### MOBILE (TeamMapScreen.tsx)
**État actuel :**
- ⚠️ Existe mais basique (voir mobile/src/screens/TeamMapScreen.tsx)

**Action requise :**
- ✅ Utiliser react-native-mapbox-gl (ou Google Maps)
- ✅ Real-time position updates
- ✅ Custom markers avec photos chauffeurs
- ✅ Route polylines
- ✅ Bottom sheet avec infos mission

```tsx
import MapboxGL from '@rnmapbox/maps';

MapboxGL.setAccessToken(MAPBOX_TOKEN);

<MapboxGL.MapView style={styles.map}>
  <MapboxGL.Camera
    centerCoordinate={[2.3522, 48.8566]}
    zoomLevel={12}
  />
  
  {drivers.map(driver => (
    <MapboxGL.MarkerView
      key={driver.id}
      coordinate={[driver.longitude, driver.latitude]}
    >
      <View style={styles.marker}>
        <Image source={{ uri: driver.avatar }} style={styles.avatar} />
        <Text style={styles.markerLabel}>{driver.name}</Text>
      </View>
    </MapboxGL.MarkerView>
  ))}
  
  {missions.map(mission => (
    <MapboxGL.ShapeSource
      key={mission.id}
      id={`route-${mission.id}`}
      shape={mission.routeGeometry}
    >
      <MapboxGL.LineLayer
        id={`route-line-${mission.id}`}
        style={{
          lineColor: mission.status === 'active' ? '#10b981' : '#6b7280',
          lineWidth: 4,
        }}
      />
    </MapboxGL.ShapeSource>
  ))}
</MapboxGL.MapView>

<BottomSheet snapPoints={['20%', '50%']}>
  <MissionInfo mission={selectedMission} />
</BottomSheet>
```

---

### 6. 📷 SCANNER PRO

#### WEB (Scanner.tsx)
**Fonctionnalités :**
- ✅ OCR scan (Tesseract.js)
- ✅ Multi-page scanning
- ✅ PDF merge
- ✅ Image enhancement (brightness, contrast)
- ✅ Crop & rotate
- ✅ Export formats (PDF, JPG, PNG)

**OCR Implementation :**
```tsx
import Tesseract from 'tesseract.js';

const scanDocument = async (imageFile: File) => {
  const { data: { text } } = await Tesseract.recognize(imageFile, 'fra', {
    logger: m => console.log(m),
  });
  return text;
};

const enhanceImage = async (imageUri: string) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const img = new Image();
  img.src = imageUri;
  
  await new Promise(resolve => img.onload = resolve);
  
  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);
  
  // Apply filters
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    // Increase contrast
    const contrast = 1.2;
    data[i] = ((data[i] - 128) * contrast) + 128;
    data[i + 1] = ((data[i + 1] - 128) * contrast) + 128;
    data[i + 2] = ((data[i + 2] - 128) * contrast) + 128;
  }
  
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL();
};
```

#### MOBILE (ScannerProScreen.tsx - 725 lignes)
**État actuel :**
- ⚠️ Limité (pas d'OCR, scanner désactivé pour Expo Go)

**Action requise :**
- ✅ Activer react-native-document-scanner-plugin
- ✅ Ajouter expo-image-manipulator pour enhancement
- ✅ Intégrer Tesseract OCR mobile (react-native-tesseract-ocr)
- ✅ PDF merge avec react-native-pdf-lib

```tsx
import DocumentScanner from 'react-native-document-scanner-plugin';
import * as ImageManipulator from 'expo-image-manipulator';
import TesseractOcr from 'react-native-tesseract-ocr';

const scanDocument = async () => {
  const { scannedImages } = await DocumentScanner.scanDocument({
    croppedImageQuality: 100,
    maxNumDocuments: 10,
  });
  
  const enhancedImages = [];
  
  for (const image of scannedImages) {
    // Enhancement
    const enhanced = await ImageManipulator.manipulateAsync(
      image,
      [
        { resize: { width: 1000 } },
        { brightness: 0.1 },
        { contrast: 1.2 },
        { sharpen: 1 },
      ],
      { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
    );
    
    // OCR
    const text = await TesseractOcr.recognize(enhanced.uri, 'fra', {
      whitelist: null,
      blacklist: null,
    });
    
    enhancedImages.push({ uri: enhanced.uri, text });
  }
  
  return enhancedImages;
};

const generatePDF = async (images: string[]) => {
  const pdf = await PDFDocument.create();
  
  for (const imageUri of images) {
    const imageBytes = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const image = await pdf.embedJpg(`data:image/jpeg;base64,${imageBytes}`);
    
    const page = pdf.addPage([image.width, image.height]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height,
    });
  }
  
  const pdfBytes = await pdf.save();
  const pdfPath = `${FileSystem.documentDirectory}scan_${Date.now()}.pdf`;
  await FileSystem.writeAsStringAsync(pdfPath, pdfBytes, {
    encoding: FileSystem.EncodingType.Base64,
  });
  
  return pdfPath;
};
```

---

## 🎨 ASSETS & IMAGES

### SVG Images Web
```
src/assets/images/
└── covoiturage-hero.svg ✅
```

### PNG Images Web
```
src/assets/
├── blablacar.png ✅
└── (autres images)
```

### Action Mobile
```bash
# Copier tous les assets
cp src/assets/blablacar.png mobile/assets/
cp src/assets/images/covoiturage-hero.svg mobile/assets/images/

# Convertir SVG en PNG pour mobile (si nécessaire)
# Utiliser https://svgtopng.com ou librairie
```

**Alternative pour SVG dans React Native :**
```tsx
// Installer react-native-svg-transformer
npm install react-native-svg-transformer react-native-svg

// metro.config.js
module.exports = {
  transformer: {
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
  },
};

// Usage
import CovoiturageHero from '../assets/images/covoiturage-hero.svg';

<CovoiturageHero width={300} height={200} />
```

---

## 🔄 SYNCHRONISATION TEMPS RÉEL

### Web → Mobile (Bidirectionnelle)

**Approche 1 : Supabase Realtime**
```tsx
// Web & Mobile (identique)
useEffect(() => {
  const subscription = supabase
    .channel('missions')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'missions' },
      (payload) => {
        console.log('Change received!', payload);
        // Update local state
        if (payload.eventType === 'INSERT') {
          setMissions(prev => [...prev, payload.new]);
        } else if (payload.eventType === 'UPDATE') {
          setMissions(prev => prev.map(m => 
            m.id === payload.new.id ? payload.new : m
          ));
        } else if (payload.eventType === 'DELETE') {
          setMissions(prev => prev.filter(m => m.id !== payload.old.id));
        }
      }
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}, []);
```

**Approche 2 : Socket.io (si besoin de features avancées)**
```tsx
// Server (Node.js)
import { Server } from 'socket.io';

const io = new Server(3001, {
  cors: { origin: '*' }
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('mission:created', (mission) => {
    io.emit('mission:new', mission);
  });
  
  socket.on('mission:updated', (mission) => {
    io.emit('mission:changed', mission);
  });
});

// Web
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');

socket.on('mission:new', (mission) => {
  setMissions(prev => [...prev, mission]);
});

// Mobile (même code)
import io from 'socket.io-client';

const socket = io('http://localhost:3001');

socket.on('mission:new', (mission) => {
  setMissions(prev => [...prev, mission]);
});
```

**Approche 3 : Polling (fallback simple)**
```tsx
// Refresh every 5 seconds
useEffect(() => {
  const interval = setInterval(async () => {
    const { data } = await supabase
      .from('missions')
      .select('*')
      .order('created_at', { ascending: false });
    setMissions(data || []);
  }, 5000);

  return () => clearInterval(interval);
}, []);
```

---

## 📦 PACKAGES NÉCESSAIRES

### Mobile - Nouvelles Dépendances
```json
{
  "dependencies": {
    // Charts
    "react-native-chart-kit": "^6.12.0",
    "react-native-svg": "^15.0.0",
    
    // Maps
    "@rnmapbox/maps": "^10.1.28",
    
    // Bottom Sheet
    "@gorhom/bottom-sheet": "^4.6.1",
    "react-native-reanimated": "^3.6.1",
    "react-native-gesture-handler": "^2.14.1",
    
    // Image Handling
    "react-native-image-viewing": "^0.2.2",
    "expo-image-manipulator": "^12.0.5",
    
    // PDF
    "react-native-pdf-lib": "^1.0.0",
    "pdf-lib": "^1.17.1",
    
    // Scanner
    "react-native-document-scanner-plugin": "^0.5.0",
    "react-native-tesseract-ocr": "^2.2.1",
    
    // Signature
    "react-native-signature-canvas": "^4.7.2",
    
    // SVG Support
    "react-native-svg-transformer": "^1.3.0",
    
    // Material Top Tabs
    "@react-navigation/material-top-tabs": "^6.6.5",
    "react-native-tab-view": "^3.5.2",
    
    // Keyboard
    "react-native-keyboard-aware-scroll-view": "^0.9.5",
    
    // Realtime (si Socket.io)
    "socket.io-client": "^4.6.1"
  }
}
```

### Installation
```bash
cd mobile
npx expo install react-native-chart-kit react-native-svg
npx expo install @rnmapbox/maps
npx expo install @gorhom/bottom-sheet react-native-reanimated react-native-gesture-handler
npx expo install react-native-image-viewing expo-image-manipulator
npx expo install react-native-pdf-lib pdf-lib
npx expo install react-native-signature-canvas
npx expo install react-native-svg-transformer
npx expo install @react-navigation/material-top-tabs react-native-tab-view
npx expo install react-native-keyboard-aware-scroll-view
npm install socket.io-client
```

---

## 🗂️ STRUCTURE FICHIERS FINALE

```
mobile/
├── assets/
│   ├── blablacar.png ✅
│   ├── images/
│   │   └── covoiturage-hero.svg ✅
│   ├── icon.png
│   ├── adaptive-icon.png
│   └── splash.png
│
├── src/
│   ├── screens/
│   │   ├── DashboardScreen.tsx ✅ (refonte complète)
│   │   ├── TeamMissionsScreen.tsx ✅ (nouveau - clone TeamMissions.tsx)
│   │   ├── CovoiturageScreen.tsx ✅ (refonte complète)
│   │   ├── InspectionScreen.tsx ✅ (refonte complète)
│   │   ├── TeamMapScreen.tsx ✅ (refonte complète)
│   │   ├── ScannerProScreen.tsx ✅ (refonte complète)
│   │   ├── MissionsScreen.tsx
│   │   ├── FacturationScreen.tsx
│   │   ├── ContactsScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   ├── SupportScreen.tsx
│   │   ├── LoginScreen.tsx
│   │   └── SignupScreen.tsx
│   │
│   ├── components/
│   │   ├── MissionCard.tsx ✅
│   │   ├── StatsCard.tsx ✅
│   │   ├── TripCard.tsx ✅
│   │   ├── InspectionPhotoStep.tsx ✅
│   │   ├── SignaturePad.tsx ✅
│   │   ├── MapMarker.tsx ✅
│   │   ├── BottomSheetModal.tsx ✅
│   │   ├── ChartContainer.tsx ✅
│   │   └── ErrorBoundary.tsx ✅
│   │
│   ├── services/
│   │   ├── supabase.ts ✅
│   │   ├── inspectionService.ts ✅
│   │   ├── missionPdfGenerator.ts ✅
│   │   ├── ocrService.ts ✅ (nouveau)
│   │   ├── mapService.ts ✅ (nouveau)
│   │   └── realtimeService.ts ✅ (nouveau)
│   │
│   ├── hooks/
│   │   ├── useAuth.ts ✅
│   │   ├── useRealtime.ts ✅ (nouveau)
│   │   ├── useLocation.ts ✅
│   │   └── useCamera.ts ✅
│   │
│   └── lib/
│       ├── supabase.ts ✅
│       └── constants.ts ✅
│
├── app.config.js ✅
├── metro.config.js ✅ (ajouter transformer SVG)
└── package.json ✅
```

---

## 📅 PLANNING D'IMPLÉMENTATION

### Phase 1 : Setup (1 jour)
- [x] ✅ Installer toutes les dépendances
- [ ] ⏳ Configurer metro.config.js pour SVG
- [ ] ⏳ Copier tous les assets (images, SVG)
- [ ] ⏳ Setup Mapbox native
- [ ] ⏳ Tester que tout compile

### Phase 2 : Dashboard (2 jours)
- [ ] ⏳ Refonte complète DashboardScreen.tsx
- [ ] ⏳ Ajouter graphiques (Bar Chart, Line Chart)
- [ ] ⏳ Stats cards identiques au web
- [ ] ⏳ Recent missions list
- [ ] ⏳ Quick actions grid
- [ ] ⏳ Realtime refresh

### Phase 3 : Team Missions (3 jours)
- [ ] ⏳ Créer TeamMissionsScreen.tsx from scratch
- [ ] ⏳ Material Top Tabs (5 tabs)
- [ ] ⏳ FlatList avec mission cards
- [ ] ⏳ Assignment modal (Bottom Sheet)
- [ ] ⏳ Inspection viewer modal
- [ ] ⏳ Edit/Delete/Reassign modals
- [ ] ⏳ Stats tab avec charts
- [ ] ⏳ Realtime sync

### Phase 4 : Covoiturage (2 jours)
- [ ] ⏳ Port complet Covoiturage.tsx → CovoiturageScreen.tsx
- [ ] ⏳ Hero image BlaBlaCar
- [ ] ⏳ Search filters (Bottom Sheet)
- [ ] ⏳ Trip cards avec toutes les infos
- [ ] ⏳ Booking modal
- [ ] ⏳ Messages/Chat intégré
- [ ] ⏳ Rating system
- [ ] ⏳ Realtime trips updates

### Phase 5 : Inspection (3 jours)
- [ ] ⏳ Port InspectionWizard.tsx → InspectionScreen.tsx
- [ ] ⏳ Camera integration (expo-camera)
- [ ] ⏳ 23 photo steps avec preview
- [ ] ⏳ AI annotations (DeepSeek API)
- [ ] ⏳ Validation descriptions
- [ ] ⏳ Signature pad (chauffeur + client)
- [ ] ⏳ PDF generation mobile
- [ ] ⏳ Upload vers Supabase Storage

### Phase 6 : Team Map (2 jours)
- [ ] ⏳ Setup @rnmapbox/maps
- [ ] ⏳ Afficher markers chauffeurs
- [ ] ⏳ Custom markers avec photos
- [ ] ⏳ Routes polylines
- [ ] ⏳ Clustering
- [ ] ⏳ Bottom Sheet infos mission
- [ ] ⏳ Realtime position updates
- [ ] ⏳ Filtres par statut

### Phase 7 : Scanner Pro (2 jours)
- [ ] ⏳ Activer react-native-document-scanner-plugin
- [ ] ⏳ Multi-page scanning
- [ ] ⏳ Image enhancement (expo-image-manipulator)
- [ ] ⏳ OCR integration (Tesseract)
- [ ] ⏳ PDF merge
- [ ] ⏳ Export & Share

### Phase 8 : Synchronisation Temps Réel (1 jour)
- [ ] ⏳ Setup Supabase Realtime sur toutes les tables
- [ ] ⏳ Écouter postgres_changes (missions, trips, assignments)
- [ ] ⏳ Update local state automatiquement
- [ ] ⏳ Optimistic updates
- [ ] ⏳ Conflict resolution

### Phase 9 : Tests & Polish (2 jours)
- [ ] ⏳ Tester tous les flows
- [ ] ⏳ Vérifier sync web ↔ mobile
- [ ] ⏳ Corriger bugs
- [ ] ⏳ Animations fluides
- [ ] ⏳ Loading states
- [ ] ⏳ Error handling

### Phase 10 : Build Final (1 jour)
- [ ] ⏳ Clean code
- [ ] ⏳ Remove console.logs
- [ ] ⏳ Optimiser images
- [ ] ⏳ Build APK release
- [ ] ⏳ Tester sur plusieurs devices
- [ ] ⏳ Documentation

**DURÉE TOTALE : 19 jours**

---

## 🚀 COMMANDES DE DÉMARRAGE

### 1. Installation
```bash
cd mobile

# Install all packages
npm install react-native-chart-kit react-native-svg
npm install @rnmapbox/maps
npm install @gorhom/bottom-sheet react-native-reanimated react-native-gesture-handler
npm install react-native-image-viewing expo-image-manipulator
npm install react-native-pdf-lib pdf-lib
npm install react-native-signature-canvas
npm install react-native-svg-transformer
npm install @react-navigation/material-top-tabs react-native-tab-view
npm install react-native-keyboard-aware-scroll-view
npm install socket.io-client

# Copier assets
cp ../src/assets/blablacar.png ./assets/
cp ../src/assets/images/covoiturage-hero.svg ./assets/images/
```

### 2. Configuration metro.config.js
```javascript
// mobile/metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};

config.resolver = {
  ...config.resolver,
  assetExts: config.resolver.assetExts.filter((ext) => ext !== 'svg'),
  sourceExts: [...config.resolver.sourceExts, 'svg'],
};

module.exports = config;
```

### 3. Test compilation
```bash
npx expo start --clear

# Si erreurs, essayer
npx expo install --fix
```

---

## ✅ CHECKLIST FINALE

### Fonctionnalités
- [ ] Dashboard avec stats complètes + graphiques
- [ ] Team Missions avec 5 tabs + assignations
- [ ] Covoiturage avec search + filtres + chat
- [ ] Inspection 23 photos + AI + signatures + PDF
- [ ] Team Map tracking temps réel
- [ ] Scanner Pro avec OCR + PDF merge
- [ ] Sync temps réel bidirectionnelle

### UI/UX
- [ ] Design identique au web
- [ ] Même couleurs (#0b1220, #14b8a6, etc.)
- [ ] Mêmes icons (Feather, MaterialCommunityIcons)
- [ ] Animations fluides
- [ ] Loading states partout
- [ ] Error handling gracieux

### Assets
- [ ] Toutes les images copiées
- [ ] SVG convertis ou transformés
- [ ] Hero images présentes
- [ ] Icons cohérents

### Performance
- [ ] Images optimisées
- [ ] Lazy loading
- [ ] Memoization (React.memo, useMemo)
- [ ] FlatList virtualized
- [ ] Debounce sur search

### Tests
- [ ] Testé sur Android
- [ ] Testé sur iOS
- [ ] Sync web ↔ mobile vérifié
- [ ] Offline handling
- [ ] Error scenarios testés

---

## 🎯 RÉSULTAT FINAL

Après implémentation complète :

✅ **Mobile = Clone PARFAIT du Web**
- Mêmes écrans
- Mêmes fonctionnalités
- Mêmes images/SVG
- Mêmes formulaires
- Sync temps réel
- Sans boutique ni inscription

✅ **Cohérence Totale**
- Design identique
- Flows identiques
- Data identique
- Experience identique

✅ **Modernisation**
- Scanner OCR avancé
- Maps natives
- Animations fluides
- Bottom sheets modernes

---

**Êtes-vous prêt à commencer ? Par quelle phase voulez-vous commencer ?** 🚀

1. **Dashboard** (graphiques + stats)
2. **Team Missions** (nouveau screen complet)
3. **Covoiturage** (hero image + filtres)
4. **Inspection** (AI + signatures)
5. **Team Map** (tracking temps réel)
6. **Scanner** (OCR + PDF)
7. **Tout en une fois** (installations + setup)

Dites-moi et je commence immédiatement ! 💪
