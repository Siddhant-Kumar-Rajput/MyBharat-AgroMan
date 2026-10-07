import { describe, it, expect } from "vitest";
import {
  clusterReports,
  distanceKm,
  adviceSchema,
  rotateThreads,
  newThread,
  languages,
  confidenceBand,
  cropCycleInputSchema,
  cycleEventInputSchema,
  profileInputSchema,
  postalWeatherLocality,
  selectDistrictGeocodeMatch,
  matchCases,
  summarizeLedger,
  triageCase,
  type CropHealthCase,
  type LedgerEntry,
  type Report,
} from "../shared/domain";
const now = Date.now();
function report(id: string, overrides: Partial<Report> = {}): Report {
  return {
    id,
    installation: id,
    districtId: "PB-LDH",
    crop: "RICE",
    diseaseCode: "BLIGHT",
    name: "Blight",
    confidence: 0.85,
    lat: 30.9,
    lon: 75.85,
    timestamp: now,
    origin: "live",
    ...overrides,
  };
}

describe("PIN-aware weather location", () => {
  const offices = [
    { name: "Anandpur", block: "Haldwani", district: "Nainital", state: "Uttarakhand", pincode: "263139" },
    { name: "Bail Parao", block: "Ramnagar", district: "Nainital", state: "Uttarakhand", pincode: "263139" },
    { name: "Fathepur", block: "NA", district: "Nainital", state: "Uttarakhand", pincode: "263139" },
  ];

  it("uses the selected post office parent town instead of the district hill city", () => {
    expect(postalWeatherLocality(offices, {
      state: "Uttarakhand",
      district: "Nainital",
      locality: "Anandpur",
      pincode: "263139",
    })).toBe("Haldwani");
    expect(postalWeatherLocality(offices, {
      state: "Uttarakhand",
      district: "Nainital",
      locality: "Bail Parao",
      pincode: "263139",
    })).toBe("Ramnagar");
  });

  it("does not silently use a different PIN locality", () => {
    expect(postalWeatherLocality(offices, {
      state: "Uttarakhand",
      district: "Nainital",
      locality: "Nainital",
      pincode: "263139",
    })).toBeNull();
  });

  it("validates the geocoder result against both saved state and district", () => {
    const correct = { name: "Haldwani", latitude: 29.22, longitude: 79.53, admin1: "Uttarakhand", admin2: "Naini Tal" };
    const wrong = { name: "Haldwani", latitude: 30.1, longitude: 78.2, admin1: "Uttarakhand", admin2: "Dehradun" };
    expect(selectDistrictGeocodeMatch([wrong, correct], { state: "Uttarakhand", district: "Nainital" })).toEqual(correct);
  });
});

describe("outbreak detection", () => {
  it("requires three distinct installations", () => {
    expect(
      clusterReports([report("1"), report("2"), report("3")], now)[0].status,
    ).toBe("potential");
    expect(
      clusterReports(
        [
          report("1"),
          report("2", { installation: "1" }),
          report("3", { installation: "1" }),
        ],
        now,
      )[0].status,
    ).toBe("observation");
  });
  it("excludes old, future and low-confidence reports", () => {
    expect(
      clusterReports(
        [
          report("1", { timestamp: now - 8 * 86400000 }),
          report("2", { confidence: 0.74 }),
          report("3", { timestamp: now + 100 }),
        ],
        now,
      ),
    ).toHaveLength(0);
  });
  it("separates district, crop, disease and synthetic data", () => {
    const reports = [
      report("1"),
      report("2", { districtId: "MH-PUN" }),
      report("3", { crop: "WHEAT" }),
      report("4", { diseaseCode: "RUST" }),
      report("5", { origin: "demo" }),
    ];
    expect(clusterReports(reports, now)).toHaveLength(5);
  });
  it("does not chain reports beyond the radius", () => {
    expect(
      clusterReports(
        [report("1"), report("2", { lat: 30.96 }), report("3", { lat: 31.02 })],
        now,
      ).every((c) => c.status !== "potential"),
    ).toBe(true);
  });
  it("counts threshold confidence and current reports", () => {
    expect(
      clusterReports([report("1", { confidence: 0.75 })], now),
    ).toHaveLength(1);
  });
  it("places an aggregate signal at its reports' geographic centroid", () => {
    const [cluster] = clusterReports(
      [
        report("1", { lat: 30.9, lon: 75.8 }),
        report("2", { lat: 30.92, lon: 75.84 }),
        report("3", { lat: 30.94, lon: 75.88 }),
      ],
      now,
    );
    expect(cluster.lat).toBeCloseTo(30.92, 5);
    expect(cluster.lon).toBeCloseTo(75.84, 5);
  });
  it("calculates geographic distance", () => {
    expect(distanceKm({ lat: 0, lon: 0 }, { lat: 1, lon: 0 })).toBeCloseTo(
      111.19,
      1,
    );
  });
});
describe("request and session contracts", () => {
  it("rotates oldest thread while keeping three", () => {
    const old = [newThread("PB-LDH"), newThread("PB-LDH"), newThread("PB-LDH")];
    const next = newThread("MH-PUN");
    expect(rotateThreads(old, next)).toEqual([next, old[0], old[1]]);
  });
  it("has 22 scheduled languages and English without duplicates", () => {
    expect(languages).toHaveLength(23);
    expect(new Set(languages.map((l) => l[0])).size).toBe(23);
  });
  it("rejects unsupported locale and oversized history", () => {
    const valid = {
      requestId: crypto.randomUUID(),
      threadId: crypto.randomUUID(),
      districtId: "PB-LDH",
      locale: "en",
      text: "What next?",
      history: [],
    };
    expect(adviceSchema.safeParse(valid).success).toBe(true);
    expect(
      adviceSchema.safeParse({ ...valid, locale: "invalid" }).success,
    ).toBe(false);
    expect(
      adviceSchema.safeParse({
        ...valid,
        history: Array(37).fill({ role: "user", text: "hello" }),
      }).success,
    ).toBe(false);
  });
});

