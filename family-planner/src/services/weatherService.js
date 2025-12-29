/**
 * Weather Service for Netherlands
 * Uses KNMI (Royal Netherlands Meteorological Institute) data via Open-Meteo API
 * Open-Meteo is free and doesn't require an API key
 */

class WeatherService {
  constructor() {
    // Default location: Zeist, Netherlands
    this.defaultLat = 52.0907;
    this.defaultLon = 5.2334;
    this.apiBase = 'https://api.open-meteo.com/v1';
  }

  /**
   * Get current weather and forecast
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   */
  async getWeather(lat = this.defaultLat, lon = this.defaultLon) {
    try {
      const params = new URLSearchParams({
        latitude: lat,
        longitude: lon,
        current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m',
        hourly: 'temperature_2m,precipitation_probability,precipitation,weather_code',
        daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max',
        timezone: 'Europe/Amsterdam',
        forecast_days: 7
      });

      const response = await fetch(`${this.apiBase}/forecast?${params}`);
      if (!response.ok) throw new Error('Failed to fetch weather data');
      
      const data = await response.json();
      return this.parseWeatherData(data);
    } catch (error) {
      console.error('Weather service error:', error);
      throw error;
    }
  }

  /**
   * Parse raw weather data into usable format
   */
  parseWeatherData(data) {
    return {
      current: {
        temperature: Math.round(data.current.temperature_2m),
        feelsLike: Math.round(data.current.apparent_temperature),
        humidity: data.current.relative_humidity_2m,
        windSpeed: Math.round(data.current.wind_speed_10m),
        precipitation: data.current.precipitation,
        condition: this.getWeatherCondition(data.current.weather_code),
        icon: this.getWeatherIcon(data.current.weather_code)
      },
      hourly: data.hourly.time.slice(0, 24).map((time, index) => ({
        time: new Date(time),
        temperature: Math.round(data.hourly.temperature_2m[index]),
        precipitation: data.hourly.precipitation_probability[index],
        condition: this.getWeatherCondition(data.hourly.weather_code[index]),
        icon: this.getWeatherIcon(data.hourly.weather_code[index])
      })),
      daily: data.daily.time.map((date, index) => ({
        date: new Date(date),
        maxTemp: Math.round(data.daily.temperature_2m_max[index]),
        minTemp: Math.round(data.daily.temperature_2m_min[index]),
        precipitation: data.daily.precipitation_sum[index],
        precipitationProbability: data.daily.precipitation_probability_max[index],
        condition: this.getWeatherCondition(data.daily.weather_code[index]),
        icon: this.getWeatherIcon(data.daily.weather_code[index])
      }))
    };
  }

  /**
   * Convert WMO weather code to condition text
   * Based on WMO Weather interpretation codes
   */
  getWeatherCondition(code) {
    const conditions = {
      0: { nl: 'Helder', en: 'Clear' },
      1: { nl: 'Overwegend helder', en: 'Mainly clear' },
      2: { nl: 'Gedeeltelijk bewolkt', en: 'Partly cloudy' },
      3: { nl: 'Bewolkt', en: 'Overcast' },
      45: { nl: 'Mist', en: 'Foggy' },
      48: { nl: 'IJsmist', en: 'Depositing rime fog' },
      51: { nl: 'Lichte motregen', en: 'Light drizzle' },
      53: { nl: 'Motregen', en: 'Moderate drizzle' },
      55: { nl: 'Dichte motregen', en: 'Dense drizzle' },
      61: { nl: 'Lichte regen', en: 'Slight rain' },
      63: { nl: 'Regen', en: 'Moderate rain' },
      65: { nl: 'Zware regen', en: 'Heavy rain' },
      71: { nl: 'Lichte sneeuw', en: 'Slight snow' },
      73: { nl: 'Sneeuw', en: 'Moderate snow' },
      75: { nl: 'Zware sneeuw', en: 'Heavy snow' },
      77: { nl: 'Sneeuwvlagen', en: 'Snow grains' },
      80: { nl: 'Lichte buien', en: 'Slight rain showers' },
      81: { nl: 'Buien', en: 'Moderate rain showers' },
      82: { nl: 'Zware buien', en: 'Violent rain showers' },
      85: { nl: 'Sneeuwbuien', en: 'Slight snow showers' },
      86: { nl: 'Zware sneeuwbuien', en: 'Heavy snow showers' },
      95: { nl: 'Onweer', en: 'Thunderstorm' },
      96: { nl: 'Onweer met hagel', en: 'Thunderstorm with slight hail' },
      99: { nl: 'Onweer met zware hagel', en: 'Thunderstorm with heavy hail' }
    };
    return conditions[code] || { nl: 'Onbekend', en: 'Unknown' };
  }

  /**
   * Get weather icon emoji based on condition code
   */
  getWeatherIcon(code) {
    if (code === 0) return '☀️';
    if (code <= 3) return '⛅';
    if (code <= 48) return '🌫️';
    if (code <= 55) return '🌦️';
    if (code <= 65) return '🌧️';
    if (code <= 77) return '❄️';
    if (code <= 82) return '🌧️';
    if (code <= 86) return '🌨️';
    if (code >= 95) return '⛈️';
    return '🌤️';
  }

  /**
   * Check if weather is suitable for outdoor activities
   */
  isOutdoorFriendly(weatherData) {
    const current = weatherData.current;
    
    // Bad weather conditions
    if (current.precipitation > 2) return { suitable: false, reason: 'Heavy precipitation' };
    if (current.windSpeed > 40) return { suitable: false, reason: 'Strong winds' };
    if (current.temperature < 5) return { suitable: false, reason: 'Too cold' };
    if (current.temperature > 35) return { suitable: false, reason: 'Too hot' };
    
    const code = current.condition.code;
    if (code >= 95) return { suitable: false, reason: 'Thunderstorm' };
    if (code >= 71 && code <= 77) return { suitable: false, reason: 'Snow' };
    if (code >= 61 && code <= 65) return { suitable: false, reason: 'Rain' };
    
    return { suitable: true, reason: null };
  }

  /**
   * Get weather for specific date/time (for event planning)
   */
  async getWeatherForEvent(eventDate, lat, lon) {
    try {
      const weather = await this.getWeather(lat, lon);
      const eventTime = new Date(eventDate);
      
      // Find closest hourly forecast
      const hourlyForecast = weather.hourly.find(h => {
        const diff = Math.abs(h.time - eventTime);
        return diff < 3600000; // Within 1 hour
      });
      
      if (hourlyForecast) {
        return {
          ...hourlyForecast,
          suitable: hourlyForecast.precipitation < 30 && hourlyForecast.temperature > 10
        };
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get weather for event:', error);
      return null;
    }
  }
}

export default new WeatherService();
