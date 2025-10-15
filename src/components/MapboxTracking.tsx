import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Token Mapbox depuis les variables d'environnement
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

interface MapboxTrackingProps {
  pickupLat: number;
  pickupLng: number;
  deliveryLat: number;
  deliveryLng: number;
  currentLat?: number;
  currentLng?: number;
  route?: [number, number][];
}

export default function MapboxTracking({
  pickupLat,
  pickupLng,
  deliveryLat,
  deliveryLng,
  currentLat,
  currentLng,
  route = []
}: MapboxTrackingProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const driverMarker = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Initialiser la carte
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12', // Style 3D
      center: [pickupLng, pickupLat],
      zoom: 12,
      pitch: 45, // Angle de vue 3D
      bearing: 0,
      antialias: true
    });

    // Ajouter les contrôles
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    // Attendre le chargement de la carte
    map.current.on('load', () => {
      if (!map.current) return;

      // Activer les bâtiments 3D
      const layers = map.current.getStyle().layers;
      const labelLayerId = layers?.find(
        (layer) => layer.type === 'symbol' && layer.layout?.['text-field']
      )?.id;

      map.current.addLayer(
        {
          id: '3d-buildings',
          source: 'composite',
          'source-layer': 'building',
          filter: ['==', 'extrude', 'true'],
          type: 'fill-extrusion',
          minzoom: 15,
          paint: {
            'fill-extrusion-color': '#aaa',
            'fill-extrusion-height': [
              'interpolate',
              ['linear'],
              ['zoom'],
              15,
              0,
              15.05,
              ['get', 'height']
            ],
            'fill-extrusion-base': [
              'interpolate',
              ['linear'],
              ['zoom'],
              15,
              0,
              15.05,
              ['get', 'min_height']
            ],
            'fill-extrusion-opacity': 0.6
          }
        },
        labelLayerId
      );

      // Ajouter le marqueur de départ (Point A)
      const pickupEl = document.createElement('div');
      pickupEl.className = 'marker-pickup';
      pickupEl.style.width = '40px';
      pickupEl.style.height = '40px';
      pickupEl.style.backgroundImage = 'url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxOCIgZmlsbD0iIzEwYjk4MSIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjMiLz48dGV4dCB4PSIyMCIgeT0iMjYiIGZvbnQtc2l6ZT0iMTgiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSIjZmZmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5BPC90ZXh0Pjwvc3ZnPg==)';
      pickupEl.style.backgroundSize = 'cover';
      pickupEl.style.cursor = 'pointer';

      new mapboxgl.Marker(pickupEl)
        .setLngLat([pickupLng, pickupLat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(
            '<div style="padding: 8px;"><strong>🟢 Point de départ</strong></div>'
          )
        )
        .addTo(map.current);

      // Ajouter le marqueur d'arrivée (Point B)
      const deliveryEl = document.createElement('div');
      deliveryEl.className = 'marker-delivery';
      deliveryEl.style.width = '40px';
      deliveryEl.style.height = '40px';
      deliveryEl.style.backgroundImage = 'url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxOCIgZmlsbD0iI2VmNDQ0NCIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjMiLz48dGV4dCB4PSIyMCIgeT0iMjYiIGZvbnQtc2l6ZT0iMTgiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSIjZmZmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5CPC90ZXh0Pjwvc3ZnPg==)';
      deliveryEl.style.backgroundSize = 'cover';
      deliveryEl.style.cursor = 'pointer';

      new mapboxgl.Marker(deliveryEl)
        .setLngLat([deliveryLng, deliveryLat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(
            '<div style="padding: 8px;"><strong>🔴 Point d\'arrivée</strong></div>'
          )
        )
        .addTo(map.current);

      // Ajouter la source pour le tracé GPS
      map.current.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: route.length > 0 ? route : [[pickupLng, pickupLat], [deliveryLng, deliveryLat]]
          }
        }
      });

      // Ajouter la couche pour le tracé GPS
      map.current.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#3b82f6',
          'line-width': 5,
          'line-opacity': 0.8
        }
      });

      // Ajouter une couche pour l'animation du tracé
      map.current.addLayer({
        id: 'route-glow',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#3b82f6',
          'line-width': 10,
          'line-opacity': 0.3,
          'line-blur': 5
        }
      });

      // Créer le marqueur du chauffeur (sera mis à jour en temps réel)
      const driverEl = document.createElement('div');
      driverEl.className = 'marker-driver';
      driverEl.style.width = '50px';
      driverEl.style.height = '50px';
      driverEl.style.backgroundImage = 'url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyNSIgY3k9IjI1IiByPSIyMyIgZmlsbD0iIzA2YjZkNCIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjMiLz48Y2lyY2xlIGN4PSIyNSIgY3k9IjI1IiByPSIxNSIgZmlsbD0iI2ZmZiIgb3BhY2l0eT0iMC4zIiBjbGFzcz0icHVsc2UiLz48dGV4dCB4PSIyNSIgeT0iMzIiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IiNmZmYiIHRleHQtYW5jaG9yPSJtaWRkbGUiPvCfmoY8L3RleHQ+PC9zdmc+)';
      driverEl.style.backgroundSize = 'cover';
      driverEl.style.cursor = 'pointer';
      driverEl.style.animation = 'pulse 2s ease-in-out infinite';

      if (currentLat && currentLng) {
        driverMarker.current = new mapboxgl.Marker(driverEl)
          .setLngLat([currentLng, currentLat])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 }).setHTML(
              '<div style="padding: 8px;"><strong>🚚 Chauffeur</strong><br/><small>Position en temps réel</small></div>'
            )
          )
          .addTo(map.current);
      }

      // Ajuster la vue pour montrer tout le parcours
      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend([pickupLng, pickupLat]);
      bounds.extend([deliveryLng, deliveryLat]);
      if (currentLat && currentLng) {
        bounds.extend([currentLng, currentLat]);
      }
      map.current.fitBounds(bounds, { padding: 50, pitch: 45 });
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  // Mettre à jour la position du chauffeur en temps réel
  useEffect(() => {
    if (!map.current || !currentLat || !currentLng) return;

    if (driverMarker.current) {
      // Animer le déplacement du marqueur
      driverMarker.current.setLngLat([currentLng, currentLat]);
    } else {
      // Créer le marqueur s'il n'existe pas
      const driverEl = document.createElement('div');
      driverEl.className = 'marker-driver';
      driverEl.style.width = '50px';
      driverEl.style.height = '50px';
      driverEl.style.backgroundImage = 'url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyNSIgY3k9IjI1IiByPSIyMyIgZmlsbD0iIzA2YjZkNCIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjMiLz48Y2lyY2xlIGN4PSIyNSIgY3k9IjI1IiByPSIxNSIgZmlsbD0iI2ZmZiIgb3BhY2l0eT0iMC4zIi8+PHRleHQgeD0iMjUiIHk9IjMyIiBmb250LXNpemU9IjIwIiBmaWxsPSIjZmZmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7wn5qGPC90ZXh0Pjwvc3ZnPg==)';
      driverEl.style.backgroundSize = 'cover';
      driverEl.style.cursor = 'pointer';

      driverMarker.current = new mapboxgl.Marker(driverEl)
        .setLngLat([currentLng, currentLat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(
            '<div style="padding: 8px;"><strong>🚚 Chauffeur</strong><br/><small>Position en temps réel</small></div>'
          )
        )
        .addTo(map.current);
    }

    // Centrer la carte sur le chauffeur (optionnel)
    // map.current.easeTo({ center: [currentLng, currentLat], zoom: 14 });
  }, [currentLat, currentLng]);

  // Mettre à jour le tracé GPS
  useEffect(() => {
    if (!map.current || route.length === 0) return;

    const source = map.current.getSource('route') as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: route
        }
      });
    }
  }, [route]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full rounded-xl" />
      
      {/* Légende */}
      <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-xl border border-slate-200">
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">A</div>
            <span className="text-slate-700">Point de départ</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold">B</div>
            <span className="text-slate-700">Point d'arrivée</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center text-white text-xs">🚚</div>
            <span className="text-slate-700">Chauffeur (temps réel)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-1 bg-blue-500 rounded"></div>
            <span className="text-slate-700">Tracé GPS</span>
          </div>
        </div>
      </div>

      {/* Indicateur temps réel */}
      {currentLat && currentLng && (
        <div className="absolute top-4 left-4 bg-green-500/90 backdrop-blur-sm text-white px-4 py-2 rounded-full shadow-xl flex items-center gap-2 animate-pulse">
          <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
          <span className="text-sm font-bold">Mise à jour en temps réel</span>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.8;
          }
        }
        
        .marker-driver {
          animation: pulse 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
