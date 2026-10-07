import { useEffect, useRef, useState } from "react";
import { map as createMap, tileLayer, circleMarker, type Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { CommunityMapPlace } from "../../shared/community-map";
import type { Cluster } from "../../shared/domain";
import type { Copy } from "../lib/i18n";

export default function CityMap({ place, clusters, copy: t }: { place: CommunityMapPlace; clusters: Cluster[]; copy: Copy }) {
  const container = useRef<HTMLDivElement>(null);
  const instance = useRef<LeafletMap | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!container.current) return;
    setStatus("loading");
    const map = createMap(container.current, { scrollWheelZoom: false, zoomControl: false, minZoom: 7, maxZoom: 14 });
    instance.current = map;
    map.attributionControl.setPrefix(false);
    map.setView([place.latitude, place.longitude], place.scope === "district" ? 10 : 12, { animate: false });
    // Browser caching/referrer remain intact. No geolocation, tile prefetch,
    // offline download, locality, identity or PIN is sent to this provider.
    const layer = tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
      maxZoom: 14, keepBuffer: 0,
    });
    let loaded = false;
    layer.on("tileload", () => { loaded = true; setStatus("ready"); });
    layer.on("tileerror", () => { if (!loaded) setStatus("error"); });
    layer.addTo(map);
    const timer = window.setTimeout(() => { if (!loaded) setStatus("error"); }, 15000);
    const observer = new ResizeObserver(() => map.invalidateSize({ animate: false }));
    observer.observe(container.current);
    return () => { window.clearTimeout(timer); observer.disconnect(); map.remove(); instance.current = null; };
  }, [place.latitude, place.longitude, place.scope, retry]);

  useEffect(() => {
    const map = instance.current;
    if (!map) return;
    const markers = clusters.map((cluster) => {
      const marker = circleMarker([cluster.lat, cluster.lon], {
        radius: 12, color: "#ffffff", weight: 3,
        fillColor: cluster.status === "potential" ? "#a9503c" : cluster.status === "watch" ? "#8a631d" : "#396338", fillOpacity: 0.9,
      }).addTo(map);
      // Text-only content; never insert an untrusted disease name as HTML.
      const text = document.createElement("span");
      text.textContent = `${cluster.name}: ${cluster.count} · ${t.reports}`;
      marker.bindTooltip(text);
      return marker;
    });
    return () => { markers.forEach((marker) => marker.remove()); };
  }, [clusters, t.reports, place.latitude, place.longitude, place.scope, retry]);

  return <section className="city-map" aria-label={`${t.cityMapLabel} ${place.name}`}>
    <div className="city-map-heading"><div><h2>{place.name}</h2><p>{place.district}, {place.state}</p></div><span>{place.scope === "district" ? t.districtMapView : t.cityMapView}</span></div>
    <div className="city-map-frame">
      <div ref={container} className="city-map-canvas" />
      {status !== "ready" && <div className="city-map-status" role="status"><p>{status === "loading" ? t.cityMapLoading : t.cityTilesUnavailable}</p>{status === "error" && <button className="secondary" onClick={() => setRetry((value) => value + 1)}>{t.cityMapRetry}</button>}</div>}
    </div>
    <div className="city-map-tools">
      <button className="text-button" aria-label={t.cityMapZoomIn} onClick={() => instance.current?.zoomIn(undefined, { animate: false })}>+</button>
      <button className="text-button" aria-label={t.cityMapZoomOut} onClick={() => instance.current?.zoomOut(undefined, { animate: false })}>−</button>
      <button className="text-button" onClick={() => instance.current?.setView([place.latitude, place.longitude], place.scope === "district" ? 10 : 12, { animate: false })}>{t.cityMapRecenter}</button>
    </div>
    <p className="city-map-note">{t.cityMapScopeNote}</p>
    <small className="city-map-provider">{t.cityMapPrivacy}</small>
  </section>;
}
