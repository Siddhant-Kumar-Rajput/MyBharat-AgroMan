CREATE TABLE IF NOT EXISTS field_baselines (
  plot_id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL,
  baseline_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (plot_id) REFERENCES farm_plots(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS field_baselines_owner ON field_baselines(subject_id);

CREATE TABLE IF NOT EXISTS farm_quick_actions (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL,
  cycle_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('irrigation', 'weeding', 'crop_protection')),
  occurred_on TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(subject_id, cycle_id, action, occurred_on),
  FOREIGN KEY (cycle_id) REFERENCES crop_cycles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS farm_quick_actions_owner ON farm_quick_actions(subject_id, created_at DESC);

CREATE TABLE IF NOT EXISTS crop_photo_observations (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL,
  cycle_id TEXT NOT NULL,
  observation_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (cycle_id) REFERENCES crop_cycles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS crop_photo_observations_owner ON crop_photo_observations(subject_id, created_at DESC);
