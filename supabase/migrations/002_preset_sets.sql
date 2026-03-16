-- shift_set_presets: groups of shifts saved as a template
CREATE TABLE IF NOT EXISTS shift_set_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  shifts jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE shift_set_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own shift set presets" ON shift_set_presets
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- position_set_presets: groups of positions saved as a template
CREATE TABLE IF NOT EXISTS position_set_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  positions jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE position_set_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own position set presets" ON position_set_presets
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
