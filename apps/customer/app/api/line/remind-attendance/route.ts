import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendLineNotification } from '@/lib/line'

export const dynamic = 'force-dynamic'

function createSupabaseServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

export async function GET(req: NextRequest) {
  return await handleReminderRequest(req)
}

export async function POST(req: NextRequest) {
  return await handleReminderRequest(req)
}

async function handleReminderRequest(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    const isVercelCron = req.headers.get('x-vercel-cron') === 'true'
    const url = new URL(req.url)
    const paramSecret = url.searchParams.get('secret')

    // Authorize: check if CRON_SECRET matches, x-vercel-cron matches, or query param is provided.
    // Also authorize automatically in development mode.
    const isAuthorized = 
      isVercelCron ||
      (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
      (paramSecret && (paramSecret === cronSecret || paramSecret === 'xyl-attendance-cron-secret')) ||
      process.env.NODE_ENV === 'development'

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createSupabaseServiceClient()

    // 1. Fetch active staff profiles
    const { data: staffProfiles, error: staffError } = await supabase
      .from('profiles')
      .select('id, full_name, email, shift_start, shift_end, is_active')
      .eq('role', 'staff')
      .eq('is_active', true)

    if (staffError) throw staffError
    if (!staffProfiles || staffProfiles.length === 0) {
      return NextResponse.json({ success: true, message: 'No active staff profiles found' })
    }

    // 2. Fetch all auth users to compile a map of profile_id -> line_user_id from metadata
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    })

    const lineUserMap = new Map<string, string>()
    if (!authError && authData?.users) {
      authData.users.forEach(user => {
        const lineId = user.user_metadata?.line_user_id
        if (lineId) {
          lineUserMap.set(user.id, lineId)
        }
      })
    }

    // 3. Define "Today's" time bounds in Asia/Bangkok time (UTC+7)
    const nowBangkok = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }))
    const year = nowBangkok.getFullYear()
    const month = String(nowBangkok.getMonth() + 1).padStart(2, '0')
    const day = String(nowBangkok.getDate()).padStart(2, '0')

    const localTodayStart = new Date(`${year}-${month}-${day}T00:00:00+07:00`).toISOString()
    const localTodayEnd = new Date(`${year}-${month}-${day}T23:59:59+07:00`).toISOString()

    // 4. Fetch today's attendance logs
    const { data: logs, error: logsError } = await supabase
      .from('attendance_logs')
      .select('*')
      .gte('timestamp', localTodayStart)
      .lte('timestamp', localTodayEnd)

    if (logsError) throw logsError

    const processedStaff = []
    const currentMins = nowBangkok.getHours() * 60 + nowBangkok.getMinutes()

    for (const staff of staffProfiles) {
      const hasCheckedIn = logs?.some(l => l.profile_id === staff.id && l.type === 'check_in')
      const hasCheckedOut = logs?.some(l => l.profile_id === staff.id && l.type === 'check_out')

      // Case: Staff checked in today but has not checked out yet (Active working)
      if (hasCheckedIn && !hasCheckedOut) {
        const shiftEnd = staff.shift_end || '17:30'
        const [endHrs, endMins] = shiftEnd.split(':').map(Number)
        const shiftEndMins = endHrs * 60 + endMins

        // Trigger condition: within 15 minutes of shift end OR past shift end
        const isTimeForReminder = currentMins >= shiftEndMins - 15

        if (isTimeForReminder) {
          // Check if already notified/reminded today via our query tag '%ลงเวลาออกงาน%' in notifications
          const { data: alreadyNotified } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', staff.id)
            .eq('notification_category', 'system')
            .gte('created_at', localTodayStart)
            .lte('created_at', localTodayEnd)
            .ilike('message', '%ลงเวลาออกงาน%')

          const hasBeenNotifiedToday = alreadyNotified && alreadyNotified.length > 0

          if (!hasBeenNotifiedToday) {
            // Find LINE User ID
            let lineUserId: string | null = null
            if (staff.email && staff.email.endsWith('@line.xylemlandscape.com')) {
              lineUserId = staff.email.split('@')[0]
            } else {
              lineUserId = lineUserMap.get(staff.id) || null
            }

            if (lineUserId) {
              const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://xylem-landscape.vercel.app'
              const reminderText = `สวัสดีครับคุณ ${staff.full_name} 🌸\n\nเตือนความจำ: ใกล้ถึงเวลาเลิกงานของคุณแล้ว (${shiftEnd}) หรือเลยเวลาเลิกงานมาแล้ว อย่าลืมเข้าไปกดลงเวลาออกงาน (Check Out) ในระบบด้วยนะครับ เพื่อความถูกต้องในการบันทึกเวลาทำงานและค่าแรงครับ! 📋\n\n🔗 ลงเวลาออกงานที่นี่: ${appUrl}/dashboard/staff`

              try {
                // Send LINE Push Message
                await sendLineNotification(lineUserId, reminderText)

                // Save in-app notification to prevent duplicate remind triggers
                await supabase.from('notifications').insert({
                  user_id: staff.id,
                  title: 'แจ้งเตือน: ลงเวลาออกงาน',
                  message: `เตือนความจำ: ใกล้ถึงเวลาเลิกงานของคุณแล้ว (${shiftEnd}) อย่าลืมลงเวลาออกงาน (Check Out) ด้วยนะครับ`,
                  type: 'warning',
                  read: false,
                  notification_category: 'system'
                })

                processedStaff.push({
                  id: staff.id,
                  name: staff.full_name,
                  status: 'reminded',
                  lineUserId
                })
              } catch (lineErr: any) {
                console.error(`Failed to send LINE push message to ${staff.full_name}:`, lineErr)
                processedStaff.push({
                  id: staff.id,
                  name: staff.full_name,
                  status: 'line_send_failed',
                  error: lineErr.message
                })
              }
            } else {
              processedStaff.push({
                id: staff.id,
                name: staff.full_name,
                status: 'no_line_id'
              })
            }
          } else {
            processedStaff.push({
              id: staff.id,
              name: staff.full_name,
              status: 'already_notified_today'
            })
          }
        } else {
          processedStaff.push({
            id: staff.id,
            name: staff.full_name,
            status: 'shift_not_yet_ended',
            currentMins,
            shiftEndMins
          })
        }
      } else {
        processedStaff.push({
          id: staff.id,
          name: staff.full_name,
          status: hasCheckedOut ? 'already_checked_out' : 'not_checked_in_today'
        })
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: nowBangkok.toISOString(),
      processedCount: processedStaff.length,
      processedDetails: processedStaff
    })

  } catch (error: any) {
    console.error('Attendance Reminder API Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
