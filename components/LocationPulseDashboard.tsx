import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type GeoResult = {
  name: string;
  country: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  timezone: string;
};

type WeatherResult = {
  temperature: number;
  windspeed: number;
  winddirection: number;
  weathercode: number;
  sunrise?: string;
  sunset?: string;
  tempMax?: number;
  tempMin?: number;
  forecast?: Array<{
    date: string;
    weathercode?: number;
    tempMax?: number;
    tempMin?: number;
    precipSum?: number;
    precipProb?: number;
    windMax?: number;
    gustsMax?: number;
  }>;
};

type AirQualityResult = {
  aqi?: number;
  pm10?: number;
  pm25?: number;
  co?: number;
  no2?: number;
  o3?: number;
  time?: string;
};

type WikiResult = {
  title: string;
  extract: string;
  url: string;
  population?: number;
  areaKm2?: number;
  elevationM?: number;
  inception?: string;
};

type QuakeResult = {
  title: string;
  place: string;
  time: number;
  magnitude: number;
  distanceKm: number;
};

const DEFAULT_QUERY = 'Glasgow';
const WEATHER_REFRESH_MS = 15 * 60 * 1000;
const AIR_REFRESH_MS = 20 * 60 * 1000;
const QUAKE_REFRESH_MS = 10 * 60 * 1000;
const MAP_ZOOM_OUT = 1;
const MAP_ZOOM_IN = 9.5;

const formatNumber = (value?: number, digits = 1) => {
  if (value === undefined || Number.isNaN(value)) return '—';
  return value.toFixed(digits);
};

const formatClock = (value?: string) => {
  if (!value) return '—';
  if (value.length >= 16) {
    return value.slice(11, 16);
  }
  return value;
};

const formatPopulation = (value?: number) => {
  if (!value) return '—';
  return Intl.NumberFormat('en-GB').format(Math.round(value));
};

const formatArea = (value?: number) => {
  if (!value) return '—';
  return `${formatNumber(value, 1)} km²`;
};

const formatLocalTime = (value?: string, timeZone?: string) => {
  if (!value || !timeZone) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', { timeZone, timeStyle: 'short' }).format(parsed);
};

const parseWikidataAmount = (value: any) => {
  const raw = value?.amount;
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseWikidataDate = (value: any) => {
  const time = value?.time as string | undefined;
  if (!time) return undefined;
  if (time.startsWith('+')) {
    return time.slice(1).split('T')[0];
  }
  return time.split('T')[0];
};

const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371 * c;
};

const useLocalTime = (timeZone?: string) => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const formatted = useMemo(() => {
    if (!timeZone) return '—';
    return new Intl.DateTimeFormat('en-GB', {
      timeZone,
      dateStyle: 'medium',
      timeStyle: 'medium'
    }).format(now);
  }, [now, timeZone]);

  return formatted;
};

const getWeatherLabel = (code: number) => {
  if (code === 0) return 'Clear sky';
  if (code === 1 || code === 2) return 'Mainly clear';
  if (code === 3) return 'Overcast';
  if (code === 45 || code === 48) return 'Fog';
  if (code >= 51 && code <= 57) return 'Drizzle';
  if (code >= 61 && code <= 67) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Rain showers';
  if (code >= 85 && code <= 86) return 'Snow showers';
  if (code >= 95 && code <= 99) return 'Thunderstorm';
  return 'Mixed conditions';
};

const getAqiCategory = (aqi?: number) => {
  if (aqi === undefined || Number.isNaN(aqi)) return null;
  if (aqi <= 50) return { label: 'Good', guidance: 'No special precautions.', index: 0, color: 'emerald' };
  if (aqi <= 100) {
    return {
      label: 'Moderate',
      guidance: 'Sensitive groups: consider reducing prolonged outdoor exertion.',
      index: 1,
      color: 'amber'
    };
  }
  if (aqi <= 150) {
    return {
      label: 'Unhealthy for Sensitive Groups',
      guidance: 'Sensitive groups: reduce outdoor exertion.',
      index: 2,
      color: 'orange'
    };
  }
  if (aqi <= 200) return { label: 'Unhealthy', guidance: 'Sensitive groups: reduce outdoor exertion.', index: 3, color: 'rose' };
  if (aqi <= 300) {
    return { label: 'Very Unhealthy', guidance: 'Sensitive groups: reduce outdoor exertion.', index: 4, color: 'red' };
  }
  return { label: 'Hazardous', guidance: 'Sensitive groups: reduce outdoor exertion.', index: 5, color: 'red' };
};

