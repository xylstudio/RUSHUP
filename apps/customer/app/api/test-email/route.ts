import { NextRequest, NextResponse } from 'next/server'
import { testEmailConnection, sendBookingEmails } from '@/lib/emailService'

export async function GET() {
  try {
    const testResult = await testEmailConnection()
    return NextResponse.json(testResult)
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to test email connection' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const { action, language } = await req.json()
    
    if (action === 'test') {
      const lang = language || 'th'
      const testNames = {
        th: 'ทดสอบ ระบบ',
        en: 'Test User',
        zh: '测试用户'
      }
      const testTopics = {
        th: 'สวนถาด (ทดสอบ)',
        en: 'Tray Garden (Test)',
        zh: '托盘花园（测试）'
      }
      
      // Send test email
      const testData = {
        customerName: testNames[lang as keyof typeof testNames],
        customerEmail: process.env.EMAIL_FROM || 'test@example.com',
        workshopTopic: testTopics[lang as keyof typeof testTopics],
        workshopDate: new Date().toISOString().split('T')[0],
        workshopTime: '09:00 - 11:30',
        attendeesCount: 1,
        totalAmount: 890,
        bookingId: 'TEST-' + Date.now(),
        paymentMethod: 'cash',
        paymentStatus: 'pending_cash' as const,
        language: lang as 'th' | 'en' | 'zh'
      }
      
      const result = await sendBookingEmails(testData)
      return NextResponse.json(result)
    }
    
    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to send test email' },
      { status: 500 }
    )
  }
}