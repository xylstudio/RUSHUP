const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cdjbzyrflzckjgxbqjqb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkamJ6eXJmbHpja2pneGJxanFiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTY1OTc5OCwiZXhwIjoyMDg3MjM1Nzk4fQ.17vCilrLI2O543l4S6lVLB18Dulc7QkuMFENrxoIBQs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function heal() {
  console.log('Healing recipe IDs based on names...');

  // 1. Fetch all active inventory items
  const { data: invItems, error: invErr } = await supabase.from('inventory_items').select('*');
  if (invErr) {
    console.error('Error fetching inventory items:', invErr);
    return;
  }

  // Create lookup map of (name, branch_id) -> id
  const invMap = {};
  invItems.forEach(item => {
    const key = `${item.name.trim()}_${item.branch_id || 'null'}`;
    invMap[key] = item.id;
  });

  // 2. Heal pos_menu_items recipes
  const { data: menuItems, error: menuErr } = await supabase.from('pos_menu_items').select('*');
  if (menuErr) {
    console.error('Error fetching menu items:', menuErr);
    return;
  }

  console.log(`Checking ${menuItems.length} menu items...`);
  for (const item of menuItems) {
    if (item.recipe_data && item.recipe_data.length > 0) {
      let changed = false;
      const newRecipe = item.recipe_data.map(ing => {
        const key = `${ing.name.trim()}_${item.branch_id || 'null'}`;
        const correctId = invMap[key];
        if (correctId && correctId !== ing.ingredient_id) {
          console.log(`  Menu item [${item.name}]: mapping ingredient [${ing.name}] id from ${ing.ingredient_id} to ${correctId}`);
          changed = true;
          return { ...ing, ingredient_id: correctId };
        }
        return ing;
      });

      if (changed) {
        const { error: updateErr } = await supabase
          .from('pos_menu_items')
          .update({ recipe_data: newRecipe })
          .eq('id', item.id);
        if (updateErr) {
          console.error(`  Error updating menu item ${item.name}:`, updateErr);
        } else {
          console.log(`  Successfully updated menu item [${item.name}]`);
        }
      }
    }
  }

  // 3. Heal pos_menu_modifiers recipes
  const { data: modifiers, error: modErr } = await supabase.from('pos_menu_modifiers').select('*');
  if (modErr) {
    console.error('Error fetching modifiers:', modErr);
    return;
  }

  console.log(`Checking ${modifiers.length} modifiers...`);
  for (const mod of modifiers) {
    if (mod.recipe_data && mod.recipe_data.length > 0) {
      let changed = false;
      const newRecipe = mod.recipe_data.map(ing => {
        const key = `${ing.name.trim()}_${mod.branch_id || 'null'}`;
        const correctId = invMap[key];
        if (correctId && correctId !== ing.ingredient_id) {
          console.log(`  Modifier [${mod.name}]: mapping ingredient [${ing.name}] id from ${ing.ingredient_id} to ${correctId}`);
          changed = true;
          return { ...ing, ingredient_id: correctId };
        }
        return ing;
      });

      if (changed) {
        const { error: updateErr } = await supabase
          .from('pos_menu_modifiers')
          .update({ recipe_data: newRecipe })
          .eq('id', mod.id);
        if (updateErr) {
          console.error(`  Error updating modifier ${mod.name}:`, updateErr);
        } else {
          console.log(`  Successfully updated modifier [${mod.name}]`);
        }
      }
    }
  }

  console.log('Healing completed!');
}

heal();