const getAqiColorClasses = (color?: string) => {
  switch (color) {
    case 'emerald':
      return 'border-emerald-500/50 text-emerald-300';
    case 'amber':
      return 'border-amber-500/50 text-amber-300';
    case 'orange':
      return 'border-orange-500/50 text-orange-300';
    case 'rose':
      return 'border-rose-500/50 text-rose-300';
    case 'red':
      return 'border-red-500/50 text-red-300';
    default:
      return 'border-neutral-700 text-neutral-300';
  }
};

const getAqiBarColor = (color?: string) => {
  switch (color) {
    case 'emerald':
      return 'bg-emerald-400';
    case 'amber':
      return 'bg-amber-400';
    case 'orange':
      return 'bg-orange-400';
    case 'rose':
      return 'bg-rose-500';
    case 'red':
      return 'bg-red-600';
    default:
      return 'bg-neutral-700';
  }
};

const getDominantPollutant = (air: AirQualityResult | null) => {
  if (!air) return null;
  const coMg = air.co !== undefined ? air.co / 1000 : undefined;
  const candidates = [
    { key: 'PM2.5', value: air.pm25, scale: 35 },
    { key: 'PM10', value: air.pm10, scale: 50 },
    { key: 'O₃', value: air.o3, scale: 100 },
    { key: 'NO₂', value: air.no2, scale: 200 },
    { key: 'CO', value: coMg, scale: 10, isMg: true }
  ].filter((item) => item.value !== undefined);
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => (b.value! / b.scale) - (a.value! / a.scale));
  return candidates[0].key;
};

