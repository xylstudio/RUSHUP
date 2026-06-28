import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(url, key)

async function run() {
  const customerId = 'f0f7c298-fc8e-4547-a654-1a46d10b9b2d'
  console.log(`Checking orders for customer ${customerId}...`)
  
  const { data: orders, error: getErr } = await supabase
    .from('orders')
    .select('id, completed_sessions, total_sessions, status, created_at')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })

  if (getErr) {
    console.error('Failed to get orders:', getErr)
    return
  }

  console.log(`Found ${orders?.length || 0} orders.`)
  if (orders && orders.length > 0) {
    const targetOrder = orders[0]
    console.log('Most recent order:', targetOrder)

    if (targetOrder.completed_sessions === 0) {
      console.log(`Updating completed_sessions to 1 for order ${targetOrder.id}...`)
      const { data: updateData, error: updateErr } = await supabase
        .from('orders')
        .update({ completed_sessions: 1 })
        .eq('id', targetOrder.id)
        .select('completed_sessions')
        .single()

      if (updateErr) {
        console.error('Failed to update:', updateErr)
      } else {
        console.log('Successfully updated! New count:', updateData.completed_sessions)
      }
    } else {
      console.log('Session count is already > 0, not updating.')
    }
  }
}

run().catch(console.error)
