import { useState } from "react";
import {
  communityReviewSchema,
  signalPresentation,
  type CommunityCase,
  type CommunityReviewInput,
} from "../../shared/community-review";
import { districts } from "../../shared/domain";
import type { Copy } from "../lib/i18n";
import { CommunityGuidance } from "./CommunityGuidance";

export function CommunityExpertCases({
  cases,
  copy: t,
  onPublish,
}: {
  cases: CommunityCase[];
  copy: Copy;
  onPublish: (
    item: CommunityCase,
    input: CommunityReviewInput,
  ) => Promise<void>;
}) {
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const visible = cases.filter((item) => Boolean(item.review) === reviewed);
  return (
    <section className="community-review-section">
      <h2>{t.communityQueue}</h2>
      <p className="community-queue-note">{t.communityQueueLimit}</p>
      <div className="community-review-tabs">
        <button
          className="secondary"
          aria-pressed={!reviewed}
          onClick={() => setReviewed(false)}
        >
          {t.communityNeedsReview} (
          {cases.filter((item) => !item.review).length})
        </button>
        <button
          className="secondary"
          aria-pressed={reviewed}
          onClick={() => setReviewed(true)}
        >
          {t.communityReviewed} ({cases.filter((item) => item.review).length})
        </button>
      </div>
      {notice && <p role="status">{notice}</p>}
      {!visible.length && <p>{t.noReviewCases}</p>}
      <div className="community-case-grid">
        {visible.map((item) => {
          const presentation = signalPresentation({
            review: item.review,
            awaitingReview: !item.review,
          });
          return (
            <article
              className="record-panel review-case"
              key={`${item.id}:${item.version}`}
            >
              <span className={`community-status ${presentation.tone}`}>
                {t[presentation.label]}
              </span>
              <h3>{item.diseaseName}</h3>
              <p>
                {districts.find((d) => d.id === item.districtId)?.name ??
                  item.districtId.split(":").slice(1).reverse().join(", ")}{" "}
                · {item.crop}
              </p>
              <small>
                {t.caseReference}: {item.reference}
              </small>
              <details>
                <summary>{t.aiPreReview}</summary>
                <p>{item.evidence.join(" · ")}</p>
                <p>
                  {t.aiConfidence}: {Math.round(item.confidence * 100)}%
                </p>
                <small>{t.confidenceExplanation}</small>
              </details>
              <CommunityGuidance
                reviews={item.review ? [item.review] : undefined}
                copy={t}
              />
              <details className="community-review-editor">
                <summary>
                  {item.review
                    ? t.communityUpdateReview
                    : t.communityOpenReview}
                </summary>
                <form
                  className="review-form"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    const data = new FormData(event.currentTarget);
                    const parsed = communityReviewSchema.safeParse({
                      version: item.version,
                      risk: data.get("risk"),
                      summary: data.get("summary"),
                      prevention: String(data.get("prevention"))
                        .split("\n")
                        .map((line) => line.trim())
                        .filter(Boolean),
                      sources: [String(data.get("source"))],
                      publishConsent: data.get("publish") === "on",
                    });
                    if (!parsed.success) {
                      setNotice(t.communityReviewInvalid);
                      return;
                    }
                    setBusy(true);
                    setNotice("");
                    try {
                      await onPublish(item, parsed.data);
                      setNotice(t.communityPublished);
                    } catch (error) {
                      setNotice(
                        error instanceof Error &&
                          error.message.includes("newer review")
                          ? t.communityReviewConflict
                          : t.communityPublishFailed,
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <label>
                    {t.communityDecision}
                    <select
                      name="risk"
                      aria-label={t.communityDecision}
                      required
                      defaultValue={item.review?.risk ?? ""}
                    >
                      <option value="" disabled>
                        {t.communityChooseRisk}
                      </option>
                      <option value="watch">{t.communityRiskWatch}</option>
                      <option value="spreading">{t.communityRiskSpread}</option>
                      <option value="not_confirmed">
                        {t.communityRiskUnconfirmed}
                      </option>
                      <option value="resolved">
                        {t.communityRiskResolved}
                      </option>
                    </select>
                  </label>
                  <label>
                    {t.communityPublicSummary}
                    <textarea
                      name="summary"
                      required
                      minLength={10}
                      maxLength={1000}
                      defaultValue={item.review?.summary}
                    />
                  </label>
                  <label>
                    {t.communityPrevention}
                    <textarea
                      name="prevention"
                      required
                      maxLength={2407}
                      placeholder={t.onePerLine}
                      defaultValue={item.review?.prevention.join("\n")}
                    />
                  </label>
                  <label>
                    {t.authoritativeSource}
                    <input
                      name="source"
                      type="url"
                      required
                      pattern="https://.*"
                      maxLength={1000}
                      placeholder="https://"
                      defaultValue={item.review?.sources[0]}
                    />
                  </label>
                  <label className="community-publish-consent">
                    <input type="checkbox" name="publish" required />{" "}
                    <span>{t.communityPublicConsent}</span>
                  </label>
                  <button className="primary" disabled={busy}>
                    {t.communityPublish}
                  </button>
                </form>
              </details>
            </article>
          );
        })}
      </div>
    </section>
  );
}
