import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  BadgeIndianRupee,
  BookOpen,
  CheckCircle2,
  Download,
  FileText,
  MapPin,
  PackageOpen,
  Phone,
  Plus,
  Printer,
  Scale,
  ShieldCheck,
  Sprout,
} from "lucide-react";
import {
  PHASE2_CONSENT_VERSION,
  confidenceBand,
  matchCases,
  priorityCrops,
  summarizeLedger,
  triageCase,
  type CropCycleInput,
  type CropHealthCase,
  type Phase2State,
  type ProfileInput,
} from "../../shared/domain";
import { demo } from "../lib/api";
import { deletePhase2Record, loadPhase2, persistDemoPhase2, phase2Post } from "../lib/phase2";
import type { Copy } from "../lib/i18n";
import { LocationFields } from "./LocationFields";

type Props = {
  copy: Copy;
  locale: string;
  onError: (message: string) => void;
};

const emptyState: Phase2State = { plots: [], cycles: [], events: [], ledger: [], cases: [], outcomes: [] };
const today = () => new Date().toISOString().slice(0, 10);
const cropKey: Record<string, keyof Copy> = {
  RICE: "cropRice",
  WHEAT: "cropWheat",
  COTTON: "cropCotton",
  SUGARCANE: "cropSugarcane",
  MAIZE: "cropMaize",
  TOMATO: "cropTomato",
};
const caseByCrop: Record<string, { code: string; name: keyof Copy; symptom: keyof Copy }> = {
  RICE: { code: "RICE_BLAST", name: "exampleRiceBlast", symptom: "exampleRiceBlastSymptom" },
  WHEAT: { code: "YELLOW_RUST", name: "exampleYellowRust", symptom: "exampleYellowRustSymptom" },
  COTTON: { code: "PINK_BOLLWORM", name: "examplePinkBollworm", symptom: "examplePinkBollwormSymptom" },
  SUGARCANE: { code: "RED_ROT", name: "exampleRedRot", symptom: "exampleRedRotSymptom" },
  MAIZE: { code: "FALL_ARMYWORM", name: "exampleFallArmyworm", symptom: "exampleFallArmywormSymptom" },
  TOMATO: { code: "EARLY_BLIGHT", name: "exampleEarlyBlight", symptom: "exampleEarlyBlightSymptom" },
};
const reasonKey: Record<string, keyof Copy> = {
  "same crop": "sameCrop",
  "same suspected condition": "sameCondition",
  "same crop stage": "sameCropStage",
  "same season": "sameSeason",
  "same district": "sameDistrict",
  "nearby coarse area": "nearbyCoarseArea",
};
const interimActionKey: Record<string, keyof Copy> = {
  monitor_changes: "monitorChanges",
  avoid_unverified_treatment: "avoidUnverifiedTreatment",
  capture_more_evidence: "captureMoreEvidence",
  contact_official_helpline: "contactOfficialHelpline",
};
const inputClassKey: Record<string, keyof Copy> = {
  seed: "seed",
  fertilizer: "fertilizer",
  crop_protection: "pesticide",
  soil_amendment: "soilAmendment",
  bio_input: "bioInput",
  other: "other",
};
const unitKey: Record<string, keyof Copy> = {
  kg: "unitKg",
  quintal: "unitQuintal",
  tonne: "unitTonne",
  litre: "unitLitre",
  millilitre: "unitMillilitre",
  gram: "unitGram",
  bag: "unitBag",
  acre: "acre",
  hectare: "hectare",
  other: "other",
};

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export function FarmRecords({ copy: t, locale, onError }: Props) {
  const [state, setState] = useState<Phase2State>(emptyState);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [recordNotice, setRecordNotice] = useState("");
  const [activeCycleId, setActiveCycleId] = useState("");
  const [profile, setProfile] = useState({ displayName: "", state: "", district: "", recentCropCode: "", lastHarvestOn: "" });
  const [plot, setPlot] = useState({ name: "", area: "", areaUnit: "acre", irrigation: "rainfed", mechanization: "manual" });
  const [cycle, setCycle] = useState<{ plotId: string; cropCode: CropCycleInput["cropCode"]; variety: string; startedOn: string; expectedHarvestOn: string }>({ plotId: "", cropCode: "RICE", variety: "", startedOn: today(), expectedHarvestOn: "" });
  const [activity, setActivity] = useState({ title: "", detail: "", occurredOn: today() });
  const [farmInput, setFarmInput] = useState({ inputClass: "seed", productName: "", amount: "", unit: "kg", purpose: "", occurredOn: today(), detail: "" });
  const [harvestRecord, setHarvestRecord] = useState({ yieldAmount: "", yieldUnit: "quintal", occurredOn: today(), detail: "" });
  const [ledger, setLedger] = useState({ kind: "expense", category: "seed", amount: "", occurredOn: today(), note: "" });

  const activeCycle = state.cycles.find((item) => item.id === activeCycleId) ?? state.cycles[0];
  const activeLedger = state.ledger.filter((entry) => entry.cycleId === activeCycle?.id);
  const totals = summarizeLedger(activeLedger);
  const harvestIntervalDays = state.profile?.lastHarvestOn
    ? Math.max(0, Math.floor((Date.now() - new Date(`${state.profile.lastHarvestOn}T00:00:00`).getTime()) / 86400000))
    : undefined;
  const activeCase = state.cases.find((item) => item.cycleId === activeCycle?.id);
  const referenceCases = useMemo(() => {
    if (!activeCase) return [];
    return ["A", "B"].map((suffix, index): CropHealthCase => ({
      ...activeCase,
      id: `reference-${suffix}-${activeCase.cropCode}`,
      reference: `DEMO-${activeCase.cropCode}-${suffix}`,
      district: index ? t.referenceDistrict : activeCase.district,
      coarseCell: undefined,
      status: "closed",
      origin: "synthetic",
      createdAt: activeCase.createdAt - (index + 1) * 86400000,
      updatedAt: activeCase.updatedAt - (index + 1) * 86400000,
    }));
  }, [activeCase]);
  const matches = activeCase ? matchCases(activeCase, referenceCases) : [];

  async function refresh() {
    const value = await loadPhase2();
    setState(value);
    setProfile({
      displayName: value.profile?.displayName ?? "",
      state: value.profile?.state ?? "",
      district: value.profile?.district ?? "",
      recentCropCode: value.profile?.recentCropCode ?? "",
      lastHarvestOn: value.profile?.lastHarvestOn ?? "",
    });
    setActiveCycleId((current) => current || value.cycles[0]?.id || "");
    setLoaded(true);
  }

  useEffect(() => {
    void refresh().catch((error) => onError(error.message));
  }, []);

  async function commit(next: Phase2State) {
    setState(next);
    await persistDemoPhase2(next);
  }

  async function action(run: () => Promise<void>) {
    setBusy(true);
    try {
      await run();
    } catch (error) {
      onError(error instanceof Error ? error.message : t.error);
    } finally {
      setBusy(false);
    }
  }

  function saveProfile(event: FormEvent) {
    event.preventDefault();
    void action(async () => {
      const value = {
        displayName: profile.displayName,
        locale,
        state: profile.state,
        district: profile.district,
        recentCropCode: profile.recentCropCode as ProfileInput["recentCropCode"],
        lastHarvestOn: profile.lastHarvestOn,
        consentVersion: PHASE2_CONSENT_VERSION,
      } satisfies ProfileInput;
      if (demo) {
        const now = Date.now();
        await commit({ ...state, profile: { ...value, createdAt: state.profile?.createdAt ?? now, updatedAt: now } });
      } else {
        await phase2Post("profile", value);
        await refresh();
      }
    });
  }

  function deleteRecord() {
    void action(async () => {
      if (demo) await persistDemoPhase2(emptyState);
      else await deletePhase2Record();
      setState(emptyState);
      setProfile({ displayName: "", state: "", district: "", recentCropCode: "", lastHarvestOn: "" });
      setActiveCycleId("");
      setDeleteArmed(false);
      setRecordNotice(t.recordDeleted);
    });
  }

  function addPlot(event: FormEvent) {
    event.preventDefault();
    void action(async () => {
      const value = {
        name: plot.name,
        area: Number(plot.area),
        areaUnit: plot.areaUnit as "acre" | "hectare",
        irrigation: plot.irrigation as "rainfed" | "canal" | "sprinkler" | "drip" | "borewell" | "other",
        mechanization: plot.mechanization as "manual" | "animal" | "partial" | "tractor",
        state: state.profile!.state,
        district: state.profile!.district,
      };
      if (demo) {
        const now = Date.now();
        const next = { ...state, plots: [{ ...value, id: crypto.randomUUID(), createdAt: now, updatedAt: now }, ...state.plots] };
        await commit(next);
        setCycle((current) => ({ ...current, plotId: next.plots[0].id }));
      } else {
        await phase2Post("plots", value);
        await refresh();
      }
      setPlot({ ...plot, name: "", area: "" });
    });
  }

  function addCycle(event: FormEvent) {
    event.preventDefault();
    void action(async () => {
      const value = { ...cycle, plotId: cycle.plotId || state.plots[0]?.id };
      if (demo) {
        const now = Date.now();
        const created = { ...value, id: crypto.randomUUID(), status: "active" as const, createdAt: now, updatedAt: now };
        await commit({ ...state, cycles: [created, ...state.cycles] });
        setActiveCycleId(created.id);
      } else {
        const result = await phase2Post<{ id: string }>("cycles", value);
        await refresh();
        setActiveCycleId(result.id);
      }
    });
  }

  function addActivity(event: FormEvent) {
    event.preventDefault();
    if (!activeCycle) return;
    void action(async () => {
      const value = { cycleId: activeCycle.id, type: "note" as const, ...activity, source: "farmer" as const, productName: "", purpose: "" };
      if (demo) await commit({ ...state, events: [{ ...value, id: crypto.randomUUID(), createdAt: Date.now() }, ...state.events] });
      else { await phase2Post("events", value); await refresh(); }
      setActivity({ ...activity, title: "", detail: "" });
    });
  }

  function addFarmInput(event: FormEvent) {
    event.preventDefault();
    if (!activeCycle) return;
    void action(async () => {
      const value = {
        cycleId: activeCycle.id,
        type: "input" as const,
        occurredOn: farmInput.occurredOn,
        title: farmInput.productName,
        detail: farmInput.detail,
        source: "farmer" as const,
        inputClass: farmInput.inputClass as "seed" | "fertilizer" | "crop_protection" | "soil_amendment" | "bio_input" | "other",
        productName: farmInput.productName,
        amount: Number(farmInput.amount),
        unit: farmInput.unit as "kg" | "quintal" | "tonne" | "litre" | "millilitre" | "gram" | "bag" | "acre" | "hectare" | "other",
        purpose: farmInput.purpose,
      };
      if (demo) await commit({ ...state, events: [{ ...value, id: crypto.randomUUID(), createdAt: Date.now() }, ...state.events] });
      else { await phase2Post("events", value); await refresh(); }
      setFarmInput({ ...farmInput, productName: "", amount: "", purpose: "", detail: "" });
    });
  }

  function addHarvestRecord(event: FormEvent) {
    event.preventDefault();
    if (!activeCycle) return;
    void action(async () => {
      const value = {
        cycleId: activeCycle.id,
        type: "harvest" as const,
        occurredOn: harvestRecord.occurredOn,
        title: t.harvestRecorded,
        detail: harvestRecord.detail,
        source: "farmer" as const,
        productName: "",
        purpose: "",
        yieldAmount: Number(harvestRecord.yieldAmount),
        yieldUnit: harvestRecord.yieldUnit as "kg" | "quintal" | "tonne" | "litre" | "millilitre" | "gram" | "bag" | "acre" | "hectare" | "other",
      };
      if (demo) await commit({ ...state, events: [{ ...value, id: crypto.randomUUID(), createdAt: Date.now() }, ...state.events] });
      else { await phase2Post("events", value); await refresh(); }
      setHarvestRecord({ ...harvestRecord, yieldAmount: "", detail: "" });
    });
  }

  function addLedger(event: FormEvent) {
    event.preventDefault();
    if (!activeCycle) return;
    void action(async () => {
      const value = {
        cycleId: activeCycle.id,
        kind: ledger.kind as "expense" | "revenue",
        category: ledger.category as "seed" | "fertilizer" | "pesticide" | "labour" | "irrigation" | "equipment" | "harvest" | "sale" | "other",
        amountPaise: Math.round(Number(ledger.amount) * 100),
        occurredOn: ledger.occurredOn,
        note: ledger.note,
      };
      if (demo) await commit({ ...state, ledger: [{ ...value, id: crypto.randomUUID(), createdAt: Date.now() }, ...state.ledger] });
      else { await phase2Post("ledger", value); await refresh(); }
      setLedger({ ...ledger, amount: "", note: "" });
    });
  }

  function createExampleCase() {
    if (!activeCycle || activeCase) return;
    const condition = caseByCrop[activeCycle.cropCode] ?? caseByCrop.RICE;
    const id = crypto.randomUUID();
    const now = Date.now();
    const created: CropHealthCase = {
      id,
      reference: `AGM-DEMO-${id.replaceAll("-", "").slice(0, 6).toUpperCase()}`,
      cycleId: activeCycle.id,
      cropCode: activeCycle.cropCode,
      diseaseCode: condition.code,
      diseaseName: t[condition.name],
      symptoms: [t[condition.symptom]],
      confidence: 0.84,
      confidenceBand: confidenceBand(0.84),
      district: state.profile?.district || t.demonstrationDistrict,
      cropStage: "vegetative",
      season: t.demonstrationSeason,
      status: "pending_review",
      origin: "synthetic",
      consentVersion: PHASE2_CONSENT_VERSION,
      createdAt: now,
      updatedAt: now,
    };
    created.aiTriage = triageCase(created, now);
    void action(() => commit({ ...state, cases: [created, ...state.cases] }));
  }

  function recordOutcome(intervalDays: 3 | 7, result: "improved" | "resolved" | "unchanged" | "worse") {
    if (!activeCase) return;
    const outcome = { id: crypto.randomUUID(), caseId: activeCase.id, intervalDays, result, note: "", createdAt: Date.now() };
    const cases = state.cases.map((item) => item.id === activeCase.id ? { ...item, status: intervalDays === 7 ? "closed" as const : "follow_up_due" as const, updatedAt: Date.now() } : item);
    void action(() => commit({ ...state, cases, outcomes: [outcome, ...state.outcomes.filter((item) => !(item.caseId === activeCase.id && item.intervalDays === intervalDays))] }));
  }

  function exportJson() {
    download("agroman-farm-record.json", JSON.stringify({ notice: t.exportNotice, exportedAt: new Date().toISOString(), ...state }, null, 2), "application/json");
  }

  function exportCsv() {
    const rows = [["cycle_id", "kind", "category", "amount_inr", "date", "note"], ...state.ledger.map((entry) => [entry.cycleId, entry.kind, entry.category, (entry.amountPaise / 100).toFixed(2), entry.occurredOn, entry.note])];
    download("agroman-farm-ledger.csv", rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n"), "text/csv");
  }

  if (!loaded) return <section className="records-page section"><p>{t.loadingRecords}</p></section>;

  if (!state.profile) return (
    <section className="records-page section">
      <div className="records-heading"><div><p className="eyebrow">{t.records}</p><h1>{t.profileTitle}</h1><p>{t.profileCopy}</p></div><ShieldCheck size={42} /></div>
      {demo && <div className="demo-banner"><ShieldCheck size={17} />{t.testIdentity} — {t.syntheticCase}</div>}
      {recordNotice && <p className="record-notice deletion-success" role="status">{recordNotice}</p>}
      <form className="record-form" onSubmit={saveProfile}>
        <label>{t.farmerName}<input value={profile.displayName} onChange={(event) => setProfile({ ...profile, displayName: event.target.value })} /></label>
        <LocationFields copy={t} state={profile.state} district={profile.district} onChange={(location) => setProfile({ ...profile, ...location })} />
        <label>{t.recentCrop}<select value={profile.recentCropCode} onChange={(event) => setProfile({ ...profile, recentCropCode: event.target.value })}><option value="">{t.notProvided}</option>{priorityCrops.map(([cropCode]) => <option key={cropCode} value={cropCode}>{t[cropKey[cropCode]]}</option>)}</select></label>
        <label>{t.lastHarvestDate}<input type="date" max={today()} value={profile.lastHarvestOn} onChange={(event) => setProfile({ ...profile, lastHarvestOn: event.target.value })} /></label>
        <button className="primary" disabled={busy}>{t.saveProfile}</button>
      </form>
    </section>
  );

  return (
    <section className="records-page section">
      <div className="records-heading">
        <div><p className="eyebrow">{t.records}</p><h1>{t.recordsTitle}</h1><p>{t.recordsCopy}</p></div>
        <div className="identity-card"><ShieldCheck size={18} /><span>{state.profile.displayName || t.testIdentity}<small>{state.profile.district}, {state.profile.state}</small>{state.profile.recentCropCode && <small>{t.recentCrop}: {t[cropKey[state.profile.recentCropCode]]}</small>}{harvestIntervalDays !== undefined && <small>{harvestIntervalDays} {t.daysSinceHarvest}</small>}</span></div>
      </div>
      {demo && <div className="demo-banner"><ShieldCheck size={17} />{t.syntheticCase}</div>}

      <div className="records-grid">
        <article className="record-panel plots-panel">
          <div className="panel-title"><MapPin /><div><h2>{t.addPlot}</h2><p>{t.phase2Privacy}</p></div></div>
          <form className="record-form" onSubmit={addPlot}>
            <label>{t.plotName}<input value={plot.name} onChange={(event) => setPlot({ ...plot, name: event.target.value })} required /></label>
            <label>{t.area}<input value={plot.area} onChange={(event) => setPlot({ ...plot, area: event.target.value })} type="number" min="0.01" step="0.01" required /></label>
            <label>{t.areaUnit}<select value={plot.areaUnit} onChange={(event) => setPlot({ ...plot, areaUnit: event.target.value })}><option value="acre">{t.acre}</option><option value="hectare">{t.hectare}</option></select></label>
            <label>{t.irrigation}<select value={plot.irrigation} onChange={(event) => setPlot({ ...plot, irrigation: event.target.value })}>{["rainfed", "canal", "sprinkler", "drip", "borewell"].map((value) => <option key={value} value={value}>{t[value as keyof Copy]}</option>)}</select></label>
            <label>{t.mechanization}<select value={plot.mechanization} onChange={(event) => setPlot({ ...plot, mechanization: event.target.value })}>{["manual", "animal", "partial", "tractor"].map((value) => <option key={value} value={value}>{t[value as keyof Copy]}</option>)}</select></label>
            <button className="secondary" disabled={busy}><Plus size={16} />{t.createPlot}</button>
          </form>
          <div className="plot-list">{state.plots.map((item) => <button key={item.id} className={cycle.plotId === item.id ? "plot-chip selected" : "plot-chip"} onClick={() => setCycle({ ...cycle, plotId: item.id })}><strong>{item.name}</strong><small>{item.area} {t[item.areaUnit]}</small></button>)}</div>
        </article>

        <article className="record-panel cycle-panel">
          <div className="panel-title"><Sprout /><div><h2>{t.addCycle}</h2><p>{state.plots.length ? t.recordsCopy : t.noPlots}</p></div></div>
          <form className="record-form" onSubmit={addCycle}>
            <label>{t.selectPlot}<select value={cycle.plotId || state.plots[0]?.id || ""} onChange={(event) => setCycle({ ...cycle, plotId: event.target.value })} required>{state.plots.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
            <label>{t.crop}<select value={cycle.cropCode} onChange={(event) => setCycle({ ...cycle, cropCode: event.target.value as CropCycleInput["cropCode"] })}>{priorityCrops.map(([code]) => <option value={code} key={code}>{t[cropKey[code]]}</option>)}</select></label>
            <label>{t.variety}<input value={cycle.variety} onChange={(event) => setCycle({ ...cycle, variety: event.target.value })} /></label>
            <label>{t.sowingDate}<input type="date" value={cycle.startedOn} onChange={(event) => setCycle({ ...cycle, startedOn: event.target.value })} required /></label>
            <label>{t.expectedHarvest}<input type="date" value={cycle.expectedHarvestOn} onChange={(event) => setCycle({ ...cycle, expectedHarvestOn: event.target.value })} /></label>
            <button className="secondary" disabled={busy || !state.plots.length}><Plus size={16} />{t.createCycle}</button>
          </form>
          <div className="cycle-tabs">{state.cycles.map((item) => <button className={activeCycle?.id === item.id ? "selected" : ""} key={item.id} onClick={() => setActiveCycleId(item.id)}>{t[cropKey[item.cropCode]]}<small>{item.startedOn}</small></button>)}</div>
        </article>

        <article className="record-panel activity-panel">
          <div className="panel-title"><BookOpen /><div><h2>{t.addEvent}</h2><p>{activeCycle ? `${t.activeCycle}: ${t[cropKey[activeCycle.cropCode]]}` : t.noCycles}</p></div></div>
          <form className="record-form compact" onSubmit={addActivity}>
            <label>{t.eventTitle}<input value={activity.title} onChange={(event) => setActivity({ ...activity, title: event.target.value })} required /></label>
            <label>{t.eventDate}<input type="date" value={activity.occurredOn} onChange={(event) => setActivity({ ...activity, occurredOn: event.target.value })} required /></label>
            <label className="wide">{t.eventDetail}<textarea value={activity.detail} onChange={(event) => setActivity({ ...activity, detail: event.target.value })} /></label>
            <button className="secondary" disabled={busy || !activeCycle}>{t.saveActivity}</button>
          </form>
          <div className="timeline">{state.events.filter((item) => item.cycleId === activeCycle?.id).map((item) => <div key={item.id}><span /><div><strong>{item.title}</strong><small>{item.occurredOn} · {t.selfReported}</small>{item.type === "input" && item.amount !== undefined && item.unit && <p>{t.recordedQuantity}: {item.amount} {t[unitKey[item.unit]]} · {item.purpose}</p>}{item.type === "harvest" && item.yieldAmount !== undefined && item.yieldUnit && <p>{t.recordedYield}: {item.yieldAmount} {t[unitKey[item.yieldUnit]]}</p>}{item.detail && <p>{item.detail}</p>}</div></div>)}</div>
        </article>

        <article className="record-panel finance-panel">
          <div className="panel-title"><BadgeIndianRupee /><div><h2>{t.addLedger}</h2><p>{t.selfReported}</p></div></div>
          <div className="finance-summary"><div><small>{t.totalExpenses}</small><strong>₹{(totals.expensesPaise / 100).toLocaleString("en-IN")}</strong></div><div><small>{t.totalRevenue}</small><strong>₹{(totals.revenuePaise / 100).toLocaleString("en-IN")}</strong></div><div><small>{t.estimatedMargin}</small><strong>₹{(totals.marginPaise / 100).toLocaleString("en-IN")}</strong></div></div>
          <form className="record-form compact" onSubmit={addLedger}>
            <label>{t.category}<select value={ledger.kind} onChange={(event) => setLedger({ ...ledger, kind: event.target.value, category: event.target.value === "revenue" ? "sale" : "seed" })}><option value="expense">{t.expense}</option><option value="revenue">{t.revenue}</option></select></label>
            <label>{t.category}<select value={ledger.category} onChange={(event) => setLedger({ ...ledger, category: event.target.value })}>{["seed", "fertilizer", "pesticide", "labour", "irrigation", "equipment", "harvest", "sale", "other"].map((value) => <option key={value} value={value}>{t[value as keyof Copy]}</option>)}</select></label>
            <label>{t.amount}<input type="number" min="0" step="0.01" value={ledger.amount} onChange={(event) => setLedger({ ...ledger, amount: event.target.value })} required /></label>
            <label>{t.eventDate}<input type="date" value={ledger.occurredOn} onChange={(event) => setLedger({ ...ledger, occurredOn: event.target.value })} required /></label>
            <button className="secondary" disabled={busy || !activeCycle}>{t.saveEntry}</button>
          </form>
        </article>

        <article className="record-panel structured-panel">
          <div className="panel-title"><PackageOpen /><div><h2>{t.structuredRecords}</h2><p>{t.structuredRecordsCopy}</p></div></div>
          <div className="structured-records">
            <form className="record-form" onSubmit={addFarmInput}>
              <div className="subform-heading"><PackageOpen /><div><strong>{t.recordFarmInput}</strong><small>{t.farmerReportedHistory}</small></div></div>
              <label>{t.inputClass}<select value={farmInput.inputClass} onChange={(event) => setFarmInput({ ...farmInput, inputClass: event.target.value })}>{Object.keys(inputClassKey).map((value) => <option key={value} value={value}>{t[inputClassKey[value]]}</option>)}</select></label>
              <label>{t.productName}<input value={farmInput.productName} onChange={(event) => setFarmInput({ ...farmInput, productName: event.target.value })} required /></label>
              <label>{t.recordedQuantity}<input type="number" min="0.001" step="any" value={farmInput.amount} onChange={(event) => setFarmInput({ ...farmInput, amount: event.target.value })} required /></label>
              <label>{t.unit}<select value={farmInput.unit} onChange={(event) => setFarmInput({ ...farmInput, unit: event.target.value })}>{Object.keys(unitKey).map((value) => <option key={value} value={value}>{t[unitKey[value]]}</option>)}</select></label>
              <label>{t.purpose}<input value={farmInput.purpose} onChange={(event) => setFarmInput({ ...farmInput, purpose: event.target.value })} required /></label>
              <label>{t.eventDate}<input type="date" value={farmInput.occurredOn} onChange={(event) => setFarmInput({ ...farmInput, occurredOn: event.target.value })} required /></label>
              <label className="wide">{t.eventDetail}<textarea value={farmInput.detail} onChange={(event) => setFarmInput({ ...farmInput, detail: event.target.value })} /></label>
              <button className="secondary" disabled={busy || !activeCycle}>{t.saveFarmInput}</button>
            </form>
            <form className="record-form" onSubmit={addHarvestRecord}>
              <div className="subform-heading"><Scale /><div><strong>{t.recordHarvest}</strong><small>{t.farmerReportedHistory}</small></div></div>
              <label>{t.recordedYield}<input type="number" min="0" step="any" value={harvestRecord.yieldAmount} onChange={(event) => setHarvestRecord({ ...harvestRecord, yieldAmount: event.target.value })} required /></label>
              <label>{t.unit}<select value={harvestRecord.yieldUnit} onChange={(event) => setHarvestRecord({ ...harvestRecord, yieldUnit: event.target.value })}>{["kg", "quintal", "tonne", "bag", "other"].map((value) => <option key={value} value={value}>{t[unitKey[value]]}</option>)}</select></label>
              <label>{t.harvestDate}<input type="date" value={harvestRecord.occurredOn} onChange={(event) => setHarvestRecord({ ...harvestRecord, occurredOn: event.target.value })} required /></label>
              <label className="wide">{t.eventDetail}<textarea value={harvestRecord.detail} onChange={(event) => setHarvestRecord({ ...harvestRecord, detail: event.target.value })} /></label>
              <button className="secondary" disabled={busy || !activeCycle}>{t.saveHarvest}</button>
            </form>
          </div>
        </article>

        <article className="record-panel case-panel">
          <div className="panel-title"><ShieldCheck /><div><h2>{t.healthCase}</h2><p>{t.confidenceExplanation}</p></div></div>
          {!activeCase ? <button className="secondary" disabled={!activeCycle} onClick={createExampleCase}>{t.createExampleCase}</button> : <>
            <div className="case-summary"><span className="case-status">{t.synthetic}</span><h3>{activeCase.diseaseName}</h3><p><strong>{t.caseReference}:</strong> {activeCase.reference}</p><div className="confidence-row"><strong>{t.aiConfidence}</strong><span>{t.confidenceModerate} · {Math.round(activeCase.confidence * 100)}%</span></div><small>{t.confidenceExplanation}</small><p>{activeCase.status === "pending_review" ? t.pendingReview : t.reviewed}</p>{activeCase.aiTriage && <div className="interim-guidance"><strong>{t.whileWaiting}</strong><ul>{activeCase.aiTriage.interimActions.map((action) => <li key={action}>{t[interimActionKey[action]]}</li>)}</ul><small>{t.interimDisclaimer}</small></div>}</div>
            <div className="matches"><h3>{t.similarCases}</h3>{matches.map((match) => <div key={match.caseId}><CheckCircle2 size={16} /><span><strong>{match.reference}</strong><small>{match.score}% · {match.reasons.map((reason) => reasonKey[reason] ? t[reasonKey[reason]] : reason).join(", ")}</small></span></div>)}</div>
            <div className="outcome-actions"><button className="text-button" onClick={() => recordOutcome(3, "improved")}>{t.outcome3}: {t.improved}</button><button className="text-button" onClick={() => recordOutcome(7, "resolved")}>{t.outcome7}: {t.resolved}</button></div>
          </>}
        </article>

        <article className="record-panel export-panel">
          <div className="panel-title"><FileText /><div><h2>{t.exportRecord}</h2><p>{t.exportNotice}</p></div></div>
          <div className="export-actions"><button className="secondary" onClick={exportJson}><Download size={16} />{t.exportJson}</button><button className="secondary" onClick={exportCsv}><Download size={16} />{t.exportCsv}</button><button className="secondary" onClick={() => window.print()}><Printer size={16} />{t.printPdf}</button></div>
          <div className="helpline-card"><Phone size={20} /><div><strong>{t.helpline}</strong><p>{t.helplineCopy}</p><a href="tel:18001801551">1800-180-1551</a>{state.profile.state.toLowerCase() === "odisha" && <a href="tel:155333">155333 · Odisha</a>}</div></div>
          <div className="record-deletion">
            {!deleteArmed ? (
              <button className="text-button danger-link" onClick={() => setDeleteArmed(true)}>{t.deleteRecord}</button>
            ) : (
              <div className="deletion-confirmation" role="alertdialog" aria-labelledby="delete-record-title" aria-describedby="delete-record-copy">
                <strong id="delete-record-title">{t.deleteRecordTitle}</strong>
                <p id="delete-record-copy">{t.deleteRecordCopy}</p>
                <div>
                  <button className="secondary" onClick={() => setDeleteArmed(false)}>{t.cancelDeleteRecord}</button>
                  <button className="danger-button" disabled={busy} onClick={deleteRecord}>{t.confirmDeleteRecord}</button>
                </div>
              </div>
            )}
            {recordNotice && <p className="record-notice" role="status">{recordNotice}</p>}
          </div>
        </article>
      </div>
    </section>
  );
}
