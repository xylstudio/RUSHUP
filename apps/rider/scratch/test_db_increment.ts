import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(url, key)

async function run() {
  console.log('Testing DB connection...')
  
  // Get latest order
  const { data: orders, error: getErr } = await supabase
    .from('orders')
    .select('id, customer_id, completed_sessions, total_sessions, status')
    .order('created_at', { ascending: false })
    .limit(3)

  if (getErr) {
    console.error('Failed to get orders:', getErr)
    return
  }

  console.log('Recent Orders:', JSON.stringify(orders, null, 2))

  if (orders && orders.length > 0) {
    const targetOrder = orders[0]
    console.log(`\nAttempting to increment order ${targetOrder.id}...`)
    
    const nextCount = (targetOrder.completed_sessions || 0) + 1
    
    const { data: updateData, error: updateErr } = await supabase
      .from('orders')
      .update({ completed_sessions: nextCount })
      .eq('id', targetOrder.id)
      .select('completed_sessions')
      .single()

    if (updateErr) {
      console.error('Update Failed:', updateErr)
    } else {
      console.log('Update Succeeded! New count:', updateData.completed_sessions)
      
      // Rollback
      console.log('Rolling back...')
      await supabase.from('orders').update({ completed_sessions: targetOrder.completed_sessions }).eq('id', targetOrder.id)
    }
  }
}

run().catch(console.error)
