import { z } from "zod";
export const languages = [
  ["en", "English"],
  ["hi", "हिन्दी"],
  ["as", "অসমীয়া"],
  ["bn", "বাংলা"],
  ["brx", "बड़ो"],
  ["doi", "डोगरी"],
  ["gu", "ગુજરાતી"],
  ["kn", "ಕನ್ನಡ"],
  ["ks", "کٲشُر"],
  ["kok", "कोंकणी"],
  ["mai", "मैथिली"],
  ["ml", "മലയാളം"],
  ["mni-Mtei", "ꯃꯤꯇꯩꯂꯣꯟ"],
  ["mr", "मराठी"],
  ["ne", "नेपाली"],
  ["or", "ଓଡ଼ିଆ"],
  ["pa", "ਪੰਜਾਬੀ"],
  ["sa", "संस्कृतम्"],
  ["sat", "ᱥᱟᱱᱛᱟᱲᱤ"],
  ["sd", "سنڌي"],
  ["ta", "தமிழ்"],
  ["te", "తెలుగు"],
  ["ur", "اردو"],
] as const;
export const MAX_THREADS = 3;
export const MAX_TURNS = 18;
export const PHASE2_CONSENT_VERSION = "2026-10-01";
export const priorityCrops = [
  ["RICE", "Rice"],
  ["WHEAT", "Wheat"],
  ["COTTON", "Cotton"],
  ["SUGARCANE", "Sugarcane"],
  ["MAIZE", "Maize"],
  ["TOMATO", "Tomato"],
] as const;
export const districts = [
  { id: "PB-LDH", state: "Punjab", name: "Ludhiana", lat: 30.901, lon: 75.857 },
  { id: "PB-ASR", state: "Punjab", name: "Amritsar", lat: 31.634, lon: 74.872 },
  {
    id: "UP-LKO",
    state: "Uttar Pradesh",
    name: "Lucknow",
    lat: 26.847,
    lon: 80.947,
  },
  {
    id: "UP-VNS",
    state: "Uttar Pradesh",
    name: "Varanasi",
    lat: 25.317,
    lon: 82.974,
  },
  { id: "MH-PUN", state: "Maharashtra", name: "Pune", lat: 18.52, lon: 73.857 },
  {
    id: "MH-NSK",
    state: "Maharashtra",
    name: "Nashik",
    lat: 19.998,
    lon: 73.79,
  },
] as const;
export type District = (typeof districts)[number];
export const diagnosisSchema = z.object({
  crop: z.string().max(80),
  diseaseCode: z.string().regex(/^[A-Z0-9_]{1,80}$/),
  name: z.string().max(160),
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.string().max(500)).max(6),
});
export type Diagnosis = z.infer<typeof diagnosisSchema>;
export const answerSchema = z.object({
  text: z.string().min(1).max(6000),
  diagnosis: diagnosisSchema.nullable(),
});
export type Answer = z.infer<typeof answerSchema> & { receipt?: string };
export type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  diagnosis?: Diagnosis | null;
  receipt?: string;
  contributed?: boolean;
};
export type Thread = {
  id: string;
  title: string;
  districtId: string;
  messages: Message[];
  createdAt: number;
};
export type Context = {
  districtId: string;
  soilPh: number | null;
  rainfallMm: number | null;
  moisture: number | null;
  observedAt: string;
  source: string;
  mode: "demo" | "live";
  summary: string;
};
export const positionSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});
export const adviceSchema = z.object({
  requestId: z.string().uuid(),
  threadId: z.string().uuid(),
  districtId: z.string().trim().min(3).max(220),
  locale: z.string().refine((v) => languages.some((l) => l[0] === v)),
  text: z.string().min(1).max(3000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        text: z.string().max(6000),
      }),
    )
    .max(36),
  position: positionSchema.optional(),
  image: z
    .object({
      mime: z.enum(["image/jpeg", "image/png", "image/webp"]),
      data: z.string().max(2800000),
    })
    .optional(),
});
export type AdviceRequest = z.infer<typeof adviceSchema>;
export type Report = {
  id: string;
  installation: string;
  districtId: string;
  crop: string;
  diseaseCode: string;
  name: string;
  confidence: number;
  lat: number;
  lon: number;
  timestamp: number;
  origin: "demo" | "live";
};
export type Cluster = {
  id: string;
  districtId: string;
  name: string;
  count: number;
  lat: number;
  lon: number;
  status: "observation" | "watch" | "potential";
  origin: "demo" | "live";
};
export type GeoPoint = [number, number];
export type GeoPolygon = GeoPoint[][];
export type DistrictGeometry =
  | { type: "Polygon"; coordinates: GeoPolygon }
  | { type: "MultiPolygon"; coordinates: GeoPolygon[] };

