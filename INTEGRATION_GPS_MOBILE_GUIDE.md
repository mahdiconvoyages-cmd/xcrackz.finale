# 📱 Guide d'intégration GPS Mobile → Web

## 🎯 Objectif
Envoyer les positions GPS depuis l'application mobile vers la page PublicTracking web en temps réel.

## 🔧 Étapes d'intégration

### 1️⃣ Installation des dépendances

```bash
npm install @react-native-community/geolocation
```

### 2️⃣ Configuration iOS (ios/Podfile)

Ajouter dans `Info.plist`:
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Nous avons besoin de votre position pour suivre votre trajet</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>Nous avons besoin de votre position pour suivre votre trajet en arrière-plan</string>
```

Puis:
```bash
cd ios && pod install && cd ..
```

### 3️⃣ Configuration Android (android/app/src/main/AndroidManifest.xml)

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

### 4️⃣ Créer le service GPS (src/services/gpsTracking.ts)

```typescript
import { Platform, PermissionsAndroid } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { supabase } from './supabaseClient';

interface GPSPosition {
  lat: number;
  lng: number;
  speed: number; // km/h
  bearing?: number;
  accuracy?: number;
  timestamp: string;
}

let watchId: number | null = null;

// Demander permissions
export const requestLocationPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Permission de localisation',
          message: "L'application a besoin d'accéder à votre position GPS",
          buttonNeutral: 'Plus tard',
          buttonNegative: 'Refuser',
          buttonPositive: 'Autoriser',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.error('Permission error:', err);
      return false;
    }
  }
  return true; // iOS demande automatiquement
};

// Envoyer position au serveur
const sendGPSUpdate = async (missionId: string, position: GPSPosition) => {
  try {
    const channel = supabase.channel(`mission:${missionId}:gps`);
    
    await channel.send({
      type: 'broadcast',
      event: 'gps_update',
      payload: position
    });
    
    console.log('📡 GPS envoyé:', position);
  } catch (error) {
    console.error('Erreur envoi GPS:', error);
  }
};

// Démarrer le tracking
export const startGPSTracking = async (missionId: string): Promise<boolean> => {
  // Vérifier permissions
  const hasPermission = await requestLocationPermission();
  if (!hasPermission) {
    console.error('❌ Permission GPS refusée');
    return false;
  }

  // Arrêter tracking précédent si existant
  if (watchId !== null) {
    stopGPSTracking();
  }

  console.log('🚀 Démarrage tracking GPS pour mission:', missionId);

  // Démarrer watchPosition
  watchId = Geolocation.watchPosition(
    (position) => {
      const gpsData: GPSPosition = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        speed: position.coords.speed ? position.coords.speed * 3.6 : 0, // m/s → km/h
        bearing: position.coords.heading || undefined,
        accuracy: position.coords.accuracy,
        timestamp: new Date().toISOString()
      };

      sendGPSUpdate(missionId, gpsData);
    },
    (error) => {
      console.error('❌ Erreur GPS:', error.code, error.message);
    },
    {
      enableHighAccuracy: true,    // Utiliser GPS (pas WiFi/Cell)
      distanceFilter: 10,           // Mise à jour tous les 10 mètres
      interval: 5000,               // ou toutes les 5 secondes
      fastestInterval: 3000,        // Min 3 secondes entre updates
      showLocationDialog: true      // Demander activer GPS si désactivé
    }
  );

  return true;
};

// Arrêter le tracking
export const stopGPSTracking = () => {
  if (watchId !== null) {
    Geolocation.clearWatch(watchId);
    watchId = null;
    console.log('⏹️ Tracking GPS arrêté');
  }
};

// Obtenir position actuelle (one-shot)
export const getCurrentPosition = (): Promise<GPSPosition> => {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          speed: position.coords.speed ? position.coords.speed * 3.6 : 0,
          bearing: position.coords.heading || undefined,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString()
        });
      },
      (error) => reject(error),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  });
};
```

### 5️⃣ Utiliser dans l'écran Mission Active

```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { startGPSTracking, stopGPSTracking } from '../services/gpsTracking';

interface ActiveMissionScreenProps {
  mission: {
    id: string;
    status: 'pending' | 'in_progress' | 'completed';
    reference: string;
    // ... autres champs
  };
}

