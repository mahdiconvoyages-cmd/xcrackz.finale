import { useState, useEffect } from 'react';
import { Clock, MapPin, CloudRain, Navigation } from 'lucide-react';

interface WeatherData {
  temp: number;
  description: string;
  icon: string;
  city: string;
}

export default function WeatherTimeCard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [usingGeolocation, setUsingGeolocation] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadWeather();
  }, []);

  const loadWeather = async (useGeo = false) => {
    setLoading(true);

    try {
      let latitude = 48.8566;
      let longitude = 2.3522;
      let cityName = 'Paris';

      if (useGeo && navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: false,
              timeout: 5000,
              maximumAge: 300000
            });
          });

          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
          setUsingGeolocation(true);
        } catch (geoError) {
          console.log('Géolocalisation refusée, utilisation de Paris');
          setUsingGeolocation(false);
        }
      } else {
        setUsingGeolocation(false);
      }

      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&timezone=auto`;
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=fr&format=json`;

      const [weatherResponse, geoResponse] = await Promise.all([
        fetch(url),
        usingGeolocation ? fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=fr`) : Promise.resolve(null)
      ]);

      if (!weatherResponse.ok) {
        throw new Error('Weather API error');
      }

      const weatherData = await weatherResponse.json();

      if (usingGeolocation && geoResponse && geoResponse.ok) {
        const geoData = await geoResponse.json();
        cityName = geoData.address?.city || geoData.address?.town || geoData.address?.village || 'Votre position';
      }

      const weatherCodes: { [key: number]: { description: string; icon: string } } = {
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
        65: { description: 'Pluie forte', icon: '🌧️' },
        71: { description: 'Neige légère', icon: '🌨️' },
        73: { description: 'Neige modérée', icon: '🌨️' },
        75: { description: 'Neige forte', icon: '🌨️' },
        77: { description: 'Grains de neige', icon: '🌨️' },
        80: { description: 'Averses légères', icon: '🌦️' },
        81: { description: 'Averses modérées', icon: '🌧️' },
        82: { description: 'Averses violentes', icon: '⛈️' },
        85: { description: 'Averses de neige légères', icon: '🌨️' },
        86: { description: 'Averses de neige fortes', icon: '🌨️' },
        95: { description: 'Orage', icon: '⛈️' },
        96: { description: 'Orage avec grêle légère', icon: '⛈️' },
        99: { description: 'Orage avec grêle forte', icon: '⛈️' },
      };

      const weatherCode = weatherData.current_weather.weathercode;
      const weatherInfo = weatherCodes[weatherCode] || { description: 'Météo inconnue', icon: '🌤️' };

      setWeather({
        temp: Math.round(weatherData.current_weather.temperature),
        description: weatherInfo.description,
        icon: weatherInfo.icon,
        city: cityName,
      });
    } catch (error) {
      console.error('Error loading weather:', error);
      setWeather({
        temp: 20,
        description: 'Météo non disponible',
        icon: '🌤️',
        city: 'Paris',
      });
    } finally {
      setLoading(false);
    }
  };

  const requestMyLocation = () => {
    loadWeather(true);
  };

  if (loading) {
    return (
      <div className="backdrop-blur-xl bg-gradient-to-br from-sky-500/20 to-cyan-500/20 border border-sky-400/30 shadow-xl rounded-2xl p-6 animate-pulse">
        <div className="h-14 w-14 bg-sky-400/30 rounded-2xl mb-4"></div>
        <div className="h-4 bg-sky-400/30 rounded w-24 mb-2"></div>
        <div className="h-8 bg-sky-400/30 rounded w-full"></div>
      </div>
    );
  }

  return (
    <div className="backdrop-blur-xl bg-gradient-to-br from-sky-500/20 to-cyan-500/20 border border-sky-400/30 shadow-xl rounded-2xl p-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group">
      <div className="w-14 h-14 bg-gradient-to-br from-sky-500 to-cyan-500 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-lg">
        {weather ? (
          <span className="text-3xl">{weather.icon}</span>
        ) : (
          <CloudRain className="w-6 h-6 text-white" />
        )}
      </div>

      <p className="text-slate-600 text-sm font-semibold mb-3 flex items-center gap-2">
        <Clock className="w-4 h-4" />
        Informations locales
      </p>

      <div className="space-y-3">
        <div>
          <p className="text-3xl font-black text-slate-800 tabular-nums">
            {currentTime.toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            })}
          </p>
          <p className="text-xs text-slate-600 font-semibold mt-1">
            {currentTime.toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long'
            })}
          </p>
        </div>

        {weather && (
          <div className="pt-3 border-t border-sky-400/20 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-sky-600" />
                <span className="text-sm font-bold text-slate-700">{weather.city}</span>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-sky-600">{weather.temp}°C</p>
                <p className="text-xs text-slate-600 capitalize">{weather.description}</p>
              </div>
            </div>

            {!usingGeolocation && (
              <button
                onClick={requestMyLocation}
                className="w-full px-3 py-1.5 bg-sky-500/20 border border-sky-400/30 text-sky-700 text-xs font-semibold rounded-lg hover:bg-sky-500/30 transition flex items-center justify-center gap-2"
              >
                <Navigation className="w-3 h-3" />
                Ma position
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
