import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, jobId, status, message, customerId } = body;

    console.log('📢 Customer notification API called:', { type, jobId, status, message, customerId });

    // สร้าง notification object
    const notification = {
      id: Date.now(),
      message: message,
      type: type || 'info',
      timestamp: new Date().toISOString(),
      jobId: jobId,
      status: status,
      read: false,
      recipientType: 'customer',
      customerId: customerId
    };

    console.log('🔔 Broadcasting customer notification:', notification);

    // ในระบบจริงจะส่งผ่าน WebSocket หรือ Server-Sent Events
    // ที่นี่เราจะใช้วิธีจำลองโดยการ return เพื่อให้ client-side ส่งต่อ
    
    return NextResponse.json({ 
      success: true, 
      notification: notification,
      message: 'Notification queued for customer'
    });

  } catch (error) {
    console.error('❌ Customer notification API error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
