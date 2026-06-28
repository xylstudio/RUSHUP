const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cdjbzyrflzckjgxbqjqb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkamJ6eXJmbHpja2pneGJxanFiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTY1OTc5OCwiZXhwIjoyMDg3MjM1Nzk4fQ.17vCilrLI2O543l4S6lVLB18Dulc7QkuMFENrxoIBQs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function find() {
  const { data: items, error } = await supabase.from('pos_menu_items').select('*');
  if (error) {
    console.error(error);
    return;
  }
  const itemsWithRecipes = items.filter(item => item.recipe_data && item.recipe_data.length > 0);
  console.log(`Found ${itemsWithRecipes.length} items with recipes:`);
  itemsWithRecipes.forEach(item => {
    console.log(`- ${item.name} (${item.id}):`, JSON.stringify(item.recipe_data, null, 2));
  });

  const { data: modifiers, error: modError } = await supabase.from('pos_menu_modifiers').select('*');
  if (modError) {
    console.error(modError);
    return;
  }
  const modsWithRecipes = modifiers.filter(mod => mod.recipe_data && mod.recipe_data.length > 0);
  console.log(`Found ${modsWithRecipes.length} modifiers with recipes:`);
  modsWithRecipes.forEach(mod => {
    console.log(`- ${mod.name} (${mod.id}):`, JSON.stringify(mod.recipe_data, null, 2));
  });
}

find();