export const profileInputSchema = z.object({
  displayName: z.string().trim().max(120).optional().default(""),
  locale: z.string().refine((value) => languages.some(([code]) => code === value)),
  state: z.string().trim().min(2).max(100),
  district: z.string().trim().min(2).max(120),
  locality: z.string().trim().max(160).optional().default(""),
  pincode: z.string().regex(/^\d{6}$/).optional().or(z.literal("")).default(""),
  recentCropCode: z
    .enum(priorityCrops.map(([code]) => code) as [
      (typeof priorityCrops)[number][0],
      ...(typeof priorityCrops)[number][0][],
    ])
    .optional()
    .or(z.literal("")),
  lastHarvestOn: z
    .string()
    .date()
    .refine((value) => value <= new Date().toISOString().slice(0, 10), "Harvest date cannot be in the future.")
    .optional()
    .or(z.literal("")),
  consentVersion: z.literal(PHASE2_CONSENT_VERSION),
});
export type ProfileInput = z.infer<typeof profileInputSchema>;
export type FarmerProfile = ProfileInput & {
  createdAt: number;
  updatedAt: number;
};

export type FarmLocation = {
  state: string;
  district: string;
  locality: string;
  pincode: string;
};

export type PostalOfficeLocation = {
  name: string;
  block: string;
  district: string;
  state: string;
  pincode: string;
};

function normalizedPlaceName(value: string) {
  return value.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function postalWeatherLocality(
  offices: PostalOfficeLocation[],
  location: FarmLocation,
) {
  if (!location.pincode || !location.locality) return null;
  const state = normalizedPlaceName(location.state);
  const district = normalizedPlaceName(location.district);
  const locality = normalizedPlaceName(location.locality);
  const office = offices.find((candidate) =>
    candidate.pincode === location.pincode &&
    normalizedPlaceName(candidate.state) === state &&
    normalizedPlaceName(candidate.district) === district &&
    normalizedPlaceName(candidate.name) === locality
  );
  if (!office) return null;
  const block = office.block.trim();
  return block && !/^(na|none|null)$/i.test(block.replace(/[^a-z]/gi, ""))
    ? block
    : office.name;
}

export type IndianGeocodeLocation = {
  name: string;
  latitude: number;
  longitude: number;
  admin1?: string;
  admin2?: string;
  admin3?: string;
  admin4?: string;
};

export function selectDistrictGeocodeMatch(
  candidates: IndianGeocodeLocation[],
  location: Pick<FarmLocation, "state" | "district">,
) {
  const state = normalizedPlaceName(location.state);
  const district = normalizedPlaceName(location.district);
  return candidates.find((candidate) => {
    const candidateDistricts = [candidate.admin2, candidate.admin3, candidate.admin4]
      .filter((value): value is string => Boolean(value))
      .map(normalizedPlaceName);
    return normalizedPlaceName(candidate.admin1 || "") === state && candidateDistricts.includes(district);
  }) ?? null;
}

export type WeatherSummary = {
  location: string;
  latitude: number;
  longitude: number;
  temperatureC: number | null;
  humidityPercent: number | null;
  precipitationMm: number | null;
  windKph: number | null;
  weatherCode: number | null;
  observedAt: string;
  daily: Array<{
    date: string;
    minC: number | null;
    maxC: number | null;
    rainMm: number | null;
    precipitationProbability: number | null;
    weatherCode: number | null;
    referenceEt0Mm?: number | null;
  }>;
  history?: WeatherSummary["daily"];
  source: string;
  sourceUrl: string;
  kind: "model_estimate";
};

export function locationDistrictId(location: Pick<FarmLocation, "state" | "district">) {
  return `IN:${encodeURIComponent(location.state)}:${encodeURIComponent(location.district)}`;
}

export const plotInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  area: z.number().positive().max(100000),
  areaUnit: z.enum(["acre", "hectare"]),
  irrigation: z.enum(["rainfed", "canal", "sprinkler", "drip", "borewell", "other"]),
  mechanization: z.enum(["manual", "animal", "partial", "tractor", "unspecified"]),
  state: z.string().trim().min(2).max(100),
  district: z.string().trim().min(2).max(120),
  coarseCell: z.string().max(32).optional(),
});
export type PlotInput = z.infer<typeof plotInputSchema>;
export type FarmPlot = PlotInput & {
  id: string;
  createdAt: number;
  updatedAt: number;
};

