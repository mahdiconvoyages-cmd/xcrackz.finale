export interface WeatherData {
  temperature: number;
  weatherCode: number;
  windSpeed: number;
  humidity: number;
  description: string;
  icon: string;
}

const WEATHER_CODES: { [key: number]: { description: string; icon: string } } = {
  0: { description: 'Ciel dégagé', icon: '☀️' },
  1: { description: 'Principalement dégagé', icon: '🌤️' },
  2: { description: 'Partiellement nuageux', icon: '⛅' },
  3: { description: 'Couvert', icon: '☁️' },
  45: { description: 'Brouillard', icon: '🌫️' },
  48: { description: 'Brouillard givrant', icon: '🌫️' },
  51: { description: 'Bruine légère', icon: '🌦️' },
  53: { description: 'Bruine modérée', icon: '🌦️' },
  55: { description: 'Bruine dense', icon: '🌧️' },
  61: { description: 'Pluie légère', icon: '🌧️' },
  63: { description: 'Pluie modérée', icon: '🌧️' },
  65: { description: 'Pluie forte', icon: '⛈️' },
  71: { description: 'Neige légère', icon: '🌨️' },
  73: { description: 'Neige modérée', icon: '🌨️' },
  75: { description: 'Neige forte', icon: '❄️' },
  77: { description: 'Grains de neige', icon: '🌨️' },
  80: { description: 'Averses légères', icon: '🌦️' },
  81: { description: 'Averses modérées', icon: '🌧️' },
  82: { description: 'Averses violentes', icon: '⛈️' },
  85: { description: 'Averses de neige légères', icon: '🌨️' },
  86: { description: 'Averses de neige fortes', icon: '❄️' },
  95: { description: 'Orage', icon: '⛈️' },
  96: { description: 'Orage avec grêle', icon: '⛈️' },
  99: { description: 'Orage violent', icon: '🌩️' },
};

export async function getCurrentWeather(latitude: number = 48.8566, longitude: number = 2.3522): Promise<WeatherData> {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`
    );

    if (!response.ok) {
      throw new Error('Erreur lors de la récupération de la météo');
    }

    const data = await response.json();
    const current = data.current;
    const weatherCode = current.weather_code;
    const weatherInfo = WEATHER_CODES[weatherCode] || WEATHER_CODES[0];

    return {
      temperature: Math.round(current.temperature_2m),
      weatherCode,
      windSpeed: Math.round(current.wind_speed_10m),
      humidity: current.relative_humidity_2m,
      description: weatherInfo.description,
      icon: weatherInfo.icon,
    };
  } catch (error) {
    console.error('Erreur météo:', error);
    return {
      temperature: 20,
      weatherCode: 0,
      windSpeed: 10,
      humidity: 50,
      description: 'Données indisponibles',
      icon: '🌤️',
    };
  }
}

export async function getWeatherByCity(city: string): Promise<WeatherData> {
  try {
    const geocodingResponse = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=fr&format=json`
    );

    if (!geocodingResponse.ok) {
      throw new Error('Ville non trouvée');
    }

    const geocodingData = await geocodingResponse.json();

    if (!geocodingData.results || geocodingData.results.length === 0) {
      throw new Error('Ville non trouvée');
    }

    const { latitude, longitude } = geocodingData.results[0];
    return getCurrentWeather(latitude, longitude);
  } catch (error) {
    console.error('Erreur recherche ville:', error);
    return getCurrentWeather();
  }
}
