ALTER TABLE crop_health_cases ADD COLUMN triage_priority TEXT NOT NULL DEFAULT 'priority';
ALTER TABLE crop_health_cases ADD COLUMN triage_route TEXT NOT NULL DEFAULT 'priority_review';
ALTER TABLE crop_health_cases ADD COLUMN triage_reasons_json TEXT NOT NULL DEFAULT '["moderate_model_signal"]';
ALTER TABLE crop_health_cases ADD COLUMN interim_actions_json TEXT NOT NULL DEFAULT '["monitor_changes","avoid_unverified_treatment"]';
ALTER TABLE crop_health_cases ADD COLUMN triage_policy_version TEXT NOT NULL DEFAULT '2026-10-02.1';
ALTER TABLE crop_health_cases ADD COLUMN triaged_at INTEGER;

CREATE INDEX IF NOT EXISTS crop_health_cases_triage
ON crop_health_cases(status, triage_priority, created_at);