export const cropCycleInputSchema = z.object({
  plotId: z.string().uuid(),
  cropCode: z.enum(priorityCrops.map(([code]) => code) as [
    (typeof priorityCrops)[number][0],
    ...(typeof priorityCrops)[number][0][],
  ]),
  variety: z.string().trim().max(100).optional().default(""),
  startedOn: z.string().date(),
  expectedHarvestOn: z.string().date().optional().or(z.literal("")),
});
export type CropCycleInput = z.infer<typeof cropCycleInputSchema>;
export type CropCycle = CropCycleInput & {
  id: string;
  status: "active" | "harvested" | "archived";
  createdAt: number;
  updatedAt: number;
};

export const farmInputClasses = ["seed", "fertilizer", "crop_protection", "soil_amendment", "bio_input", "other"] as const;
export const farmRecordUnits = ["kg", "quintal", "tonne", "litre", "millilitre", "gram", "bag", "acre", "hectare", "other"] as const;

export const cycleEventInputSchema = z
  .object({
    cycleId: z.string().uuid(),
    type: z.enum(["sowing", "irrigation", "input", "assessment", "advice", "harvest", "note"]),
    occurredOn: z.string().date(),
    title: z.string().trim().min(1).max(120),
    detail: z.string().trim().max(1000).optional().default(""),
    source: z.enum(["farmer", "ai", "expert", "system"]).default("farmer"),
    inputClass: z.enum(farmInputClasses).optional(),
    productName: z.string().trim().max(160).optional().default(""),
    amount: z.number().positive().max(1000000000).optional(),
    unit: z.enum(farmRecordUnits).optional(),
    purpose: z.string().trim().max(300).optional().default(""),
    yieldAmount: z.number().nonnegative().max(1000000000).optional(),
    yieldUnit: z.enum(farmRecordUnits).optional(),
  })
  .superRefine((value, context) => {
    if (value.type === "input") {
      if (!value.inputClass) context.addIssue({ code: z.ZodIssueCode.custom, path: ["inputClass"], message: "Input class is required." });
      if (!value.productName) context.addIssue({ code: z.ZodIssueCode.custom, path: ["productName"], message: "Product name is required." });
      if (value.amount === undefined) context.addIssue({ code: z.ZodIssueCode.custom, path: ["amount"], message: "Amount is required." });
      if (!value.unit) context.addIssue({ code: z.ZodIssueCode.custom, path: ["unit"], message: "Unit is required." });
      if (!value.purpose) context.addIssue({ code: z.ZodIssueCode.custom, path: ["purpose"], message: "Purpose is required." });
    }
    if (value.type === "harvest") {
      if (value.yieldAmount === undefined) context.addIssue({ code: z.ZodIssueCode.custom, path: ["yieldAmount"], message: "Yield amount is required." });
      if (!value.yieldUnit) context.addIssue({ code: z.ZodIssueCode.custom, path: ["yieldUnit"], message: "Yield unit is required." });
    }
  });
