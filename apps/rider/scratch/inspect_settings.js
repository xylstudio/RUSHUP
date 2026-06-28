const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cdjbzyrflzckjgxbqjqb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkamJ6eXJmbHpja2pneGJxanFiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTY1OTc5OCwiZXhwIjoyMDg3MjM1Nzk4fQ.17vCilrLI2O543l4S6lVLB18Dulc7QkuMFENrxoIBQs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  const { data, error } = await supabase.from('pos_shop_settings').select('*').limit(1);
  if (error) {
    console.error(error);
  } else if (data && data.length > 0) {
    console.log('Columns in pos_shop_settings:', Object.keys(data[0]));
    console.log('Full record:', JSON.stringify(data[0], null, 2));
  } else {
    console.log('No settings records found.');
  }
}

inspect();
