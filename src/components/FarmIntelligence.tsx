import { useEffect, useRef, useState, type FormEvent } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  Check,
  CloudRain,
  Droplets,
  Leaf,
  Plus,
  RefreshCw,
  Sprout,
  Camera,
} from "lucide-react";
import {
  priorityCrops,
  type CropCycle,
  type Phase2State,
  type WeatherSummary,
} from "../../shared/domain";
import {
  buildFieldOutlook,
  fieldSetupSchema,
  harvestCompletionSchema,
  indiaToday,
  quickActionCodes,
  type FieldOutlook,
  type FieldSetup,
  type PhotoObservation,
  type QuickAction,
} from "../../shared/farm-intelligence";
import { demo, prepareImage, request } from "../lib/api";
import { phase2Post } from "../lib/phase2";
import type { Copy } from "../lib/i18n";
import { FieldPlanner } from "./FieldPlanner";

type Outlook = FieldOutlook & {
  actions: QuickAction[];
  photo?: PhotoObservation | null;
};
type Props = {
  copy: Copy;
  locale: string;
  state: Phase2State;
  onDemoSave: (state: Phase2State) => Promise<void>;
  onRefresh: () => Promise<void>;
  onError: (message: string) => void;
};
const cropKeys: Record<string, keyof Copy> = {
  RICE: "cropRice",
  WHEAT: "cropWheat",
  COTTON: "cropCotton",
  SUGARCANE: "cropSugarcane",
  MAIZE: "cropMaize",
  TOMATO: "cropTomato",
};
const actionKeys: Record<QuickAction["action"], keyof Copy> = {
  irrigation: "smartWatered",
  weeding: "smartWeeded",
  crop_protection: "smartProtected",
};
const stageKeys: Record<PhotoObservation["stage"], keyof Copy> = {
  seedling: "smartSeedling",
  vegetative: "smartVegetative",
  flowering: "smartFlowering",
  fruit_grain: "smartFruitGrain",
  mature: "smartMature",
  undetermined: "smartUndetermined",
};
const nextStepKeys: Record<PhotoObservation["nextStep"], keyof Copy> = {
  retake: "smartPhotoNextRetake",
  monitor: "smartPhotoNextMonitor",
  local_expert: "smartPhotoNextExpert",
};
const fresh = () => ({
  id: crypto.randomUUID(),
  area: "",
  areaUnit: "acre" as const,
  waterAccess: "unknown" as FieldSetup["waterAccess"],
  fieldState: "empty" as FieldSetup["fieldState"],
  previousCrop: "",
  harvestedOn: "",
  quantity: "",
  unit: "quintal" as "kg" | "quintal" | "tonne",
  cropCode: "WHEAT" as CropCycle["cropCode"],
  startedOn: indiaToday(),
});
function demoWeather(): WeatherSummary {
  const today = indiaToday();
  const date = (offset: number) =>
    new Date(Date.parse(today) + offset * 86400000).toISOString().slice(0, 10);
  return {
    location: "Synthetic demonstration",
    latitude: 0,
    longitude: 0,
    temperatureC: 24,
    humidityPercent: 50,
    precipitationMm: 0,
    windKph: 8,
    weatherCode: 1,
    observedAt: `${today}T12:00`,
    source: "Synthetic",
    sourceUrl: "https://open-meteo.com/",
    kind: "model_estimate",
    daily: Array.from({ length: 5 }, (_, i) => ({
      date: date(i),
      minC: 18,
      maxC: 28,
      rainMm: i === 2 ? 3 : 0,
      referenceEt0Mm: 4,
      precipitationProbability: 10,
      weatherCode: 1,
    })),
    history: Array.from({ length: 7 }, (_, i) => ({
      date: date(i - 7),
      minC: 18,
      maxC: 28,
      rainMm: i === 3 ? 5 : 0,
      referenceEt0Mm: 4,
      precipitationProbability: null,
      weatherCode: 1,
    })),
  };
}