export type CycleEventInput = z.infer<typeof cycleEventInputSchema>;
export type CropEvent = CycleEventInput & { id: string; createdAt: number };

export const ledgerEntryInputSchema = z.object({
  cycleId: z.string().uuid(),
  kind: z.enum(["expense", "revenue"]),
  category: z.enum(["seed", "fertilizer", "pesticide", "labour", "irrigation", "equipment", "harvest", "sale", "other"]),
  amountPaise: z.number().int().nonnegative().max(100000000000),
  occurredOn: z.string().date(),
  note: z.string().trim().max(300).optional().default(""),
});
export type LedgerEntryInput = z.infer<typeof ledgerEntryInputSchema>;
export type LedgerEntry = LedgerEntryInput & { id: string; createdAt: number };

export type LedgerSummary = { expensesPaise: number; revenuePaise: number; marginPaise: number };
export function summarizeLedger(entries: LedgerEntry[]): LedgerSummary {
  const expensesPaise = entries.filter((entry) => entry.kind === "expense").reduce((sum, entry) => sum + entry.amountPaise, 0);
  const revenuePaise = entries.filter((entry) => entry.kind === "revenue").reduce((sum, entry) => sum + entry.amountPaise, 0);
  return { expensesPaise, revenuePaise, marginPaise: revenuePaise - expensesPaise };
}

export type ConfidenceBand = "low" | "moderate" | "high";
export function confidenceBand(score: number): ConfidenceBand {
  if (score < 0.75) return "low";
  return score < 0.9 ? "moderate" : "high";
}

export type CaseStatus = "ai_assessed" | "pending_review" | "reviewed" | "undetermined" | "follow_up_due" | "closed";
export const AI_TRIAGE_POLICY_VERSION = "2026-10-02.1";
export type ReviewPriority = "standard" | "priority" | "urgent";
export type ReviewRoute = "standard_review" | "priority_review" | "urgent_review";
export type TriageReason = "high_model_signal" | "moderate_model_signal" | "low_model_signal" | "limited_visible_evidence" | "follow_up_due";
export type InterimAction = "monitor_changes" | "avoid_unverified_treatment" | "capture_more_evidence" | "contact_official_helpline";
export type AiTriage = {
  priority: ReviewPriority;
  route: ReviewRoute;
  reasons: TriageReason[];
  interimActions: InterimAction[];
  policyVersion: typeof AI_TRIAGE_POLICY_VERSION;
  triagedAt: number;
};
export type CropHealthCase = {
  id: string;
  reference: string;
  cycleId: string;
  cropCode: string;
  diseaseCode: string;
  diseaseName: string;
  symptoms: string[];
  confidence: number;
  confidenceBand: ConfidenceBand;
  district: string;
  coarseCell?: string;
  cropStage: string;
  season: string;
  status: CaseStatus;
  origin: "synthetic" | "live";
  consentVersion: typeof PHASE2_CONSENT_VERSION;
  aiTriage?: AiTriage;
  createdAt: number;
  updatedAt: number;
};
export function triageCase(
  item: Pick<CropHealthCase, "confidence" | "symptoms" | "status">,
  triagedAt = Date.now(),
): AiTriage {
  let priority: ReviewPriority = "standard";
  const reasons: TriageReason[] = [];
  const interimActions: InterimAction[] = ["monitor_changes", "avoid_unverified_treatment"];

  if (item.confidence < 0.75) {
    priority = "urgent";
    reasons.push("low_model_signal");
  } else if (item.confidence < 0.9) {
    priority = "priority";
    reasons.push("moderate_model_signal");
  } else {
    reasons.push("high_model_signal");
  }
  if (item.symptoms.length < 2) {
    if (priority === "standard") priority = "priority";
    reasons.push("limited_visible_evidence");
    interimActions.push("capture_more_evidence");
  }
  if (item.status === "follow_up_due") {
    priority = "urgent";
    reasons.push("follow_up_due");
  }
  if (priority === "urgent") interimActions.push("contact_official_helpline");

  return {
    priority,
    route: priority === "urgent" ? "urgent_review" : priority === "priority" ? "priority_review" : "standard_review",
    reasons,
    interimActions,
    policyVersion: AI_TRIAGE_POLICY_VERSION,
    triagedAt,
  };
}
export type CaseOutcome = {
  id: string;
  caseId: string;
  intervalDays: 3 | 7;
  result: "resolved" | "improved" | "unchanged" | "worse" | "unable";
  note: string;
  createdAt: number;
};
export type CaseMatch = { caseId: string; reference: string; score: number; reasons: string[] };
export function matchCases(target: CropHealthCase, candidates: CropHealthCase[]): CaseMatch[] {
  return candidates
    .filter((candidate) => candidate.id !== target.id && candidate.status === "closed")
    .map((candidate) => {
      let score = 0;
      const reasons: string[] = [];
      if (candidate.cropCode === target.cropCode) { score += 40; reasons.push("same crop"); }
      if (candidate.diseaseCode === target.diseaseCode) { score += 35; reasons.push("same suspected condition"); }
      if (candidate.cropStage === target.cropStage) { score += 10; reasons.push("same crop stage"); }
      if (candidate.season === target.season) { score += 8; reasons.push("same season"); }
      if (candidate.district === target.district) { score += 5; reasons.push("same district"); }
      if (candidate.coarseCell && candidate.coarseCell === target.coarseCell) { score += 2; reasons.push("nearby coarse area"); }
      return { caseId: candidate.id, reference: candidate.reference, score, reasons };
    })
    .filter((match) => match.score >= 75)
    .sort((a, b) => b.score - a.score || a.reference.localeCompare(b.reference))
    .slice(0, 3);
}

