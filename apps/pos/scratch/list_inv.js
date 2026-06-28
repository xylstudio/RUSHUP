const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cdjbzyrflzckjgxbqjqb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkamJ6eXJmbHpja2pneGJxanFiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTY1OTc5OCwiZXhwIjoyMDg3MjM1Nzk4fQ.17vCilrLI2O543l4S6lVLB18Dulc7QkuMFENrxoIBQs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: items, error } = await supabase.from('inventory_items').select('id, name, stock_quantity');
  if (error) {
    console.error(error);
  } else {
    console.log(`Found ${items.length} inventory items:`);
    items.forEach(item => {
      console.log(`- ${item.name} (${item.id}): stock = ${item.stock_quantity}`);
    });
  }
}

check();
