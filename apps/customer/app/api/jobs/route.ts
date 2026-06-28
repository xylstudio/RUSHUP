import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Mark this route as dynamic so Next.js doesn't attempt to prerender it during the build
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get('staffId');

    if (!staffId) {
      return NextResponse.json({ error: 'Staff ID required' }, { status: 400 });
    }

    console.log('🔍 API: Fetching jobs for staff:', staffId);

    const { data, error } = await supabase
      .from('job_assignments')
      .select('*')
      .eq('staff_id', staffId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ API: Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('✅ API: Jobs fetched:', data?.length || 0);
    return NextResponse.json({ jobs: data || [] });

  } catch (error) {
    console.error('❌ API: Server error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const body = await request.json();
    const { jobId, status, staffId } = body;

    if (!jobId || !status || !staffId) {
      return NextResponse.json({ 
        error: 'Job ID, status, and staff ID required' 
      }, { status: 400 });
    }

    console.log('🔄 API: Updating job status:', { jobId, status, staffId });

    // เตรียมข้อมูลสำหรับอัปเดต
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    const now = new Date().toISOString();
    switch (status) {
      case 'in_progress':
        updateData.started_at = now;
        break;
      case 'completed':
        updateData.completed_at = now;
        break;
    }

    // อัปเดตข้อมูลในฐานข้อมูล
    const { data, error } = await supabase
      .from('job_assignments')
      .update(updateData)
      .eq('id', jobId)
      .eq('staff_id', staffId)
      .select(`
        *,
        profiles:staff_id (
          id,
          display_name,
          role
        )
      `)
      .single();

    if (error) {
      console.error('❌ API: Update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ 
        error: 'ไม่พบงานหรือไม่มีสิทธิ์อัปเดต' 
      }, { status: 404 });
    }

    console.log('✅ API: Job updated successfully:', data);

    // ส่งแจ้งเตือนไปยังลูกค้า
    await sendCustomerNotification(supabase, data, status);

    return NextResponse.json({ 
      success: true, 
      job: data,
      message: 'อัปเดตสถานะสำเร็จ'
    });

  } catch (error) {
    console.error('❌ API: Server error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// ฟังก์ชันส่งแจ้งเตือนไปยังลูกค้า
async function sendCustomerNotification(supabase: any, jobData: any, newStatus: string) {
  try {
    console.log('📢 API: Sending customer notification for job:', jobData.id);
    
    const statusMessages = {
      'in_progress': 'พนักงานได้รับงานแล้วและกำลังเดินทางไปยังที่หมาย',
      'completed': 'งานเสร็จสิ้นแล้ว',
      'assigned': 'งานได้รับการมอบหมายแล้ว'
    };

    const message = statusMessages[newStatus as keyof typeof statusMessages] || 'มีการอัปเดตสถานะงาน';

    if (!jobData.order_id) {
      console.warn('⚠️ Missing order_id on job, skipping customer notification insert');
      return;
    }

    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('id, customer_id')
      .eq('id', jobData.order_id)
      .single();

    if (orderError || !orderData?.customer_id) {
      console.warn('⚠️ Could not resolve customer for notification:', orderError?.message || 'no customer_id');
      return;
    }

    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: orderData.customer_id,
        title: 'อัปเดตสถานะงาน',
        message,
        type: 'success',
        related_order_id: orderData.id,
      });

    if (notificationError) {
      console.error('❌ Failed to insert customer notification:', notificationError.message);
      return;
    }

    console.log('✅ Customer notification inserted for order:', orderData.id);
    
  } catch (error) {
    console.error('❌ Error sending customer notification:', error);
  }
}
