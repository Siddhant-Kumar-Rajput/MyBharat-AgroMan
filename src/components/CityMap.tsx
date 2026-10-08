import { useEffect, useRef, useState } from "react";
import { map as createMap, tileLayer, marker, divIcon, latLngBounds, type Marker, type Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { CommunityMapPlace } from "../../shared/community-map";
import type { Cluster } from "../../shared/domain";
import type { Copy } from "../lib/i18n";
import { signalPresentation } from "../../shared/community-review";

export default function CityMap({ place, clusters, copy: t, focusedSignal, onSignalFocus }: { place: CommunityMapPlace; clusters: Cluster[]; copy: Copy; focusedSignal?: string; onSignalFocus?: (id: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const instance = useRef<LeafletMap | null>(null);
  const signalMarkers = useRef(new Map<string, Marker>());
  const [visibleSignals, setVisibleSignals] = useState(0);
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
      const presentation = signalPresentation(cluster);
      const badge = document.createElement("span");
      badge.className = "signal-marker-count";
      badge.textContent = String(cluster.count);
      const pin = marker([cluster.lat, cluster.lon], {
        icon: divIcon({ className: `signal-marker ${presentation.tone} ${cluster.origin === "demo" ? "synthetic-signal" : ""}`, html: badge, iconSize: [44, 44], iconAnchor: [22, 22] }),
        title: `${cluster.name} · ${t[presentation.label]} · ${cluster.count} ${t.reports}`,
        alt: `${t.viewSignalOnMap}: ${cluster.name}`, keyboard: true,
      }).addTo(map);
      // Text-only content; never insert an untrusted disease name as HTML.
      const text = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = cluster.name;
      const count = document.createElement("p");
      count.textContent = `${t[presentation.label]} · ${cluster.count} ${t.reports}`;
      const origin = document.createElement("p");
      origin.textContent = cluster.origin === "demo" ? t.synthetic : cluster.reviews?.length ? t.communityAssessment : t.liveSignal;
      const notice = document.createElement("small");
      notice.textContent = t.reportNotice;
      text.append(title, count, origin, notice);
      for (const review of cluster.reviews ?? []) {
        const details = document.createElement("details");
        details.addEventListener("toggle", () => pin.getPopup()?.update());
        const summary = document.createElement("summary"); summary.textContent = t.communityAssessment;
        const date = document.createElement("small"); date.textContent = `${t.communityReviewDate}: ${new Date(review.reviewedAt).toLocaleString()}`;
        const assessment = document.createElement("p"); assessment.textContent = review.summary;
        const heading = document.createElement("strong"); heading.textContent = t.communityPrevention;
        const steps = document.createElement("ul");
        for (const step of review.prevention) { const li = document.createElement("li"); li.textContent = step; steps.append(li); }
        details.append(summary, date, assessment, heading, steps);
        for (const source of review.sources) { const link = document.createElement("a"); link.href = source; link.textContent = `${t.authoritativeSource}: ${new URL(source).hostname}`; link.target = "_blank"; link.rel = "noopener noreferrer"; details.append(link, document.createElement("br")); }
        text.append(details);
      }
      pin.bindPopup(text, { maxWidth: 240, autoPan: true });
      pin.on("click", () => onSignalFocus?.(cluster.id));
      signalMarkers.current.set(cluster.id, pin);
      return pin;
    });
    const update = () => setVisibleSignals(clusters.filter((cluster) => map.getBounds().contains([cluster.lat, cluster.lon])).length);
    update();
    map.on("moveend", update);
    return () => { map.off("moveend", update); markers.forEach((pin) => pin.remove()); signalMarkers.current.clear(); };
  }, [clusters, t, place.latitude, place.longitude, place.scope, retry, onSignalFocus]);

  useEffect(() => {
    const map = instance.current;
    const pin = focusedSignal ? signalMarkers.current.get(focusedSignal) : undefined;
    if (map && pin) { map.setView(pin.getLatLng(), 12, { animate: false }); pin.openPopup(); }
  }, [focusedSignal, clusters, retry]);

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
      {clusters.length > 0 && <button className="text-button" onClick={() => instance.current?.fitBounds(latLngBounds(clusters.map((cluster) => [cluster.lat, cluster.lon])), { padding: [34, 34], maxZoom: 12, animate: false })}>{t.showMapSignals}</button>}
    </div>
    <div className="signal-map-legend" aria-label={t.signalLegend}>{([ ["unreviewed", "communityUnreviewed"], ["pending", "communityPending"], ["monitor", "communityWatch"], ["hazard", "communitySpreading"], ["cleared", "communityResolved"] ] as const).map(([tone, label]) => <span key={tone}><i className={tone} />{t[label]}</span>)}</div>
    {clusters.length > visibleSignals && <p className="city-map-note">{t.signalsOutsideMap}</p>}
    <p className="city-map-note">{t.cityMapScopeNote}</p>
    <small className="city-map-provider">{t.cityMapPrivacy}</small>
  </section>;
}
