import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import CityMap from "../../src/components/CityMap";
import { english } from "../../src/lib/i18n";
import { hindi } from "../../src/lib/hi";
import "../../src/styles.css";

const t = new URLSearchParams(location.search).get("lang") === "hi" ? hindi : english;
createRoot(document.getElementById("root")!).render(<StrictMode><main style={{ maxWidth: 800, margin: "auto", padding: 16 }}>
  <CityMap place={{ name: "Haldwani", district: "Nainital", state: "Uttarakhand", latitude: 29.22, longitude: 79.53, scope: "place", source: "Open-Meteo geocoding (GeoNames)" }} clusters={[]} copy={t} />
</main></StrictMode>);
