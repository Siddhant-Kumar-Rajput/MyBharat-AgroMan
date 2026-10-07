import { describe, expect, it } from "vitest";
import {
  buildFieldOutlook,
  fieldSetupSchema,
  hectares,
  indiaToday,
  photoObservationSchema,
  type FieldBaseline,
} from "../shared/farm-intelligence";
import type { CropCycle, FarmPlot, WeatherSummary } from "../shared/domain";

const id = "00000000-0000-4000-8000-000000000001";
const plot: FarmPlot = {
  id,
  name: "Field",
  area: 2,
  areaUnit: "acre",
  irrigation: "other",
  mechanization: "unspecified",
  state: "Punjab",
  district: "Ludhiana",
  createdAt: 0,
  updatedAt: 0,
};
const base: FieldBaseline = {
  id,
  plotId: id,
  area: 2,
  areaUnit: "acre",
  waterAccess: "supplemental",
  fieldState: "empty",
  previous: {
    cropCode: "RICE",
    harvestedOn: "2026-09-20",
    quantity: 18,
    unit: "quintal",
  },
  createdAt: 0,
};
const cycle: CropCycle = {
  id,
  plotId: id,
  cropCode: "WHEAT",
  variety: "",
  startedOn: "2026-10-01",
  status: "active",
  createdAt: 0,
  updatedAt: 0,
};
function weather(): WeatherSummary {
  return {
    location: "Approximate",
    latitude: 30.9,
    longitude: 75.85,
    temperatureC: 25,
    humidityPercent: 40,
    precipitationMm: 0,
    windKph: 8,
    weatherCode: 0,
    observedAt: "2026-10-07T12:00",
    source: "Open-Meteo",
    sourceUrl: "https://open-meteo.com/",
    kind: "model_estimate",
    daily: Array.from({ length: 5 }, (_, i) => ({
      date: `2026-10-${String(i + 7).padStart(2, "0")}`,
      minC: 18,
      maxC: 28,
      rainMm: 2,
      referenceEt0Mm: 4,
      precipitationProbability: 10,
      weatherCode: 1,
    })),
    history: Array.from({ length: 7 }, (_, i) => ({
      date: `2026-${i ? `10-${String(i).padStart(2, "0")}` : "09-30"}`,
      minC: 18,
      maxC: 28,
      rainMm: 3,
      referenceEt0Mm: 4,
      precipitationProbability: null,
      weatherCode: 1,
    })),
  };
}
const build = (extra: Partial<Parameters<typeof buildFieldOutlook>[0]> = {}) =>
  buildFieldOutlook({
    plot,
    baseline: base,
    cycles: [],
    today: "2026-10-07",
    ...extra,
  });

