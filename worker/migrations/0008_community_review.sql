CREATE TABLE community_cases (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL UNIQUE REFERENCES reports(id) ON DELETE CASCADE,
  reference TEXT NOT NULL UNIQUE,
  evidence_json TEXT NOT NULL,
  consent_version TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 0,
  last_review_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE community_reviews (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES community_cases(id) ON DELETE CASCADE,
  reviewer_id TEXT NOT NULL,
  risk TEXT NOT NULL CHECK (risk IN ('watch', 'spreading', 'not_confirmed', 'resolved')),
  summary TEXT NOT NULL,
  prevention_json TEXT NOT NULL,
  sources_json TEXT NOT NULL,
  reviewed_at INTEGER NOT NULL
);
CREATE INDEX community_cases_queue ON community_cases(last_review_id, updated_at DESC);
CREATE INDEX community_reviews_case ON community_reviews(case_id, reviewed_at DESC);
