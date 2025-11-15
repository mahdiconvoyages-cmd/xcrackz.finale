import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Truck, Navigation, Maximize2, Route, Loader2 } from 'lucide-react';

// Fix pour les icônes Leaflet par défaut
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LeafletTrackingProps {
  pickupLat: number;
  pickupLng: number;
  pickupAddress: string;
  deliveryLat: number;
  deliveryLng: number;
  deliveryAddress: string;
  driverLat?: number;
  driverLng?: number;
  driverName?: string;
  vehiclePlate?: string;
  status?: string;
  showControls?: boolean;
  height?: string;
  gpsPath?: [number, number][]; // Nouveau: tableau de coordonnées GPS réelles
}

export default function LeafletTracking({
  pickupLat,
  pickupLng,
  pickupAddress,
  deliveryLat,
  deliveryLng,
  deliveryAddress,
  driverLat,
  driverLng,
  driverName = 'Chauffeur',
  vehiclePlate,
  status = 'En cours',
  showControls = true,
  height = '500px',
  gpsPath,
}: LeafletTrackingProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const pickupMarkerRef = useRef<L.Marker | null>(null);
  const deliveryMarkerRef = useRef<L.Marker | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const gpsTrailRef = useRef<L.Polyline | null>(null);
  const futureRouteRef = useRef<L.Polyline | null>(null);

  // États pour le tracé GPS
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number } | null>(null);
  const [osrmRoute, setOsrmRoute] = useState<[number, number][]>([]);

  // Gestion du fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      // Fullscreen state change handled
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Ensure the container is ready before initializing
    if (!mapRef.current) {
      try {
        // Créer la carte
        mapRef.current = L.map(mapContainerRef.current, {
          center: [pickupLat, pickupLng],
          zoom: 13,
          zoomControl: showControls,
          scrollWheelZoom: true,
        });

        // Ajouter les tuiles OpenStreetMap (GRATUIT)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(mapRef.current);
      } catch (error) {
        console.error('Error initializing map:', error);
        return;
      }
    }

    // Créer les icônes personnalisées
    const pickupIcon = L.divIcon({
      html: `
        <div style="position: relative;">
          <div style="
            background: linear-gradient(135deg, #10b981, #059669);
            width: 40px;
            height: 40px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 3px solid white;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <svg style="transform: rotate(45deg);" width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>
        </div>
      `,
      className: '',
      iconSize: [40, 40],
      iconAnchor: [20, 40],
    });

    const deliveryIcon = L.divIcon({
      html: `
        <div style="position: relative;">
          <div style="
            background: linear-gradient(135deg, #ef4444, #dc2626);
            width: 40px;
            height: 40px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 3px solid white;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <svg style="transform: rotate(45deg);" width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>
        </div>
      `,
      className: '',
      iconSize: [40, 40],
      iconAnchor: [20, 40],
    });

    const driverIcon = L.divIcon({
      html: `
        <div style="position: relative;">
          <!-- Halo pulsant style Uber -->
          <div style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 70px;
            height: 70px;
            background: radial-gradient(circle, rgba(20, 184, 166, 0.4) 0%, transparent 70%);
            border-radius: 50%;
            animation: pulseHalo 2s infinite;
          "></div>
          
          <!-- Marqueur chauffeur -->
          <div style="
            position: relative;
            background: linear-gradient(135deg, #14b8a6, #0d9488);
            width: 50px;
            height: 50px;
            border-radius: 50%;
            border: 4px solid white;
            box-shadow: 0 6px 20px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10;
          ">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
              <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
            </svg>
          </div>
          
          <!-- Point de direction (flèche) -->
          <div style="
            position: absolute;
            top: -8px;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 8px solid transparent;
            border-right: 8px solid transparent;
            border-bottom: 12px solid #14b8a6;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
          "></div>
        </div>
        <style>
          @keyframes pulseHalo {
            0%, 100% { 
              transform: translate(-50%, -50%) scale(1);
              opacity: 0.6;
            }
            50% { 
              transform: translate(-50%, -50%) scale(1.2);
              opacity: 0.3;
            }
          }
        <\/style>
      `,
      className: '',
      iconSize: [70, 70],
      iconAnchor: [35, 35],
    });

    // Ajouter les marqueurs
    pickupMarkerRef.current = L.marker([pickupLat, pickupLng], { icon: pickupIcon })
      .addTo(mapRef.current)
      .bindPopup(`
        <div style="min-width: 200px;">
          <div style="font-weight: bold; color: #10b981; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#10b981">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
            </svg>
            Point de départ
          </div>
          <div style="color: #475569; font-size: 14px;">${pickupAddress}</div>
        </div>
      `);

    deliveryMarkerRef.current = L.marker([deliveryLat, deliveryLng], { icon: deliveryIcon })
      .addTo(mapRef.current)
      .bindPopup(`
        <div style="min-width: 200px;">
          <div style="font-weight: bold; color: #ef4444; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#ef4444">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
            </svg>
            Destination
          </div>
          <div style="color: #475569; font-size: 14px;">${deliveryAddress}</div>
        </div>
      `);

    // Tracer la route (GPS réel ou routing OSRM style Uber)
    const loadRoute = async () => {
      setRouteLoading(true);
      try {
        if (mapRef.current) {
          // Supprimer les anciennes lignes
          if (routeLineRef.current) {
            mapRef.current.removeLayer(routeLineRef.current);
          }
          if (gpsTrailRef.current) {
            mapRef.current.removeLayer(gpsTrailRef.current);
          }
          if (futureRouteRef.current) {
            mapRef.current.removeLayer(futureRouteRef.current);
          }

          // Si on a un chemin GPS réel ET un chauffeur en mouvement
          if (gpsPath && gpsPath.length > 1 && driverLat && driverLng) {
            // TRAJET PARCOURU (vert épais) - Style Uber Eats
            gpsTrailRef.current = L.polyline(gpsPath, {
              color: '#10b981',
              weight: 6,
              opacity: 0.8,
              smoothFactor: 2,
              lineCap: 'round',
              lineJoin: 'round',
            }).addTo(mapRef.current);

            // TRAJET RESTANT (gris pointillé) - Récupérer route OSRM
            try {
              const response = await fetch(
                `https://router.project-osrm.org/route/v1/driving/${driverLng},${driverLat};${deliveryLng},${deliveryLat}?overview=full&geometries=geojson`
              );
              
              if (response.ok) {
                const data = await response.json();
                if (data.routes && data.routes[0]) {
                  const coords = data.routes[0].geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]);
                  setOsrmRoute(coords);
                  
                  // Ligne pointillée pour le futur trajet
                  futureRouteRef.current = L.polyline(coords, {
                    color: '#94a3b8',
                    weight: 4,
                    opacity: 0.5,
                    dashArray: '10, 10',
                    smoothFactor: 2,
                  }).addTo(mapRef.current);

                  // Infos du trajet depuis OSRM
                  const route = data.routes[0];
                  setRouteInfo({
                    distance: route.distance / 1000, // mètres -> km
                    duration: route.duration / 60 // secondes -> minutes
                  });
                }
              } else {
                // Fallback: ligne droite si OSRM fail
                futureRouteRef.current = L.polyline(
                  [[driverLat, driverLng], [deliveryLat, deliveryLng]],
                  {
                    color: '#94a3b8',
                    weight: 4,
                    opacity: 0.5,
                    dashArray: '10, 10',
                  }
                ).addTo(mapRef.current);
              }
            } catch (osrmError) {
              console.warn('OSRM routing failed, using straight line:', osrmError);
              futureRouteRef.current = L.polyline(
                [[driverLat, driverLng], [deliveryLat, deliveryLng]],
                {
                  color: '#94a3b8',
                  weight: 4,
                  opacity: 0.5,
                  dashArray: '10, 10',
                }
              ).addTo(mapRef.current);
            }

            // Calculer distance totale du chemin GPS parcouru
            let totalDistance = 0;
            for (let i = 0; i < gpsPath.length - 1; i++) {
              const [lat1, lng1] = gpsPath[i];
              const [lat2, lng2] = gpsPath[i + 1];
              totalDistance += calculateDistance(lat1, lng1, lat2, lng2);
            }

            // Si pas d'info OSRM, utiliser calcul manuel
            if (!routeInfo) {
              const remainingDistance = calculateDistance(driverLat, driverLng, deliveryLat, deliveryLng);
              setRouteInfo({
                distance: remainingDistance,
                duration: remainingDistance / 60 * 60 // 60 km/h
              });
            }
          } else if (gpsPath && gpsPath.length > 1) {
            // Seulement GPS path sans chauffeur actif
            routeLineRef.current = L.polyline(gpsPath, {
              color: '#14b8a6',
              weight: 5,
              opacity: 0.8,
              smoothFactor: 2,
              lineCap: 'round',
            }).addTo(mapRef.current);

            let totalDistance = 0;
            for (let i = 0; i < gpsPath.length - 1; i++) {
              const [lat1, lng1] = gpsPath[i];
              const [lat2, lng2] = gpsPath[i + 1];
              totalDistance += calculateDistance(lat1, lng1, lat2, lng2);
            }

            setRouteInfo({
              distance: totalDistance,
              duration: totalDistance / 60 * 60
            });
          } else {
            // Pas de GPS path: récupérer route OSRM entre pickup et delivery
            try {
              const response = await fetch(
                `https://router.project-osrm.org/route/v1/driving/${pickupLng},${pickupLat};${deliveryLng},${deliveryLat}?overview=full&geometries=geojson`
              );
              
              if (response.ok) {
                const data = await response.json();
                if (data.routes && data.routes[0]) {
                  const coords = data.routes[0].geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]);
                  
                  routeLineRef.current = L.polyline(coords, {
                    color: '#14b8a6',
                    weight: 5,
                    opacity: 0.7,
                    smoothFactor: 2,
                    lineCap: 'round',
                  }).addTo(mapRef.current);

                  const route = data.routes[0];
                  setRouteInfo({
                    distance: route.distance / 1000,
                    duration: route.duration / 60
                  });
                }
              } else {
                throw new Error('OSRM failed');
              }
            } catch (error) {
              console.warn('OSRM routing failed, using straight line');
              // Fallback ligne droite
              routeLineRef.current = L.polyline(
                [[pickupLat, pickupLng], [deliveryLat, deliveryLng]],
                {
                  color: '#14b8a6',
                  weight: 4,
                  opacity: 0.8,
                  smoothFactor: 1,
                }
              ).addTo(mapRef.current);

              const distance = calculateDistance(pickupLat, pickupLng, deliveryLat, deliveryLng);
              setRouteInfo({
                distance: distance,
                duration: distance / 60 * 60
              });
            }
          }
        }
      } catch (error) {
        console.error('Error loading route:', error);
      } finally {
        setRouteLoading(false);
      }
    };

    // Fonction helper pour calculer distance Haversine
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371; // Rayon de la Terre en km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    };

    loadRoute();

    // Ajouter le marqueur du chauffeur si position disponible
    if (driverLat && driverLng) {
      driverMarkerRef.current = L.marker([driverLat, driverLng], { icon: driverIcon })
        .addTo(mapRef.current)
        .bindPopup(`
          <div style="min-width: 200px;">
            <div style="font-weight: bold; color: #14b8a6; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#14b8a6">
                <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99z"/>
              </svg>
              ${driverName}
            </div>
            ${vehiclePlate ? `<div style="color: #475569; font-size: 13px; margin-bottom: 4px;">🚗 ${vehiclePlate}</div>` : ''}
            <div style="color: #475569; font-size: 13px;">
              <span style="color: #10b981; font-weight: 600;">${status}</span>
            </div>
          </div>
        `);
    }

    // Ajuster la vue pour inclure tous les marqueurs
    const bounds = L.latLngBounds([
      [pickupLat, pickupLng],
      [deliveryLat, deliveryLng],
      ...(driverLat && driverLng ? [L.latLng(driverLat, driverLng)] : []),
    ] as L.LatLngExpression[]);
    mapRef.current.fitBounds(bounds, { padding: [50, 50] });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [
    pickupLat,
    pickupLng,
    deliveryLat,
    deliveryLng,
    pickupAddress,
    deliveryAddress,
    showControls,
    gpsPath,
    driverLat,
    driverLng,
  ]);

  // Mettre à jour la position du chauffeur en temps réel avec animation fluide
  useEffect(() => {
    if (!driverLat || !driverLng || !mapRef.current) return;

    const newDriverIcon = L.divIcon({
      html: `
        <div style="position: relative;">
          <div style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 70px;
            height: 70px;
            background: radial-gradient(circle, rgba(20, 184, 166, 0.4) 0%, transparent 70%);
            border-radius: 50%;
            animation: pulseHalo 2s infinite;
          "></div>
          
          <div style="
            position: relative;
            background: linear-gradient(135deg, #14b8a6, #0d9488);
            width: 50px;
            height: 50px;
            border-radius: 50%;
            border: 4px solid white;
            box-shadow: 0 6px 20px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10;
          ">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
              <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
            </svg>
          </div>
          
          <div style="
            position: absolute;
            top: -8px;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 8px solid transparent;
            border-right: 8px solid transparent;
            border-bottom: 12px solid #14b8a6;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
          "></div>
        </div>
        <style>
          @keyframes pulseHalo {
            0%, 100% { 
              transform: translate(-50%, -50%) scale(1);
              opacity: 0.6;
            }
            50% { 
              transform: translate(-50%, -50%) scale(1.2);
              opacity: 0.3;
            }
          }
        </style>
      `,
      className: '',
      iconSize: [70, 70],
      iconAnchor: [35, 35],
    });

    if (driverMarkerRef.current) {
      // Animation fluide du déplacement (style Uber)
      const currentLatLng = driverMarkerRef.current.getLatLng();
      const newLatLng = L.latLng(driverLat, driverLng);
      
      // Animer le mouvement sur 1 seconde
      const duration = 1000;
      const startTime = Date.now();
      const startLat = currentLatLng.lat;
      const startLng = currentLatLng.lng;
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Interpolation easing (smooth)
        const easeProgress = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        
        const lat = startLat + (driverLat - startLat) * easeProgress;
        const lng = startLng + (driverLng - startLng) * easeProgress;
        
        if (driverMarkerRef.current) {
          driverMarkerRef.current.setLatLng([lat, lng]);
        }
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      
      requestAnimationFrame(animate);
      driverMarkerRef.current.setIcon(newDriverIcon);
    } else {
      driverMarkerRef.current = L.marker([driverLat, driverLng], { icon: newDriverIcon })
        .addTo(mapRef.current)
        .bindPopup(`
          <div style="min-width: 200px;">
            <div style="font-weight: bold; color: #14b8a6; margin-bottom: 8px;">
              🚗 ${driverName}
            </div>
            ${vehiclePlate ? `<div style="color: #475569; font-size: 13px;">${vehiclePlate}</div>` : ''}
            <div style="color: #10b981; font-weight: 600; font-size: 13px; margin-top: 4px;">
              ${status}
            </div>
          </div>
        `);
    }
  }, [driverLat, driverLng, driverName, vehiclePlate, status]);

  const toggleFullscreen = () => {
    if (!mapContainerRef.current) return;

    if (!document.fullscreenElement) {
      mapContainerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const centerOnDriver = () => {
    if (driverLat && driverLng && mapRef.current) {
      mapRef.current.setView([driverLat, driverLng], 15, { animate: true });
    }
  };

  const fitAllMarkers = () => {
    if (!mapRef.current) return;

    const bounds = L.latLngBounds([
      [pickupLat, pickupLng],
      [deliveryLat, deliveryLng],
      ...(driverLat && driverLng ? [L.latLng(driverLat, driverLng)] : []),
    ] as L.LatLngExpression[]);
    mapRef.current.fitBounds(bounds, { padding: [50, 50], animate: true });
  };

  // Helper functions for formatting
  const formatDistance = (km: number): string => {
    return `${km.toFixed(1)} km`;
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  return (
    <div className="relative">
      <div
        ref={mapContainerRef}
        style={{ height, width: '100%' }}
        className="rounded-lg shadow-lg overflow-hidden border-2 border-gray-200"
      />

      {/* Contrôles personnalisés */}
      {showControls && (
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-[1000]">
          {driverLat && driverLng && (
            <button
              onClick={centerOnDriver}
              className="group bg-gradient-to-br from-teal-500 to-cyan-500 p-3 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 border-2 border-white"
              title="Centrer sur le chauffeur"
            >
              <Truck className="w-6 h-6 text-white group-hover:animate-pulse" />
            </button>
          )}

          <button
            onClick={fitAllMarkers}
            className="bg-white p-3 rounded-xl shadow-lg hover:bg-gray-50 hover:shadow-xl transition-all hover:scale-105 border border-gray-200"
            title="Voir tout l'itinéraire"
          >
            <Navigation className="w-6 h-6 text-blue-600" />
          </button>

          <button
            onClick={toggleFullscreen}
            className="bg-white p-3 rounded-xl shadow-lg hover:bg-gray-50 hover:shadow-xl transition-all hover:scale-105 border border-gray-200"
            title="Plein écran"
          >
            <Maximize2 className="w-6 h-6 text-gray-600" />
          </button>
        </div>
      )}

      {/* Informations de trajet */}
      {routeInfo && (
        <div className="absolute bottom-4 left-4 backdrop-blur-xl bg-white/90 px-4 py-3 rounded-2xl shadow-2xl z-[1000] border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center">
                <Route className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Distance</p>
                <p className="text-lg font-black text-slate-900">{formatDistance(routeInfo.distance)}</p>
              </div>
            </div>
            <div className="w-px h-10 bg-slate-200"></div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                <span className="text-lg">⏱️</span>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Durée estimée</p>
                <p className="text-lg font-black text-slate-900">{formatDuration(routeInfo.duration)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chargement du tracé */}
      {routeLoading && (
        <div className="absolute bottom-4 left-4 backdrop-blur-xl bg-white/90 px-4 py-3 rounded-2xl shadow-2xl z-[1000] border border-slate-200">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-teal-600 animate-spin" />
            <span className="text-sm font-semibold text-slate-700">Calcul du tracé GPS...</span>
          </div>
        </div>
      )}
    </div>
  );
}
