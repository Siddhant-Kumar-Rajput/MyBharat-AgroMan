CREATE TABLE IF NOT EXISTS farmer_profiles (
  subject_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL DEFAULT '',
  locale TEXT NOT NULL,
  state TEXT NOT NULL,
  district TEXT NOT NULL,
  consent_version TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS farm_plots (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL,
  name TEXT NOT NULL,
  area REAL NOT NULL,
  area_unit TEXT NOT NULL CHECK (area_unit IN ('acre', 'hectare')),
  irrigation TEXT NOT NULL,
  mechanization TEXT NOT NULL,
  state TEXT NOT NULL,
  district TEXT NOT NULL,
  coarse_cell TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (subject_id) REFERENCES farmer_profiles(subject_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS farm_plots_subject ON farm_plots(subject_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS crop_cycles (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL,
  plot_id TEXT NOT NULL,
  crop_code TEXT NOT NULL,
  variety TEXT NOT NULL DEFAULT '',
  started_on TEXT NOT NULL,
  expected_harvest_on TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'harvested', 'archived')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (plot_id) REFERENCES farm_plots(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS crop_cycles_subject ON crop_cycles(subject_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS crop_events (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL,
  cycle_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  occurred_on TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (cycle_id) REFERENCES crop_cycles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS crop_events_cycle ON crop_events(cycle_id, occurred_on DESC);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL,
  cycle_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('expense', 'revenue')),
  category TEXT NOT NULL,
  amount_paise INTEGER NOT NULL CHECK (amount_paise >= 0),
  occurred_on TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  FOREIGN KEY (cycle_id) REFERENCES crop_cycles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS ledger_entries_cycle ON ledger_entries(cycle_id, occurred_on DESC);

CREATE TABLE IF NOT EXISTS crop_health_cases (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  subject_id TEXT NOT NULL,
  cycle_id TEXT NOT NULL,
  crop_code TEXT NOT NULL,
  disease_code TEXT NOT NULL,
  disease_name TEXT NOT NULL,
  symptoms_json TEXT NOT NULL,
  confidence REAL NOT NULL,
  confidence_band TEXT NOT NULL,
  district TEXT NOT NULL,
  coarse_cell TEXT,
  crop_stage TEXT NOT NULL,
  season TEXT NOT NULL,
  status TEXT NOT NULL,
  origin TEXT NOT NULL CHECK (origin IN ('synthetic', 'live')),
  consent_version TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (cycle_id) REFERENCES crop_cycles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS crop_health_cases_owner ON crop_health_cases(subject_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS crop_health_cases_match ON crop_health_cases(crop_code, disease_code, status);

CREATE TABLE IF NOT EXISTS case_reviews (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  reviewer_id TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'changed', 'undetermined')),
  remedy_json TEXT NOT NULL,
  sources_json TEXT NOT NULL,
  synthetic INTEGER NOT NULL DEFAULT 0,
  reviewed_at INTEGER NOT NULL,
  FOREIGN KEY (case_id) REFERENCES crop_health_cases(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS case_outcomes (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  interval_days INTEGER NOT NULL CHECK (interval_days IN (3, 7)),
  result TEXT NOT NULL CHECK (result IN ('resolved', 'improved', 'unchanged', 'worse', 'unable')),
  note TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  UNIQUE(case_id, interval_days),
  FOREIGN KEY (case_id) REFERENCES crop_health_cases(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS record_exports (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  record_count INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS in_app_alerts (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  read_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS in_app_alerts_subject ON in_app_alerts(subject_id, created_at DESC);
