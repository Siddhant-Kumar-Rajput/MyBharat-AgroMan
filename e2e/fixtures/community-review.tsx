import { useState } from "react";
import { createRoot } from "react-dom/client";
import CityMap from "../../src/components/CityMap";
import { CommunityExpertCases } from "../../src/components/CommunityExpertCases";
import { english } from "../../src/lib/i18n";
import { hindi } from "../../src/lib/hi";
import type { CommunityCase } from "../../shared/community-review";
import "../../src/styles.css";

const t =
  new URLSearchParams(location.search).get("lang") === "hi" ? hindi : english;
function Fixture() {
  const [cases, setCases] = useState<CommunityCase[]>([
    {
      id: "test-only",
      reference: "DEMO-TEST",
      districtId: "IN:Uttarakhand:Nainital",
      crop: "RICE",
      diseaseName: "Synthetic leaf concern",
      confidence: 0.8,
      evidence: ["Synthetic spots"],
      createdAt: Date.now(),
      version: 0,
      priority: "standard",
    },
  ]);
  return (
    <main style={{ maxWidth: 800, margin: "auto", padding: 16 }}>
      <p>{t.synthetic}</p>
      <CityMap
        copy={t}
        place={{
          name: "Haldwani",
          district: "Nainital",
          state: "Uttarakhand",
          latitude: 29.22,
          longitude: 79.53,
          scope: "place",
          source: "Open-Meteo geocoding (GeoNames)",
        }}
        clusters={cases.map((item) => ({
          id: item.id,
          districtId: item.districtId,
          name: item.diseaseName,
          count: 1,
          lat: 29.22,
          lon: 79.53,
          origin: "demo",
          status: "observation",
          awaitingReview: !item.review,
          reviews: item.review ? [item.review] : [],
        }))}
      />
      <CommunityExpertCases
        copy={t}
        cases={cases}
        onPublish={async (item, input) => {
          setCases((previous) =>
            previous.map((entry) =>
              entry.id === item.id
                ? {
                    ...entry,
                    version: entry.version + 1,
                    review: {
                      risk: input.risk,
                      summary: input.summary,
                      prevention: input.prevention,
                      sources: input.sources,
                      reviewedAt: Date.now(),
                    },
                  }
                : entry,
            ),
          );
        }}
      />
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Fixture />);
