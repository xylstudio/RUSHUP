import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { amount, order_id, method = 'promptpay', items, splitMode } = body;

    if (!amount || !order_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Amount should be passed in THB, stripe uses smallest unit (satang/cents)
    const amountInSatang = Math.round(amount * 100);

    // 1. Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInSatang,
      currency: 'thb',
      payment_method_types: ['promptpay', 'card'],
      metadata: {
        type: 'pos_order',
        order_id: order_id,
      },
    });

    if (!paymentIntent.client_secret) {
      throw new Error('Failed to create PaymentIntent');
    }

    // 2. Insert into pos_order_payments as 'pending'
    const { data: paymentRecord, error: paymentError } = await supabase
      .from('pos_order_payments')
      .insert({
        order_id,
        payment_method: method,
        amount,
        status: 'pending',
        stripe_payment_intent_id: paymentIntent.id
      })
      .select('id')
      .single();

    if (paymentError || !paymentRecord) {
      throw new Error('Failed to create payment record in DB');
    }

    // Update pos_orders with the split mode if provided
    if (splitMode) {
      await supabase.from('pos_orders').update({ payment_split_mode: splitMode }).eq('id', order_id);
    }

    // 3. Insert into pos_payment_items if items exist
    if (items && Array.isArray(items) && items.length > 0) {
      const paymentItems = items.map((i: any) => ({
        payment_id: paymentRecord.id,
        order_item_id: i.item_id,
        amount: i.amount
      }));
      
      const { error: itemsError } = await supabase
        .from('pos_payment_items')
        .insert(paymentItems);

      if (itemsError) {
         console.error('Error inserting payment items:', itemsError);
         // Don't throw, we still have the payment intent
      }
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentId: paymentRecord.id,
      stripePaymentIntentId: paymentIntent.id
    });
  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
