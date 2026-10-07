import { z } from "zod";
import { indiaToday } from "../../shared/farm-intelligence";
import { ApiError } from "./errors";

export const MANDI_RESOURCE_ID = "9ef84268-d588-465a-a308-a864a43d0070";
export const mandiSampleQuery = z
  .object({ limit: z.coerce.number().int().min(1).max(10).default(5) })
  .strict();
const text = z.string().trim().min(1).max(160);
const rawRow = z.object({
  state: text,
  district: text,
  market: text,
  commodity: text,
  variety: z.string().max(160).optional(),
  grade: z.string().max(160).optional(),
  arrival_date: z.string().max(40),
  min_price: z.union([z.string().max(40), z.number(), z.null()]).optional(),
  max_price: z.union([z.string().max(40), z.number(), z.null()]).optional(),
  modal_price: z.union([z.string().max(40), z.number(), z.null()]).optional(),
});
const responseSchema = z.object({
  status: z.string().optional(),
  title: z.string().max(240),
  index_name: z.string().optional(),
  org: z.array(z.string().max(160)).max(10).optional(),
  total: z.union([z.string().max(20), z.number()]).optional(),
  updated_date: z.string().max(50).optional(),
  field: z
    .array(
      z.object({
        id: z.string().max(100),
        name: z.string().max(160),
        type: z.string().max(40).optional(),
      }),
    )
    .max(50)
    .optional(),
  records: z.array(rawRow).max(10),
});
function price(value: unknown) {
  if (typeof value === "string" && !/^\d+(?:\.\d+)?$/.test(value.trim()))
    return null;
  if (typeof value !== "string" && typeof value !== "number") return null;
  const result = Number(value);
  return Number.isFinite(result) && result >= 0 ? result : null;
}
function date(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  const iso = match ? `${match[3]}-${match[2]}-${match[1]}` : value;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const stamp = Date.parse(`${iso}T00:00:00Z`);
  return Number.isFinite(stamp) &&
    new Date(stamp).toISOString().slice(0, 10) === iso
    ? iso
    : null;
}

/** A bounded national sample: no saved location, record values, imports or AI. */
export async function fetchMandiSample(
  env: { DATA_GOV_API_KEY?: string },
  limit = 5,
  provider: typeof fetch = fetch,
  now = Date.now(),
) {
  const count = mandiSampleQuery.parse({ limit }).limit;
  if (!env.DATA_GOV_API_KEY?.trim())
    throw new ApiError(503, "The mandi data API key is not configured.");
  const upstream = new URL(
    `https://api.data.gov.in/resource/${MANDI_RESOURCE_ID}`,
  );
  upstream.search = new URLSearchParams({
    "api-key": env.DATA_GOV_API_KEY.trim(),
    format: "json",
    limit: String(count),
    offset: "0",
  }).toString();
  let response: Response;
  try {
    response = await provider(upstream, {
      headers: { Accept: "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(12000),
    });
  } catch (error) {
    // Never log or return the upstream URL, body, exception text or key.
    const message = error instanceof Error ? error.message : "";
    let reason = "The mandi provider could not complete the request.";
    if (
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError")
    )
      reason = "The mandi provider request timed out.";
    else if (/redirect/i.test(message))
      reason =
        "The mandi provider attempted a redirect; it was blocked to protect the API key.";
    else if (/dns|resolve|resolution/i.test(message))
      reason = "The mandi provider hostname could not be resolved.";
    else if (/tls|ssl|certificate/i.test(message))
      reason =
        "A secure connection to the mandi provider could not be established.";
    throw new ApiError(502, reason);
  }
  if (!response.ok)
    throw new ApiError(
      502,
      `The mandi provider returned HTTP ${response.status}.`,
    );
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError(502, "The mandi provider returned a non-JSON response.");
  }
  const parsed = responseSchema.safeParse(payload);
  if (
    !parsed.success ||
    parsed.data.status?.toLowerCase() === "error" ||
    !/daily.*price.*mandi/i.test(parsed.data.title) ||
    (parsed.data.index_name && parsed.data.index_name !== MANDI_RESOURCE_ID)
  )
    throw new ApiError(
      502,
      "The mandi provider returned an unexpected data response.",
    );
  const data = parsed.data;
  const today = indiaToday(now);
  const records = data.records.slice(0, count).map((row) => ({
    state: row.state,
    district: row.district,
    market: row.market,
    commodity: row.commodity,
    variety: row.variety ?? null,
    grade: row.grade ?? null,
    arrivalDate: date(row.arrival_date),
    publishedArrivalDate: row.arrival_date,
    prices: {
      minimum: price(row.min_price),
      maximum: price(row.max_price),
      modal: price(row.modal_price),
    },
  }));
  const dates = records
    .map((row) => row.arrivalDate)
    .filter((value): value is string => !!value)
    .sort();
  const latest = dates.at(-1) ?? null;
  const ageDays = latest
    ? Math.floor(
        (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${latest}T00:00:00Z`)) /
          86400000,
      )
    : null;
  const warnings = [
    "national_sample_not_coverage_guarantee",
    "price_unit_not_supplied_by_api",
  ];
  if (!records.length) warnings.push("empty_sample");
  if (records.some((row) => !row.arrivalDate))
    warnings.push("unverified_record_date");
  if (ageDays !== null && ageDays > 3)
    warnings.push("latest_sample_record_older_than_three_days");
  if (records.some((row) => row.arrivalDate && row.arrivalDate > today))
    warnings.push("future_record_date");
  if (
    records.some((row) =>
      Object.values(row.prices).some((value) => value === null),
    )
  )
    warnings.push("missing_or_invalid_price");
  if (
    records.some(
      ({ prices: p }) =>
        p.minimum !== null &&
        p.maximum !== null &&
        (p.minimum > p.maximum ||
          (p.modal !== null && (p.modal < p.minimum || p.modal > p.maximum))),
    )
  )
    warnings.push("inconsistent_price_range");
  const result = {
    source: {
      provider: "data.gov.in",
      resourceId: MANDI_RESOURCE_ID,
      title: data.title,
      organizations: data.org ?? [],
      fields: data.field ?? [],
      url: "https://www.data.gov.in/resource/current-daily-price-various-commodities-various-markets-mandi",
      providerUpdatedAt: data.updated_date ?? null,
    },
    fetchedAt: new Date(now).toISOString(),
    todayIndia: today,
    mode: "live",
    scope: "national_sample",
    priceUnit: null,
    priceUnitStatus: "not_supplied_by_api",
    returned: records.length,
    providerReportedTotal: price(data.total),
    dateRange: { earliest: dates[0] ?? null, latest, latestAgeDays: ageDays },
    warnings,
    records,
  };
  if (JSON.stringify(result).includes(env.DATA_GOV_API_KEY.trim()))
    throw new ApiError(
      502,
      "The mandi provider returned an unsafe data response.",
    );
  return result;
}
