
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function diagnose() {
  console.log('--- Diagnosing Data Integrity ---')

  // 1. Check for work_reports without orders
  const { data: reports, error: reportsError } = await supabase
    .from('work_reports')
    .select('id, order_id, customer_id, created_at')
  
  if (reportsError) {
    console.error('Error fetching work_reports:', reportsError)
  } else {
    console.log(`Total work_reports: ${reports.length}`)
    
    const orderIds = reports.map(r => r.order_id).filter(Boolean)
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id')
      .in('id', orderIds)
    
    if (ordersError) {
      console.error('Error fetching orders:', ordersError)
    } else {
      const existingOrderIds = new Set(orders.map(o => o.id))
      const orphanedReports = reports.filter(r => r.order_id && !existingOrderIds.has(r.order_id))
      
      console.log(`Orphaned work_reports (no matching order): ${orphanedReports.length}`)
      if (orphanedReports.length > 0) {
        console.log('Sample orphaned report:', orphanedReports[0])
      }
    }
  }

  // 2. Check for orders that might be considered "deleted" but still present (e.g. status='cancelled'?)
  const { data: cancelledOrders, error: cancelledError } = await supabase
    .from('orders')
    .select('id, status, customer_id')
    .eq('status', 'cancelled')
  
  if (cancelledError) {
    console.error('Error fetching cancelled orders:', cancelledError)
  } else {
    console.log(`Cancelled orders: ${cancelledOrders.length}`)
  }

  // 3. Check for job_assignments without orders
  const { data: assignments, error: assignmentsError } = await supabase
    .from('job_assignments')
    .select('id, order_id')
  
  if (assignmentsError) {
    console.error('Error fetching job_assignments:', assignmentsError)
  } else {
    const orderIds = assignments.map(a => a.order_id).filter(Boolean)
    const { data: orders } = await supabase
      .from('orders')
      .select('id')
      .in('id', orderIds)
    
    const existingOrderIds = new Set(orders?.map(o => o.id) || [])
    const orphanedAssignments = assignments.filter(a => a.order_id && !existingOrderIds.has(a.order_id))
    console.log(`Orphaned job_assignments: ${orphanedAssignments.length}`)
  }
}

diagnose()
