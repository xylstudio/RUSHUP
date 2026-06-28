const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cdjbzyrflzckjgxbqjqb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkamJ6eXJmbHpja2pneGJxanFiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTY1OTc5OCwiZXhwIjoyMDg3MjM1Nzk4fQ.17vCilrLI2O543l4S6lVLB18Dulc7QkuMFENrxoIBQs';

const supabase = createClient(supabaseUrl, supabaseKey);

const FROM_BRANCH = '1f3fc496-d89e-4323-a66e-4fcd555444e9'; // สันกำแพง (01)
const TO_BRANCH = 'ae2abb37-3a8c-40ef-be9a-2dc76a94c06c';   // 99 CAFE (02)
const PREFIX = '02-';

async function clone() {
  console.log(`🚀 Starting optimized clone from San Kamphaeng to 99 CAFE...`);

  // 1. Clone/Map Categories
  console.log('--- 1. Cloning/Mapping Categories ---');
  const { data: oldCats, error: catErr } = await supabase.from('pos_menu_categories').select('*').eq('branch_id', FROM_BRANCH);
  if (catErr) {
    console.error('Error fetching categories:', catErr);
    return;
  }
  
  const catMap = {};
  for (const cat of oldCats) {
    const { id, created_at, ...catData } = cat;
    catData.branch_id = TO_BRANCH;
    
    const { data: newCat, error: insertCatErr } = await supabase.from('pos_menu_categories').insert(catData).select().maybeSingle();
    if (insertCatErr) {
      if (insertCatErr.code === '23505') {
        // Duplicate key, fetch existing category ID by name
        const { data: existingCat } = await supabase.from('pos_menu_categories').select('id').eq('name', cat.name).maybeSingle();
        if (existingCat) {
          catMap[id] = existingCat.id;
          console.log(`Reused existing category: ${cat.name} -> ${existingCat.id}`);
        } else {
          console.error(`Failed to fetch existing category for ${cat.name}`);
        }
      } else {
        console.error(`Failed to insert category ${catData.name}:`, insertCatErr);
      }
    } else if (newCat) {
      catMap[id] = newCat.id;
      console.log(`Cloned category: ${cat.name} -> ${newCat.id}`);
    }
  }

  // 2. Clone Modifier Groups and Modifiers
  console.log('--- 2. Cloning Modifier Groups & Modifiers ---');
  // First clean up any previously created groups for TO_BRANCH in failed runs to avoid duplicate group name errors
  await supabase.from('pos_menu_modifier_groups').delete().eq('branch_id', TO_BRANCH);

  const { data: oldGroups, error: grpErr } = await supabase.from('pos_menu_modifier_groups').select('*').eq('branch_id', FROM_BRANCH);
  if (grpErr) {
    console.error('Error fetching modifier groups:', grpErr);
    return;
  }

  const groupMap = {};
  for (const group of oldGroups) {
    const { id, created_at, ...groupData } = group;
    groupData.branch_id = TO_BRANCH;

    const { data: newGroup, error: insertGrpErr } = await supabase.from('pos_menu_modifier_groups').insert(groupData).select().maybeSingle();
    if (insertGrpErr) {
      console.error(`Failed to insert group ${groupData.name}:`, insertGrpErr);
    } else if (newGroup) {
      groupMap[id] = newGroup.id;
      console.log(`Cloned modifier group: ${group.name} -> ${newGroup.id}`);

      // Fetch modifiers in this group
      const { data: oldModifiers } = await supabase.from('pos_menu_modifiers').select('*').eq('group_id', id);
      if (oldModifiers && oldModifiers.length > 0) {
        for (const mod of oldModifiers) {
          const { id: mId, created_at: mCreated, ...modData } = mod;
          modData.group_id = newGroup.id;
          const { data: newMod, error: insertModErr } = await supabase.from('pos_menu_modifiers').insert(modData).select().maybeSingle();
          if (insertModErr) {
            console.error(`Failed to insert modifier ${modData.name}:`, insertModErr);
          } else {
            console.log(`  Cloned modifier: ${mod.name}`);
          }
        }
      }
    }
  }

  // 3. Clone Menu Items
  console.log('--- 3. Cloning Menu Items ---');
  // Clean up old items for TO_BRANCH in previous failed runs to avoid duplication
  await supabase.from('pos_menu_items').delete().eq('branch_id', TO_BRANCH);

  const { data: oldItems, error: itemErr } = await supabase.from('pos_menu_items').select('*').eq('branch_id', FROM_BRANCH);
  if (itemErr) {
    console.error('Error fetching menu items:', itemErr);
    return;
  }

  const itemMap = {};
  for (const item of oldItems) {
    const { id, created_at, ...itemData } = item;
    itemData.branch_id = TO_BRANCH;
    if (item.category_id && catMap[item.category_id]) {
      itemData.category_id = catMap[item.category_id];
    } else {
      console.warn(`Category mapping not found for item ${item.name}`);
      continue;
    }

    const { data: newItem, error: insertItemErr } = await supabase.from('pos_menu_items').insert(itemData).select().maybeSingle();
    if (insertItemErr) {
      console.error(`Failed to insert item ${itemData.name}:`, insertItemErr);
    } else if (newItem) {
      itemMap[id] = newItem.id;
      console.log(`Cloned menu item: ${item.name} -> ${newItem.id}`);
      
      // Fetch modifier links for this item
      const { data: oldLinks } = await supabase.from('pos_item_modifier_links').select('*').eq('item_id', id);
      if (oldLinks && oldLinks.length > 0) {
        for (const link of oldLinks) {
          if (groupMap[link.group_id]) {
            const linkData = {
              item_id: newItem.id,
              group_id: groupMap[link.group_id]
            };
            const { error: insertLinkErr } = await supabase.from('pos_item_modifier_links').insert(linkData);
            if (insertLinkErr) {
              console.error(`Failed to link item ${newItem.name} with group:`, insertLinkErr);
            }
          }
        }
      }
    }
  }

  // 4. Clone POS Tables
  console.log('--- 4. Cloning Tables ---');
  // Clean up any previously created tables for TO_BRANCH to prevent duplicates
  await supabase.from('pos_tables').delete().eq('branch_id', TO_BRANCH);

  const { data: oldTables, error: tblErr } = await supabase.from('pos_tables').select('*').eq('branch_id', FROM_BRANCH);
  if (tblErr) {
    console.error('Error fetching tables:', tblErr);
    return;
  }

  for (const table of oldTables) {
    const { id, created_at, ...tableData } = table;
    tableData.branch_id = TO_BRANCH;
    tableData.table_number = PREFIX + table.table_number; // Apply branch prefix to prevent unique constraint violation
    
    const { error: insertTblErr } = await supabase.from('pos_tables').insert(tableData);
    if (insertTblErr) {
      console.error(`Failed to insert table ${tableData.table_number}:`, insertTblErr);
    } else {
      console.log(`Cloned table: ${tableData.table_number}`);
    }
  }

  // 5. Clone Shop Settings
  console.log('--- 5. Cloning Shop Settings ---');
  const { data: oldSettings } = await supabase.from('pos_shop_settings').select('*').eq('branch_id', FROM_BRANCH).maybeSingle();
  if (oldSettings) {
    const { id, created_at, ...settingsData } = oldSettings;
    settingsData.branch_id = TO_BRANCH;
    
    const { data: existingSettings } = await supabase.from('pos_shop_settings').select('id').eq('branch_id', TO_BRANCH).maybeSingle();
    if (existingSettings) {
      await supabase.from('pos_shop_settings').update(settingsData).eq('id', existingSettings.id);
      console.log('Updated existing shop settings for 99 CAFE.');
    } else {
      await supabase.from('pos_shop_settings').insert(settingsData);
      console.log('Created new shop settings for 99 CAFE.');
    }
  }

  console.log('✅ Cloned all branch configuration and menu data successfully with unique constraints resolved!');
}

clone();
