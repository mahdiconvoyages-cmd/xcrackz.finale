# 🛰️ Architecture Complète - Tracking GPS Temps Réel Professionnel

## 📋 Analyse de l'Existant

### ✅ Ce qui fonctionne
- Service `GPSTrackingService` avec Geolocator
- Table `mission_tracking_positions` en base
- Supabase Realtime pour broadcasting
- Écran carte Google Maps Flutter
- Update position tous les 10 mètres

### ❌ Problèmes Critiques
1. **Pas de tracking en arrière-plan** → GPS s'arrête quand app fermée
2. **Pas de lien public** → Client ne peut pas suivre en temps réel
3. **Performance** → Pas d'optimisation batterie/réseau
4. **Expérience Web** → Pas de page publique dédiée
5. **Persistance** → Anciennes positions jamais nettoyées
6. **Fiabilité** → Perte de connexion = perte de tracking

---

## 🏗️ Architecture Cible Professionnelle

### Vue d'ensemble

```
┌─────────────────────────────────────────────────────────┐
│  APP MOBILE FLUTTER (Chauffeur)                          │
│  ┌───────────────────────────────────────────────┐      │
│  │  📱 Background Service (PERMANENT)             │      │
│  │  • Tracking GPS même app fermée                │      │
│  │  • Notification persistante "GPS Actif"        │      │
│  │  • Optimisations batterie intelligentes        │      │
│  │  • Cache offline + sync automatique            │      │
│  └───────────────────────────────────────────────┘      │
│                     ↓ (Position toutes les 2-3s FLUIDE)  │
└─────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────┐
│  SUPABASE BACKEND                                        │
│  ┌───────────────────────────────────────────────┐      │
│  │  Table: mission_tracking_live (optimisée)     │      │
│  │  • UN seul enregistrement par mission          │      │
│  │  • UPDATE en temps réel (pas INSERT)          │      │
│  │  • Colonne last_update avec timestamp         │      │
│  │  • Index sur mission_id + user_id             │      │
│  └───────────────────────────────────────────────┘      │
│  ┌───────────────────────────────────────────────┐      │
│  │  Table: mission_tracking_history (archives)   │      │
│  │  • Snapshot toutes les 5 minutes               │      │
│  │  • Nettoyage auto après 7 jours               │      │
│  │  • Pour reconstitution de trajet              │      │
│  └───────────────────────────────────────────────┘      │
│  ┌───────────────────────────────────────────────┐      │
│  │  Table: public_tracking_links (sécurité)      │      │
│  │  • UUID token unique par mission               │      │
│  │  • Expiration automatique 48h après mission   │      │
│  │  • Rate limiting anti-spam                     │      │
│  └───────────────────────────────────────────────┘      │
│                                                           │
│  📡 Realtime Channel: mission:{id}:gps                   │
│  • Broadcast position toutes les 2-3s (FLUIDE)          │
│  • Latence < 200ms pour tracking ultra-réactif          │
└─────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────┐
│  PAGE WEB PUBLIQUE (Client)                             │
│  URL: app.finality.com/track/{TOKEN}                    │
│  ┌───────────────────────────────────────────────┐      │
│  │  🗺️ Carte Interactive (Leaflet - GRATUIT)    │      │
│  │  • Marker chauffeur animé en temps réel        │      │
│  │  • Trajectoire complète avec timestamps        │      │
│  │  • Points départ/arrivée                       │      │
│  │  • Mise à jour ULTRA-FLUIDE toutes les 2-3s    │      │
│  └───────────────────────────────────────────────┘      │
│  ┌───────────────────────────────────────────────┐      │
│  │  📊 Panneau Informations Live                  │      │
│  │  • Distance parcourue / restante               │      │
│  │  • Vitesse actuelle                            │      │
│  │  • Heure estimée d'arrivée (ETA)               │      │
│  │  • Dernière mise à jour (timestamp)            │      │
│  └───────────────────────────────────────────────┘      │
│                                                           │
│  🔒 Sécurité                                             │
│  • Pas d'authentification requise (lien public)         │
│  • Token unique impossible à deviner                    │
│  • Expiration automatique                               │
│  • Pas d'infos sensibles                                │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Schéma Base de Données Optimisé

### Table 1: `mission_tracking_live` (Position actuelle)

```sql
CREATE TABLE mission_tracking_live (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Position GPS
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION, -- Précision en mètres
  altitude DOUBLE PRECISION,
  bearing DOUBLE PRECISION,  -- Direction 0-360°
  speed DOUBLE PRECISION,    -- m/s
  
  -- Métadonnées
  last_update TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  battery_level INTEGER,     -- Pourcentage
  is_active BOOLEAN DEFAULT true,
  
  -- Index pour performance
  UNIQUE(mission_id, user_id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index composé pour queries rapides
CREATE INDEX idx_tracking_live_mission ON mission_tracking_live(mission_id, last_update DESC);
CREATE INDEX idx_tracking_live_active ON mission_tracking_live(is_active) WHERE is_active = true;

-- Nettoyage automatique des positions inactives > 2h
CREATE OR REPLACE FUNCTION cleanup_inactive_tracking()
RETURNS void AS $$
BEGIN
  UPDATE mission_tracking_live
  SET is_active = false
  WHERE last_update < NOW() - INTERVAL '2 hours'
  AND is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Trigger auto-nettoyage
CREATE OR REPLACE FUNCTION schedule_tracking_cleanup()
RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('tracking_cleanup', '');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Table 2: `mission_tracking_history` (Archives)

```sql
CREATE TABLE mission_tracking_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  bearing DOUBLE PRECISION,
  
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour reconstitution rapide du trajet
CREATE INDEX idx_tracking_history_mission_time 
ON mission_tracking_history(mission_id, recorded_at DESC);

-- Partitionnement par mois pour performance
-- (Optionnel si volume élevé)

-- Nettoyage automatique après 7 jours
CREATE OR REPLACE FUNCTION cleanup_old_tracking_history()
RETURNS void AS $$
BEGIN
  DELETE FROM mission_tracking_history
  WHERE recorded_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;
```

### Table 3: `public_tracking_links` (Liens publics sécurisés)

```sql
CREATE TABLE public_tracking_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL UNIQUE REFERENCES missions(id) ON DELETE CASCADE,
  
  -- Token public unique (32 caractères)
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'base64url'),
  
  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL, -- 48h après fin mission
  last_accessed_at TIMESTAMPTZ,
  access_count INTEGER DEFAULT 0,
  
  -- Sécurité
  is_active BOOLEAN DEFAULT true,
  max_accesses INTEGER DEFAULT 1000 -- Rate limiting
);

-- Index pour lookup rapide
CREATE INDEX idx_tracking_links_token ON public_tracking_links(token) WHERE is_active = true;
CREATE INDEX idx_tracking_links_expiry ON public_tracking_links(expires_at) WHERE is_active = true;

-- Fonction de nettoyage automatique des liens expirés
CREATE OR REPLACE FUNCTION cleanup_expired_tracking_links()
RETURNS void AS $$
BEGIN
  UPDATE public_tracking_links
  SET is_active = false
  WHERE expires_at < NOW() AND is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Fonction de génération de lien public
CREATE OR REPLACE FUNCTION generate_public_tracking_link(p_mission_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_token TEXT;
  v_mission_end TIMESTAMPTZ;
BEGIN
  -- Récupérer date de fin de mission
  SELECT delivery_date INTO v_mission_end
  FROM missions
  WHERE id = p_mission_id;
  
  -- Calculer expiration (48h après fin mission)
  IF v_mission_end IS NULL THEN
    v_mission_end := NOW() + INTERVAL '7 days';
  END IF;
  
  -- Créer ou mettre à jour le lien
  INSERT INTO public_tracking_links (mission_id, expires_at)
  VALUES (p_mission_id, v_mission_end + INTERVAL '48 hours')
  ON CONFLICT (mission_id) 
  DO UPDATE SET 
    is_active = true,
    expires_at = EXCLUDED.expires_at
  RETURNING token INTO v_token;
  
  RETURN v_token;
END;
$$ LANGUAGE plpgsql;
```

### Policies RLS (Sécurité)

```sql
-- mission_tracking_live
ALTER TABLE mission_tracking_live ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can update own tracking"
ON mission_tracking_live FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can view tracking of their missions"
ON mission_tracking_live FOR SELECT
USING (
  mission_id IN (
    SELECT id FROM missions 
    WHERE user_id = auth.uid() OR assigned_user_id = auth.uid()
  )
);

-- mission_tracking_history
ALTER TABLE mission_tracking_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own tracking history"
ON mission_tracking_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view history of their missions"
ON mission_tracking_history FOR SELECT
USING (
  mission_id IN (
    SELECT id FROM missions 
    WHERE user_id = auth.uid() OR assigned_user_id = auth.uid()
  )
);

-- public_tracking_links (PUBLIC - pas d'auth)
ALTER TABLE public_tracking_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active tracking links"
ON public_tracking_links FOR SELECT
USING (is_active = true AND expires_at > NOW());

CREATE POLICY "Mission owners can create tracking links"
ON public_tracking_links FOR INSERT
WITH CHECK (
  mission_id IN (
    SELECT id FROM missions WHERE user_id = auth.uid()
  )
);
```

---

## 📱 Service Flutter Background (Pro)

### Fichier: `lib/services/background_tracking_service.dart`

```dart
import 'package:flutter_background_service/flutter_background_service.dart';
import 'package:flutter_background_service_android/flutter_background_service_android.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:geolocator/geolocator.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'dart:async';
import 'dart:io';

class BackgroundTrackingService {
  static const int LOCATION_UPDATE_INTERVAL = 3; // 3 secondes (FLUIDE)
  static const int HISTORY_SNAPSHOT_INTERVAL = 300; // 5 minutes
  
  static Future<void> initialize() async {
    final service = FlutterBackgroundService();
    
    // Configuration notification Android
    const AndroidNotificationChannel channel = AndroidNotificationChannel(
      'gps_tracking_channel',
      'GPS Tracking',
      description: 'Tracking GPS actif pour votre mission',
      importance: Importance.low,
      enableVibration: false,
      playSound: false,
    );
    
    final FlutterLocalNotificationsPlugin notificationsPlugin =
        FlutterLocalNotificationsPlugin();
    
    await notificationsPlugin
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(channel);
    
    // Configuration du service background
    await service.configure(
      androidConfiguration: AndroidConfiguration(
        onStart: onStart,
        autoStart: false,
        isForegroundMode: true,
        notificationChannelId: 'gps_tracking_channel',
        initialNotificationTitle: 'GPS Tracking',
        initialNotificationContent: 'Initialisation...',
        foregroundServiceNotificationId: 888,
      ),
      iosConfiguration: IosConfiguration(
        autoStart: false,
        onForeground: onStart,
        onBackground: onIosBackground,
      ),
    );
  }
  
  @pragma('vm:entry-point')
  static void onStart(ServiceInstance service) async {
    if (service is AndroidServiceInstance) {
      service.on('setAsForeground').listen((event) {
        service.setAsForegroundService();
      });
      
      service.on('setAsBackground').listen((event) {
        service.setAsBackgroundService();
      });
    }
    
    service.on('stopService').listen((event) {
      service.stopSelf();
    });
    
    // Démarrer le tracking
    Timer.periodic(const Duration(seconds: LOCATION_UPDATE_INTERVAL), (timer) async {
      if (service is AndroidServiceInstance) {
        if (await service.isForegroundService()) {
          await _updateLocation(service);
        }
      } else {
        await _updateLocation(service);
      }
    });
    
    // Snapshot historique toutes les 5 minutes
    Timer.periodic(const Duration(seconds: HISTORY_SNAPSHOT_INTERVAL), (timer) async {
      await _snapshotHistory(service);
    });
  }
  
  @pragma('vm:entry-point')
  static Future<bool> onIosBackground(ServiceInstance service) async {
    return true;
  }
  
  static Future<void> _updateLocation(ServiceInstance service) async {
    try {
      // Récupérer position GPS
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          distanceFilter: 0,
        ),
      );
      
      // Récupérer mission ID depuis les préférences
      final prefs = await SharedPreferences.getInstance();
      final missionId = prefs.getString('tracking_mission_id');
      
      if (missionId == null) {
        service.stopSelf();
        return;
      }
      
      final supabase = Supabase.instance.client;
      final userId = supabase.auth.currentUser?.id;
      
      if (userId == null) {
        service.stopSelf();
        return;
      }
      
      // Récupérer niveau batterie
      final battery = await Battery().batteryLevel;
      
      // UPDATE position en base (UPSERT)
      await supabase.from('mission_tracking_live').upsert({
        'mission_id': missionId,
        'user_id': userId,
        'latitude': position.latitude,
        'longitude': position.longitude,
        'accuracy': position.accuracy,
        'altitude': position.altitude,
        'bearing': position.heading,
        'speed': position.speed,
        'battery_level': battery,
        'last_update': DateTime.now().toIso8601String(),
        'is_active': true,
      }, onConflict: 'mission_id,user_id');
      
      // Broadcast via Realtime pour fluidité
      await supabase.channel('mission:$missionId:gps').sendBroadcastMessage(
        event: 'position_update',
        payload: {
          'user_id': userId,
          'latitude': position.latitude,
          'longitude': position.longitude,
          'speed': position.speed,
          'bearing': position.heading,
          'timestamp': DateTime.now().toIso8601String(),
        },
      );
      
      // Mettre à jour notification
      if (service is AndroidServiceInstance) {
        service.setForegroundNotificationInfo(
          title: 'GPS Tracking Actif',
          content: '${position.latitude.toStringAsFixed(6)}, ${position.longitude.toStringAsFixed(6)}\\n'
                  'Vitesse: ${(position.speed * 3.6).toStringAsFixed(1)} km/h',
        );
      }
      
      print('📍 Position updated: ${position.latitude}, ${position.longitude}');
    } catch (e) {
      print('❌ Erreur update location: $e');
    }
  }
  
  static Future<void> _snapshotHistory(ServiceInstance service) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final missionId = prefs.getString('tracking_mission_id');
      if (missionId == null) return;
      
      final position = await Geolocator.getCurrentPosition();
      final supabase = Supabase.instance.client;
      final userId = supabase.auth.currentUser?.id;
      
      // Insérer snapshot dans historique
      await supabase.from('mission_tracking_history').insert({
        'mission_id': missionId,
        'user_id': userId,
        'latitude': position.latitude,
        'longitude': position.longitude,
        'accuracy': position.accuracy,
        'speed': position.speed,
        'bearing': position.heading,
        'recorded_at': DateTime.now().toIso8601String(),
      });
      
      print('📸 History snapshot saved');
    } catch (e) {
      print('❌ Erreur snapshot history: $e');
    }
  }
  
  // Démarrer le tracking
  static Future<bool> start(String missionId) async {
    try {
      // Vérifier permissions
      final permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        return false;
      }
      
      // Sauvegarder mission ID
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('tracking_mission_id', missionId);
      
      // Démarrer service
      final service = FlutterBackgroundService();
      await service.startService();
      
      print('✅ Background tracking démarré pour mission: $missionId');
      return true;
    } catch (e) {
      print('❌ Erreur start tracking: $e');
      return false;
    }
  }
  
  // Arrêter le tracking
  static Future<void> stop() async {
    try {
      final service = FlutterBackgroundService();
      service.invoke('stopService');
      
      // Nettoyer préférences
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('tracking_mission_id');
      
      print('⏹️ Background tracking arrêté');
    } catch (e) {
      print('❌ Erreur stop tracking: $e');
    }
  }
  
  // Vérifier si actif
  static Future<bool> isRunning() async {
    final service = FlutterBackgroundService();
    return await service.isRunning();
  }
}
```

### Dépendances `pubspec.yaml`

```yaml
dependencies:
  flutter_background_service: ^5.0.0
  flutter_background_service_android: ^6.0.0
  flutter_local_notifications: ^17.0.0
  geolocator: ^10.1.0
  supabase_flutter: ^2.0.0
  battery_plus: ^5.0.0
  shared_preferences: ^2.2.2
```

---

## 🌐 Page Web Publique de Tracking

### Fichier: `src/pages/PublicTracking.tsx`

```typescript
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import { Icon, LatLngExpression } from 'leaflet';
import { Navigation, Clock, Zap, MapPin, Activity } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

interface Position {
  latitude: number;
  longitude: number;
  speed: number;
  bearing: number;
  timestamp: string;
}

interface Mission {
  id: string;
  reference: string;
  pickup_address: string;
  delivery_address: string;
  pickup_lat: number;
  pickup_lng: number;
  delivery_lat: number;
  delivery_lng: number;
  vehicle_brand: string;
  vehicle_model: string;
  vehicle_plate: string;
  status: string;
}

// Icône personnalisée pour le chauffeur
const driverIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const pickupIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const deliveryIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Composant pour centrer automatiquement la carte
function AutoCenterMap({ position }: { position: [number, number] }) {
  const map = useMap();
  
  useEffect(() => {
    if (position) {
      map.flyTo(position, 13, { duration: 1 });
    }
  }, [position, map]);
  
  return null;
}

export default function PublicTracking() {
  const { token } = useParams<{ token: string }>();
  
  const [mission, setMission] = useState<Mission | null>(null);
  const [currentPosition, setCurrentPosition] = useState<Position | null>(null);
  const [history, setHistory] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isLive, setIsLive] = useState(false);
  
  const channelRef = useRef<any>(null);
  
  // Charger les données initiales
  useEffect(() => {
    loadTrackingData();
  }, [token]);
  
  // S'abonner aux updates temps réel
  useEffect(() => {
    if (!mission) return;
    
    subscribeToRealtime();
    
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, [mission]);
  
  async function loadTrackingData() {
    try {
      setLoading(true);
      
      // 1. Vérifier le token et récupérer mission_id
      const { data: linkData, error: linkError } = await supabase
        .from('public_tracking_links')
        .select('mission_id, access_count, max_accesses')
        .eq('token', token)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .single();
      
      if (linkError || !linkData) {
        setError('Lien de tracking invalide ou expiré');
        setLoading(false);
        return;
      }
      
      // Rate limiting check
      if (linkData.access_count >= linkData.max_accesses) {
        setError('Ce lien a atteint sa limite d\\'accès');
        setLoading(false);
        return;
      }
      
      // Incrémenter compteur d'accès
      await supabase
        .from('public_tracking_links')
        .update({ 
          access_count: linkData.access_count + 1,
          last_accessed_at: new Date().toISOString()
        })
        .eq('token', token);
      
      // 2. Charger mission
      const { data: missionData, error: missionError } = await supabase
        .from('missions')
        .select('*')
        .eq('id', linkData.mission_id)
        .single();
      
      if (missionError || !missionData) {
        setError('Mission introuvable');
        setLoading(false);
        return;
      }
      
      setMission(missionData);
      
      // 3. Charger position actuelle
      const { data: liveData, error: liveError } = await supabase
        .from('mission_tracking_live')
        .select('*')
        .eq('mission_id', linkData.mission_id)
        .eq('is_active', true)
        .single();
      
      if (liveData) {
        setCurrentPosition({
          latitude: liveData.latitude,
          longitude: liveData.longitude,
          speed: liveData.speed || 0,
          bearing: liveData.bearing || 0,
          timestamp: liveData.last_update,
        });
        setLastUpdate(new Date(liveData.last_update));
        
        // Vérifier si actif (moins de 5 min)
        const updateAge = Date.now() - new Date(liveData.last_update).getTime();
        setIsLive(updateAge < 5 * 60 * 1000);
      }
      
      // 4. Charger historique
      const { data: historyData } = await supabase
        .from('mission_tracking_history')
        .select('latitude, longitude, speed, bearing, recorded_at')
        .eq('mission_id', linkData.mission_id)
        .order('recorded_at', { ascending: true })
        .limit(500);
      
      if (historyData) {
        setHistory(historyData.map(h => ({
          latitude: h.latitude,
          longitude: h.longitude,
          speed: h.speed || 0,
          bearing: h.bearing || 0,
          timestamp: h.recorded_at,
        })));
      }
      
      setLoading(false);
    } catch (err: any) {
      console.error('Erreur chargement tracking:', err);
      setError(err.message);
      setLoading(false);
    }
  }
  
  function subscribeToRealtime() {
    if (!mission) return;
    
    console.log('🔔 Abonnement Realtime:', mission.id);
    
    channelRef.current = supabase
      .channel(`mission:${mission.id}:gps`)
      .on('broadcast', { event: 'position_update' }, (payload: any) => {
        console.log('📍 Position update reçue:', payload);
        
        const newPosition: Position = {
          latitude: payload.payload.latitude,
          longitude: payload.payload.longitude,
          speed: payload.payload.speed || 0,
          bearing: payload.payload.bearing || 0,
          timestamp: payload.payload.timestamp,
        };
        
        setCurrentPosition(newPosition);
        setLastUpdate(new Date());
        setIsLive(true);
        
        // Ajouter à l'historique
        setHistory(prev => [...prev, newPosition].slice(-500));
      })
      .subscribe((status) => {
        console.log('📡 Realtime status:', status);
      });
  }
  
  // Calculer distance restante
  function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
  
  // Calculer ETA
  function calculateETA(): string {
    if (!currentPosition || !mission || currentPosition.speed === 0) {
      return 'Calcul en cours...';
    }
    
    const distanceKm = calculateDistance(
      currentPosition.latitude,
      currentPosition.longitude,
      mission.delivery_lat,
      mission.delivery_lng
    );
    
    const speedKmh = currentPosition.speed * 3.6;
    if (speedKmh < 5) return 'Arrêté';
    
    const hoursRemaining = distanceKm / speedKmh;
    const minutesRemaining = Math.round(hoursRemaining * 60);
    
    if (minutesRemaining < 60) {
      return `${minutesRemaining} min`;
    } else {
      const hours = Math.floor(minutesRemaining / 60);
      const minutes = minutesRemaining % 60;
      return `${hours}h${minutes}min`;
    }
  }
  
  if (loading) {
    return (
      <div className=\"min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-blue-50\">
        <div className=\"text-center\">
          <Activity className=\"w-16 h-16 text-teal-600 animate-spin mx-auto mb-4\" />
          <p className=\"text-xl text-slate-700\">Chargement du suivi GPS...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className=\"min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50\">
        <div className=\"text-center max-w-md p-8\">
          <div className=\"w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4\">
            <MapPin className=\"w-10 h-10 text-red-600\" />
          </div>
          <h2 className=\"text-2xl font-bold text-slate-900 mb-2\">Erreur de tracking</h2>
          <p className=\"text-slate-600\">{error}</p>
        </div>
      </div>
    );
  }
  
  if (!mission || !currentPosition) {
    return (
      <div className=\"min-h-screen flex items-center justify-center\">
        <p>Aucune position disponible</p>
      </div>
    );
  }
  
  // Coordonnées pour la carte
  const currentPos: [number, number] = [currentPosition.latitude, currentPosition.longitude];
  const pickupPos: [number, number] = [mission.pickup_lat, mission.pickup_lng];
  const deliveryPos: [number, number] = [mission.delivery_lat, mission.delivery_lng];
  
  // Trajet (historique + position actuelle)
  const routeCoords: LatLngExpression[] = [
    ...history.map(h => [h.latitude, h.longitude] as LatLngExpression),
    currentPos,
  ];
  
  const distanceRemaining = calculateDistance(
    currentPosition.latitude,
    currentPosition.longitude,
    mission.delivery_lat,
    mission.delivery_lng
  );
  
  return (
    <div className=\"min-h-screen bg-slate-50\">
      {/* Header */}
      <div className=\"bg-gradient-to-r from-teal-600 to-blue-600 text-white p-6 shadow-lg\">
        <div className=\"max-w-7xl mx-auto\">
          <div className=\"flex items-center justify-between\">
            <div>
              <h1 className=\"text-3xl font-black mb-2\">
                Suivi GPS en Temps Réel
              </h1>
              <p className=\"text-teal-100\">
                Mission: <span className=\"font-bold\">{mission.reference}</span>
              </p>
            </div>
            <div className=\"flex items-center gap-3\">
              {isLive ? (
                <div className=\"flex items-center gap-2 bg-green-500 px-4 py-2 rounded-full\">
                  <div className=\"w-3 h-3 bg-white rounded-full animate-pulse\" />
                  <span className=\"font-bold\">EN DIRECT</span>
                </div>
              ) : (
                <div className=\"bg-gray-500 px-4 py-2 rounded-full\">
                  <span className=\"font-bold\">Hors ligne</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className=\"max-w-7xl mx-auto px-6 py-6\">
        <div className=\"grid grid-cols-1 md:grid-cols-4 gap-4 mb-6\">
          <div className=\"bg-white rounded-xl p-4 shadow-md\">
            <div className=\"flex items-center gap-3\">
              <div className=\"w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center\">
                <Navigation className=\"w-6 h-6 text-blue-600\" />
              </div>
              <div>
                <p className=\"text-sm text-slate-600\">Distance restante</p>
                <p className=\"text-2xl font-black text-slate-900\">
                  {distanceRemaining.toFixed(1)} km
                </p>
              </div>
            </div>
          </div>
          
          <div className=\"bg-white rounded-xl p-4 shadow-md\">
            <div className=\"flex items-center gap-3\">
              <div className=\"w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center\">
                <Zap className=\"w-6 h-6 text-teal-600\" />
              </div>
              <div>
                <p className=\"text-sm text-slate-600\">Vitesse actuelle</p>
                <p className=\"text-2xl font-black text-slate-900\">
                  {(currentPosition.speed * 3.6).toFixed(0)} km/h
                </p>
              </div>
            </div>
          </div>
          
          <div className=\"bg-white rounded-xl p-4 shadow-md\">
            <div className=\"flex items-center gap-3\">
              <div className=\"w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center\">
                <Clock className=\"w-6 h-6 text-purple-600\" />
              </div>
              <div>
                <p className=\"text-sm text-slate-600\">Arrivée estimée</p>
                <p className=\"text-2xl font-black text-slate-900\">
                  {calculateETA()}
                </p>
              </div>
            </div>
          </div>
          
          <div className=\"bg-white rounded-xl p-4 shadow-md\">
            <div className=\"flex items-center gap-3\">
              <div className=\"w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center\">
                <Activity className=\"w-6 h-6 text-amber-600\" />
              </div>
              <div>
                <p className=\"text-sm text-slate-600\">Dernière mise à jour</p>
                <p className=\"text-lg font-bold text-slate-900\">
                  {lastUpdate ? new Date(lastUpdate).toLocaleTimeString('fr-FR') : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Carte */}
        <div className=\"bg-white rounded-2xl shadow-xl overflow-hidden\">
          <MapContainer
            center={currentPos}
            zoom={13}
            style={{ height: '600px', width: '100%' }}
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a>'
              url=\"https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png\"
            />
            
            <AutoCenterMap position={currentPos} />
            
            {/* Marker départ */}
            <Marker position={pickupPos} icon={pickupIcon}>
              <Popup>
                <div>
                  <p className=\"font-bold\">🟢 Départ</p>
                  <p className=\"text-sm\">{mission.pickup_address}</p>
                </div>
              </Popup>
            </Marker>
            
            {/* Marker arrivée */}
            <Marker position={deliveryPos} icon={deliveryIcon}>
              <Popup>
                <div>
                  <p className=\"font-bold\">🔴 Arrivée</p>
                  <p className=\"text-sm\">{mission.delivery_address}</p>
                </div>
              </Popup>
            </Marker>
            
            {/* Marker position actuelle */}
            <Marker position={currentPos} icon={driverIcon}>
              <Popup>
                <div>
                  <p className=\"font-bold\">🚗 Chauffeur</p>
                  <p className=\"text-sm\">
                    {mission.vehicle_brand} {mission.vehicle_model}
                  </p>
                  <p className=\"text-xs text-gray-600\">{mission.vehicle_plate}</p>
                  <p className=\"text-sm mt-2\">
                    Vitesse: {(currentPosition.speed * 3.6).toFixed(0)} km/h
                  </p>
                </div>
              </Popup>
            </Marker>
            
            {/* Ligne du trajet */}
            {routeCoords.length > 1 && (
              <Polyline
                positions={routeCoords}
                color=\"#0ea5e9\"
                weight={4}
                opacity={0.7}
              />
            )}
          </MapContainer>
        </div>
        
        {/* Infos mission */}
        <div className=\"mt-6 bg-white rounded-xl p-6 shadow-md\">
          <h3 className=\"text-xl font-black text-slate-900 mb-4\">
            Informations de la mission
          </h3>
          <div className=\"grid grid-cols-1 md:grid-cols-2 gap-4\">
            <div>
              <p className=\"text-sm text-slate-600 mb-1\">Véhicule</p>
              <p className=\"font-bold text-slate-900\">
                {mission.vehicle_brand} {mission.vehicle_model} - {mission.vehicle_plate}
              </p>
            </div>
            <div>
              <p className=\"text-sm text-slate-600 mb-1\">Statut</p>
              <p className=\"font-bold text-slate-900 capitalize\">{mission.status}</p>
            </div>
            <div>
              <p className=\"text-sm text-slate-600 mb-1\">Départ</p>
              <p className=\"text-slate-900\">{mission.pickup_address}</p>
            </div>
            <div>
              <p className=\"text-sm text-slate-600 mb-1\">Arrivée</p>
              <p className=\"text-slate-900\">{mission.delivery_address}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className=\"max-w-7xl mx-auto px-6 py-8 text-center text-slate-500 text-sm\">
        <p>Suivi GPS fourni par ChecksFleet</p>
        <p className=\"mt-1\">Ce lien expirera automatiquement 48h après la fin de la mission</p>
      </div>
    </div>
  );
}
```

### Route dans `App.tsx`

```typescript
import PublicTracking from './pages/PublicTracking';

// Dans les routes
<Route path=\"/track/:token\" element={<PublicTracking />} />
```

### Dépendances NPM

```bash
npm install react-leaflet leaflet @types/leaflet lucide-react
```

---

## 📤 Partage du Lien de Tracking

### Dans l'app mobile - Bouton partage

```dart
// lib/widgets/tracking_share_button.dart

import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class TrackingShareButton extends StatefulWidget {
  final String missionId;
  
  const TrackingShareButton({super.key, required this.missionId});
  
  @override
  State<TrackingShareButton> createState() => _TrackingShareButtonState();
}

class _TrackingShareButtonState extends State<TrackingShareButton> {
  final _supabase = Supabase.instance.client;
  bool _loading = false;
  
  Future<void> _shareTrackingLink() async {
    setState(() => _loading = true);
    
    try {
      // Générer lien public
      final response = await _supabase
          .rpc('generate_public_tracking_link', params: {
        'p_mission_id': widget.missionId,
      });
      
      final token = response as String;
      final trackingUrl = 'https://app.finality.com/track/$token';
      
      // Partager
      await Share.share(
        'Suivez votre véhicule en temps réel :\\n\\n'
        '$trackingUrl\\n\\n'
        'Ce lien est sécurisé et expirera automatiquement.',
        subject: 'Suivi GPS de votre véhicule',
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erreur: ${e.toString()}')),
      );
    } finally {
      setState(() => _loading = false);
    }
  }
  
  @override
  Widget build(BuildContext context) {
    return ElevatedButton.icon(
      onPressed: _loading ? null : _shareTrackingLink,
      icon: _loading
          ? const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          : const Icon(Icons.share),
      label: const Text('Partager lien GPS'),
      style: ElevatedButton.styleFrom(
        backgroundColor: Colors.teal,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      ),
    );
  }
}
```

---

## ⚡ Optimisations & Performance

### 1. Gestion intelligente de la batterie

```dart
// Adapter la fréquence selon niveau batterie (stratégie fluide)
int getUpdateInterval(int batteryLevel, double speed) {
  // Si en mouvement (speed > 1 m/s ~3.6 km/h), tracking plus fréquent
  bool isMoving = speed > 1.0;
  
  if (batteryLevel > 50) {
    return isMoving ? 3 : 5; // 3s en mouvement, 5s à l'arrêt
  } else if (batteryLevel > 20) {
    return isMoving ? 5 : 10; // 5s en mouvement, 10s à l'arrêt
  } else {
    return isMoving ? 10 : 30; // 10s en mouvement, 30s à l'arrêt
  }
}

// Adapter précision GPS
LocationAccuracy getAccuracy(int batteryLevel) {
  if (batteryLevel > 30) {
    return LocationAccuracy.high;
  } else {
    return LocationAccuracy.medium;
  }
}
```

### 2. Cache offline + sync

```dart
// Sauvegarder en local si offline
final box = await Hive.openBox('tracking_queue');

if (await ConnectivityService().isOnline) {
  await _sendToSupabase(position);
} else {
  // Stocker en local
  await box.add({
    'latitude': position.latitude,
    'longitude': position.longitude,
    'timestamp': DateTime.now().toIso8601String(),
  });
}

// Sync quand connexion revient
void onConnectionRestored() async {
  final pendingPositions = box.values.toList();
  for (final pos in pendingPositions) {
    await _sendToSupabase(pos);
  }
  await box.clear();
}
```

### 3. Compression des données

```dart
// N'envoyer que si déplacement significatif
Position? lastSentPosition;

bool shouldSendUpdate(Position newPosition) {
  if (lastSentPosition == null) return true;
  
  final distance = Geolocator.distanceBetween(
    lastSentPosition!.latitude,
    lastSentPosition!.longitude,
    newPosition.latitude,
    newPosition.longitude,
  );
  
  // Envoyer uniquement si déplacement > 10m
  return distance > 10;
}
```

### 4. Nettoyage automatique

```sql
-- Fonction PostgreSQL - nettoyage automatique quotidien
CREATE OR REPLACE FUNCTION daily_cleanup_tracking()
RETURNS void AS $$
BEGIN
  -- Supprimer historique > 7 jours
  DELETE FROM mission_tracking_history
  WHERE recorded_at < NOW() - INTERVAL '7 days';
  
  -- Désactiver tracking inactif > 2h
  UPDATE mission_tracking_live
  SET is_active = false
  WHERE last_update < NOW() - INTERVAL '2 hours'
  AND is_active = true;
  
  -- Désactiver liens expirés
  UPDATE public_tracking_links
  SET is_active = false
  WHERE expires_at < NOW()
  AND is_active = true;
  
  RAISE NOTICE 'Cleanup terminé';
END;
$$ LANGUAGE plpgsql;

-- Planifier avec pg_cron (extension)
SELECT cron.schedule('daily-tracking-cleanup', '0 3 * * *', 'SELECT daily_cleanup_tracking()');
```

---

## 🔐 Sécurité

### 1. Rate Limiting

```typescript
// Edge Function Supabase
export async function handler(req: Request) {
  const token = req.url.split('/').pop();
  
  // Vérifier rate limit
  const {data, error} = await supabaseAdmin
    .from('public_tracking_links')
    .select('access_count, max_accesses, last_accessed_at')
    .eq('token', token)
    .single();
  
  if (data) {
    // Max 100 requêtes/heure
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (data.last_accessed_at > hourAgo && data.access_count > 100) {
      return new Response('Rate limit exceeded', {status: 429});
    }
  }
  
  // Continue...
}
```

### 2. Validation des données GPS

```dart
bool isValidGPSData(Position position) {
  // Vérifier cohérence
  if (position.latitude < -90 || position.latitude > 90) return false;
  if (position.longitude < -180 || position.longitude > 180) return false;
  if (position.accuracy > 1000) return false; // Précision < 1km
  if (position.speed < 0 || position.speed > 70) return false; // < 250 km/h
  
  return true;
}
```

### 3. Obfuscation des infos sensibles

```typescript
// Ne pas exposer user_id, email, etc. dans l'API publique
const publicMissionData = {
  reference: mission.reference,
  vehicle_brand: mission.vehicle_brand,
  vehicle_model: mission.vehicle_model,
  vehicle_plate: mission.vehicle_plate,
  // PAS d'infos client, chauffeur, prix...
};
```

---

## 📊 Monitoring & Analytics

### 1. Métriques de performance

```sql
-- Vue pour monitoring
CREATE OR REPLACE VIEW tracking_performance_stats AS
SELECT
  COUNT(DISTINCT mission_id) as active_missions,
  AVG(EXTRACT(EPOCH FROM (NOW() - last_update))) as avg_delay_seconds,
  COUNT(*) FILTER (WHERE last_update > NOW() - INTERVAL '1 minute') as positions_last_minute,
  AVG(battery_level) as avg_battery_level
FROM mission_tracking_live
WHERE is_active = true;
```

### 2. Alertes

```dart
// Alerter si GPS inactif > 10 min
void checkTrackingHealth() {
  final lastUpdate = await getLastTrackingUpdate();
  final delay = DateTime.now().difference(lastUpdate);
  
  if (delay.inMinutes > 10) {
    // Envoyer notification push admin
    sendAdminAlert('⚠️ GPS tracking inactif depuis ${delay.inMinutes} min');
  }
}
```

---

## 📦 Checklist d'Implémentation

### Phase 1: Backend (1-2 jours)
- [ ] Créer tables SQL optimisées
- [ ] Implémenter génération liens publics
- [ ] Configurer policies RLS
- [ ] Créer fonctions de nettoyage auto
- [ ] Tester Realtime channels

### Phase 2: Mobile (2-3 jours)
- [ ] Implémenter service background
- [ ] Configurer notifications persistantes
- [ ] Ajouter optimisations batterie
- [ ] Implémenter cache offline
- [ ] Tester tracking longue durée
- [ ] Ajouter bouton partage lien

### Phase 3: Web (2 jours)
- [ ] Créer page publique tracking
- [ ] Intégrer Leaflet maps
- [ ] Implémenter Realtime subscription
- [ ] Design responsive mobile
- [ ] Optimiser performance carte
- [ ] Tester avec données réelles

### Phase 4: Tests & Optimisation (1 jour)
- [ ] Tests en conditions réelles
- [ ] Monitoring batterie mobile
- [ ] Tester latence Realtime
- [ ] Vérifier nettoyage automatique
- [ ] Tests sécurité (rate limiting)

### Phase 5: Documentation & Formation (1 jour)
- [ ] Guide utilisateur chauffeur
- [ ] Guide client (lien public)
- [ ] Documentation technique
- [ ] Formation équipe support

---

## 🎯 Résultat Final

### Pour le Chauffeur
- ✅ Tracking GPS automatique en arrière-plan
- ✅ Notification discrète "GPS actif"
- ✅ Pas d'action manuelle requise
- ✅ Optimisation batterie intelligente
- ✅ Fonctionnement même sans réseau temporairement

### Pour le Client
- ✅ Lien public accessible sans compte
- ✅ Carte interactive temps réel
- ✅ ETA automatique et précis
- ✅ Historique du trajet
- ✅ Interface mobile-friendly
- ✅ Pas d'installation requise

### Pour l'Admin
- ✅ Vue globale de toutes les missions actives
- ✅ Alertes si tracking inactif
- ✅ Historique conservé 7 jours
- ✅ Monitoring performance
- ✅ Gestion centralisée

---

## 💰 Coûts & Technologies

### Technologies Utilisées
- **Flutter**: App mobile (gratuit)
- **Supabase**: Backend + Realtime (gratuit jusqu'à 500MB)
- **Leaflet**: Cartes web (100% gratuit, open-source)
- **OpenStreetMap**: Tuiles de carte (gratuit)

### Coûts Estimés
- **0€/mois** pour < 100 missions/jour
- **~25€/mois** Supabase Pro si > 500MB données
- **Pas de coût Google Maps** (Leaflet = gratuit)

---

## 🚀 Prêt à Implémenter?

Cette architecture professionnelle vous garantit:
- ⚡ **Performance**: Updates fluides < 500ms latence
- 🔋 **Autonomie**: Optimisations batterie intelligentes
- 📡 **Fiabilité**: Fonctionne même offline temporairement
- 🔒 **Sécurité**: Liens publics sécurisés avec expiration
- 💰 **Économique**: 100% open-source, pas de coûts cachés

Tu veux que je commence par quelle phase?
