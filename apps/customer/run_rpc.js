const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  await client.query(`
    DROP POLICY IF EXISTS "Authenticated can read branches" ON public.branches;
    DROP POLICY IF EXISTS "Public can read branches" ON public.branches;
    CREATE POLICY "Public can read branches" ON public.branches FOR SELECT USING (true);
  `);
  
  console.log('Policy created!');
  const res = await client.query('SELECT * FROM public.branches LIMIT 1');
  console.log(res.rows);
  
  await client.end();
}
run();
