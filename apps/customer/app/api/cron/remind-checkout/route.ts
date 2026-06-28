import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { resolveLineUserIdBySupabaseUserId, sendLinePushToLineUserId } from '@/lib/server/lineMessaging';
import { format, addMinutes, startOfDay, endOfDay } from 'date-fns';

// Prevent Next.js from caching this API route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    // 1. Initialize Supabase client with Service Role to bypass RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify cron secret if provided by Vercel
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // In development, we might not have CRON_SECRET, so we allow it if NEXT_PUBLIC_SITE_URL is localhost
      // For production, this protects the endpoint
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const todayStart = startOfDay(new Date()).toISOString();
    const todayEnd = endOfDay(new Date()).toISOString();

    // 2. Find all 'check_in' logs for today where reminded_checkout is false or null
    const { data: checkInLogs, error: logsError } = await supabase
      .from('attendance_logs')
      .select('id, profile_id, timestamp, reminded_checkout')
      .eq('type', 'check_in')
      .gte('timestamp', todayStart)
      .lte('timestamp', todayEnd)
      .filter('reminded_checkout', 'in', '(false,null)');

    if (logsError) throw logsError;

    if (!checkInLogs || checkInLogs.length === 0) {
      return NextResponse.json({ success: true, message: 'No pending check-ins found' });
    }

    // 3. For each check-in, check if they have already checked out today
    const profileIds = [...new Set(checkInLogs.map(l => l.profile_id))];
    const { data: checkOutLogs, error: checkOutError } = await supabase
      .from('attendance_logs')
      .select('profile_id')
      .eq('type', 'check_out')
      .gte('timestamp', todayStart)
      .lte('timestamp', todayEnd)
      .in('profile_id', profileIds);

    if (checkOutError) throw checkOutError;

    const checkedOutProfileIds = new Set(checkOutLogs?.map(l => l.profile_id) || []);

    // Profiles that are still working (no check_out today)
    const workingLogs = checkInLogs.filter(log => !checkedOutProfileIds.has(log.profile_id));

    if (workingLogs.length === 0) {
      return NextResponse.json({ success: true, message: 'All checked-in users have already checked out' });
    }

    // 4. Fetch profiles to get their shift_end
    const workingProfileIds = workingLogs.map(l => l.profile_id);
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, shift_end, display_name')
      .in('id', workingProfileIds);

    if (profilesError) throw profilesError;

    const currentTime = new Date();
    // In Thailand time (UTC+7). Vercel cron runs in UTC, so we must be careful with timezones.
    // The easiest way is to parse shift_end (e.g., "17:30") and compare it to the current time in Bangkok.
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Bangkok',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    // Create a Date object representing the current time in BKK for easy comparison
    // e.g., if it's 17:15 in BKK, this string is "17:15"
    const currentBkkTimeStr = formatter.format(currentTime);
    const [currentHr, currentMin] = currentBkkTimeStr.split(':').map(Number);
    const currentMinsTotal = currentHr * 60 + currentMin;

    const logsToUpdate: string[] = [];
    const notificationsSent: string[] = [];

    // 5. Check if it's within 15 minutes of shift_end
    for (const log of workingLogs) {
      const profile = profiles?.find(p => p.id === log.profile_id);
      if (!profile || !profile.shift_end) continue;

      const [shiftHr, shiftMin] = profile.shift_end.split(':').map(Number);
      const shiftMinsTotal = shiftHr * 60 + shiftMin;

      // Difference in minutes (shift_end - current_time)
      const diffMins = shiftMinsTotal - currentMinsTotal;

      // If shift ends within the next 15 minutes (diffMins between 0 and 15)
      // or if they are already late to check out (diffMins < 0) and we haven't reminded them
      if (diffMins <= 15) {
        // Send LINE reminder
        const lineUserId = await resolveLineUserIdBySupabaseUserId(supabase, profile.id);
        
        if (lineUserId) {
          const message = `ใกล้ถึงเวลาเลิกงานของคุณแล้ว (${profile.shift_end}) อย่าลืมกดลงเวลาเลิกงานในระบบนะครับ 🕒`;
          const pushResult = await sendLinePushToLineUserId(lineUserId, message, null, supabase);
          
          if (pushResult.delivered) {
            notificationsSent.push(profile.display_name || profile.id);
            logsToUpdate.push(log.id);
          } else {
            console.error(`Failed to send LINE reminder to ${profile.id}:`, pushResult.error);
            // Even if it failed, we might want to flag as reminded to prevent infinite loop?
            // Actually, let's only mark if successful, so it retries on next cron.
          }
        } else {
          // No LINE ID, mark as reminded so we don't keep trying
          logsToUpdate.push(log.id);
        }
      }
    }

    // 6. Update logs as reminded
    if (logsToUpdate.length > 0) {
      // Supabase update for multiple IDs
      const { error: updateError } = await supabase
        .from('attendance_logs')
        .update({ reminded_checkout: true })
        .in('id', logsToUpdate);

      if (updateError) throw updateError;
    }

    return NextResponse.json({ 
      success: true, 
      processed: logsToUpdate.length,
      notifiedUsers: notificationsSent
    });

  } catch (error: any) {
    console.error('Checkout Reminder Cron Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
