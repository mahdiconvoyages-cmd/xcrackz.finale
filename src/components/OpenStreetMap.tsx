/**
 * 🗺️ Composant Map avec OpenStreetMap (GRATUIT)
 * 
 * Remplace Google Maps par une solution 100% gratuite et open source
 * Utilise Leaflet + OpenStreetMap
 */

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix pour les icônes Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface Location {
  lat: number;
  lng: number;
  label?: string;
  color?: 'green' | 'red' | 'blue' | 'orange';
}

interface OpenStreetMapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  markers?: Location[];
  routes?: { from: Location; to: Location; color?: string }[];
  height?: string;
  className?: string;
  onMarkerClick?: (marker: Location) => void;
}

export function OpenStreetMap({
  center = { lat: 48.8566, lng: 2.3522 }, // Paris par défaut
  zoom = 13,
  markers = [],
  routes = [],
  height = '500px',
  className = '',
  onMarkerClick,
}: OpenStreetMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Créer la carte
    const map = L.map(mapContainerRef.current).setView([center.lat, center.lng], zoom);
    mapRef.current = map;

    // Ajouter les tiles OpenStreetMap (GRATUIT)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Cleanup
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Mettre à jour le centre et zoom
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView([center.lat, center.lng], zoom);
    }
  }, [center, zoom]);

  // Ajouter les marqueurs
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;

    // Supprimer les anciens marqueurs
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        map.removeLayer(layer);
      }
    });

    // Créer icônes colorées
    const createColoredIcon = (color: string) => {
      const colors: Record<string, string> = {
        green: '#10b981',
        red: '#ef4444',
        blue: '#3b82f6',
        orange: '#f97316',
      };

      const svgIcon = `
        <svg xmlns="http://www.w3.org/2000/svg" width="30" height="40" viewBox="0 0 30 40">
          <path fill="${colors[color] || colors.blue}" d="M15,0 C8.373,0 3,5.373 3,12 C3,21 15,40 15,40 S27,21 27,12 C27,5.373 21.627,0 15,0 Z"/>
          <circle fill="white" cx="15" cy="12" r="5"/>
        </svg>
      `;

      return L.divIcon({
        html: svgIcon,
        className: 'custom-marker',
        iconSize: [30, 40],
        iconAnchor: [15, 40],
      });
    };

    // Ajouter les nouveaux marqueurs
    markers.forEach((marker) => {
      const icon = marker.color ? createColoredIcon(marker.color) : DefaultIcon;
      
      const leafletMarker = L.marker([marker.lat, marker.lng], { icon }).addTo(map);

      if (marker.label) {
        leafletMarker.bindPopup(marker.label);
      }

      if (onMarkerClick) {
        leafletMarker.on('click', () => onMarkerClick(marker));
      }
    });

    // Ajouter les routes
    routes.forEach((route) => {
      L.polyline(
        [
          [route.from.lat, route.from.lng],
          [route.to.lat, route.to.lng],
        ],
        {
          color: route.color || '#14b8a6',
          weight: 3,
          opacity: 0.7,
          dashArray: '5, 10',
        }
      ).addTo(map);
    });

    // Auto-zoom pour montrer tous les marqueurs
    if (markers.length > 0) {
      const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [markers, routes, onMarkerClick]);

  return (
    <div
      ref={mapContainerRef}
      className={className}
      style={{ height, width: '100%', borderRadius: '8px', overflow: 'hidden' }}
    />
  );
}

/**
 * 🗺️ Exemple d'utilisation
 */
export function ExampleUsage() {
  const markers = [
    {
      lat: 48.8566,
      lng: 2.3522,
      label: '<b>📍 Pickup</b><br/>123 Rue de Paris',
      color: 'green' as const,
    },
    {
      lat: 48.8606,
      lng: 2.3376,
      label: '<b>🚗 En cours</b><br/>Mission #1234',
      color: 'red' as const,
    },
    {
      lat: 48.8738,
      lng: 2.2950,
      label: '<b>🎯 Delivery</b><br/>456 Avenue des Champs',
      color: 'blue' as const,
    },
  ];

  const routes = [
    {
      from: markers[0],
      to: markers[1],
      color: '#10b981',
    },
    {
      from: markers[1],
      to: markers[2],
      color: '#ef4444',
    },
  ];

  return (
    <div>
      <h2>Carte Temps Réel</h2>
      <OpenStreetMap
        center={{ lat: 48.8566, lng: 2.3522 }}
        zoom={12}
        markers={markers}
        routes={routes}
        height="600px"
        onMarkerClick={(marker) => console.log('Clicked:', marker)}
      />
    </div>
  );
}