export default function ActiveMissionScreen({ mission }: ActiveMissionScreenProps) {
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    // Démarrer GPS quand mission en cours
    if (mission.status === 'in_progress' && !isTracking) {
      startTracking();
    }

    // Arrêter GPS quand mission terminée
    if (mission.status !== 'in_progress' && isTracking) {
      stopTracking();
    }

    // Cleanup à la fermeture
    return () => {
      if (isTracking) {
        stopTracking();
      }
    };
  }, [mission.status]);

  const startTracking = async () => {
    const success = await startGPSTracking(mission.id);
    if (success) {
      setIsTracking(true);
      Alert.alert('✅ GPS activé', 'Votre position est maintenant partagée en temps réel');
    } else {
      Alert.alert('❌ Erreur', 'Impossible de démarrer le GPS. Vérifiez les permissions.');
    }
  };

  const stopTracking = () => {
    stopGPSTracking();
    setIsTracking(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mission {mission.reference}</Text>
      
      {isTracking && (
        <View style={styles.trackingBadge}>
          <View style={styles.pulseDot} />
          <Text style={styles.trackingText}>📡 Position partagée en temps réel</Text>
        </View>
      )}

      {/* Reste de votre UI */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20
  },
  trackingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'white',
    marginRight: 8
  },
  trackingText: {
    color: 'white',
    fontWeight: 'bold'
  }
});
```

### 6️⃣ Bonus: Tracking en arrière-plan (optionnel)

Pour continuer le tracking même quand app en arrière-plan:

```bash
npm install react-native-background-geolocation
```

Puis configurer selon [documentation officielle](https://github.com/transistorsoft/react-native-background-geolocation).

## ✅ Test de l'intégration

### Test 1: Permissions
1. Lancer l'app mobile
2. Commencer une mission
3. Vérifier: Alert demande permission GPS
4. Accepter
5. Vérifier: Badge "📡 Position partagée" s'affiche

### Test 2: Envoi GPS
1. Ouvrir console React Native: `npx react-native log-android` ou `log-ios`
2. Vérifier logs: `📡 GPS envoyé: { lat: X, lng: Y, speed: Z }`
3. Se déplacer de 10+ mètres
4. Vérifier: Nouvelle position envoyée

### Test 3: Réception Web
1. Ouvrir page PublicTracking sur navigateur
2. Ouvrir console DevTools (F12)
3. Sélectionner la mission en cours
4. Vérifier logs: `🚗 GPS update received: { lat: X, lng: Y, speed: Z }`
5. Vérifier: Panneau stats s'affiche avec vitesse/ETA
6. Vérifier: Marqueur chauffeur apparaît et bouge sur carte

### Test 4: Performance
1. Laisser tourner 5 minutes
2. Vérifier: Pas de crash
3. Vérifier: Battery drain acceptable (< 10%/h)
4. Vérifier: Data usage minimal (< 1MB/h)

## 🐛 Problèmes courants

### "Permission denied" sur Android
**Solution:** Vérifier `AndroidManifest.xml` contient les permissions. Redémarrer app.

### "Location services disabled"
**Solution:** Demander utilisateur activer GPS dans paramètres système.

### Positions GPS imprécises
**Solution:** 
- Vérifier `enableHighAccuracy: true`
- Tester en extérieur (pas en intérieur)
- Attendre 30s pour fix GPS

### Aucune position reçue sur web
**Solutions:**
1. Vérifier console mobile: GPS envoyé ?
2. Vérifier console web: GPS reçu ?
3. Vérifier Supabase Realtime activé
4. Vérifier format `mission:${id}:gps` correct

### Battery drain élevé
**Solutions:**
- Augmenter `interval` à 10000 (10s)
- Augmenter `distanceFilter` à 50m
- Utiliser tracking arrière-plan optimisé

## 📊 Métriques attendues

| Métrique | Valeur attendue |
|----------|-----------------|
| Précision GPS | 5-15 mètres |
| Fréquence updates | 1 update/5-10s |
| Latence web | < 500ms |
| Battery drain | 5-10%/heure |
| Data usage | 0.5-1 MB/heure |

## 🎉 Résultat final

Une fois intégré, l'utilisateur pourra:
1. 📱 Ouvrir l'app mobile et démarrer mission
2. 🚗 GPS commence à envoyer position automatiquement
3. 💻 Ouvrir PublicTracking sur navigateur
4. 👀 Voir en temps réel:
   - Vitesse actuelle du chauffeur
   - Distance restante
   - Temps d'arrivée estimé
   - Marqueur animé sur carte
5. 🎯 Recevoir notification quand chauffeur arrive

**L'intégration est simple et ne prend que 30 minutes!** ⚡
