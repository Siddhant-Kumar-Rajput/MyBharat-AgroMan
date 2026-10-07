import { z } from "zod";
import {
  type CropCycle,
  type FarmLocation,
  type FarmPlot,
  type WeatherSummary,
} from "../../shared/domain";
import {
  buildFieldOutlook,
  cropCodeSchema,
  fieldSetupSchema,
  harvestCompletionSchema,
  indiaToday,
  quickActionSchema,
  type FieldBaseline,
  type PhotoObservation,
} from "../../shared/farm-intelligence";
import { english } from "../../src/lib/i18n";
import type { Env } from "./index";
import { ApiError } from "./errors";
import { observeCropPhoto } from "./crop-photo";

type Row = Record<string, string | number | null>;
type WeatherLookup = (location: {
  state: string;
  district: string;
  locality: string;
  pincode: string;
}) => Promise<WeatherSummary>;
const day = z
  .string()
  .date()
  .refine((date) => date <= indiaToday());

async function ownedPlot(
  env: Env,
  subject: string,
  id: string,
): Promise<FarmPlot> {
  const row = await env.DB.prepare(
    "SELECT * FROM farm_plots WHERE id = ? AND subject_id = ?",
  )
    .bind(id, subject)
    .first<Row>();
  if (!row) throw new ApiError(404, "Farm plot not found.");
  return {
    id: String(row.id),
    name: String(row.name),
    area: Number(row.area),
    areaUnit: row.area_unit as FarmPlot["areaUnit"],
    irrigation: row.irrigation as FarmPlot["irrigation"],
    mechanization: row.mechanization as FarmPlot["mechanization"],
    state: String(row.state),
    district: String(row.district),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}
function toCycle(row: Row): CropCycle {
  return {
    id: String(row.id),
    plotId: String(row.plot_id),
    cropCode: row.crop_code as CropCycle["cropCode"],
    variety: String(row.variety ?? ""),
    startedOn: String(row.started_on),
    expectedHarvestOn: String(row.expected_harvest_on ?? ""),
    status: row.status as CropCycle["status"],
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}
async function activeCycle(env: Env, subject: string, id: string) {
  const row = await env.DB.prepare(
    "SELECT * FROM crop_cycles WHERE id = ? AND subject_id = ? AND status = 'active'",
  )
    .bind(id, subject)
    .first<Row>();
  if (!row) throw new ApiError(404, "Active crop cycle not found.");
  const count = await env.DB.prepare(
    "SELECT COUNT(*) AS count FROM crop_cycles WHERE plot_id = ? AND subject_id = ? AND status = 'active'",
  )
    .bind(row.plot_id, subject)
    .first<{ count: number }>();
  if (count?.count !== 1)
    throw new ApiError(
      409,
      "This field has conflicting active cycles. Review its detailed records first.",
    );
  return toCycle(row);
}
async function parse(request: Request) {
  const text = await request.text();
  if (text.length > 10000) throw new ApiError(413, "Request is too large.");
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(400, "Invalid JSON request.");
  }
}

export async function handleFarm(
  request: Request,
  env: Env,
  subject: string,
  path: string,
  weatherLookup: WeatherLookup,
): Promise<{ value: unknown; status?: number }> {
  if (path === "farm/setup" && request.method === "POST") {
    const input = fieldSetupSchema.parse(await parse(request));
    const profile = await env.DB.prepare(
      "SELECT state, district FROM farmer_profiles WHERE subject_id = ?",
    )
      .bind(subject)
      .first<{ state: string; district: string }>();
    if (!profile)
      throw new ApiError(
        409,
        "Save your profile location before adding a field.",
      );
    const existing = await env.DB.prepare(
      "SELECT subject_id FROM farm_plots WHERE id = ?",
    )
      .bind(input.id)
      .first<{ subject_id: string }>();
    if (existing) {
      if (existing.subject_id !== subject)
        throw new ApiError(404, "Farm plot not found.");
      return { value: { id: input.id, alreadySaved: true } };
    }
    const now = Date.now();
    const baseline: FieldBaseline = {
      ...input,
      plotId: input.id,
      createdAt: now,
    };
    const statements = [
      env.DB.prepare(
        `INSERT INTO farm_plots (id, subject_id, name, area, area_unit, irrigation, mechanization, state, district, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'unspecified', ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING`,
      ).bind(
        input.id,
        subject,
        english.smartDefaultField,
        input.area,
        input.areaUnit,
        input.waterAccess === "rain_only" ? "rainfed" : "other",
        profile.state,
        profile.district,
        now,
        now,
      ),
      env.DB.prepare(
        `INSERT INTO field_baselines (plot_id, subject_id, baseline_json, created_at)
        SELECT id, subject_id, ?, ? FROM farm_plots WHERE id = ? AND subject_id = ? ON CONFLICT(plot_id) DO NOTHING`,
      ).bind(JSON.stringify(baseline), now, input.id, subject),
    ];
    if (input.crop)
      statements.push(
        env.DB.prepare(
          `INSERT INTO crop_cycles (id, subject_id, plot_id, crop_code, variety, started_on, status, created_at, updated_at)
      SELECT ?, subject_id, id, ?, '', ?, 'active', ?, ? FROM farm_plots WHERE id = ? AND subject_id = ? ON CONFLICT(id) DO NOTHING`,
        ).bind(
          input.id,
          input.crop.cropCode,
          input.crop.startedOn,
          now,
          now,
          input.id,
          subject,
        ),
      );
    await env.DB.batch(statements);
    return { value: { id: input.id }, status: 201 };
  }

  if (path === "farm/outlook" && request.method === "GET") {
    const id = z
      .string()
      .uuid()
      .parse(new URL(request.url).searchParams.get("plotId"));
    const plot = await ownedPlot(env, subject, id);
    const [base, cycles, profile, actions, photos] = await Promise.all([
      env.DB.prepare(
        "SELECT baseline_json FROM field_baselines WHERE plot_id = ? AND subject_id = ?",
      )
        .bind(id, subject)
        .first<{ baseline_json: string }>(),
      env.DB.prepare(
        "SELECT * FROM crop_cycles WHERE plot_id = ? AND subject_id = ? ORDER BY updated_at DESC",
      )
        .bind(id, subject)
        .all<Row>(),
      env.DB.prepare(
        "SELECT state, district, locality, pincode FROM farmer_profiles WHERE subject_id = ?",
      )
        .bind(subject)
        .first<FarmLocation>(),
      env.DB.prepare(
        "SELECT a.* FROM farm_quick_actions a JOIN crop_cycles c ON a.cycle_id = c.id WHERE c.plot_id = ? AND a.subject_id = ? ORDER BY a.created_at DESC LIMIT 20",
      )
        .bind(id, subject)
        .all<Row>(),
      env.DB.prepare(
        "SELECT o.observation_json FROM crop_photo_observations o JOIN crop_cycles c ON o.cycle_id = c.id WHERE c.plot_id = ? AND o.subject_id = ? ORDER BY o.created_at DESC LIMIT 1",
      )
        .bind(id, subject)
        .first<{ observation_json: string }>(),
    ]);
    const same =
      profile?.state === plot.state && profile?.district === plot.district;
    let weather: WeatherSummary | undefined;
    try {
      weather = await weatherLookup({
        state: plot.state,
        district: plot.district,
        locality: same ? (profile!.locality ?? "") : "",
        pincode: same ? (profile!.pincode ?? "") : "",
      });
    } catch {
      /* Live weather failure stays explicit, never becomes demo data. */
    }
    const outlook = buildFieldOutlook({
      plot,
      baseline: base ? JSON.parse(base.baseline_json) : undefined,
      cycles: cycles.results.map(toCycle),
      weather,
    });
    const photo = photos
      ? (JSON.parse(photos.observation_json) as PhotoObservation)
      : null;
    return {
      value: {
        ...outlook,
        photo: photo?.cycleId === outlook.cycleId ? photo : null,
        actions: actions.results.map((a) => ({
          id: a.id,
          cycleId: a.cycle_id,
          action: a.action,
          occurredOn: a.occurred_on,
          createdAt: a.created_at,
        })),
      },
    };
  }

  if (path === "farm/start" && request.method === "POST") {
    const input = z
      .object({
        id: z.string().uuid(),
        plotId: z.string().uuid(),
        cropCode: cropCodeSchema,
        startedOn: day,
      })
      .parse(await parse(request));
    await ownedPlot(env, subject, input.plotId);
    const existing = await env.DB.prepare(
      "SELECT id FROM crop_cycles WHERE id = ? AND subject_id = ? AND plot_id = ?",
    )
      .bind(input.id, subject, input.plotId)
      .first();
    if (existing) return { value: { id: input.id, alreadySaved: true } };
    const now = Date.now();
    const result = await env.DB.prepare(
      `INSERT INTO crop_cycles (id, subject_id, plot_id, crop_code, variety, started_on, status, created_at, updated_at)
      SELECT ?, ?, ?, ?, '', ?, 'active', ?, ? WHERE NOT EXISTS (SELECT 1 FROM crop_cycles WHERE plot_id = ? AND status = 'active')`,
    )
      .bind(
        input.id,
        subject,
        input.plotId,
        input.cropCode,
        input.startedOn,
        now,
        now,
        input.plotId,
      )
      .run();
    if (!result.meta.changes)
      throw new ApiError(409, "This field already has an active crop.");
    return { value: { id: input.id }, status: 201 };
  }

  if (path === "farm/action" && request.method === "POST") {
    const input = quickActionSchema.parse(await parse(request));
    await activeCycle(env, subject, input.cycleId);
    const occurredOn = indiaToday();
    await env.DB.prepare(
      `INSERT INTO farm_quick_actions (id, subject_id, cycle_id, action, occurred_on, created_at)
      VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(subject_id, cycle_id, action, occurred_on) DO NOTHING`,
    )
      .bind(
        crypto.randomUUID(),
        subject,
        input.cycleId,
        input.action,
        occurredOn,
        Date.now(),
      )
      .run();
    return { value: { ok: true, occurredOn } };
  }
  if (path === "farm/harvest" && request.method === "POST") {
    const input = harvestCompletionSchema.parse(await parse(request));
    const previousEvent = await env.DB.prepare(
      "SELECT id FROM crop_events WHERE id = ? AND subject_id = ? AND cycle_id = ?",
    )
      .bind(input.id, subject, input.cycleId)
      .first();
    if (previousEvent) return { value: { ok: true, alreadySaved: true } };
    const cycle = await activeCycle(env, subject, input.cycleId);
    if (input.harvestedOn < cycle.startedOn)
      throw new ApiError(400, "Harvest cannot be before sowing.");
    const plot = await ownedPlot(env, subject, cycle.plotId);
    const old = await env.DB.prepare(
      "SELECT baseline_json FROM field_baselines WHERE plot_id = ? AND subject_id = ?",
    )
      .bind(plot.id, subject)
      .first<{ baseline_json: string }>();
    const oldBase: FieldBaseline | undefined = old
      ? JSON.parse(old.baseline_json)
      : undefined;
    const now = Date.now();
    const baseline: FieldBaseline = {
      id: plot.id,
      plotId: plot.id,
      area: plot.area,
      areaUnit: plot.areaUnit,
      waterAccess: oldBase?.waterAccess ?? "unknown",
      fieldState: "empty",
      previous: {
        cropCode: cycle.cropCode,
        harvestedOn: input.harvestedOn,
        quantity: input.quantity,
        unit: input.unit,
      },
      createdAt: oldBase?.createdAt ?? now,
    };
    const result = await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO crop_events (id, subject_id, cycle_id, event_type, occurred_on, title, detail, source, yield_amount, yield_unit, created_at)
        SELECT ?, ?, id, 'harvest', ?, ?, '', 'farmer', ?, ?, ? FROM crop_cycles WHERE id = ? AND subject_id = ? AND status = 'active'`,
      ).bind(
        input.id,
        subject,
        input.harvestedOn,
        english.harvestRecorded,
        input.quantity ?? null,
        input.quantity === undefined ? null : input.unit,
        now,
        cycle.id,
        subject,
      ),
      env.DB.prepare(
        `INSERT INTO field_baselines (plot_id, subject_id, baseline_json, created_at)
        SELECT ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM crop_events WHERE id = ? AND subject_id = ?)
        ON CONFLICT(plot_id) DO UPDATE SET baseline_json = excluded.baseline_json`,
      ).bind(
        plot.id,
        subject,
        JSON.stringify(baseline),
        now,
        input.id,
        subject,
      ),
      env.DB.prepare(
        `UPDATE crop_cycles SET status = 'harvested', updated_at = ? WHERE id = ? AND subject_id = ? AND EXISTS (SELECT 1 FROM crop_events WHERE id = ? AND subject_id = ?)`,
      ).bind(now, cycle.id, subject, input.id, subject),
    ]);
    if (!result[0].meta.changes)
      throw new ApiError(409, "This crop has already been harvested.");
    return { value: { ok: true }, status: 201 };
  }
  if (path === "farm/photo" && request.method === "POST") {
    const observation = await observeCropPhoto(request, env, (id) =>
      activeCycle(env, subject, id),
    );
    // Derived observations only. Images, photo URLs and identity are not stored.
    await env.DB.prepare(
      "INSERT INTO crop_photo_observations (id, subject_id, cycle_id, observation_json, created_at) VALUES (?, ?, ?, ?, ?)",
    )
      .bind(
        observation.id,
        subject,
        observation.cycleId,
        JSON.stringify(observation),
        observation.createdAt,
      )
      .run();
    return { value: observation, status: 201 };
  }
  throw new ApiError(404, "Endpoint not found.");
}
