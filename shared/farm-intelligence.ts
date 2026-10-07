import { z } from "zod";
import {
  priorityCrops,
  type CropCycle,
  type FarmPlot,
  type WeatherSummary,
} from "./domain";

export const FARM_RULE_VERSION = "field-outlook-1.0.0";
export const cropCodeSchema = z.enum(
  priorityCrops.map(([code]) => code) as [
    "RICE",
    "WHEAT",
    "COTTON",
    "SUGARCANE",
    "MAIZE",
    "TOMATO",
  ],
);
export const indiaToday = (now = Date.now()) =>
  new Date(now + 330 * 60000).toISOString().slice(0, 10);
const dateSchema = z
  .string()
  .date()
  .refine((date) => date <= indiaToday(), "Date cannot be in the future.");
const previousSchema = z.object({
  cropCode: cropCodeSchema,
  harvestedOn: dateSchema,
  quantity: z.number().nonnegative().max(1e9).optional(),
  unit: z.enum(["kg", "quintal", "tonne"]).default("quintal"),
});
export const fieldSetupSchema = z
  .object({
    // Client-generated UUID makes retried setup requests safe, not duplicate plots.
    id: z.string().uuid(),
    area: z.number().positive().max(100000),
    areaUnit: z.enum(["acre", "hectare"]),
    waterAccess: z.enum(["rain_only", "supplemental", "unknown"]),
    fieldState: z.enum(["empty", "growing"]),
    previous: previousSchema.optional(),
    crop: z
      .object({ cropCode: cropCodeSchema, startedOn: dateSchema })
      .optional(),
  })
  .superRefine((value, context) => {
    if (value.fieldState === "growing" && !value.crop)
      context.addIssue({
        code: "custom",
        path: ["crop"],
        message: "Growing fields need a crop and sowing date.",
      });
    if (value.fieldState === "empty" && value.crop)
      context.addIssue({
        code: "custom",
        path: ["crop"],
        message: "An empty field cannot have a standing crop.",
      });
    if (value.fieldState === "growing" && value.previous)
      context.addIssue({
        code: "custom",
        path: ["previous"],
        message: "Use current crop details for a growing field.",
      });
  });
export type FieldSetup = z.infer<typeof fieldSetupSchema>;
export type FieldBaseline = FieldSetup & { plotId: string; createdAt: number };
export const harvestCompletionSchema = z.object({
  id: z.string().uuid(),
  cycleId: z.string().uuid(),
  harvestedOn: dateSchema,
  quantity: z.number().nonnegative().max(1e9).optional(),
  unit: z.enum(["kg", "quintal", "tonne"]),
});
export const quickActionCodes = [
  "irrigation",
  "weeding",
  "crop_protection",
] as const;
export const quickActionSchema = z.object({
  cycleId: z.string().uuid(),
  action: z.enum(quickActionCodes),
});
export type QuickAction = z.infer<typeof quickActionSchema> & {
  id: string;
  occurredOn: string;
  createdAt: number;
};
export const photoObservationSchema = z
  .object({
    quality: z.enum(["usable", "retake"]),
    stage: z.enum([
      "seedling",
      "vegetative",
      "flowering",
      "fruit_grain",
      "mature",
      "undetermined",
    ]),
    visibleStress: z.enum(["visible", "not_visible", "undetermined"]),
    observation: z.string().min(1).max(600),
    nextStep: z.enum(["retake", "monitor", "local_expert"]),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.quality === "retake" &&
      (value.stage !== "undetermined" || value.visibleStress !== "undetermined")
    )
      context.addIssue({
        code: "custom",
        message:
          "Insufficient photos must not produce stage or stress judgments.",
      });
  });
export type PhotoObservation = z.infer<typeof photoObservationSchema> & {
  id: string;
  cycleId: string;
  createdAt: number;
  model: string;
  locale: string;
};

