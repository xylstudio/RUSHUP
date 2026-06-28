import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const targetId = params.id;
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

    const { data: profile } = await supabaseAdmin.from('profiles').select('*').eq('id', targetId).single();

    // collaborators
    const { data: collabData } = await supabaseAdmin.from('house_collaborators').select('house_id').eq('user_id', targetId);
    const collabHouseIds = (collabData || []).map(c => c.house_id);

    let houseQuery = supabaseAdmin.from('houses').select('*');
    if (collabHouseIds.length > 0) {
      houseQuery = houseQuery.or(`user_id.eq.${targetId},customer_id.eq.${targetId},id.in.(${collabHouseIds.join(',')})`);
    } else {
      houseQuery = houseQuery.or(`user_id.eq.${targetId},customer_id.eq.${targetId}`);
    }
    const { data: houses } = await houseQuery;

    const { data: orders, error: ordersError } = await supabaseAdmin.from('orders').select('*, services(service_name)').eq('customer_id', targetId).order('created_at', { ascending: false });
    
    const { data: reports } = await supabaseAdmin.from('work_reports').select('*').eq('customer_id', targetId).order('created_at', { ascending: false });

    return NextResponse.json({ 
      profile, 
      houses: houses || [], 
      orders: orders || [], 
      reports: reports || [],
      debug_ordersError: ordersError,
      debug_url: supabaseUrl
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
