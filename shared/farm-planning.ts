import { z } from "zod";
import { languages } from "./domain";
import {
  cropCodeSchema,
  type FieldBaseline,
  type FieldOutlook,
} from "./farm-intelligence";

export const PLANNING_CONSENT_VERSION = "farm-planning-2026-10-07.1";
export const planningRequestSchema = z
  .object({
    plotId: z.string().uuid(),
    consent: z.literal(true),
    consentVersion: z.literal(PLANNING_CONSENT_VERSION),
    locale: z
      .string()
      .refine((locale) => languages.some(([code]) => code === locale)),
    cropProtection: z.enum(["yes", "no", "unknown"]),
  })
  .strict();
export type PlanningRequest = z.infer<typeof planningRequestSchema>;
export const planActionCodes = [
  "check_water",
  "check_drainage",
  "inspect",
  "crop_windows",
  "local_calendar",
  "soil_test",
  "input_record",
  "market",
  "photo",
] as const;
export const planningOutputSchema = z
  .object({
    priorities: z.array(z.enum(planActionCodes)).min(1).max(4),
    cropCodes: z.array(cropCodeSchema).max(3),
  })
  .strict();
export type NextStepPlan = z.infer<typeof planningOutputSchema> & {
  createdAt: number;
  model: string;
  locale: string;
};

// Whitelist rather than redact: no location, source URL containing a district,
// identity, record IDs, free text, photographs, financial values or full records.
export function planningEvidence(
  outlook: FieldOutlook,
  baseline: FieldBaseline | undefined,
  cropProtection: PlanningRequest["cropProtection"],
) {
  return {
    areaHa: outlook.areaHa,
    fieldState: outlook.fieldState,
    currentCrop: outlook.cropCode,
    previousCrop: baseline?.previous?.cropCode ?? null,
    cropAgeDays: outlook.cropAgeDays,
    daysSinceHarvest: outlook.daysSinceHarvest,
    waterAccess: outlook.waterAccess,
    cropProtection,
    soilStatus: outlook.soilStatus,
    calendarStatus: outlook.calendarStatus,
    weather: outlook.weather
      ? {
          forecastDays: outlook.weather.forecastDays,
          rainfall5DaysMm: outlook.weather.rainfall5DaysMm,
          referenceEt05DaysMm: outlook.weather.referenceEt05DaysMm,
          recentDays: outlook.weather.recentDays,
          recentRain7DaysMm: outlook.weather.recentRain7DaysMm,
          heavyRainDays: outlook.weather.heavyRainDates.length,
        }
      : null,
    cropOptions: outlook.candidates.map((candidate) => ({
      cropCode: candidate.cropCode,
      windowStart: candidate.start,
      windowEnd: candidate.end,
      waitDays: candidate.waitDays,
      needsWaterCheck: candidate.waterCheck,
      repeatedCrop: candidate.repeatedCrop,
      precision: candidate.precision,
      sourceYear: candidate.sourceYear,
    })),
  };
}
export function allowedPlanActions(
  outlook: FieldOutlook,
  protection: PlanningRequest["cropProtection"],
) {
  const actions: Array<(typeof planActionCodes)[number]> = [
    "soil_test",
    "inspect",
    "market",
  ];
  if (
    outlook.waterAccess === "unknown" ||
    outlook.candidates.some((c) => c.waterCheck)
  )
    actions.unshift("check_water");
  if (outlook.weather?.heavyRainDates.length) actions.unshift("check_drainage");
  if (outlook.fieldState === "growing") actions.push("photo");
  if (outlook.fieldState === "empty")
    actions.push(outlook.candidates.length ? "crop_windows" : "local_calendar");
  if (protection !== "no") actions.push("input_record");
  return actions;
}
export function validatePlan(
  output: unknown,
  outlook: FieldOutlook,
  protection: PlanningRequest["cropProtection"],
) {
  const parsed = planningOutputSchema.parse(output);
  const allowed = allowedPlanActions(outlook, protection);
  if (
    parsed.priorities.some((action) => !allowed.includes(action)) ||
    parsed.cropCodes.some(
      (crop) =>
        !outlook.candidates.some((candidate) => candidate.cropCode === crop),
    )
  )
    throw new Error("Planning response used unsupported evidence.");
  if (
    new Set(parsed.priorities).size !== parsed.priorities.length ||
    new Set(parsed.cropCodes).size !== parsed.cropCodes.length
  )
    throw new Error("Planning response repeated a choice.");
  return parsed;
}