type Window = {
  crop: z.infer<typeof cropCodeSchema>;
  start: string;
  end: string;
  water: "supplemental" | "either";
  precision: "calendar" | "season_screen";
};
type Calendar = {
  state: string;
  districts: string[];
  source: string;
  year: number;
  windows: Window[];
};
const crida = "https://www.icar-crida.res.in/CP-2012/statewiseplans/";
// Historic source windows are encoded as inclusive dates. Week 2 = days 8–14,
// week 4 = days 22–28. They are screening evidence, not current local advisories.
export const districtCalendars: Calendar[] = [
  {
    state: "Punjab",
    districts: ["Ludhiana"],
    year: 2011,
    source: `${crida}Punjab%20(Pdf)/PAU,%20Ludhiana/PUNJAB%205-Ludhiana%2030.04.2011.pdf`,
    windows: [
      {
        crop: "RICE",
        start: "06-08",
        end: "07-07",
        water: "supplemental",
        precision: "calendar",
      },
      {
        crop: "WHEAT",
        start: "10-22",
        end: "12-07",
        water: "supplemental",
        precision: "calendar",
      },
      {
        crop: "MAIZE",
        start: "05-22",
        end: "06-28",
        water: "supplemental",
        precision: "calendar",
      },
      {
        crop: "COTTON",
        start: "04-08",
        end: "05-28",
        water: "supplemental",
        precision: "calendar",
      },
      {
        crop: "SUGARCANE",
        start: "02-15",
        end: "03-31",
        water: "supplemental",
        precision: "calendar",
      },
    ],
  },
  {
    state: "Maharashtra",
    districts: ["Pune"],
    year: 2011,
    source: `${crida}Maharastra(Pdf)/MPKVV,%20Rahuri/MH8-%20PUNE%2031.03.2011.pdf`,
    windows: [
      {
        crop: "WHEAT",
        start: "10-15",
        end: "11-15",
        water: "either",
        precision: "calendar",
      },
      {
        crop: "RICE",
        start: "06-08",
        end: "06-14",
        water: "either",
        precision: "calendar",
      },
    ],
  },
  // The Nainital plan identifies rabi wheat, but no exact sowing window.
  // Oct–Nov is explicitly an inferred rabi screen, not a verified local date.
  {
    state: "Uttarakhand",
    districts: ["Nainital"],
    year: 2014,
    source: `${crida}Uttarkhand/UKD8-Nainital-10.07.14.pdf`,
    windows: [
      {
        crop: "WHEAT",
        start: "10-01",
        end: "11-30",
        water: "either",
        precision: "season_screen",
      },
    ],
  },
];
const daysBetween = (a: string, b: string) =>
  Math.floor(
    (Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000,
  );
export const hectares = (area: number, unit: "acre" | "hectare") =>
  unit === "acre" ? area * 0.40468564224 : area;
const round = (value: number) => Math.round(value * 100) / 100;
const normalize = (value: string) => value.trim().toLowerCase();
const sumComplete = (values: (number | null | undefined)[]) =>
  values.length &&
  values.every((v) => typeof v === "number" && Number.isFinite(v))
    ? round(values.reduce<number>((sum, v) => sum + (v ?? 0), 0))
    : null;

export function buildFieldOutlook(input: {
  plot: FarmPlot;
  baseline?: FieldBaseline;
  cycles: CropCycle[];
  weather?: WeatherSummary;
  today?: string;
}) {
  const today = input.today ?? indiaToday();
  const { plot, baseline, weather } = input;
  const activeCycles = input.cycles.filter(
    (c) => c.plotId === plot.id && c.status === "active",
  );
  const cycle = activeCycles.length === 1 ? activeCycles[0] : undefined;
  const forecast =
    weather?.daily.filter((d) => d.date >= today).slice(0, 5) ?? [];
  const past = weather?.history?.filter((d) => d.date < today).slice(-7) ?? [];
  const rainfall =
    forecast.length === 5 ? sumComplete(forecast.map((d) => d.rainMm)) : null;
  const et0 =
    forecast.length === 5
      ? sumComplete(forecast.map((d) => d.referenceEt0Mm))
      : null;
  const waterBalance =
    rainfall !== null && et0 !== null ? round(rainfall - et0) : null;
  const previous = baseline?.previous;
  const harvestDate = previous?.harvestedOn;
  const calendar = districtCalendars.find(
    (c) =>
      normalize(c.state) === normalize(plot.state) &&
      c.districts.some((d) => normalize(d) === normalize(plot.district)),
  );
  const year = Number(today.slice(0, 4));
  const candidates =
    cycle || activeCycles.length > 1
      ? []
      : (calendar?.windows ?? [])
          .flatMap((window) => {
            const windows = [year - 1, year, year + 1]
              .map((y) => {
                const start = `${y}-${window.start}`;
                const end = `${window.end < window.start ? y + 1 : y}-${window.end}`;
                const waitDays =
                  today >= start && today <= end
                    ? 0
                    : daysBetween(today, start);
                return { start, end, waitDays };
              })
              .filter(
                (w) => w.end >= today && w.waitDays >= 0 && w.waitDays <= 60,
              );
            return windows.map((w) => ({
              cropCode: window.crop,
              ...w,
              precision: window.precision,
              waterCheck:
                window.water === "supplemental" &&
                baseline?.waterAccess !== "supplemental",
              repeatedCrop: previous?.cropCode === window.crop,
              sourceUrl: calendar!.source,
              sourceYear: calendar!.year,
            }));
          })
          .sort(
            (a, b) =>
              Number(a.waterCheck) - Number(b.waterCheck) ||
              a.waitDays - b.waitDays ||
              Number(a.repeatedCrop) - Number(b.repeatedCrop),
          );
  return {
    ruleVersion: FARM_RULE_VERSION,
    calculatedOn: today,
    plotId: plot.id,
    fieldState:
      activeCycles.length > 1
        ? ("conflicting_cycles" as const)
        : cycle
          ? ("growing" as const)
          : ("empty" as const),
    areaHa: round(hectares(plot.area, plot.areaUnit)),
    daysSinceHarvest: harvestDate
      ? Math.max(0, daysBetween(harvestDate, today))
      : null,
    previousYieldTonnesPerHa:
      previous?.quantity !== undefined
        ? round(
            (previous.quantity *
              { kg: 0.001, quintal: 0.1, tonne: 1 }[previous.unit]) /
              hectares(plot.area, plot.areaUnit),
          )
        : null,
    cycleId: cycle?.id ?? null,
    cropCode: cycle?.cropCode ?? null,
    cropAgeDays:
      cycle && cycle.startedOn <= today
        ? daysBetween(cycle.startedOn, today)
        : null,
    waterAccess: baseline?.waterAccess ?? "unknown",
    weather: weather
      ? {
          location: weather.location,
          observedAt: weather.observedAt,
          sourceUrl: weather.sourceUrl,
          forecastDays: forecast.length,
          rainfall5DaysMm: rainfall,
          referenceEt05DaysMm: et0,
          referenceBalance5DaysMm: waterBalance,
          recentRain7DaysMm:
            past.length === 7 ? sumComplete(past.map((d) => d.rainMm)) : null,
          recentDays: past.length,
          heavyRainDates: forecast
            .filter((d) => (d.rainMm ?? 0) >= 25)
            .map((d) => d.date),
        }
      : null,
    // No fabricated fertility score when no authorized, dated soil evidence exists.
    soilStatus: "not_available" as const,
    calendarStatus: calendar
      ? ("historic_source" as const)
      : ("not_available" as const),
    candidates: candidates.slice(0, 3),
  };
}
export type FieldOutlook = ReturnType<typeof buildFieldOutlook>;
