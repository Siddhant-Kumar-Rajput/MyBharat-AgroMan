import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import CityMap from "../../src/components/CityMap";
import { english } from "../../src/lib/i18n";
import { hindi } from "../../src/lib/hi";
import "../../src/styles.css";
import { clusterReports, type Cluster } from "../../shared/domain";
import { demoReports } from "../../src/lib/api";

const t = new URLSearchParams(location.search).get("lang") === "hi" ? hindi : english;
function Fixture() {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [focus, setFocus] = useState<string>();
  return <main style={{ maxWidth: 800, margin: "auto", padding: 16 }}>
    <button onClick={() => setClusters(clusterReports(demoReports("IN:Uttarakhand:Nainital", { lat: 29.22, lon: 79.53 }, t.sampleDiseaseName)))}>{t.previewExamples}</button>
    <button onClick={() => { setClusters((items) => [...items, { id: "new-live-test", districtId: "IN:Uttarakhand:Nainital", name: "Test observation", count: 1, lat: 29.22, lon: 79.53, status: "observation", origin: "live" }]); setFocus("new-live-test"); }}>{t.viewSignalOnMap}</button>
    <CityMap place={{ name: "Haldwani", district: "Nainital", state: "Uttarakhand", latitude: 29.22, longitude: 79.53, scope: "place", source: "Open-Meteo geocoding (GeoNames)" }} clusters={clusters} copy={t} focusedSignal={focus} onSignalFocus={setFocus} />
  </main>;
}
createRoot(document.getElementById("root")!).render(<StrictMode><Fixture /></StrictMode>);
