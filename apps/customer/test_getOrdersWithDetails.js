const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const user = { id: 'a73f8ca7-8868-44d6-be1c-ecb94885d2f3' };
  
  const ownedHousesResult = await supabaseAdmin
    .from('houses').select('id')
    .or(`user_id.eq.${user.id},customer_id.eq.${user.id}`)

  const collabHousesResult = await supabaseAdmin
    .from('house_collaborators').select('house_id').eq('user_id', user.id)

  const houseIds = new Set()
  if (ownedHousesResult.data) ownedHousesResult.data.forEach((h) => h.id && houseIds.add(h.id))
  if (collabHousesResult.data) collabHousesResult.data.forEach((h) => h.house_id && houseIds.add(h.house_id))

  const houseIdsArray = Array.from(houseIds)
  console.log("houseIdsArray:", houseIdsArray);

  const { data, error } = await supabaseAdmin
    .from('orders')
    .select(`
      *,
      services (id, service_name, service_code),
      houses!orders_house_id_fkey (id, name, address, house_code),
      profiles!orders_customer_id_fkey (id, display_name, phone, email),
      price_templates (id, template_name, description),
      order_additional_services (
        id, quantity, unit_price, total_price,
        additional_services (id, service_name, price)
      ),
      job_assignments (
        id, status, assigned_date, started_at, completed_at, staff_id,
        profiles!job_assignments_staff_id_fkey (id, display_name, phone)
      ),
      work_reports (id, created_at, updated_at)
    `)
    .in('house_id', houseIdsArray)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('SUCCESS! Orders found:', data?.length);
    if (data?.length > 0) {
      console.log('scheduled_date:', data[0].scheduled_date);
      console.log('status:', data[0].status);
      console.log('houses:', data[0].houses);
    }
  }
}
run();
