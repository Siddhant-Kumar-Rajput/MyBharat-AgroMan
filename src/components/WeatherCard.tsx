import { useEffect, useState } from "react";
import { CloudRain, Droplets, ExternalLink, Thermometer, Wind } from "lucide-react";
import type { FarmLocation, WeatherSummary } from "../../shared/domain";
import type { Copy } from "../lib/i18n";
import { demo, request } from "../lib/api";

type Props = { copy: Copy; location?: FarmLocation; onError?: (message: string) => void };

function metric(value: number | null, suffix: string) {
  return value === null ? "—" : `${Math.round(value)}${suffix}`;
}

export function WeatherCard({ copy: t, location, onError }: Props) {
  const [weather, setWeather] = useState<WeatherSummary>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!location?.state || !location.district) {
      setWeather(undefined);
      return;
    }
    if (demo) {
      setWeather(undefined);
      return;
    }
    let cancelled = false;
    setBusy(true);
    const query = new URLSearchParams({ state: location.state, district: location.district, locality: location.locality || "", pincode: location.pincode || "" });
    request<WeatherSummary>(`weather?${query}`)
      .then((value) => { if (!cancelled) setWeather(value); })
      .catch((error) => { if (!cancelled) onError?.(error instanceof Error ? error.message : t.error); })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [location?.state, location?.district, location?.locality, location?.pincode]);

  return (
    <article className="dashboard-card weather-card">
      <div className="weather-heading"><div><p className="card-label"><CloudRain size={16} />{t.weatherTitle}</p><h2>{weather?.location || location?.locality || location?.district || t.weatherUnavailable}</h2></div>{weather && <span>{t.weatherModelEstimate}</span>}</div>
      {busy ? <p>{t.weatherLoading}</p> : !weather ? <p>{t.weatherUnavailable}</p> : <>
        <p className="weather-resolution">{t.weatherResolvedAs}: {weather.latitude.toFixed(2)}, {weather.longitude.toFixed(2)}</p>
        <div className="weather-now">
          <div><Thermometer /><strong>{metric(weather.temperatureC, "°C")}</strong><span>{t.weatherTemperature}</span></div>
          <div><Droplets /><strong>{metric(weather.humidityPercent, "%")}</strong><span>{t.weatherHumidity}</span></div>
          <div><CloudRain /><strong>{metric(weather.precipitationMm, " mm")}</strong><span>{t.weatherRain}</span></div>
          <div><Wind /><strong>{metric(weather.windKph, " km/h")}</strong><span>{t.weatherWind}</span></div>
        </div>
        <div className="weather-days" aria-label={t.weatherNextDays}>{weather.daily.map((day) => <div key={day.date}><time>{new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(new Date(`${day.date}T12:00:00`))}</time><strong>{metric(day.maxC, "°")}</strong><span>{metric(day.rainMm, " mm")}</span></div>)}</div>
        <small>{t.weatherSourceNote} <a href={weather.sourceUrl} target="_blank" rel="noreferrer">{weather.source}<ExternalLink size={12} /></a></small>
      </>}
    </article>
  );
}