describe("phase two farm records", () => {
  it("summarizes expenses, revenue and margin in paise", () => {
    const base = {
      id: crypto.randomUUID(),
      cycleId: crypto.randomUUID(),
      category: "seed" as const,
      occurredOn: "2026-10-01",
      note: "",
      createdAt: now,
    };
    const entries: LedgerEntry[] = [
      { ...base, kind: "expense", amountPaise: 125050 },
      { ...base, id: crypto.randomUUID(), kind: "revenue", category: "sale", amountPaise: 300000 },
    ];
    expect(summarizeLedger(entries)).toEqual({
      expensesPaise: 125050,
      revenuePaise: 300000,
      marginPaise: 174950,
    });
  });

  it("uses explicit confidence bands without calling them certainty", () => {
    expect(confidenceBand(0.74)).toBe("low");
    expect(confidenceBand(0.75)).toBe("moderate");
    expect(confidenceBand(0.9)).toBe("high");
  });

  it("validates priority crop cycles and ISO dates", () => {
    const value = {
      plotId: crypto.randomUUID(),
      cropCode: "RICE",
      variety: "",
      startedOn: "2026-10-01",
      expectedHarvestOn: "",
    };
    expect(cropCycleInputSchema.safeParse(value).success).toBe(true);
    expect(cropCycleInputSchema.safeParse({ ...value, cropCode: "MANGO" }).success).toBe(false);
    expect(cropCycleInputSchema.safeParse({ ...value, startedOn: "tomorrow" }).success).toBe(false);
  });

  it("accepts optional recent crop context in the farmer profile", () => {
    const profile = {
      displayName: "",
      locale: "en",
      state: "Punjab",
      district: "Ludhiana",
      recentCropCode: "WHEAT",
      lastHarvestOn: "2026-04-15",
      consentVersion: "2026-10-01",
    };
    expect(profileInputSchema.safeParse(profile).success).toBe(true);
    expect(profileInputSchema.safeParse({ ...profile, recentCropCode: "MANGO" }).success).toBe(false);
    expect(profileInputSchema.safeParse({ ...profile, lastHarvestOn: "2999-01-01" }).success).toBe(false);
  });

  it("requires structured details for input and harvest events", () => {
    const base = {
      cycleId: crypto.randomUUID(),
      occurredOn: "2026-10-01",
      title: "Farmer record",
      detail: "",
      source: "farmer" as const,
    };
    expect(cycleEventInputSchema.safeParse({
      ...base,
      type: "input",
      inputClass: "fertilizer",
      productName: "Farmer-entered material",
      amount: 25,
      unit: "kg",
      purpose: "Farmer-entered purpose",
    }).success).toBe(true);
    expect(cycleEventInputSchema.safeParse({ ...base, type: "input" }).success).toBe(false);
    expect(cycleEventInputSchema.safeParse({ ...base, type: "harvest", yieldAmount: 12, yieldUnit: "quintal" }).success).toBe(true);
    expect(cycleEventInputSchema.safeParse({ ...base, type: "harvest" }).success).toBe(false);
  });

  it("fast-tracks strong evidence but escalates uncertainty and follow-up", () => {
    expect(triageCase({ confidence: 0.94, symptoms: ["a", "b"], status: "pending_review" })).toMatchObject({
      priority: "standard",
      route: "standard_review",
      reasons: ["high_model_signal"],
    });
    expect(triageCase({ confidence: 0.84, symptoms: ["a"], status: "pending_review" })).toMatchObject({
      priority: "priority",
      route: "priority_review",
      reasons: ["moderate_model_signal", "limited_visible_evidence"],
    });
    expect(triageCase({ confidence: 0.94, symptoms: ["a", "b"], status: "follow_up_due" })).toMatchObject({
      priority: "urgent",
      route: "urgent_review",
      reasons: ["high_model_signal", "follow_up_due"],
    });
  });

  it("retrieves only sufficiently similar closed cases", () => {
    const base: CropHealthCase = {
      id: crypto.randomUUID(),
      reference: "AGM-1",
      cycleId: crypto.randomUUID(),
      cropCode: "RICE",
      diseaseCode: "RICE_BLAST",
      diseaseName: "Rice blast",
      symptoms: ["leaf lesion"],
      confidence: 0.84,
      confidenceBand: "moderate",
      district: "Cuttack",
      cropStage: "vegetative",
      season: "kharif",
      status: "pending_review",
      origin: "synthetic",
      consentVersion: "2026-10-01",
      createdAt: now,
      updatedAt: now,
    };
    const closed = { ...base, id: crypto.randomUUID(), reference: "AGM-2", status: "closed" as const };
    const pending = { ...base, id: crypto.randomUUID(), reference: "AGM-3" };
    expect(matchCases(base, [closed, pending])).toEqual([
      expect.objectContaining({ reference: "AGM-2", score: 98 }),
    ]);
  });
});