export function FarmIntelligence({
  copy: t,
  locale,
  state,
  onDemoSave,
  onRefresh,
  onError,
}: Props) {
  const [selectedId, setSelectedId] = useState("");
  const [settingUp, setSettingUp] = useState(false);
  const [form, setForm] = useState(fresh);
  const [outlook, setOutlook] = useState<Outlook | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [starting, setStarting] = useState(false);
  const [harvesting, setHarvesting] = useState(false);
  const [harvest, setHarvest] = useState(() => ({
    id: crypto.randomUUID(),
    harvestedOn: indiaToday(),
    quantity: "",
    unit: "quintal" as "kg" | "quintal" | "tonne",
  }));
  const [startId, setStartId] = useState(() => crypto.randomUUID());
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [photo, setPhoto] = useState<PhotoObservation | null>(null);
  const generation = useRef(0);
  const container = useRef<HTMLDivElement>(null);
  const plot = state.plots.find((p) => p.id === selectedId) ?? state.plots[0];
  const today = indiaToday();
  const format = (value: number | null | undefined, unit = "") =>
    value == null
      ? t.smartMissing
      : `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)}${unit}`;

  useGSAP(
    () => {
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.fromTo(
        ".field-title",
        { opacity: 0.35, y: 8 },
        { opacity: 1, y: 0, duration: 0.35 },
      );
      gsap.fromTo(
        ".field-metrics > div",
        { opacity: 0.4, y: 10 },
        { opacity: 1, y: 0, duration: 0.3, stagger: 0.035 },
      );
    },
    {
      scope: container,
      dependencies: [plot?.id, outlook?.ruleVersion],
      revertOnUpdate: true,
    },
  );

  useEffect(() => {
    const current = ++generation.current;
    setOutlook(null);
    setPhoto(null);
    setConsent(false);
    setPhotoFile(null);
    if (!plot) return;
    setLoading(true);
    const load = demo
      ? Promise.resolve({
          ...buildFieldOutlook({
            plot,
            baseline: state.fieldBaselines?.find((b) => b.plotId === plot.id),
            cycles: state.cycles,
            weather: demoWeather(),
          }),
          actions: (state.quickActions ?? []).filter((a) =>
            state.cycles.some(
              (c) => c.id === a.cycleId && c.plotId === plot.id,
            ),
          ),
          photo: state.photoObservations?.find((p) =>
            state.cycles.some(
              (c) => c.id === p.cycleId && c.plotId === plot.id,
            ),
          ),
        })
      : request<Outlook>(`farm/outlook?plotId=${encodeURIComponent(plot.id)}`);
    void load
      .then((value) => {
        if (current === generation.current) {
          setOutlook(value);
          setPhoto(value.photo ?? null);
        }
      })
      .catch((error) => {
        if (current === generation.current) onError(error.message);
      })
      .finally(() => {
        if (current === generation.current) setLoading(false);
      });
    return () => {
      generation.current++;
    };
  }, [state, plot?.id, refreshKey]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      onError(error instanceof Error ? error.message : t.error);
    } finally {
      setBusy(false);
    }
  }
  function saveSetup(event: FormEvent) {
    event.preventDefault();
    const parsed = fieldSetupSchema.safeParse({
      id: form.id,
      area: Number(form.area),
      areaUnit: form.areaUnit,
      waterAccess: form.waterAccess,
      fieldState: form.fieldState,
      ...(form.fieldState === "empty" && form.previousCrop
        ? {
            previous: {
              cropCode: form.previousCrop,
              harvestedOn: form.harvestedOn,
              ...(form.quantity ? { quantity: Number(form.quantity) } : {}),
              unit: form.unit,
            },
          }
        : {}),
      ...(form.fieldState === "growing"
        ? { crop: { cropCode: form.cropCode, startedOn: form.startedOn } }
        : {}),
    });
    if (!parsed.success) {
      onError(t.smartInvalidSetup);
      return;
    }
    void run(async () => {
      const input = parsed.data;
      if (demo) {
        const now = Date.now();
        const newPlot = {
          id: input.id,
          name: t.smartDefaultField,
          area: input.area,
          areaUnit: input.areaUnit,
          irrigation:
            input.waterAccess === "rain_only"
              ? ("rainfed" as const)
              : ("other" as const),
          mechanization: "unspecified" as const,
          state: state.profile!.state,
          district: state.profile!.district,
          createdAt: now,
          updatedAt: now,
        };
        const cycles: CropCycle[] = input.crop
          ? [
              {
                id: input.id,
                plotId: input.id,
                ...input.crop,
                variety: "",
                status: "active",
                createdAt: now,
                updatedAt: now,
              },
              ...state.cycles,
            ]
          : state.cycles;
        await onDemoSave({
          ...state,
          plots: [newPlot, ...state.plots],
          cycles,
          fieldBaselines: [
            { ...input, plotId: input.id, createdAt: now },
            ...(state.fieldBaselines ?? []),
          ],
        });
      } else {
        await phase2Post("farm/setup", input);
        await onRefresh();
      }
      setSelectedId(input.id);
      setSettingUp(false);
      setForm(fresh());
    });
  }
  function startCrop(event: FormEvent) {
    event.preventDefault();
    if (!plot) return;
    void run(async () => {
      const input = {
        id: startId,
        plotId: plot.id,
        cropCode: form.cropCode,
        startedOn: form.startedOn,
      };
      if (demo) {
        const now = Date.now();
        await onDemoSave({
          ...state,
          cycles: [
            {
              ...input,
              variety: "",
              status: "active",
              createdAt: now,
              updatedAt: now,
            },
            ...state.cycles,
          ],
        });
      } else {
        await phase2Post("farm/start", input);
        await onRefresh();
      }
      setStarting(false);
      setStartId(crypto.randomUUID());
    });
  }
  function logAction(action: QuickAction["action"]) {
    if (!outlook?.cycleId) return;
    const cycleId = outlook.cycleId;
    void run(async () => {
      if (demo)
        await onDemoSave({
          ...state,
          quickActions: [
            {
              id: crypto.randomUUID(),
              cycleId,
              action,
              occurredOn: today,
              createdAt: Date.now(),
            },
            ...(state.quickActions ?? []).filter(
              (a) =>
                !(
                  a.cycleId === cycleId &&
                  a.action === action &&
                  a.occurredOn === today
                ),
            ),
          ],
        });
      else {
        await phase2Post("farm/action", { cycleId, action });
        await onRefresh();
      }
    });
  }
  function checkPhoto(event: FormEvent) {
    event.preventDefault();
    if (!photoFile || !consent || !outlook?.cycleId || demo) return;
    const cycleId = outlook.cycleId;
    void run(async () => {
      const image = await prepareImage(photoFile);
      const result = await phase2Post<PhotoObservation>("farm/photo", {
        cycleId,
        consent: true,
        locale,
        image,
      });
      setPhoto(result);
      setPhotoFile(null);
      setConsent(false);
      await onRefresh();
    });
  }
  function finishHarvest(event: FormEvent) {
    event.preventDefault();
    if (!plot || !outlook?.cycleId) return;
    const parsed = harvestCompletionSchema.safeParse({
      ...harvest,
      cycleId: outlook.cycleId,
      quantity: harvest.quantity === "" ? undefined : Number(harvest.quantity),
    });
    const cycle = state.cycles.find((c) => c.id === outlook.cycleId);
    if (!parsed.success || !cycle || harvest.harvestedOn < cycle.startedOn) {
      onError(t.smartInvalidHarvest);
      return;
    }
    void run(async () => {
      const input = parsed.data;
      if (demo) {
        const now = Date.now();
        const old = state.fieldBaselines?.find((b) => b.plotId === plot.id);
        await onDemoSave({
          ...state,
          cycles: state.cycles.map((c) =>
            c.id === cycle.id
              ? { ...c, status: "harvested", updatedAt: now }
              : c,
          ),
          fieldBaselines: [
            {
              id: plot.id,
              plotId: plot.id,
              area: plot.area,
              areaUnit: plot.areaUnit,
              waterAccess: old?.waterAccess ?? "unknown",
              fieldState: "empty",
              previous: {
                cropCode: cycle.cropCode,
                harvestedOn: input.harvestedOn,
                quantity: input.quantity,
                unit: input.unit,
              },
              createdAt: old?.createdAt ?? now,
            },
            ...(state.fieldBaselines ?? []).filter((b) => b.plotId !== plot.id),
          ],
          events: [
            {
              id: input.id,
              cycleId: cycle.id,
              type: "harvest",
              occurredOn: input.harvestedOn,
              title: t.harvestRecorded,
              detail: "",
              source: "farmer",
              productName: "",
              purpose: "",
              yieldAmount: input.quantity,
              yieldUnit: input.quantity === undefined ? undefined : input.unit,
              createdAt: now,
            },
            ...state.events,
          ],
        });
      } else {
        await phase2Post("farm/harvest", input);
        await onRefresh();
      }
      setHarvesting(false);
      setHarvest({
        id: crypto.randomUUID(),
        harvestedOn: today,
        quantity: "",
        unit: "quintal",
      });
    });
  }
  const cropSelect = (
    value: string,
    onChange: (value: string) => void,
    optional = false,
  ) => (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {optional && <option value="">{t.smartOptional}</option>}
      {priorityCrops.map(([code]) => (
        <option key={code} value={code}>
          {t[cropKeys[code]]}
        </option>
      ))}
    </select>
  );

  return (
    <div className="field-intelligence" ref={container}>
      <div className="field-title">
        <div>
          <h2>{t.smartTitle}</h2>
          <p>{t.smartIntro}</p>
        </div>
        {plot && (
          <button
            className="secondary"
            onClick={() => {
              setForm(fresh());
              setSettingUp(true);
            }}
            disabled={busy}
          >
            <Plus size={18} />
            {t.smartAddField}
          </button>
        )}
      </div>
      {!plot || settingUp ? (
        <form className="field-setup record-form" onSubmit={saveSetup}>
          <h3>{t.smartSetupTitle}</h3>
          <p>{t.smartSetupCopy}</p>
          <div className="field-form-row">
            <label>
              {t.smartArea}
              <input
                required
                type="number"
                min="0.001"
                max="100000"
                step="any"
                inputMode="decimal"
                value={form.area}
                onChange={(e) => setForm({ ...form, area: e.target.value })}
              />
            </label>
            <label>
              {t.unit}
              <select
                value={form.areaUnit}
                onChange={(e) =>
                  setForm({
                    ...form,
                    areaUnit: e.target.value as typeof form.areaUnit,
                  })
                }
              >
                <option value="acre">{t.acre}</option>
                <option value="hectare">{t.hectare}</option>
              </select>
            </label>
          </div>
          <label>
            {t.smartWaterQuestion}
            <select
              value={form.waterAccess}
              onChange={(e) =>
                setForm({
                  ...form,
                  waterAccess: e.target.value as typeof form.waterAccess,
                })
              }
            >
              <option value="unknown">{t.smartUnknown}</option>
              <option value="rain_only">{t.smartRainOnly}</option>
              <option value="supplemental">{t.smartSupplemental}</option>
            </select>
          </label>
          <fieldset className="field-choice">
            <legend>{t.smartFieldQuestion}</legend>
            <button
              type="button"
              aria-pressed={form.fieldState === "empty"}
              onClick={() => setForm({ ...form, fieldState: "empty" })}
            >
              {t.smartEmpty}
            </button>
            <button
              type="button"
              aria-pressed={form.fieldState === "growing"}
              onClick={() => setForm({ ...form, fieldState: "growing" })}
            >
              {t.smartGrowing}
            </button>
          </fieldset>
          {form.fieldState === "empty" ? (
            <>
              <label>
                {t.smartPrevious}
                {cropSelect(
                  form.previousCrop,
                  (previousCrop) => setForm({ ...form, previousCrop }),
                  true,
                )}
              </label>
              {form.previousCrop && (
                <>
                  <label>
                    {t.lastHarvestDate}
                    <input
                      type="date"
                      required
                      max={today}
                      value={form.harvestedOn}
                      onChange={(e) =>
                        setForm({ ...form, harvestedOn: e.target.value })
                      }
                    />
                  </label>
                  <div className="field-form-row">
                    <label>
                      {t.smartQuantity}
                      <input
                        type="number"
                        min="0"
                        step="any"
                        max="1000000000"
                        inputMode="decimal"
                        placeholder={t.smartOptional}
                        value={form.quantity}
                        onChange={(e) =>
                          setForm({ ...form, quantity: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      {t.unit}
                      <select
                        value={form.unit}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            unit: e.target.value as typeof form.unit,
                          })
                        }
                      >
                        <option value="kg">{t.unitKg}</option>
                        <option value="quintal">{t.unitQuintal}</option>
                        <option value="tonne">{t.unitTonne}</option>
                      </select>
                    </label>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <label>
                {t.crop}
                {cropSelect(form.cropCode, (cropCode) =>
                  setForm({
                    ...form,
                    cropCode: cropCode as CropCycle["cropCode"],
                  }),
                )}
              </label>
              <label>
                {t.smartSown}
                <input
                  required
                  type="date"
                  max={today}
                  value={form.startedOn}
                  onChange={(e) =>
                    setForm({ ...form, startedOn: e.target.value })
                  }
                />
              </label>
            </>
          )}
          <button className="primary" disabled={busy}>
            {busy ? t.smartComputing : t.smartCalculate}
          </button>
          {plot && (
            <button
              type="button"
              className="secondary"
              onClick={() => setSettingUp(false)}
            >
              {t.smartCancel}
            </button>
          )}
        </form>
      ) : (
        <>
          <div className="field-toolbar">
            <label>
              {t.smartSelectField}
              <select
                value={plot.id}
                onChange={(e) => {
                  setSelectedId(e.target.value);
                  setStarting(false);
                }}
                disabled={busy}
              >
                {state.plots.map((p, i) => (
                  <option value={p.id} key={p.id}>
                    {p.name === "My field" ? t.smartDefaultField : p.name}
                    {state.plots.length > 1 ? ` · ${i + 1}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="secondary"
              disabled={busy || loading}
              onClick={() => setRefreshKey((v) => v + 1)}
            >
              <RefreshCw size={17} />
              {t.smartRetry}
            </button>
          </div>
          {loading && (
            <p role="status" className="field-loading">
              {t.smartComputing}
            </p>
          )}
          {!loading && !outlook && <p className="field-note">{t.error}</p>}
          {outlook && (
            <>
              <FieldPlanner key={`${outlook.plotId}-${outlook.fieldState}-${outlook.cycleId ?? "empty"}-${locale}`} copy={t} locale={locale} outlook={outlook} />
              {outlook.fieldState === "conflicting_cycles" && (
                <p role="alert" className="field-note">
                  {t.smartConflict}
                </p>
              )}
              <div className="field-metrics">
                <div>
                  <span>{t.smartAreaHa}</span>
                  <strong>{format(outlook.areaHa)}</strong>
                </div>
                <div>
                  <span>
                    {outlook.fieldState === "growing"
                      ? t.smartAge
                      : t.smartHarvestGap}
                  </span>
                  <strong>
                    {format(
                      outlook.fieldState === "growing"
                        ? outlook.cropAgeDays
                        : outlook.daysSinceHarvest,
                    )}
                  </strong>
                </div>
                <div>
                  <span>{t.smartRainForecast}</span>
                  <strong>
                    {format(outlook.weather?.rainfall5DaysMm, " mm")}
                  </strong>
                </div>
                <div>
                  <span>{t.smartPreviousYield}</span>
                  <strong>{format(outlook.previousYieldTonnesPerHa)}</strong>
                </div>
              </div>
              {outlook.previousYieldTonnesPerHa !== null && (
                <p className="field-note">{t.smartReportedYield}</p>
              )}
              {outlook.fieldState === "growing" && (
                <p className="field-note">
                  {t[cropKeys[outlook.cropCode!]]} · {t.smartAgeLimit}
                </p>
              )}
              {outlook.fieldState === "growing" && (
                <section className="field-panel">
                  <h3>{t.smartQuickTitle}</h3>
                  <p>{t.smartQuickCopy}</p>
                  <div className="field-quick-actions">
                    {quickActionCodes.map((action) => {
                      const done = outlook.actions.some(
                        (a) =>
                          a.cycleId === outlook.cycleId &&
                          a.action === action &&
                          a.occurredOn === today,
                      );
                      const Icon = done
                        ? Check
                        : action === "irrigation"
                          ? Droplets
                          : Leaf;
                      return (
                        <button
                          key={action}
                          className={done ? "done" : ""}
                          disabled={busy || done}
                          onClick={() => logAction(action)}
                        >
                          <Icon size={24} />
                          <span>
                            {t[actionKeys[action]]}
                            <small>
                              {done ? t.smartDone : t.smartTapToRecord}
                            </small>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}
              <section className="field-panel">
                <h3>
                  <CloudRain size={21} />
                  {t.smartWeatherTitle}
                </h3>
                {outlook.weather ? (
                  <>
                    <p>
                      {outlook.weather.heavyRainDates.length
                        ? t.smartHeavyRain
                        : outlook.weather.referenceBalance5DaysMm === null
                          ? t.smartWeatherPartial
                          : outlook.weather.referenceBalance5DaysMm < 0
                            ? t.smartDryWatch
                            : t.smartRainWatch}
                    </p>
                    <dl className="field-weather-values">
                      <div>
                        <dt>{t.smartRecentRain}</dt>
                        <dd>
                          {format(outlook.weather.recentRain7DaysMm, " mm")}
                        </dd>
                      </div>
                      <div>
                        <dt>{t.smartWaterBalance}</dt>
                        <dd>
                          {format(
                            outlook.weather.referenceBalance5DaysMm,
                            " mm",
                          )}
                        </dd>
                      </div>
                    </dl>
                    <small>
                      {demo ? t.synthetic : outlook.weather.location} ·{" "}
                      {outlook.weather.observedAt}
                    </small>
                    <details className="field-explanation">
                      <summary>{t.smartExplanation}</summary>
                      <p className="field-note">{t.smartWeatherLimit}</p>
                    </details>
                  </>
                ) : (
                  <p>{t.smartWeatherUnavailable}</p>
                )}
              </section>
              {outlook.fieldState === "empty" && (
                <section className="field-panel">
                  <h3>
                    <Sprout size={21} />
                    {t.smartNextCrop}
                  </h3>
                  {outlook.calendarStatus === "not_available" ? (
                    <p>{t.smartCalendarMissing}</p>
                  ) : (
                    <>
                      {!outlook.candidates.length && (
                        <p>{t.smartCalendarNoWindow}</p>
                      )}
                      <div className="field-candidates">
                        {outlook.candidates.map((c) => (
                          <article key={c.cropCode}>
                            <h4>{t[cropKeys[c.cropCode]]}</h4>
                            <p>
                              {c.waitDays === 0
                                ? t.smartWindowNow
                                : t.smartWindowSoon.replace(
                                    "{days}",
                                    format(c.waitDays),
                                  )}
                            </p>
                            <small>
                              {c.start} — {c.end}
                            </small>
                            {c.waterCheck && (
                              <p className="field-note">{t.smartWaterCheck}</p>
                            )}
                            {c.repeatedCrop && (
                              <p className="field-note">{t.smartRepeatCrop}</p>
                            )}
                            {c.precision === "season_screen" && (
                              <p className="field-note">
                                {t.smartSeasonScreen}
                              </p>
                            )}
                            <a
                              href={c.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {t.smartSource} · {c.sourceYear}
                            </a>
                          </article>
                        ))}
                      </div>
                      <p className="field-note">{t.smartCalendarLimit}</p>
                    </>
                  )}
                  <button
                    className="primary"
                    onClick={() => {
                      setStarting(true);
                      setForm({
                        ...form,
                        cropCode: outlook.candidates[0]?.cropCode ?? "WHEAT",
                        startedOn: today,
                      });
                    }}
                    disabled={busy}
                  >
                    {t.smartStartCrop}
                  </button>
                  {starting && (
                    <form className="record-form" onSubmit={startCrop}>
                      <label>
                        {t.crop}
                        {cropSelect(form.cropCode, (cropCode) =>
                          setForm({
                            ...form,
                            cropCode: cropCode as CropCycle["cropCode"],
                          }),
                        )}
                      </label>
                      <label>
                        {t.smartSown}
                        <input
                          type="date"
                          required
                          max={today}
                          value={form.startedOn}
                          onChange={(e) =>
                            setForm({ ...form, startedOn: e.target.value })
                          }
                        />
                      </label>
                      <button className="primary" disabled={busy}>
                        {t.smartStartSave}
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => setStarting(false)}
                      >
                        {t.smartCancel}
                      </button>
                    </form>
                  )}
                </section>
              )}
              {outlook.fieldState === "growing" && (
                <>
                  <section className="field-panel">
                    <h3>
                      <Camera size={21} />
                      {t.smartPhotoTitle}
                    </h3>
                    <p>{t.smartPhotoCopy}</p>
                    {demo ? (
                      <p className="field-note">{t.smartDemoPhoto}</p>
                    ) : (
                      <form className="field-photo-form" onSubmit={checkPhoto}>
                        <label>
                          {t.smartPhotoFile}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            disabled={busy}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              setConsent(false);
                              if (
                                file &&
                                [
                                  "image/jpeg",
                                  "image/png",
                                  "image/webp",
                                ].includes(file.type) &&
                                file.size <= 10 * 1024 * 1024
                              )
                                setPhotoFile(file);
                              else {
                                setPhotoFile(null);
                                if (file) onError(t.smartPhotoInvalid);
                              }
                            }}
                          />
                        </label>
                        <label className="field-consent">
                          <input
                            type="checkbox"
                            checked={consent}
                            disabled={busy}
                            onChange={(e) => setConsent(e.target.checked)}
                          />
                          <span>{t.smartPhotoConsent}</span>
                        </label>
                        <button
                          className="primary"
                          disabled={busy || !photoFile || !consent}
                        >
                          {busy ? t.smartPhotoPreparing : t.smartPhotoRun}
                        </button>
                      </form>
                    )}
                    {photo && (
                      <div className="field-photo-result" role="status">
                        <h4>
                          {photo.quality === "retake"
                            ? t.smartPhotoRetake
                            : t.smartPhotoObserved}
                        </h4>
                        <p>{t[stageKeys[photo.stage]]}</p>
                        {photo.locale === locale ? (
                          <p>{photo.observation}</p>
                        ) : (
                          <p>{t.smartPhotoLanguage}</p>
                        )}
                        <p>{t[nextStepKeys[photo.nextStep]]}</p>
                        <p>
                          {photo.visibleStress === "visible"
                            ? t.smartVisibleStress
                            : photo.visibleStress === "not_visible"
                              ? t.smartNoVisibleStress
                              : t.smartStressUnknown}
                        </p>
                        <small>
                          {new Date(photo.createdAt).toLocaleString(locale)}
                        </small>
                      </div>
                    )}
                    <p className="field-note">{t.smartPhotoLimit}</p>
                  </section>
                  <section className="field-panel">
                    <h3>{t.smartHarvestTitle}</h3>
                    <p>{t.smartHarvestCopy}</p>
                    <button
                      className="secondary"
                      disabled={busy}
                      onClick={() => setHarvesting(!harvesting)}
                    >
                      {t.smartFinishHarvest}
                    </button>
                    {harvesting && (
                      <form className="record-form" onSubmit={finishHarvest}>
                        <label>
                          {t.harvestDate}
                          <input
                            required
                            type="date"
                            max={today}
                            value={harvest.harvestedOn}
                            onChange={(e) =>
                              setHarvest({
                                ...harvest,
                                harvestedOn: e.target.value,
                              })
                            }
                          />
                        </label>
                        <label>
                          {t.smartQuantity}
                          <input
                            type="number"
                            min="0"
                            step="any"
                            inputMode="decimal"
                            max="1000000000"
                            placeholder={t.smartOptional}
                            value={harvest.quantity}
                            onChange={(e) =>
                              setHarvest({
                                ...harvest,
                                quantity: e.target.value,
                              })
                            }
                          />
                        </label>
                        <label>
                          {t.unit}
                          <select
                            value={harvest.unit}
                            onChange={(e) =>
                              setHarvest({
                                ...harvest,
                                unit: e.target.value as typeof harvest.unit,
                              })
                            }
                          >
                            <option value="kg">{t.unitKg}</option>
                            <option value="quintal">{t.unitQuintal}</option>
                            <option value="tonne">{t.unitTonne}</option>
                          </select>
                        </label>
                        <button className="primary" disabled={busy}>
                          {t.smartConfirmHarvest}
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => setHarvesting(false)}
                        >
                          {t.smartCancel}
                        </button>
                      </form>
                    )}
                  </section>
                </>
              )}
              <details className="field-panel">
                <summary>{t.smartSoilTitle}</summary>
                <p>{t.smartSoilMissing}</p>
              </details>
              <details className="field-panel">
                <summary>{t.smartHistory}</summary>
                {outlook.actions.length ? (
                  <ul className="field-timeline">
                    {outlook.actions.slice(0, 8).map((a) => (
                      <li key={a.id}>
                        <Check size={16} />
                        <span>{t[actionKeys[a.action]]}</span>
                        <time>{a.occurredOn}</time>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>{t.smartNoActivity}</p>
                )}
              </details>
              <p className="field-note field-rule">
                {t.smartRuleVersion}: {outlook.ruleVersion} ·{" "}
                {outlook.calculatedOn}
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}