export type Phase2State = {
  fieldBaselines?: import("./farm-intelligence").FieldBaseline[];
  quickActions?: import("./farm-intelligence").QuickAction[];
  photoObservations?: import("./farm-intelligence").PhotoObservation[];
  profile?: FarmerProfile;
  plots: FarmPlot[];
  cycles: CropCycle[];
  events: CropEvent[];
  ledger: LedgerEntry[];
  cases: CropHealthCase[];
  outcomes: CaseOutcome[];
};
export function distanceKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
) {
  const rad = Math.PI / 180;
  const h =
    Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 +
    Math.cos(a.lat * rad) *
      Math.cos(b.lat * rad) *
      Math.sin(((b.lon - a.lon) * rad) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
export function clusterReports(reports: Report[], now = Date.now()): Cluster[] {
  const accepted = reports
    .filter(
      (r) =>
        r.confidence >= 0.75 &&
        r.timestamp <= now &&
        r.timestamp >= now - 7 * 86400000,
    )
    .sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id));
  const groups: Report[][] = [];
  for (const r of accepted) {
    const group = groups.find(
      (g) =>
        g[0].districtId === r.districtId &&
        g[0].origin === r.origin &&
        g[0].crop === r.crop &&
        g[0].diseaseCode === r.diseaseCode &&
        g.every((other) => distanceKm(r, other) <= 10),
    );
    if (group) group.push(r);
    else groups.push([r]);
  }
  return groups.map((g) => {
    const count = new Set(g.map((r) => r.installation)).size;
    return {
      id: g[0].id,
      districtId: g[0].districtId,
      name: g[0].name,
      count,
      lat: g.reduce((sum, report) => sum + report.lat, 0) / g.length,
      lon: g.reduce((sum, report) => sum + report.lon, 0) / g.length,
      status: count >= 3 ? "potential" : count === 2 ? "watch" : "observation",
      origin: g[0].origin,
    };
  });
}
export function newThread(districtId: string): Thread {
  return {
    id: crypto.randomUUID(),
    title: "New conversation",
    districtId,
    messages: [],
    createdAt: Date.now(),
  };
}
export function rotateThreads(threads: Thread[], thread: Thread) {
  return [thread, ...threads].slice(0, MAX_THREADS);
}
export function turns(thread: Thread) {
  return thread.messages.filter((m) => m.role === "user").length;
}
