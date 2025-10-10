import mapboxgl from 'mapbox-gl';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

export { mapboxgl };

export interface Coordinates {
  lng: number;
  lat: number;
}

export interface RouteResponse {
  distance: number;
  duration: number;
  geometry: {
    coordinates: [number, number][];
  };
}

export async function getRoute(start: Coordinates, end: Coordinates): Promise<RouteResponse | null> {
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${start.lng},${start.lat};${end.lng},${end.lat}?geometries=geojson&access_token=${mapboxgl.accessToken}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.routes && data.routes.length > 0) {
      return {
        distance: data.routes[0].distance,
        duration: data.routes[0].duration,
        geometry: data.routes[0].geometry,
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching route:', error);
    return null;
  }
}

export async function geocodeAddress(address: string): Promise<Coordinates | null> {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${mapboxgl.accessToken}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center;
      return { lng, lat };
    }
    return null;
  } catch (error) {
    console.error('Error geocoding address:', error);
    return null;
  }
}
