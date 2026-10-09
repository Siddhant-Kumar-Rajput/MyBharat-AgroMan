import { useEffect, useState } from "react";
import { BrainCircuit, CheckCircle2, ShieldCheck } from "lucide-react";
import type { CropHealthCase, Phase2State } from "../../shared/domain";
import { demo, request } from "../lib/api";
import { loadPhase2, persistDemoPhase2 } from "../lib/phase2";
import type { Copy } from "../lib/i18n";
import { InfoHint } from "./InfoHint";
import { CommunityExpertCases } from "./CommunityExpertCases";
import type { CommunityCase, CommunityReviewInput, PublicCommunityReview } from "../../shared/community-review";
import type { Report } from "../../shared/domain";

type Props = { copy: Copy; onError: (message: string) => void; demoReports?: Report[]; onDemoReview?: (id: string, review: PublicCommunityReview) => void };

export function ExpertReview({ copy: t, onError, demoReports = [], onDemoReview }: Props) {
  const [communityCases, setCommunityCases] = useState<CommunityCase[]>([]);
  const [refresh, setRefresh] = useState(0);
  const [state, setState] = useState<Phase2State>();
  const [cases, setCases] = useState<CropHealthCase[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [denied, setDenied] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, { summary: string; monitoring: string; nonChemical: string; source: string }>>({});

  const priorityKey = { standard: "standardPriority", priority: "priorityPriority", urgent: "urgentPriority" } as const;
  const reasonKey = {
    high_model_signal: "highModelSignal",
    moderate_model_signal: "moderateModelSignal",
    low_model_signal: "lowModelSignal",
    limited_visible_evidence: "limitedVisibleEvidence",
    follow_up_due: "followUpReason",
  } as const;
  const actionKey = {
    monitor_changes: "monitorChanges",
    avoid_unverified_treatment: "avoidUnverifiedTreatment",
    capture_more_evidence: "captureMoreEvidence",
    contact_official_helpline: "contactOfficialHelpline",
  } as const;

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setLoadFailed(false); setDenied(false);
    const load = demo
      ? loadPhase2().then((value) => {
          if (cancelled) return;
          setState(value);
          setCases(value.cases.filter((item) => item.status === "pending_review"));
        })
      : request<{ cases: CropHealthCase[]; communityCases: CommunityCase[] }>("expert/cases").then((value) => {
          if (cancelled) return;
          setCases(value.cases);
          setCommunityCases(value.communityCases);
        });
    void load
      .catch((error) => {
        if (cancelled) return;
        setLoadFailed(true);
        if (error.message === "Reviewer access required.") setDenied(true);
        else onError(error.message);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [refresh]);

  const demoCases: CommunityCase[] = demoReports.filter((report) => report.awaitingReview || report.review).map((report) => ({
    id: report.id, reference: `DEMO-${report.id.slice(0, 8)}`, districtId: report.districtId, crop: report.crop,
    diseaseName: report.name, confidence: report.confidence, evidence: [t.syntheticCase], createdAt: report.timestamp,
    version: 0, priority: "standard", review: report.review,
  }));
  async function publishCommunity(item: CommunityCase, input: CommunityReviewInput) {
    if (demo) {
      onDemoReview?.(item.id, { risk: input.risk, summary: input.summary, prevention: input.prevention, sources: input.sources, reviewedAt: Date.now() });
      return;
    }
    const result = await request<{ version: number; review: PublicCommunityReview }>(`expert/community-cases/${item.id}/review`, input);
    setCommunityCases((current) => current.map((entry) => entry.id === item.id ? { ...entry, ...result } : entry));
  }

  async function approve(item: CropHealthCase) {
    const draft = drafts[item.id];
    if (!draft) return;
    setBusy(true);
    try {
      if (demo && state) {
        const next = {
          ...state,
          cases: state.cases.map((entry) =>
            entry.id === item.id
              ? { ...entry, status: "reviewed" as const, updatedAt: Date.now() }
              : entry,
          ),
        };
        await persistDemoPhase2(next);
        setState(next);
      } else {
        await request(`expert/cases/${item.id}/review`, {
          decision: "approved",
          remedy: {
            summary: draft.summary,
            monitoring: draft.monitoring.split("\n").map((line) => line.trim()).filter(Boolean),
            nonChemical: draft.nonChemical.split("\n").map((line) => line.trim()).filter(Boolean),
          },
          sources: [draft.source.trim()].filter(Boolean),
          synthetic: false,
        });
      }
      setCases((current) => current.filter((entry) => entry.id !== item.id));
    } catch (error) {
      onError(error instanceof Error ? error.message : t.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="records-page section expert-page">
      <div className="records-heading">
        <div>
          <p className="eyebrow">{t.expert}</p>
          <h1><InfoHint copy={t} title={t.reviewerAccessTitle} label={t.reviewerTitle}><p>{t.reviewerCopy}</p><p>{t.reviewerAccessCopy}</p><p>{t.reviewerSetupCopy}</p></InfoHint></h1>
        </div>
        <ShieldCheck size={42} />
      </div>
      {demo && (
        <div className="demo-banner">
          <ShieldCheck size={17} /> {t.syntheticCase}
        </div>
      )}
      <div className="review-queue">
        <button className="secondary" disabled={loading} onClick={() => setRefresh((value) => value + 1)}>{t.communityRefresh}</button>
        {!loading && !loadFailed && <CommunityExpertCases cases={demo ? demoCases : communityCases} copy={t} onPublish={publishCommunity} />}
        {loading ? (
          <p>{t.loadingReview}</p>
        ) : loadFailed ? (
          <p role="status">{denied ? t.reviewerDenied : t.reviewUnavailable}</p>
        ) : !cases.length ? null : (
          cases.map((item) => (
            <article className="record-panel review-case" key={item.id}>
              <div className="review-case-heading"><span className="case-status">{t.pendingReview}</span>{item.aiTriage && <span className={`triage-priority ${item.aiTriage.priority}`}>{t[priorityKey[item.aiTriage.priority]]}</span>}</div>
              <h2>{item.diseaseName}</h2>
              <p>
                <strong>{t.caseReference}:</strong> {item.reference}
              </p>
              <p>{item.symptoms.join(", ")}</p>
              <div className="confidence-row">
                <strong>{t.aiConfidence}</strong>
                <span>{Math.round(item.confidence * 100)}%</span>
              </div>
              <small>{t.confidenceExplanation}</small>
              {item.aiTriage && <div className="ai-triage-panel"><div><BrainCircuit /><span><strong>{t.aiPreReview}</strong><small>{t.aiPreReviewCopy}</small></span></div><details><summary>{t.whyRouted}</summary><ul>{item.aiTriage.reasons.map((reason) => <li key={reason}>{t[reasonKey[reason]]}</li>)}</ul><strong>{t.safeInterimActions}</strong><ul>{item.aiTriage.interimActions.map((action) => <li key={action}>{t[actionKey[action]]}</li>)}</ul><small>{t.triageAudit}: {item.aiTriage.policyVersion}</small></details></div>}
              <p className="source-warning">{t.sourceRequired}</p>
              <form className="review-form" onSubmit={(event) => { event.preventDefault(); void approve(item); }}>
                <label>{t.remedySummary}<textarea required value={drafts[item.id]?.summary || ""} onChange={(event) => setDrafts({ ...drafts, [item.id]: { summary: event.target.value, monitoring: drafts[item.id]?.monitoring || "", nonChemical: drafts[item.id]?.nonChemical || "", source: drafts[item.id]?.source || "" } })} /></label>
                <label>{t.monitoringSteps}<textarea required placeholder={t.onePerLine} value={drafts[item.id]?.monitoring || ""} onChange={(event) => setDrafts({ ...drafts, [item.id]: { summary: drafts[item.id]?.summary || "", monitoring: event.target.value, nonChemical: drafts[item.id]?.nonChemical || "", source: drafts[item.id]?.source || "" } })} /></label>
                <label>{t.nonChemicalSteps}<textarea required placeholder={t.onePerLine} value={drafts[item.id]?.nonChemical || ""} onChange={(event) => setDrafts({ ...drafts, [item.id]: { summary: drafts[item.id]?.summary || "", monitoring: drafts[item.id]?.monitoring || "", nonChemical: event.target.value, source: drafts[item.id]?.source || "" } })} /></label>
                <label>{t.authoritativeSourceOptional}<input type="url" placeholder="https://" value={drafts[item.id]?.source || ""} onChange={(event) => setDrafts({ ...drafts, [item.id]: { summary: drafts[item.id]?.summary || "", monitoring: drafts[item.id]?.monitoring || "", nonChemical: drafts[item.id]?.nonChemical || "", source: event.target.value } })} /></label>
                <button className="secondary" disabled={busy}>
                  <CheckCircle2 size={16} /> {t.approveSourcedGuidance}
                </button>
              </form>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
