import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import type { Copy } from "../lib/i18n";
import { demo, request } from "../lib/api";
import type { FieldOutlook } from "../../shared/farm-intelligence";
import {
  allowedPlanActions,
  PLANNING_CONSENT_VERSION,
  type NextStepPlan,
  type PlanningRequest,
} from "../../shared/farm-planning";

const actionCopy = {
  check_water: "planCheckWater",
  check_drainage: "planCheckDrainage",
  inspect: "planInspect",
  crop_windows: "planCropWindows",
  local_calendar: "planLocalCalendar",
  soil_test: "planSoilTest",
  input_record: "planInputRecord",
  market: "planMarket",
  photo: "planPhoto",
} as const;
const cropCopy = {
  RICE: "cropRice",
  WHEAT: "cropWheat",
  COTTON: "cropCotton",
  SUGARCANE: "cropSugarcane",
  MAIZE: "cropMaize",
  TOMATO: "cropTomato",
} as const;
export function FieldPlanner({
  copy: t,
  locale,
  outlook,
}: {
  copy: Copy;
  locale: string;
  outlook: FieldOutlook;
}) {
  const [consent, setConsent] = useState(false);
  const [protection, setProtection] =
    useState<PlanningRequest["cropProtection"]>("unknown");
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState<NextStepPlan>();
  const [error, setError] = useState(false);
  useEffect(() => {
    setPlan(undefined);
    setConsent(false);
    setError(false);
    setProtection("unknown");
  }, [outlook, locale]);
  async function generate() {
    if (!consent || busy) return;
    setBusy(true);
    setError(false);
    setPlan(undefined);
    try {
      const result = demo
        ? {
            priorities: allowedPlanActions(outlook, protection).slice(0, 4),
            cropCodes: outlook.candidates.map(
              (candidate) => candidate.cropCode,
            ),
            createdAt: Date.now(),
            model: "synthetic",
            locale,
          }
        : await request<NextStepPlan>("farm/plan", {
            plotId: outlook.plotId,
            consent: true,
            consentVersion: PLANNING_CONSENT_VERSION,
            locale,
            cropProtection: protection,
          });
      setPlan(result);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
      setConsent(false);
    }
  }
  return (
    <section className="planning-panel" aria-labelledby="field-planning-title">
      <h3 id="field-planning-title">
        <Sparkles size={21} aria-hidden="true" /> {t.planningTitle}
      </h3>
      <p>{t.planningCopy}</p>
      <label>
        {t.planningInputs}
        <select
          value={protection}
          disabled={busy}
          onChange={(event) => {
            setProtection(
              event.target.value as PlanningRequest["cropProtection"],
            );
            setPlan(undefined);
            setConsent(false);
          }}
        >
          <option value="unknown">{t.planningUnknown}</option>
          <option value="no">{t.planningNo}</option>
          <option value="yes">{t.planningYes}</option>
        </select>
      </label>
      <label className="planning-consent">
        <input
          type="checkbox"
          checked={consent}
          disabled={busy}
          onChange={(event) => setConsent(event.target.checked)}
        />
        <span>{t.planningConsent}</span>
      </label>
      <button
        className="primary"
        disabled={
          !consent || busy || outlook.fieldState === "conflicting_cycles"
        }
        onClick={() => void generate()}
      >
        {busy ? t.planningBusy : t.planningGenerate}
      </button>
      {busy && <p role="status">{t.planningBusy}</p>}
      {error && <p role="alert">{t.planningError}</p>}
      {plan && (
        <div className="planning-result" role="status">
          <small>{demo ? t.planningDemo : t.planningLabel}</small>
          <ol>
            {plan.priorities.map((action) => (
              <li key={action}>{t[actionCopy[action]]}</li>
            ))}
          </ol>
          {!!plan.cropCodes.length && (
            <p>
              <strong>{t.planningCropOptions}</strong>{" "}
              {plan.cropCodes.map((crop) => t[cropCopy[crop]]).join(" · ")}
            </p>
          )}
          <p className="field-note">{t.planningMissing}</p>
        </div>
      )}
    </section>
  );
}
