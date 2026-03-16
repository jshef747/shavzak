-- boards: one row per user, full AppState as JSON blob
CREATE TABLE IF NOT EXISTS boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  board_data jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own board" ON boards
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- position_presets: named positions per user
CREATE TABLE IF NOT EXISTS position_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE position_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own position presets" ON position_presets
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- hour_presets: named time blocks per user (start_time/end_time as HH:MM)
CREATE TABLE IF NOT EXISTS hour_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_time text NOT NULL,
  end_time text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE hour_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own hour presets" ON hour_presets
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
