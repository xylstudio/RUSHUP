import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
      global: {
        fetch: (url, options) => {
          return fetch(url, { ...options, cache: 'no-store' });
        }
      }
    });

    const { data: profiles } = await supabaseAdmin.from('profiles').select('*').eq('role', 'customer');

    const customersWithCounts = await Promise.all(
      (profiles || []).map(async (p) => {
        const { data: collabData } = await supabaseAdmin
          .from('house_collaborators')
          .select('house_id')
          .eq('user_id', p.id);
          
        const collabIds = (collabData || []).map(c => c.house_id);
        
        let houseQ = supabaseAdmin.from('houses').select('*', { count: 'exact', head: true });
        if (collabIds.length > 0) {
          houseQ = houseQ.or(`user_id.eq.${p.id},customer_id.eq.${p.id},id.in.(${collabIds.join(',')})`);
        } else {
          houseQ = houseQ.or(`user_id.eq.${p.id},customer_id.eq.${p.id}`);
        }
        const { count: houseCount } = await houseQ;

        const { count: planCount } = await supabaseAdmin
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('customer_id', p.id)
          .in('status', ['confirmed', 'in_progress']);

        return {
          ...p,
          house_count: houseCount || 0,
          active_plans_count: planCount || 0
        };
      })
    );

    return NextResponse.json({ data: customersWithCounts });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
