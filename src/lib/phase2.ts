import type {
  CaseOutcome,
  CropCycle,
  CropEvent,
  CropHealthCase,
  FarmPlot,
  FarmerProfile,
  LedgerEntry,
  Phase2State,
} from "../../shared/domain";
import { demo, request } from "./api";
import { readPhase2State, savePhase2State } from "./storage";

type DbRow = Record<string, string | number | null>;

export async function loadPhase2(): Promise<Phase2State> {
  if (demo) return readPhase2State();
  const [{ profile }, records] = await Promise.all([
    request<{ profile: FarmerProfile | null }>("profile"),
    request<{
      plots: DbRow[];
      cycles: DbRow[];
      events: DbRow[];
      ledger: DbRow[];
      cases: DbRow[];
      outcomes: DbRow[];
    }>("records"),
  ]);
  return {
    profile: profile ?? undefined,
    plots: records.plots.map(
      (row): FarmPlot => ({
        id: String(row.id),
        name: String(row.name),
        area: Number(row.area),
        areaUnit: row.area_unit as FarmPlot["areaUnit"],
        irrigation: row.irrigation as FarmPlot["irrigation"],
        mechanization: row.mechanization as FarmPlot["mechanization"],
        state: String(row.state),
        district: String(row.district),
        coarseCell: row.coarse_cell ? String(row.coarse_cell) : undefined,
        createdAt: Number(row.created_at),
        updatedAt: Number(row.updated_at),
      }),
    ),
    cycles: records.cycles.map(
      (row): CropCycle => ({
        id: String(row.id),
        plotId: String(row.plot_id),
        cropCode: row.crop_code as CropCycle["cropCode"],
        variety: String(row.variety || ""),
        startedOn: String(row.started_on),
        expectedHarvestOn: String(row.expected_harvest_on || ""),
        status: row.status as CropCycle["status"],
        createdAt: Number(row.created_at),
        updatedAt: Number(row.updated_at),
      }),
    ),
    events: records.events.map(
      (row): CropEvent => ({
        id: String(row.id),
        cycleId: String(row.cycle_id),
        type: row.event_type as CropEvent["type"],
        occurredOn: String(row.occurred_on),
        title: String(row.title),
        detail: String(row.detail || ""),
        source: row.source as CropEvent["source"],
        createdAt: Number(row.created_at),
      }),
    ),
    ledger: records.ledger.map(
      (row): LedgerEntry => ({
        id: String(row.id),
        cycleId: String(row.cycle_id),
        kind: row.kind as LedgerEntry["kind"],
        category: row.category as LedgerEntry["category"],
        amountPaise: Number(row.amount_paise),
        occurredOn: String(row.occurred_on),
        note: String(row.note || ""),
        createdAt: Number(row.created_at),
      }),
    ),
    cases: records.cases.map(
      (row): CropHealthCase => ({
        id: String(row.id),
        reference: String(row.reference),
        cycleId: String(row.cycle_id),
        cropCode: String(row.crop_code),
        diseaseCode: String(row.disease_code),
        diseaseName: String(row.disease_name),
        symptoms: JSON.parse(String(row.symptoms_json)),
        confidence: Number(row.confidence),
        confidenceBand: row.confidence_band as CropHealthCase["confidenceBand"],
        district: String(row.district),
        coarseCell: row.coarse_cell ? String(row.coarse_cell) : undefined,
        cropStage: String(row.crop_stage),
        season: String(row.season),
        status: row.status as CropHealthCase["status"],
        origin: row.origin as CropHealthCase["origin"],
        consentVersion: String(row.consent_version) as CropHealthCase["consentVersion"],
        createdAt: Number(row.created_at),
        updatedAt: Number(row.updated_at),
      }),
    ),
    outcomes: records.outcomes.map(
      (row): CaseOutcome => ({
        id: String(row.id),
        caseId: String(row.case_id),
        intervalDays: Number(row.interval_days) as 3 | 7,
        result: row.result as CaseOutcome["result"],
        note: String(row.note || ""),
        createdAt: Number(row.created_at),
      }),
    ),
  };
}

export async function persistDemoPhase2(state: Phase2State) {
  if (!demo) return;
  await savePhase2State(state);
}

export async function phase2Post<T>(path: string, value: unknown): Promise<T> {
  return request<T>(path, value);
}
