import { useEffect, useRef } from 'react';
import { mapboxgl, Coordinates } from '../lib/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapProps {
  center?: Coordinates;
  zoom?: number;
  markers?: Array<{
    coordinates: Coordinates;
    popup?: string;
  }>;
  route?: {
    coordinates: [number, number][];
  };
  className?: string;
}

export default function Map({
  center = { lng: 2.3522, lat: 48.8566 },
  zoom = 12,
  markers = [],
  route,
  className = "w-full h-96"
}: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [center.lng, center.lat],
      zoom: zoom,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current) return;

    map.current.setCenter([center.lng, center.lat]);
    map.current.setZoom(zoom);
  }, [center, zoom]);

  useEffect(() => {
    if (!map.current) return;

    const markerElements: mapboxgl.Marker[] = [];

    markers.forEach((marker) => {
      const el = new mapboxgl.Marker()
        .setLngLat([marker.coordinates.lng, marker.coordinates.lat]);

      if (marker.popup) {
        el.setPopup(
          new mapboxgl.Popup({ offset: 25 })
            .setHTML(marker.popup)
        );
      }

      el.addTo(map.current!);
      markerElements.push(el);
    });

    return () => {
      markerElements.forEach(marker => marker.remove());
    };
  }, [markers]);

  useEffect(() => {
    if (!map.current || !route) return;

    map.current.on('load', () => {
      if (!map.current) return;

      if (map.current.getSource('route')) {
        map.current.removeLayer('route');
        map.current.removeSource('route');
      }

      map.current.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: route.coordinates,
          },
        },
      });

      map.current.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#14b8a6',
          'line-width': 4,
        },
      });
    });

    return () => {
      if (map.current?.getSource('route')) {
        map.current.removeLayer('route');
        map.current.removeSource('route');
      }
    };
  }, [route]);

  return <div ref={mapContainer} className={className} />;
}
