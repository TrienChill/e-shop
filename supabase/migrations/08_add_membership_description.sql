-- Add description column to membership_levels table
ALTER TABLE membership_levels ADD COLUMN IF NOT EXISTS description TEXT;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
ALTER TABLE membership_levels ENABLE ROW LEVEL SECURITY;

-- Policy: everyone can read, only service_role can insert/update/delete
DROP POLICY IF EXISTS "Allow read all" ON membership_levels;
CREATE POLICY "Allow read all" ON membership_levels FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow service_role all" ON membership_levels;
CREATE POLICY "Allow service_role all" ON membership_levels USING (auth.role() = 'service_role');
