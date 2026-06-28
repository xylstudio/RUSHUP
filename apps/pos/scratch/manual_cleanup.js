const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

// 🛡️ Load Environment Variables
let config = {};
if (fs.existsSync('.env.prod.local')) {
  const envFile = fs.readFileSync('.env.prod.local');
  config = dotenv.parse(envFile);
} else if (fs.existsSync('.env')) {
  const envFile = fs.readFileSync('.env');
  config = dotenv.parse(envFile);
}

const supabaseUrl = config.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = config.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Could not find NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function manualCleanup() {
  console.log(`🔄 Cleaning up orphaned data manually: ${supabaseUrl}`);

  // 1. Clean up Notifications
  console.log('⏳ Fetching all notifications...');
  const { data: notifications, error: notifError } = await supabase
    .from('notifications')
    .select('id, related_order_id, related_measurement_id');

  if (notifError) {
    console.error('❌ Failed to fetch notifications:', notifError);
    process.exit(1);
  }

  console.log(`Found ${notifications.length} notifications. Checking for orphans...`);

  const orderIds = new Set();
  const measurementIds = new Set();

  notifications.forEach(n => {
    if (n.related_order_id) orderIds.add(n.related_order_id);
    if (n.related_measurement_id) measurementIds.add(n.related_measurement_id);
  });

  // Fetch valid IDs
  const { data: validOrders } = await supabase.from('orders').select('id').in('id', Array.from(orderIds));
  const { data: validMeasurements } = await supabase.from('measurement_requests').select('id').in('id', Array.from(measurementIds));

  const validOrderSet = new Set((validOrders || []).map(o => o.id));
  const validMeasurementSet = new Set((validMeasurements || []).map(m => m.id));

  const toDelete = notifications.filter(n => {
    if (n.related_order_id && !validOrderSet.has(n.related_order_id)) return true;
    if (n.related_measurement_id && !validMeasurementSet.has(n.related_measurement_id)) return true;
    return false;
  }).map(n => n.id);

  if (toDelete.length > 0) {
    console.log(`🗑️ Deleting ${toDelete.length} orphaned notifications...`);
    const { error: delError } = await supabase.from('notifications').delete().in('id', toDelete);
    if (delError) console.error('❌ Failed to delete notifications:', delError);
    else console.log('✅ Orphaned notifications cleared.');
  } else {
    console.log('✨ No orphaned notifications found.');
  }

  // 2. Clean up Work Reports (Just in case)
  console.log('⏳ Checking work reports for orphans...');
  const { data: reports } = await supabase.from('work_reports').select('id, order_id');
  const reportOrderIds = Array.from(new Set((reports || []).map(r => r.order_id).filter(Boolean)));
  
  const { data: validReportOrders } = await supabase.from('orders').select('id').in('id', reportOrderIds);
  const validReportOrderSet = new Set((validReportOrders || []).map(o => o.id));

  const reportsToDelete = (reports || []).filter(r => r.order_id && !validReportOrderSet.has(r.order_id)).map(r => r.id);

  if (reportsToDelete.length > 0) {
    console.log(`🗑️ Deleting ${reportsToDelete.length} orphaned work reports...`);
    await supabase.from('work_reports').delete().in('id', reportsToDelete);
    console.log('✅ Orphaned work reports cleared.');
  } else {
    console.log('✨ No orphaned work reports found.');
  }

  console.log('🏁 Manual cleanup complete.');
}

manualCleanup();