const LocationPulseDashboard: React.FC = () => {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [activeQuery, setActiveQuery] = useState(DEFAULT_QUERY);
  const [geo, setGeo] = useState<GeoResult | null>(null);
  const [weather, setWeather] = useState<WeatherResult | null>(null);
  const [air, setAir] = useState<AirQualityResult | null>(null);
  const [wiki, setWiki] = useState<WikiResult | null>(null);
  const [quake, setQuake] = useState<QuakeResult | null>(null);
  const [recentLocalQuake, setRecentLocalQuake] = useState<QuakeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const weatherTimer = useRef<number | null>(null);
  const airTimer = useRef<number | null>(null);
  const quakeTimer = useRef<number | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const mapMarkerRef = useRef<any>(null);
  const mapHoverRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const localTime = useLocalTime(geo?.timezone);
  const aqiMeta = useMemo(() => getAqiCategory(air?.aqi), [air?.aqi]);
  const dominantPollutant = useMemo(() => getDominantPollutant(air), [air]);

  const resetTimers = useCallback(() => {
    if (weatherTimer.current) window.clearInterval(weatherTimer.current);
    if (airTimer.current) window.clearInterval(airTimer.current);
    if (quakeTimer.current) window.clearInterval(quakeTimer.current);
    weatherTimer.current = null;
    airTimer.current = null;
    quakeTimer.current = null;
  }, []);

  useEffect(() => {
    let mounted = true;

    const ensureLeaflet = async () => {
      if ((window as any).L) {
        return (window as any).L;
      }

      if (!document.querySelector('link[data-leaflet]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
        link.crossOrigin = '';
        link.setAttribute('data-leaflet', 'true');
        document.head.appendChild(link);
      }

      return new Promise((resolve, reject) => {
        const existingScript = document.querySelector('script[data-leaflet]');
        if (existingScript) {
          existingScript.addEventListener('load', () => resolve((window as any).L));
          existingScript.addEventListener('error', () => reject(new Error('Leaflet failed to load.')));
          return;
        }
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
        script.crossOrigin = '';
        script.setAttribute('data-leaflet', 'true');
        script.async = true;
        script.onload = () => resolve((window as any).L);
        script.onerror = () => reject(new Error('Leaflet failed to load.'));
        document.body.appendChild(script);
      });
    };

    const setupMap = async () => {
      if (!mapContainerRef.current) return;
      try {
        const L = await ensureLeaflet();
        if (!mounted || !mapContainerRef.current) return;
        if (!mapInstanceRef.current) {
          mapInstanceRef.current = L.map(mapContainerRef.current, {
            zoomControl: false,
            attributionControl: false,
            dragging: false,
            scrollWheelZoom: false,
            doubleClickZoom: false,
            boxZoom: false,
            keyboard: false,
            touchZoom: false,
            zoomSnap: 0.5,
            zoomDelta: 0.5,
            minZoom: 1,
            maxZoom: 13
          });
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18,
            attribution: '&copy; OpenStreetMap contributors'
          }).addTo(mapInstanceRef.current);
        }

        if (geo) {
          const targetZoom = mapHoverRef.current ? MAP_ZOOM_IN : MAP_ZOOM_OUT;
          mapInstanceRef.current.setView([geo.latitude, geo.longitude], targetZoom);
          if (!mapMarkerRef.current) {
            mapMarkerRef.current = L.marker([geo.latitude, geo.longitude]).addTo(mapInstanceRef.current);
          } else {
            mapMarkerRef.current.setLatLng([geo.latitude, geo.longitude]);
          }
        }
      } catch (err) {
        setError('Map failed to load.');
      }
    };

    setupMap();

    return () => {
      mounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        mapMarkerRef.current = null;
      }
    };
  }, [geo]);

  const fetchWeather = useCallback(async (location: GeoResult) => {
    const signal = abortRef.current?.signal;
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', location.latitude.toString());
    url.searchParams.set('longitude', location.longitude.toString());
    url.searchParams.set('current_weather', 'true');
    url.searchParams.set(
      'daily',
      'sunrise,sunset,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,windspeed_10m_max,windgusts_10m_max,weathercode'
    );
    url.searchParams.set('forecast_days', '8');
    url.searchParams.set('timezone', 'auto');

    const response = await fetch(url.toString(), { signal });
    if (!response.ok) {
      throw new Error('Weather service is unavailable.');
    }
    const data = await response.json();
    const current = data.current_weather;
    const daily = data.daily;
    const forecast = Array.isArray(daily?.time)
      ? daily.time.slice(1, 8).map((date: string, offset: number) => {
          const index = offset + 1;
          return {
            date,
            weathercode: daily.weathercode?.[index],
            tempMax: daily.temperature_2m_max?.[index],
            tempMin: daily.temperature_2m_min?.[index],
            precipSum: daily.precipitation_sum?.[index],
            precipProb: daily.precipitation_probability_max?.[index],
            windMax: daily.windspeed_10m_max?.[index],
            gustsMax: daily.windgusts_10m_max?.[index]
          };
        })
      : undefined;
    setWeather({
      temperature: current?.temperature,
      windspeed: current?.windspeed,
      winddirection: current?.winddirection,
      weathercode: current?.weathercode,
      sunrise: daily?.sunrise?.[0],
      sunset: daily?.sunset?.[0],
      tempMax: daily?.temperature_2m_max?.[0],
      tempMin: daily?.temperature_2m_min?.[0],
      forecast
    });
  }, []);

  const fetchAir = useCallback(async (location: GeoResult) => {
    const signal = abortRef.current?.signal;
    const url = new URL('https://air-quality-api.open-meteo.com/v1/air-quality');
    url.searchParams.set('latitude', location.latitude.toString());
    url.searchParams.set('longitude', location.longitude.toString());
    url.searchParams.set('current', 'us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,ozone');
    url.searchParams.set('timezone', 'auto');

    const response = await fetch(url.toString(), { signal });
    if (!response.ok) {
      throw new Error('Air quality service is unavailable.');
    }
    const data = await response.json();
    const current = data.current || {};

    setAir({
      aqi: current.us_aqi,
      pm10: current.pm10,
      pm25: current.pm2_5,
      co: current.carbon_monoxide,
      no2: current.nitrogen_dioxide,
      o3: current.ozone,
      time: current.time
    });
  }, []);

  const fetchWiki = useCallback(async (location: GeoResult) => {
    const signal = abortRef.current?.signal;
    const normalizedTitle = location.name;
    let title = normalizedTitle;

    const summaryRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`, {
      signal
    });
    let summary = null;
    if (summaryRes.ok) {
      summary = await summaryRes.json();
    }

    if (!summary || summary.type === 'disambiguation') {
      const searchUrl = new URL('https://en.wikipedia.org/w/api.php');
      searchUrl.searchParams.set('action', 'query');
      searchUrl.searchParams.set('list', 'search');
      searchUrl.searchParams.set('srsearch', `${location.name} ${location.country}`);
      searchUrl.searchParams.set('srlimit', '5');
      searchUrl.searchParams.set('format', 'json');
      searchUrl.searchParams.set('origin', '*');

      const searchRes = await fetch(searchUrl.toString(), { signal });
      if (!searchRes.ok) {
        throw new Error('Wikipedia search is unavailable.');
      }
      const searchData = await searchRes.json();
      const hits = searchData.query?.search || [];
      const match = hits.find((entry: any) => entry.title.toLowerCase() === location.name.toLowerCase()) || hits[0];
      if (!match?.title) {
        setWiki(null);
        return;
      }

      title = match.title;
      const fallbackRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`, {
        signal
      });
      if (!fallbackRes.ok) {
        throw new Error('Wikipedia summary is unavailable.');
      }
      summary = await fallbackRes.json();
    }

    let wikidataItem: string | undefined;
    const propsUrl = new URL('https://en.wikipedia.org/w/api.php');
    propsUrl.searchParams.set('action', 'query');
    propsUrl.searchParams.set('prop', 'pageprops');
    propsUrl.searchParams.set('titles', title);
    propsUrl.searchParams.set('format', 'json');
    propsUrl.searchParams.set('origin', '*');

    const propsRes = await fetch(propsUrl.toString(), { signal });
    if (propsRes.ok) {
      const propsData = await propsRes.json();
      const pages = propsData.query?.pages || {};
      const page = Object.values(pages)[0] as any;
      wikidataItem = page?.pageprops?.wikibase_item;
    }

    let population: number | undefined;
    let areaKm2: number | undefined;
    let elevationM: number | undefined;
    let inception: string | undefined;

    if (wikidataItem) {
      const wikidataRes = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${wikidataItem}.json`, {
        signal
      });
      if (wikidataRes.ok) {
        const wikidata = await wikidataRes.json();
        const entity = wikidata.entities?.[wikidataItem];
        const claims = entity?.claims || {};
        const populationClaim = claims.P1082?.[0]?.mainsnak?.datavalue?.value;
        const areaClaim = claims.P2046?.[0]?.mainsnak?.datavalue?.value;
        const elevationClaim = claims.P2044?.[0]?.mainsnak?.datavalue?.value;
        const inceptionClaim = claims.P571?.[0]?.mainsnak?.datavalue?.value;

        population = parseWikidataAmount(populationClaim);
        const rawArea = parseWikidataAmount(areaClaim);
        if (rawArea !== undefined) {
          areaKm2 = rawArea > 10000 ? rawArea / 1_000_000 : rawArea;
        }
        elevationM = parseWikidataAmount(elevationClaim);
        inception = parseWikidataDate(inceptionClaim);
      }
    }

    setWiki({
      title: summary.title || title,
      extract: summary.extract || 'No summary available.',
      url: summary.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
      population,
      areaKm2,
      elevationM,
      inception
    });
  }, []);

  const fetchQuakes = useCallback(async (location: GeoResult) => {
    const signal = abortRef.current?.signal;
    const response = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson', { signal });
    if (!response.ok) {
      throw new Error('Earthquake feed is unavailable.');
    }
    const data = await response.json();
    const quakes = (data.features || []) as Array<any>;
    const enriched = quakes
      .map((feature) => {
        const coords = feature.geometry?.coordinates || [];
        const lon = coords[0];
        const lat = coords[1];
        const distanceKm = haversineKm(location.latitude, location.longitude, lat, lon);
        return {
          title: feature.properties?.title || 'Unknown event',
          place: feature.properties?.place || 'Unknown location',
          time: feature.properties?.time || 0,
          magnitude: feature.properties?.mag ?? 0,
          distanceKm
        } as QuakeResult;
      })
      .filter((entry) => Number.isFinite(entry.distanceKm))
      .sort((a, b) => a.distanceKm - b.distanceKm);

    const nearby = enriched.find((entry) => entry.distanceKm <= 500);
    setQuake(nearby || enriched[0] || null);
  }, []);

  const fetchRecentLocalQuake = useCallback(async (location: GeoResult) => {
    const signal = abortRef.current?.signal;
    const end = new Date();
    const start = new Date(end.getTime() - 1000 * 60 * 60 * 24 * 30);
    const url = new URL('https://earthquake.usgs.gov/fdsnws/event/1/query');
    url.searchParams.set('format', 'geojson');
    url.searchParams.set('starttime', start.toISOString().slice(0, 10));
    url.searchParams.set('endtime', end.toISOString().slice(0, 10));
    url.searchParams.set('latitude', location.latitude.toString());
    url.searchParams.set('longitude', location.longitude.toString());
    url.searchParams.set('maxradiuskm', '50');
    url.searchParams.set('orderby', 'time');

    const response = await fetch(url.toString(), { signal });
    if (!response.ok) {
      throw new Error('Local seismic history is unavailable.');
    }
    const data = await response.json();
    const feature = data.features?.[0];
    if (!feature) {
      setRecentLocalQuake(null);
      return;
    }
    const coords = feature.geometry?.coordinates || [];
    const lon = coords[0];
    const lat = coords[1];
    const distanceKm = haversineKm(location.latitude, location.longitude, lat, lon);
    setRecentLocalQuake({
      title: feature.properties?.title || 'Recent event',
      place: feature.properties?.place || 'Unknown location',
      time: feature.properties?.time || 0,
      magnitude: feature.properties?.mag ?? 0,
      distanceKm
    });
  }, []);

  const fetchAll = useCallback(
    async (location: GeoResult) => {
      const results = await Promise.allSettled([
        fetchWeather(location),
        fetchAir(location),
        fetchWiki(location),
        fetchQuakes(location),
        fetchRecentLocalQuake(location)
      ]);
      const failed = results.filter((result) => result.status === 'rejected').length;
      if (failed === results.length) {
        throw new Error('All data sources are unavailable.');
      }
      setLastUpdated(new Date());
      return { failed, total: results.length };
    },
    [fetchAir, fetchQuakes, fetchRecentLocalQuake, fetchWeather, fetchWiki]
  );

  const fetchGeocode = useCallback(async (target: string) => {
    const signal = abortRef.current?.signal;
    const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
    url.searchParams.set('name', target);
    url.searchParams.set('count', '1');
    url.searchParams.set('language', 'en');
    url.searchParams.set('format', 'json');

    const response = await fetch(url.toString(), { signal });
    if (!response.ok) {
      throw new Error('Geocoding service is unavailable.');
    }
    const data = await response.json();
    const result = data.results?.[0];
    if (!result) {
      throw new Error('No results for that location.');
    }

    return {
      name: result.name,
      country: result.country,
      admin1: result.admin1,
      latitude: result.latitude,
      longitude: result.longitude,
      timezone: result.timezone
    } as GeoResult;
  }, []);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      setIsLoading(true);
      setError(null);
      resetTimers();

      if (abortRef.current) {
        abortRef.current.abort();
      }
      abortRef.current = new AbortController();

      try {
        const geoResult = await fetchGeocode(activeQuery);
        if (!mounted) return;
        setGeo(geoResult);
        await fetchAll(geoResult);
        if (!mounted) return;

        weatherTimer.current = window.setInterval(() => fetchWeather(geoResult), WEATHER_REFRESH_MS);
        airTimer.current = window.setInterval(() => fetchAir(geoResult), AIR_REFRESH_MS);
        quakeTimer.current = window.setInterval(() => fetchQuakes(geoResult), QUAKE_REFRESH_MS);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Something went wrong.');
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    run();

    return () => {
      mounted = false;
      resetTimers();
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [activeQuery, fetchAir, fetchAll, fetchGeocode, fetchQuakes, fetchWeather, resetTimers]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const cleaned = query.trim();
    if (cleaned.length > 0 && cleaned !== activeQuery) {
      setActiveQuery(cleaned);
    }
  };

  const locationLabel = geo
    ? `${geo.name}${geo.admin1 ? `, ${geo.admin1}` : ''}, ${geo.country}`
    : activeQuery;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 rounded-2xl border border-neutral-800 bg-neutral-900/30 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">City information dashboard</p>
            <h2 className="text-2xl font-semibold text-white">{locationLabel}</h2>
            <p className="text-sm text-neutral-400">Weather, air quality, seismic, and Wikipedia context in one place.</p>
          </div>
          <div className="w-full max-w-sm md:max-w-[240px]">
            <div
              className="relative isolate z-0 h-36 w-full overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950/70"
              onMouseEnter={() => {
                mapHoverRef.current = true;
                if (geo && mapInstanceRef.current) {
                  mapInstanceRef.current.flyTo([geo.latitude, geo.longitude], MAP_ZOOM_IN, { duration: 1.4 });
                }
              }}
              onMouseLeave={() => {
                mapHoverRef.current = false;
                if (geo && mapInstanceRef.current) {
                  mapInstanceRef.current.flyTo([geo.latitude, geo.longitude], MAP_ZOOM_OUT, { duration: 1.4 });
                }
              }}
            >
              <div ref={mapContainerRef} className="absolute inset-0 pointer-events-none z-0" />
              <div className="absolute bottom-2 left-2 rounded-full border border-neutral-800 bg-neutral-900/80 px-2 py-1 text-[10px] uppercase tracking-widest text-neutral-400">
                Map
              </div>
            </div>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Enter a city or region"
            className="flex-1 rounded-lg border border-neutral-800 bg-neutral-950/70 px-4 py-2 text-sm text-neutral-200 focus:border-neutral-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-neutral-200"
          >
            Search
          </button>
        </form>
        <div className="flex flex-wrap gap-3 text-xs text-neutral-400">
          <span>Local time: {localTime}</span>
          {lastUpdated && <span>Last update: {lastUpdated.toLocaleTimeString('en-GB')}</span>}
          {geo && <span>Lat {formatNumber(geo.latitude, 3)} / Lon {formatNumber(geo.longitude, 3)}</span>}
        </div>
        {error && (
          <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/30 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Weather</h3>
            <span className="text-xs uppercase tracking-wider text-neutral-500">Open-Meteo</span>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-neutral-400">Temperature</p>
              <p className="text-3xl font-semibold text-white">{formatNumber(weather?.temperature)}°C</p>
              <p className="text-xs text-neutral-500">{weather ? getWeatherLabel(weather.weathercode) : '—'}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-400">Wind</p>
              <p className="text-lg text-neutral-100">{formatNumber(weather?.windspeed)} km/h</p>
              <p className="text-xs text-neutral-500">Direction {formatNumber(weather?.winddirection, 0)}°</p>
            </div>
            <div>
              <p className="text-sm text-neutral-400">High / Low</p>
              <p className="text-lg text-neutral-100">
                {formatNumber(weather?.tempMax)}° / {formatNumber(weather?.tempMin)}°
              </p>
            </div>
            <div>
              <p className="text-sm text-neutral-400">Sunrise / Sunset</p>
              <p className="text-lg text-neutral-100">
                {formatClock(weather?.sunrise)} / {formatClock(weather?.sunset)}
              </p>
            </div>
          </div>
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-white">Next 7 days</h4>
              <span className="text-xs uppercase tracking-wider text-neutral-500">Daily</span>
            </div>
            <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
              {(weather?.forecast || []).map((day) => (
                <div
                  key={day.date}
                  className="min-w-[160px] rounded-xl border border-neutral-800/80 bg-neutral-950/40 p-4"
                >
                  <div className="text-xs uppercase tracking-wider text-neutral-500">
                    {new Date(day.date).toLocaleDateString('en-GB', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                  <div className="mt-2 text-lg font-semibold text-white">
                    {formatNumber(day.tempMax)}° / {formatNumber(day.tempMin)}°
                  </div>
                  <div className="mt-1 text-xs text-neutral-400">{getWeatherLabel(day.weathercode ?? 0)}</div>
                  <div className="mt-3 space-y-1 text-xs text-neutral-400">
                    <div>Precip: {formatNumber(day.precipSum)} mm</div>
                    <div>Chance: {formatNumber(day.precipProb, 0)}%</div>
                    <div>Wind: {formatNumber(day.windMax)} km/h</div>
                    <div>Gusts: {formatNumber(day.gustsMax)} km/h</div>
                  </div>
                </div>
              ))}
              {(!weather?.forecast || weather.forecast.length === 0) && (
                <div className="text-sm text-neutral-400">Forecast unavailable.</div>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/30 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Air quality</h3>
            <a
              href="https://open-meteo.com/"
              target="_blank"
              rel="noreferrer"
              className="text-xs uppercase tracking-wider text-neutral-500 hover:text-neutral-300"
            >
              Open-Meteo
            </a>
          </div>
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-sm text-neutral-400">US AQI</p>
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-3xl font-semibold text-white">{formatNumber(air?.aqi, 0)}</p>
                {aqiMeta && (
                  <span
                    className={`rounded-full border px-3 py-1 text-xs uppercase tracking-wider ${getAqiColorClasses(
                      aqiMeta.color
                    )}`}
                  >
                    {aqiMeta.label}
                  </span>
                )}
              </div>
              <div className="mt-2 flex gap-1">
                {Array.from({ length: 6 }).map((_, index) => (
                  <span
                    key={index}
                    className={`h-1.5 flex-1 rounded-full ${
                      aqiMeta && index <= aqiMeta.index ? getAqiBarColor(aqiMeta.color) : 'bg-neutral-800'
                    }`}
                  />
                ))}
              </div>
              <p className="mt-2 text-xs text-neutral-400">{aqiMeta?.guidance || 'AQI unavailable.'}</p>
              <p className="mt-2 text-xs text-neutral-500">
                {dominantPollutant ? `Driver: ${dominantPollutant}` : 'Driver: —'}
              </p>
            </div>
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500">
                <span className="uppercase tracking-wider">Current concentrations</span>
                <span>Instantaneous estimate; health categories use AQI.</span>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-neutral-800/70 bg-neutral-950/40 px-3 py-2">
                  <p className="text-xs uppercase tracking-wider text-neutral-500">PM2.5</p>
                  <p className="text-sm text-neutral-100">{formatNumber(air?.pm25)} μg/m³</p>
                </div>
                <div className="rounded-lg border border-neutral-800/70 bg-neutral-950/40 px-3 py-2">
                  <p className="text-xs uppercase tracking-wider text-neutral-500">PM10</p>
                  <p className="text-sm text-neutral-100">{formatNumber(air?.pm10)} μg/m³</p>
                </div>
                <div className="rounded-lg border border-neutral-800/70 bg-neutral-950/40 px-3 py-2">
                  <p className="text-xs uppercase tracking-wider text-neutral-500">O₃</p>
                  <p className="text-sm text-neutral-100">{formatNumber(air?.o3)} μg/m³</p>
                </div>
                <div className="rounded-lg border border-neutral-800/70 bg-neutral-950/40 px-3 py-2">
                  <p className="text-xs uppercase tracking-wider text-neutral-500">NO₂</p>
                  <p className="text-sm text-neutral-100">{formatNumber(air?.no2)} μg/m³</p>
                </div>
                <div className="rounded-lg border border-neutral-800/70 bg-neutral-950/40 px-3 py-2">
                  <p className="text-xs uppercase tracking-wider text-neutral-500">CO</p>
                  <p className="text-sm text-neutral-100">
                    {air?.co !== undefined ? formatNumber(air.co / 1000, 2) : '—'} mg/m³
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-neutral-400">
            <span>{locationLabel}</span>
            <span>Updated {formatLocalTime(air?.time, geo?.timezone)} local</span>
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/30 p-6 md:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Wikipedia snapshot</h3>
            <span className="text-xs uppercase tracking-wider text-neutral-500">MediaWiki</span>
          </div>
          <div className="mt-4">
            <p className="text-lg font-semibold text-white">{wiki?.title || 'No entry found'}</p>
            <p className="mt-2 text-sm leading-relaxed text-neutral-300">
              {wiki?.extract || 'We could not find a nearby Wikipedia entry.'}
            </p>
            <div className="mt-4 grid gap-3 text-xs text-neutral-400 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="uppercase tracking-wider text-neutral-500">Population</p>
                <p className="text-sm text-neutral-200">{formatPopulation(wiki?.population)}</p>
              </div>
              <div>
                <p className="uppercase tracking-wider text-neutral-500">Area</p>
                <p className="text-sm text-neutral-200">{formatArea(wiki?.areaKm2)}</p>
              </div>
              <div>
                <p className="uppercase tracking-wider text-neutral-500">Elevation</p>
                <p className="text-sm text-neutral-200">
                  {wiki?.elevationM ? `${formatNumber(wiki.elevationM, 0)} m` : '—'}
                </p>
              </div>
              <div>
                <p className="uppercase tracking-wider text-neutral-500">Established</p>
                <p className="text-sm text-neutral-200">{wiki?.inception || '—'}</p>
              </div>
            </div>
            {wiki?.url && (
              <a
                href={wiki.url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex text-sm text-neutral-200 underline-offset-4 hover:underline"
              >
                Read more on Wikipedia
              </a>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/30 p-6 md:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Nearest seismic activity</h3>
            <span className="text-xs uppercase tracking-wider text-neutral-500">USGS (last 24h)</span>
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-neutral-400">Closest event</p>
              <p className="text-lg font-semibold text-white">{quake?.title || 'No events found'}</p>
              <p className="text-xs text-neutral-500">
                {quake
                  ? `${formatNumber(quake.distanceKm, 0)} km away · M${formatNumber(quake.magnitude, 1)} · ${
                      quake.place
                    }`
                  : 'Check back later.'}
              </p>
              {quake && quake.distanceKm > 500 && (
                <p className="mt-2 text-xs text-neutral-500">
                  No seismic activity detected within 500 km in the last 24 hours.
                </p>
              )}
            </div>
            {quake && (
              <div className="text-xs text-neutral-400">
                {new Date(quake.time).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
              </div>
            )}
          </div>
          <div className="mt-4 border-t border-neutral-800 pt-4 text-xs text-neutral-400">
            {recentLocalQuake ? (
              <span>
                Last event within 50 km (last 30 days): {new Date(recentLocalQuake.time).toLocaleDateString('en-GB')} · M
                {formatNumber(recentLocalQuake.magnitude, 1)}
              </span>
            ) : (
              <span>No events within 50 km in the last 30 days.</span>
            )}
          </div>
        </section>
      </div>

      {isLoading && (
        <div className="text-xs uppercase tracking-[0.3em] text-neutral-500">Loading live sources…</div>
      )}
    </div>
  );
};

export default LocationPulseDashboard;
