import { supabase } from './supabaseClient'

export type CloneOptions = {
  categories: boolean;
  itemsAndModifiers: boolean;
  recipes: boolean;
  inventory: boolean;
  shareMembers: boolean;
};

export async function cloneBranchData(sourceBranchId: string, targetBranchId: string, options: CloneOptions) {
  try {
    const invMap: Record<string, string> = {};
    const catMap: Record<string, string> = {};
    const groupMap: Record<string, string> = {};
    const itemMap: Record<string, string> = {};

    // 1. Clone Inventory
    if (options.inventory) {
      const { data: oldInv } = await supabase.from('inventory_items').select('*').eq('branch_id', sourceBranchId);
      if (oldInv && oldInv.length > 0) {
        for (const inv of oldInv) {
          const { id, created_at, ...invData } = inv;
          invData.branch_id = targetBranchId;
          invData.stock_quantity = 0; // Reset stock for new branch
          
          const { data: newInv, error } = await supabase.from('inventory_items').insert(invData).select().single();
          if (newInv) {
            invMap[id] = newInv.id;
          } else if (error) {
            console.error('Error cloning inventory:', error);
          }
        }
      }
    }

    // 2. Clone Categories
    if (options.categories || options.itemsAndModifiers) {
      const { data: oldCats } = await supabase.from('pos_menu_categories').select('*').eq('branch_id', sourceBranchId);
      if (oldCats && oldCats.length > 0) {
        for (const cat of oldCats) {
          const { id, created_at, ...catData } = cat;
          catData.branch_id = targetBranchId;
          const { data: newCat } = await supabase.from('pos_menu_categories').insert(catData).select().single();
          if (newCat) {
            catMap[id] = newCat.id;
          }
        }
      }
    }

    // 3. Clone Modifiers
    if (options.itemsAndModifiers) {
      const { data: oldGroups } = await supabase.from('pos_menu_modifier_groups').select('*').eq('branch_id', sourceBranchId);
      if (oldGroups && oldGroups.length > 0) {
        for (const group of oldGroups) {
          const { id, created_at, ...groupData } = group;
          groupData.branch_id = targetBranchId;
          const { data: newGroup } = await supabase.from('pos_menu_modifier_groups').insert(groupData).select().single();
          if (newGroup) {
            groupMap[id] = newGroup.id;
            
            // Modifiers within group
            const { data: oldMods } = await supabase.from('pos_menu_modifiers').select('*').eq('group_id', id);
            if (oldMods && oldMods.length > 0) {
              for (const mod of oldMods) {
                const { id: mId, created_at: mCreated, ...modData } = mod;
                modData.group_id = newGroup.id;
                modData.branch_id = targetBranchId;

                // Handle recipe mapping if recipes are copied
                if (options.recipes && modData.recipe_data) {
                  modData.recipe_data = (modData.recipe_data as any[]).map(ing => ({
                    ...ing,
                    ingredient_id: invMap[ing.ingredient_id] || ing.ingredient_id
                  }));
                } else if (!options.recipes) {
                   modData.recipe_data = null;
                   modData.cost_price = 0;
                }

                await supabase.from('pos_menu_modifiers').insert(modData);
              }
            }
          }
        }
      }
    }

    // 4. Clone Menu Items
    if (options.itemsAndModifiers) {
      const { data: oldItems } = await supabase.from('pos_menu_items').select('*').eq('branch_id', sourceBranchId);
      if (oldItems && oldItems.length > 0) {
        for (const item of oldItems) {
          const { id, created_at, ...itemData } = item;
          itemData.branch_id = targetBranchId;
          if (itemData.category_id && catMap[itemData.category_id]) {
            itemData.category_id = catMap[itemData.category_id];
          }

          // Handle recipe mapping
          if (options.recipes && itemData.recipe_data) {
            itemData.recipe_data = (itemData.recipe_data as any[]).map(ing => ({
              ...ing,
              ingredient_id: invMap[ing.ingredient_id] || ing.ingredient_id
            }));
          } else if (!options.recipes) {
            itemData.recipe_data = null;
            itemData.cost_price = 0;
          }

          const { data: newItem } = await supabase.from('pos_menu_items').insert(itemData).select().single();
          if (newItem) {
            itemMap[id] = newItem.id;

            // Link modifiers
            const { data: oldLinks } = await supabase.from('pos_item_modifier_links').select('*').eq('item_id', id);
            if (oldLinks && oldLinks.length > 0) {
              for (const link of oldLinks) {
                if (groupMap[link.group_id]) {
                  await supabase.from('pos_item_modifier_links').insert({
                    item_id: newItem.id,
                    group_id: groupMap[link.group_id]
                  });
                }
              }
            }
          }
        }
      }
    }

    // Clone Shop Settings
    const { data: oldSettings } = await supabase.from('pos_shop_settings').select('*').eq('branch_id', sourceBranchId).maybeSingle();
    if (oldSettings) {
      const { id, created_at, ...settingsData } = oldSettings;
      settingsData.branch_id = targetBranchId;
      if (options.shareMembers) {
         settingsData.shared_member_branch_id = sourceBranchId;
      }
      await supabase.from('pos_shop_settings').insert(settingsData);
    } else {
      // If no old settings, create default settings but with shared member branch
      const defaultSettings: any = {
        branch_id: targetBranchId
      };
      if (options.shareMembers) {
         defaultSettings.shared_member_branch_id = sourceBranchId;
      }
      await supabase.from('pos_shop_settings').insert(defaultSettings);
    }

    return { success: true };
  } catch (err: any) {
    console.error('Clone Branch Data Error:', err);
    return { success: false, error: err.message };
  }
}
