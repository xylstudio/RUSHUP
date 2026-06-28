const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env.local'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const sql = `
CREATE TABLE IF NOT EXISTS house_invites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    house_id UUID REFERENCES houses(id) ON DELETE CASCADE,
    created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
    used_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    used_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE house_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select for validation"
ON house_invites FOR SELECT
USING (true);

CREATE POLICY "Allow house owners to create invites"
ON house_invites FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM houses
        WHERE id = house_invites.house_id
        AND (user_id = auth.uid() OR customer_id = auth.uid())
    )
);

CREATE POLICY "Allow service role to update used_by"
ON house_invites FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS house_invites_house_id_idx ON house_invites(house_id);
CREATE INDEX IF NOT EXISTS house_invites_used_by_idx ON house_invites(used_by);
`;

async function run() {
  const { data, error } = await supabase.rpc('run_sql', { sql_query: sql });
  if (error) {
    console.error("Migration failed:", error);
  } else {
    console.log("Migration succeeded:", data);
  }
}
run();
