export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { id, rating, comment } = await req.json();

    if (!id || typeof rating !== 'number' || rating < 1) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    // 1. Fetch order details
    const { data: orderData, error: orderError } = await supabase
      .from('pos_orders')
      .select('line_user_id, order_number')
      .eq('id', id)
      .single();

    if (orderError || !orderData) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const customerId = orderData.line_user_id || 'anonymous';
    const orderCode = orderData.order_number || id.slice(0, 8).toUpperCase();

    // 2. Update pos_orders
    const { error } = await supabase
      .from('pos_orders')
      .update({ rating, comment })
      .eq('id', id);

    if (error) {
      console.error('Failed to rate order:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 3. Insert into customer_order_feedback (for Admin Dashboard)
    const { error: feedbackError } = await supabase
      .from('customer_order_feedback')
      .insert({
        order_id: id,
        customer_id: customerId,
        feedback_type: 'rating',
        rating,
        comment_message: comment || null,
        source: 'liff',
        status: 'new'
      });

    if (feedbackError) {
      console.error('Failed to insert into customer_order_feedback:', feedbackError);
      // We don't fail the request here, just log it.
    }

    // 4. Insert into audit_logs
    await supabase.from('audit_logs').insert({
      action: 'customer_order_feedback_submitted',
      user_id: customerId,
      user_email: null,
      details: {
        order_id: id,
        order_code: orderCode,
        feedback_type: 'rating',
        rating,
        comment_message: comment || null,
        source: 'liff'
      }
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Rating API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
