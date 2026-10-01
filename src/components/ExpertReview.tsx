import { useEffect, useState } from "react";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import type { CropHealthCase, Phase2State } from "../../shared/domain";
import { demo, request } from "../lib/api";
import { loadPhase2, persistDemoPhase2 } from "../lib/phase2";
import type { Copy } from "../lib/i18n";

type Props = { copy: Copy; onError: (message: string) => void };

export function ExpertReview({ copy: t, onError }: Props) {
  const [state, setState] = useState<Phase2State>();
  const [cases, setCases] = useState<CropHealthCase[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    const load = demo
      ? loadPhase2().then((value) => {
          setState(value);
          setCases(value.cases.filter((item) => item.status === "pending_review"));
        })
      : request<{ cases: CropHealthCase[] }>("expert/cases").then((value) =>
          setCases(value.cases),
        );
    void load
      .catch((error) => {
        setLoadFailed(true);
        onError(error.message);
      })
      .finally(() => setLoading(false));
  }, []);

  async function approve(item: CropHealthCase) {
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
          decision: "reviewed",
          note: t.sourceRequired,
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
          <h1>{t.reviewerTitle}</h1>
          <p>{t.reviewerCopy}</p>
        </div>
        <ShieldCheck size={42} />
      </div>
      {demo && (
        <div className="demo-banner">
          <ShieldCheck size={17} /> {t.syntheticCase}
        </div>
      )}
      <div className="review-queue">
        {loading ? (
          <p>{t.loadingReview}</p>
        ) : loadFailed ? (
          <p>{t.reviewUnavailable}</p>
        ) : !cases.length ? (
          <p>{t.noReviewCases}</p>
        ) : (
          cases.map((item) => (
            <article className="record-panel review-case" key={item.id}>
              <span className="case-status">{t.pendingReview}</span>
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
              <p className="source-warning">{t.sourceRequired}</p>
              <button className="secondary" disabled={busy} onClick={() => void approve(item)}>
                <CheckCircle2 size={16} /> {t.approveExample}
              </button>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