describe("field decision calculations", () => {
  it("converts area and a reported quintal harvest without predicting future yield", () => {
    expect(hectares(2, "acre")).toBeCloseTo(0.80937128448);
    expect(build().previousYieldTonnesPerHa).toBe(2.22);
    expect(build().areaHa).toBe(0.81);
    expect(build().daysSinceHarvest).toBe(17);
    expect(build().soilStatus).toBe("not_available");
  });
  it("normalizes kilograms and tonnes consistently", () => {
    for (const [quantity, unit] of [
      [1800, "kg"],
      [1.8, "tonne"],
    ] as const)
      expect(
        build({
          baseline: {
            ...base,
            previous: { ...base.previous!, quantity, unit },
          },
        }).previousYieldTonnesPerHa,
      ).toBe(2.22);
  });
  it("distinguishes zero yield from a missing entry", () => {
    expect(
      build({
        baseline: { ...base, previous: { ...base.previous!, quantity: 0 } },
      }).previousYieldTonnesPerHa,
    ).toBe(0);
    expect(
      build({
        baseline: {
          ...base,
          previous: { ...base.previous!, quantity: undefined },
        },
      }).previousYieldTonnesPerHa,
    ).toBeNull();
  });
  it("calculates crop age, not an invented growth-stage or health verdict", () => {
    const outlook = build({ cycles: [cycle] });
    expect(outlook.cropAgeDays).toBe(6);
    expect(outlook.candidates).toEqual([]);
    expect(outlook).not.toHaveProperty("healthy");
    expect(outlook).not.toHaveProperty("growthStage");
  });
  it("detects ambiguous existing cycles instead of choosing one silently", () => {
    expect(
      build({ cycles: [cycle, { ...cycle, id: "other" }] }).fieldState,
    ).toBe("conflicting_cycles");
    expect(
      build({ cycles: [cycle, { ...cycle, id: "other" }] }).cycleId,
    ).toBeNull();
  });
  it("does not apply a different plot's active crop", () =>
    expect(build({ cycles: [{ ...cycle, plotId: "other" }] }).fieldState).toBe(
      "empty",
    ));
  it("uses historic district windows and explains water constraints", () => {
    expect(build().candidates[0]).toMatchObject({
      cropCode: "WHEAT",
      waitDays: 15,
      precision: "calendar",
      waterCheck: false,
      sourceYear: 2011,
    });
    expect(
      build({ baseline: { ...base, waterAccess: "rain_only" } }).candidates[0]
        .waterCheck,
    ).toBe(true);
  });
  it("handles inclusive opening and closing dates", () => {
    expect(build({ today: "2026-10-22" }).candidates[0].waitDays).toBe(0);
    expect(build({ today: "2026-12-07" }).candidates[0].waitDays).toBe(0);
    expect(build({ today: "2026-12-08" }).candidates).toEqual([]);
  });
  it("finds upcoming windows across the year boundary", () => {
    expect(build({ today: "2026-12-31" }).candidates[0]).toMatchObject({
      cropCode: "SUGARCANE",
      start: "2027-02-15",
      waitDays: 46,
    });
  });
  it("does not borrow another state's district calendar", () => {
    expect(build({ plot: { ...plot, state: "Odisha" } }).calendarStatus).toBe(
      "not_available",
    );
    expect(build({ plot: { ...plot, state: "Odisha" } }).candidates).toEqual(
      [],
    );
  });
  it("labels Nainital as a broad seasonal screen, not an exact reviewed calendar", () => {
    expect(
      build({ plot: { ...plot, state: "Uttarakhand", district: "Nainital" } })
        .candidates[0].precision,
    ).toBe("season_screen");
  });
  it("preserves crop-rotation caveats", () => {
    expect(
      build({
        baseline: {
          ...base,
          previous: { ...base.previous!, cropCode: "WHEAT" },
        },
      }).candidates[0].repeatedCrop,
    ).toBe(true);
  });
  it("computes only reference rainfall balance and modeled recent rain", () => {
    expect(build({ weather: weather() }).weather).toMatchObject({
      rainfall5DaysMm: 10,
      referenceEt05DaysMm: 20,
      referenceBalance5DaysMm: -10,
      recentRain7DaysMm: 21,
    });
    expect(build({ weather: weather() }).weather).not.toHaveProperty(
      "irrigationAmount",
    );
  });
  it("does not replace missing weather with zero or synthetic estimates", () => {
    expect(build().weather).toBeNull();
    const missing = weather();
    missing.daily[0].rainMm = null;
    expect(build({ weather: missing }).weather?.rainfall5DaysMm).toBeNull();
    expect(
      build({ weather: missing }).weather?.referenceBalance5DaysMm,
    ).toBeNull();
  });
  it("requires full forecast/history coverage for totals", () => {
    const missing = weather();
    missing.daily.pop();
    missing.history!.pop();
    expect(build({ weather: missing }).weather?.rainfall5DaysMm).toBeNull();
    expect(build({ weather: missing }).weather?.recentRain7DaysMm).toBeNull();
  });
  it("flags a modeled heavy-rain day as a watch, not an official warning", () => {
    const heavy = weather();
    heavy.daily[2].rainMm = 25;
    expect(build({ weather: heavy }).weather?.heavyRainDates).toEqual([
      "2026-10-09",
    ]);
  });
  it("uses Indian local dates at the UTC day boundary", () =>
    expect(indiaToday(Date.parse("2026-10-06T19:00:00Z"))).toBe("2026-10-07"));
});

describe("minimal field input and image-result validation", () => {
  const setup = {
    id,
    area: 2,
    areaUnit: "acre",
    waterAccess: "unknown",
    fieldState: "empty",
  };
  it("accepts an empty field without inventing previous crop dates", () =>
    expect(fieldSetupSchema.parse(setup).previous).toBeUndefined());
  it("requires the current crop for a growing field", () =>
    expect(
      fieldSetupSchema.safeParse({ ...setup, fieldState: "growing" }).success,
    ).toBe(false));
  it("rejects future, invalid, negative and oversized inputs", () => {
    const future = new Date(Date.now() + 86400000 * 5)
      .toISOString()
      .slice(0, 10);
    for (const startedOn of [future, "2026-02-30"])
      expect(
        fieldSetupSchema.safeParse({
          ...setup,
          fieldState: "growing",
          crop: { cropCode: "WHEAT", startedOn },
        }).success,
      ).toBe(false);
    for (const area of [0, -1, 100001])
      expect(fieldSetupSchema.safeParse({ ...setup, area }).success).toBe(
        false,
      );
  });
  it("rejects contradictory empty and growing details", () =>
    expect(
      fieldSetupSchema.safeParse({
        ...setup,
        crop: { cropCode: "WHEAT", startedOn: "2026-01-01" },
      }).success,
    ).toBe(false));
  it("refuses photo judgments when the image needs retaking", () => {
    const output = {
      quality: "retake",
      stage: "vegetative",
      visibleStress: "visible",
      observation: "Blurred",
      nextStep: "retake",
    };
    expect(photoObservationSchema.safeParse(output).success).toBe(false);
    expect(
      photoObservationSchema.safeParse({
        ...output,
        stage: "undetermined",
        visibleStress: "undetermined",
      }).success,
    ).toBe(true);
  });
});
