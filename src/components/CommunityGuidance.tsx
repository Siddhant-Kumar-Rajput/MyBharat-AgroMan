import type { PublicCommunityReview } from "../../shared/community-review";
import type { Copy } from "../lib/i18n";

export function CommunityGuidance({
  reviews,
  copy: t,
}: {
  reviews?: PublicCommunityReview[];
  copy: Copy;
}) {
  if (!reviews?.length) return null;
  return (
    <details className="community-guidance">
      <summary>{t.communityAssessment}</summary>
      <small>{t.communityOriginalAdvice}</small>
      {reviews.map((review, index) => (
        <div className="community-guidance-entry" key={index}>
          <small>
            {t.communityReviewDate}:{" "}
            <time dateTime={new Date(review.reviewedAt).toISOString()}>
              {new Date(review.reviewedAt).toLocaleString()}
            </time>
          </small>
          <p>{review.summary}</p>
          <strong>{t.communityPrevention}</strong>
          <ul>
            {review.prevention.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ul>
          <ul>
            {review.sources.map((source) => (
              <li key={source}>
                <a href={source} target="_blank" rel="noopener noreferrer">
                  {t.authoritativeSource}: {new URL(source).hostname}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </details>
  );
}
