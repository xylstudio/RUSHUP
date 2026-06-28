const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cdjbzyrflzckjgxbqjqb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkamJ6eXJmbHpja2pneGJxanFiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTY1OTc5OCwiZXhwIjoyMDg3MjM1Nzk4fQ.17vCilrLI2O543l4S6lVLB18Dulc7QkuMFENrxoIBQs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const ingredientId = 'fe5eee8e-4a9c-48ed-bd54-00e69f6eeef9'; // เมล็ดกาแฟคั่วเข้ม
  const menuItemId = '45074e62-be6e-4751-b514-680ed78194b0'; // Espresso shot (ร้อน)

  // 1. Fetch current stock
  const { data: ingBefore, error: ingErrBefore } = await supabase
    .from('inventory_items')
    .select('stock_quantity, name')
    .eq('id', ingredientId)
    .single();

  if (ingErrBefore) {
    console.error('Error fetching ingredient before:', ingErrBefore);
    return;
  }
  console.log(`Before: ${ingBefore.name} stock_quantity = ${ingBefore.stock_quantity}`);

  // Get the actual menu item to see its recipe_data
  const { data: mItem } = await supabase.from('pos_menu_items').select('*').eq('id', menuItemId).single();
  console.log(`Menu Item recipe_data:`, JSON.stringify(mItem.recipe_data));

  // 2. Create a dummy order
  const { data: order, error: orderErr } = await supabase
    .from('pos_orders')
    .insert({
      order_number: 'TEST-TRIGGER-999',
      total_amount: 100,
      net_total: 100,
      status: 'paid',
    })
    .select()
    .single();

  if (orderErr) {
    console.error('Error creating order:', orderErr);
    return;
  }
  console.log(`Created order: ${order.id}`);

  // 3. Create a dummy order item (this should trigger deduct_stock_on_order)
  const { data: orderItem, error: itemErr } = await supabase
    .from('pos_order_items')
    .insert({
      order_id: order.id,
      item_id: menuItemId,
      quantity: 2, // 2 shots = 2 * 18 = 36 grams
      unit_price: 50,
      cost_price: 10, // Provide cost_price to avoid null violation
      subtotal: 100,
      selected_modifiers: []
    })
    .select()
    .single();

  if (itemErr) {
    console.error('Error creating order item:', itemErr);
    // Cleanup order
    await supabase.from('pos_orders').delete().eq('id', order.id);
    return;
  }
  console.log(`Created order item: ${orderItem.id}`);

  // 4. Fetch stock after insertion
  const { data: ingAfter, error: ingErrAfter } = await supabase
    .from('inventory_items')
    .select('stock_quantity')
    .eq('id', ingredientId)
    .single();

  console.log(`After: ${ingBefore.name} stock_quantity = ${ingAfter.stock_quantity}`);
  console.log(`Difference: ${Number(ingBefore.stock_quantity) - Number(ingAfter.stock_quantity)} (expected 36)`);

  // 5. Fetch inventory movements
  const { data: movements, error: movErr } = await supabase
    .from('inventory_movements')
    .select('*')
    .eq('item_id', ingredientId)
    .order('created_at', { ascending: false })
    .limit(3);

  console.log('Recent movements:', movements);

  // 6. Cleanup
  console.log('Cleaning up...');
  await supabase.from('pos_order_items').delete().eq('order_id', order.id);
  await supabase.from('pos_orders').delete().eq('id', order.id);
  // Restore stock
  await supabase.from('inventory_items').update({ stock_quantity: ingBefore.stock_quantity }).eq('id', ingredientId);
  console.log('Done!');
}

test();
