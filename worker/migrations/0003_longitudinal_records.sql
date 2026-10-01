ALTER TABLE farmer_profiles ADD COLUMN recent_crop_code TEXT;
ALTER TABLE farmer_profiles ADD COLUMN last_harvest_on TEXT;

ALTER TABLE crop_events ADD COLUMN input_class TEXT;
ALTER TABLE crop_events ADD COLUMN product_name TEXT NOT NULL DEFAULT '';
ALTER TABLE crop_events ADD COLUMN amount REAL;
ALTER TABLE crop_events ADD COLUMN unit TEXT;
ALTER TABLE crop_events ADD COLUMN purpose TEXT NOT NULL DEFAULT '';
ALTER TABLE crop_events ADD COLUMN yield_amount REAL;
ALTER TABLE crop_events ADD COLUMN yield_unit TEXT;
