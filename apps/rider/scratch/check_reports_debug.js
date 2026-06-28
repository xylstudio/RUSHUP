
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key);

async function check() {
  const { data, error } = await supabase
    .from('work_reports')
    .select('id, before_photos, after_photos, zones, work_done')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error(error);
    return;
  }

  data.forEach(r => {
    console.log(`Report ID: ${r.id}`);
    console.log(`Work Done: ${r.work_done}`);
    console.log(`Before Photos:`, r.before_photos);
    console.log(`After Photos:`, r.after_photos);
    if (r.zones) {
        r.zones.forEach(z => {
            console.log(`  Zone: ${z.name}`);
            console.log(`  Zone Before:`, z.before_photos || z.beforePhotos);
        });
    }
    console.log('---');
  });
}

check();
