"use client";
import Link from 'next/link';
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { JobService, JobAssignment } from "@/lib/jobService";
import { supabase } from '@/lib/supabaseClient';
import { createNotificationWithRetry } from '@/lib/supabaseClient';
import { useI18n } from '@/lib/I18nContext'
import { appCopy, pickLocalizedText } from '@/lib/appLocale'
import { isFollowUpOrder } from '@/lib/serviceFlow'
import { formatDateByLocale, formatDateTimeByLocale } from '@/lib/localeFormat'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CalendarDaysIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  PlayIcon,
  ShieldCheckIcon,
  BriefcaseIcon,
  MapPinIcon,
  PhoneIcon,
  UserIcon,
  XMarkIcon,
  ArrowPathIcon
} from "@heroicons/react/24/outline";
import { Loader2 } from 'lucide-react'
import { useSidebar } from '../_shared/sidebar-context'
import { AttendanceCheckIn } from '@/components/dashboard/AttendanceCheckIn'
import PointGenerator from '@/components/pos/PointGenerator'

interface TaskStats {
  today: number;
  pending: number;
  inProgress: number;
  completedThisWeek: number;
  total: number;
}

interface RecentActivity {
  id: string;
  description: string;
  timestamp: string;
  type: 'completed' | 'started' | 'assigned';
}

interface OpenOrder {
  id: string
  order_code?: string | null
  status: string
  scheduled_date?: string | null
  total?: number | null
  notes?: string | null
  special_instructions?: string | null
  services?: { service_name?: string | null } | null
  houses?: { 
    name?: string | null; 
    address?: string | null;
    house_code?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    zone_code?: string | null;
  } | null
  profiles?: {
    display_name?: string | null;
    phone?: string | null;
  } | null
}

export default function StaffDashboard() {
  const { sidebarLocked } = useSidebar();
  const { profile } = useAuth();
  const { locale } = useI18n()
  const copy = appCopy.staffDashboard
  
  // States
  const [jobs, setJobs] = useState<JobAssignment[]>([]);
  const [stats, setStats] = useState<TaskStats>({
    today: 0,
    pending: 0,
    inProgress: 0,
    completedThisWeek: 0,
    total: 0
  });
  const [cafeStats, setCafeStats] = useState({
    daysWorked: 0,
    lateMinutes: 0,
    otMinutes: 0,
    totalHours: 0
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [openOrders, setOpenOrders] = useState<OpenOrder[]>([])
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [claimingOrderId, setClaimingOrderId] = useState<string | null>(null)
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const [pendingConfirmation, setPendingConfirmation] = useState(false)

  useEffect(() => {
    const checkStatus = async () => {
      if (profile?.id && !profile.is_verified) {
        const { data } = await supabase
          .from('staff_identity')
          .select('id')
          .eq('profile_id', profile.id)
          .maybeSingle()
        setPendingConfirmation(!!data)
      }
    }
    checkStatus()
  }, [profile])
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<OpenOrder | null>(null)

  useEffect(() => {
    if (profile?.id) {
      console.log('--- Staff Dashboard State ---');
      console.log('Profile ID:', profile.id);
      console.log('Role:', profile.role);
      console.log('Staff Type:', profile.staff_type);
      
      const isActuallyCafe = profile.staff_type === 'cafe';
      if (isActuallyCafe) {
        fetchCafeStats();
      } else {
        refreshAll()
      }
    }
  }, [profile]);

  const fetchCafeStats = async () => {
    if (!profile?.id) return;
    try {
      setLoading(true);
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: logs } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('profile_id', profile.id)
        .gte('timestamp', startOfMonth.toISOString())
        .order('timestamp', { ascending: true });

      if (logs) {
        const { calculateAttendanceStats } = await import('@/lib/attendanceUtils');
        const stats = calculateAttendanceStats(
          logs, 
          profile.shift_start || "08:30", 
          profile.shift_end || "17:30"
        );

        const uniqueDays = new Set(logs.map(l => new Date(l.timestamp).toDateString()));

        setCafeStats({
          daysWorked: uniqueDays.size,
          lateMinutes: stats.lateMinutes,
          otMinutes: stats.otMinutes,
          totalHours: stats.totalHours
        });
      }
    } catch (err) {
      console.error('Error cafe stats:', err);
    } finally {
      setLoading(false);
    }
  }

  const fetchOpenOrders = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const response = await fetch(`/api/staff/open-orders?t=${Date.now()}`, {
        method: 'GET',
        headers: {
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        credentials: 'include',
      })

      const result = await response.json().catch(() => ({}))
      console.log('Open Orders API Result:', result);
      if (!response.ok) {
        throw new Error(result?.error || pickLocalizedText(locale, copy.loadOpenOrdersFailed))
      }

      setOpenOrders((result?.orders || []) as OpenOrder[])
    } catch (err) {
      console.error('Failed to fetch open orders:', err)
      setOpenOrders([])
    }
  }

  const refreshAll = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      await Promise.all([
        fetchJobs(),
        fetchOpenOrders()
      ]);
    } finally {
      setLoading(false);
    }
  }

  const handleClaimOrder = async (order: OpenOrder) => {
    setClaimingOrderId(order.id)
    setMessage(null)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const response = await fetch('/api/staff/open-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ orderId: order.id }),
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(result?.error || pickLocalizedText(locale, copy.claimFailed))
      }

      setMessage({ type: 'success', text: pickLocalizedText(locale, copy.claimSuccess) })
      await refreshAll()
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || pickLocalizedText(locale, copy.claimFailed) })
    } finally {
      setClaimingOrderId(null)
    }
  }

  // ดึงข้อมูลงานทั้งหมด
  const fetchJobs = async () => {
    if (!profile?.id) return;
    
    try {
      setLoading(false); // fetchJobs called by refreshAll which sets loading=true
      setError("");
      
      const jobsData = await JobService.getStaffJobs(profile.id);
      setJobs(jobsData);
      
      // คำนวณสถิติ
      calculateStats(jobsData);
      
      // สร้างกิจกรรมล่าสุด
      generateRecentActivities(jobsData);
      
    } catch (err: any) {
      console.error('Error fetching jobs:', err);
      setError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
    }
  };

  // คำนวณสถิติจากข้อมูลงาน
  const calculateStats = (jobsData: JobAssignment[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());

    let todayCount = 0;
    let pendingCount = 0;
    let inProgressCount = 0;
    let completedThisWeekCount = 0;

    jobsData.forEach(job => {
      // นับงานวันนี้
      if (job.assigned_date) {
        const assignedDate = new Date(job.assigned_date);
        if (assignedDate >= today) {
          todayCount++;
        }
      }

      // นับตามสถานะ
      if (job.status === 'assigned') pendingCount++;
      if (job.status === 'in_progress') inProgressCount++;
      
      // นับงานที่เสร็จสิ้นในสัปดาห์นี้
      if (job.status === 'completed' && job.completed_at) {
        const completedDate = new Date(job.completed_at);
        if (completedDate >= weekStart) {
          completedThisWeekCount++;
        }
      }
    });

    setStats({
      today: todayCount,
      pending: pendingCount,
      inProgress: inProgressCount,
      completedThisWeek: completedThisWeekCount,
      total: jobsData.length
    });
  };

  // สร้างกิจกรรมล่าสุด
  const generateRecentActivities = (jobsData: JobAssignment[]) => {
    const activities: RecentActivity[] = [];

    jobsData.forEach(job => {
      if (job.completed_at) {
        activities.push({
          id: job.id + '_completed',
          description: `${pickLocalizedText(locale, copy.activityCompleted)} #${job.id.slice(0, 8)}`,
          timestamp: job.completed_at,
          type: 'completed'
        });
      }
      
      if (job.started_at) {
        activities.push({
          id: job.id + '_started',
          description: `${pickLocalizedText(locale, copy.activityStarted)} #${job.id.slice(0, 8)}`,
          timestamp: job.started_at,
          type: 'started'
        });
      }
      
      activities.push({
        id: job.id + '_assigned',
        description: `${pickLocalizedText(locale, copy.activityAssigned)} #${job.id.slice(0, 8)}`,
        timestamp: job.created_at,
        type: 'assigned'
      });
    });

    // เรียงตามเวลาล่าสุด
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setRecentActivities(activities.slice(0, 5));
  };

  // ส่งแจ้งเตือน
  const sendNotification = async (message: string, type: 'success' | 'info' | 'warning' = 'info') => {
    if (!profile?.id) return;

    const { error } = await createNotificationWithRetry({
      user_id: profile.id,
      title: pickLocalizedText(locale, copy.notificationTitle),
      message,
      type,
      read: false,
    }, { context: 'staff.dashboard.self' });

    if (error) {
      console.error('❌ Failed to create staff notification:', error);
    }
  };

  // อัปเดตสถานะงาน
  const handleUpdateStatus = async (jobId: string, newStatus: string) => {
    if (!profile?.id) {
      console.error('❌ No profile ID available');
      return;
    }
    
    try {
      setIsUpdating(jobId);
      
      console.log('🔄 Staff updating job status:', { 
        jobId, 
        newStatus, 
        staffId: profile.id,
        currentJobs: jobs.length 
      });
      
      // อัปเดตสถานะ
      const updatedJob = await JobService.updateJobStatus(jobId, newStatus, profile.id);
      console.log('✅ Job updated returned:', updatedJob);
      
      // รีเฟรชข้อมูลทันที
      console.log('🔄 Refreshing jobs data...');
      await fetchJobs();
      
      const statusMessages = {
        'in_progress': pickLocalizedText(locale, copy.startSuccess),
        'completed': pickLocalizedText(locale, copy.completeSuccess)
      };
      
      const successMessage = statusMessages[newStatus as keyof typeof statusMessages] || 'อัปเดตสถานะสำเร็จ';
      
      setMessage({
        type: 'success',
        text: successMessage
      });

      await sendNotification(successMessage, 'success');
      
      // ลบข้อความหลัง 3 วินาที
      setTimeout(() => setMessage(null), 3000);
      
    } catch (error) {
      console.error('❌ Error updating job status:', error);
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด';
      console.error('❌ Full error details:', error);
      
      setMessage({
        type: 'error',
        text: errorMessage
      });
      await sendNotification(errorMessage, 'warning');
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setIsUpdating(null);
    }
  };

  // Helper functions
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'completed':
        return <CheckCircleIcon className="h-4 w-4 text-[#1A1A1A]" />;
      case 'started':
        return <ClockIcon className="h-4 w-4 text-[#1A1A1A]" />;
      case 'assigned':
        return <ExclamationTriangleIcon className="h-4 w-4 text-[#70706B]" />;
      default:
        return <CalendarDaysIcon className="h-4 w-4 text-[#70706B]" />;
    }
  };

  const isCafe = profile?.staff_type === 'cafe';
  const freshOpenOrders = openOrders.filter((order) => !isFollowUpOrder(order))
  const followUpOpenOrders = openOrders.filter((order) => isFollowUpOrder(order))

  const renderOpenOrderCard = (order: OpenOrder, variant: 'fresh' | 'follow-up') => {
      const { locale } = useI18n();
    const houseData = Array.isArray(order?.houses) ? order.houses[0] : order?.houses;
    const serviceData = Array.isArray(order?.services) ? order.services[0] : order?.services;
    const isFollowUpVariant = variant === 'follow-up'

    return (
      <div
        key={order.id}
        className={`p-8 relative overflow-hidden group hover:shadow-2xl transition-all duration-500 flex flex-col justify-between ${
          isFollowUpVariant ? 'border border-[#C9B37E] bg-[#FFFBEF]' : 'border border-[#111111] bg-white'
        }`}
      >
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-8 gap-3">
            <div className="min-w-0">
              {isFollowUpVariant && (
                <span className="text-[8px] font-black uppercase tracking-[0.28em] text-[#A68A49] block mb-2">FOLLOW-UP VISIT</span>
              )}
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[#A3A3A3] block mb-2">
                {order.order_code || `#${order.id.slice(0, 8)}`}
              </span>
              <h3 className="font-serif-thai text-2xl text-[#111111] uppercase tracking-tight leading-none truncate">
                {serviceData?.service_name || 'งานดูแลสวน'}
              </h3>
            </div>
            <div className="text-right shrink-0 ml-4">
              {isFollowUpVariant ? (
                <span className="border border-[#C9B37E] bg-white px-2 py-1 text-[8px] font-black uppercase tracking-[0.18em] text-[#7B5F22]">{locale === 'en' ? 'ต่อเนื่อง' : locale === 'zh' ? 'ต่อเนื่อง' : 'ต่อเนื่อง'}</span>
              ) : (
                <>
                  <span className="text-sm font-black text-[#111111]">{locale === 'en' ? '฿' : locale === 'zh' ? '฿' : '฿'}{order.total?.toLocaleString() || '0'}</span>
                  <p className="text-[7px] text-[#A3A3A3] uppercase tracking-widest mt-1 font-bold">{locale === 'en' ? 'รายได้' : locale === 'zh' ? 'รายได้' : 'รายได้'}</p>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="flex flex-col gap-2">
              <span className="text-[7px] font-black uppercase tracking-widest text-[#D4D4D4]">{locale === 'en' ? 'วันนัดหมาย' : locale === 'zh' ? 'วันนัดหมาย' : 'วันนัดหมาย'}</span>
              <div className="flex items-center gap-2">
                <CalendarDaysIcon className="w-4 h-4 text-[#111111]" />
                <span className="text-[9px] font-bold text-[#111111] uppercase tracking-widest">
                  {formatDateByLocale(order.scheduled_date, locale)}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-[7px] font-black uppercase tracking-widest text-[#D4D4D4]">{locale === 'en' ? 'location' : locale === 'zh' ? '地点' : 'สถานที่'}</span>
              <div className="flex items-center gap-2 min-w-0">
                <ShieldCheckIcon className="w-4 h-4 text-[#111111]" />
                <span className="text-[9px] font-bold text-[#111111] uppercase tracking-widest truncate">
                  {houseData?.name || 'ไม่ระบุ'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-3">
          <button
            onClick={() => handleClaimOrder(order)}
            disabled={claimingOrderId === order.id}
            className={`w-full text-white py-5 font-bold text-[10px] uppercase tracking-[0.3em] transition-all disabled:opacity-30 active:scale-[0.98] ${
              isFollowUpVariant ? 'bg-[#7B5F22] hover:bg-[#604818]' : 'bg-[#111111] hover:bg-black'
            }`}
          >
            {claimingOrderId === order.id ? 'กำลังดำเนินการ...' : isFollowUpVariant ? 'รับงานต่อเนื่อง' : 'กดรับงานทันที'}
          </button>
          <button
            onClick={() => setSelectedOrderForDetail(order)}
            className={`w-full py-4 font-bold text-[9px] uppercase tracking-[0.3em] transition-all ${
              isFollowUpVariant
                ? 'bg-white text-[#7B5F22] border border-[#C9B37E] hover:bg-[#FFFCF4]'
                : 'bg-white text-[#111111] border border-[#111111] hover:bg-[#FAFAFA]'
            }`}
          >
            {locale === 'en' ? '             ดูรายละเอียดงาน           ' : locale === 'zh' ? '             ดูรายละเอียดงาน           ' : '             ดูรายละเอียดงาน           '}</button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#E5E5DF] rounded-full animate-spin border-t-[#1A1A1A] mx-auto"></div>
          <div className="mt-4 text-[#70706B] font-medium">{pickLocalizedText(locale, copy.loading)}</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`transition-all duration-300 ${sidebarLocked ? "ml-64" : "ml-0"} bg-white min-h-screen pb-20`}>
      {/* Header Section */}
      <div className="border-b border-[#EFEFEF] pt-12 pb-16 px-8 mb-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-px bg-[#111111]" />
              <span className="text-[9px] font-bold uppercase tracking-[0.4em] text-[#A3A3A3]">{profile?.staff_type?.toUpperCase() || 'STAFF'} {locale === 'en' ? ' // สถานีงาน' : locale === 'zh' ? ' // สถานีงาน' : ' // สถานีงาน'}</span>
            </div>
            <div className="flex items-center gap-6">
              <h1 className="font-serif-thai text-4xl font-light text-[#111111] tracking-tight">
                {pickLocalizedText(locale, copy.title)}
              </h1>
              <button 
                onClick={refreshAll}
                className="w-10 h-10 flex items-center justify-center border border-[#111111] hover:bg-[#111111] hover:text-white transition-all group"
                title="Refresh All Data"
              >
                <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
              </button>
            </div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#A3A3A3] font-medium mt-2">
              {locale === 'en' ? '               ยินดีต้อนรับ ' : locale === 'zh' ? '               ยินดีต้อนรับ ' : '               ยินดีต้อนรับ '}{(profile?.display_name || 'พนักงาน').toUpperCase()} {locale === 'en' ? ' เข้าสู่ระบบ             ' : locale === 'zh' ? ' เข้าสู่ระบบ             ' : ' เข้าสู่ระบบ             '}</p>
          </div>

          <div className="flex gap-2">
            {!isCafe && (
              <>
                <Link href="/dashboard/staff/jobs" className="bg-[#111111] text-white px-8 py-4 font-bold text-[10px] uppercase tracking-widest hover:bg-[#1A3626] transition-all">
                  {pickLocalizedText(locale, copy.viewAllJobs)}
                </Link>
                <button onClick={refreshAll} className="border border-[#111111] text-[#111111] px-8 py-4 font-bold text-[10px] uppercase tracking-widest hover:bg-[#F9F9F9] transition-all">
                  {pickLocalizedText(locale, copy.refresh)}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 max-w-[1400px] mx-auto">
        {/* Verification Alert */}
        {!profile?.is_verified && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            className={`mb-6 border border-dashed p-4 flex items-center justify-between ${pendingConfirmation ? 'border-amber-400 bg-amber-50' : 'border-[#E54D2E] bg-[#FEF6F5]'}`}
          >
            <div className={`flex items-center gap-3 ${pendingConfirmation ? 'text-amber-600' : 'text-[#E54D2E]'}`}>
              {pendingConfirmation ? (
                <Loader2 className="w-5 h-5 shrink-0 animate-spin" />
              ) : (
                <ExclamationTriangleIcon className="w-5 h-5 shrink-0" />
              )}
              <span className="text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                {pendingConfirmation ? 'อยู่ระหว่างตรวจสอบ' : 'บัญชียังไม่ยืนยันตัวตน'}
              </span>
            </div>
            <Link 
              href="/dashboard/staff/profile?tab=verification" 
              className={`text-[10px] font-black underline uppercase tracking-widest shrink-0 ${pendingConfirmation ? 'text-amber-600' : 'text-[#E54D2E]'}`}
            >
              {pendingConfirmation ? 'ดูข้อมูล' : 'ยืนยัน'}
            </Link>
          </motion.div>
        )}

        {/* Message Banner */}
        {message && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 border border-[#111111] p-4 bg-[#111111] text-white text-[10px] font-bold uppercase tracking-[0.3em] text-center">
            {message.text}
          </motion.div>
        )}

        {/* Available Tasks Section (Garden Staff only) - NOW AT TOP */}
         {!isCafe && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-8 h-px bg-[#111111]" />
                <span className="text-[9px] font-black uppercase tracking-[0.4em] text-[#A3A3A3]">{locale === 'en' ? 'งานที่พร้อมรับ // OPEN QUEUE' : locale === 'zh' ? 'งานที่พร้อมรับ // OPEN QUEUE' : 'งานที่พร้อมรับ // OPEN QUEUE'}</span>
              </div>
              {openOrders.length > 0 && (
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 bg-[#E54D2E] rounded-full animate-ping" />
                   <span className="text-[10px] font-bold text-[#E54D2E] uppercase tracking-widest">
                     {freshOpenOrders.length} {locale === 'en' ? ' งานใหม่ / ' : locale === 'zh' ? ' งานใหม่ / ' : ' งานใหม่ / '}{followUpOpenOrders.length} {locale === 'en' ? ' งานต่อเนื่อง                    ' : locale === 'zh' ? ' งานต่อเนื่อง                    ' : ' งานต่อเนื่อง                    '}</span>
                </div>
              )}
            </div>

            {openOrders.length > 0 ? (
              <div className="space-y-10">
                <div>
                  <div className="flex items-center gap-3 mb-5">
                    <span className="text-[9px] font-black uppercase tracking-[0.35em] text-[#111111]">{locale === 'en' ? 'งานใหม่' : locale === 'zh' ? 'งานใหม่' : 'งานใหม่'}</span>
                    <div className="h-px flex-1 bg-[#EFEFEF]" />
                  </div>
                  {freshOpenOrders.length > 0 ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {freshOpenOrders.map((order) => renderOpenOrderCard(order, 'fresh'))}
                    </div>
                  ) : (
                    <div className="border border-dashed border-[#EFEFEF] p-10 text-center">
                      <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#A3A3A3]">{locale === 'en' ? 'ไม่มีงานใหม่ที่รอรับ' : locale === 'zh' ? 'ไม่มีงานใหม่ที่รอรับ' : 'ไม่มีงานใหม่ที่รอรับ'}</p>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-3 mb-5">
                    <span className="text-[9px] font-black uppercase tracking-[0.35em] text-[#7B5F22]">{locale === 'en' ? 'งานดูแลต่อเนื่อง' : locale === 'zh' ? 'งานดูแลต่อเนื่อง' : 'งานดูแลต่อเนื่อง'}</span>
                    <div className="h-px flex-1 bg-[#E9DFC5]" />
                  </div>
                  {followUpOpenOrders.length > 0 ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {followUpOpenOrders.map((order) => renderOpenOrderCard(order, 'follow-up'))}
                    </div>
                  ) : (
                    <div className="border border-dashed border-[#E9DFC5] p-10 text-center bg-[#FFFCF4]">
                      <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#B79A58]">{locale === 'en' ? 'ยังไม่มีงานดูแลต่อเนื่องในคิว' : locale === 'zh' ? 'ยังไม่มีงานดูแลต่อเนื่องในคิว' : 'ยังไม่มีงานดูแลต่อเนื่องในคิว'}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-[#EFEFEF] py-16 text-center">
                <BriefcaseIcon className="w-12 h-12 text-[#EFEFEF] mx-auto mb-4" />
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#A3A3A3]">{locale === 'en' ? 'ไม่มีงานที่รอดำเนินการในขณะนี้' : locale === 'zh' ? 'ไม่มีงานที่รอดำเนินการในขณะนี้' : 'ไม่มีงานที่รอดำเนินการในขณะนี้'}</p>
                <button onClick={refreshAll} className="mt-6 text-[9px] font-black uppercase tracking-widest text-[#111111] underline underline-offset-8 decoration-1 hover:text-[#A3A3A3] transition-colors">
                  {locale === 'en' ? '                   ตรวจสอบอีกครั้ง // REFRESH                 ' : locale === 'zh' ? '                   ตรวจสอบอีกครั้ง // REFRESH                 ' : '                   ตรวจสอบอีกครั้ง // REFRESH                 '}</button>
                {/* Admin Debug Only */}
                {profile?.role === 'admin' && (
                  <div className="mt-8 pt-8 border-t border-[#EFEFEF] max-w-xs mx-auto text-left">
                     <p className="text-[8px] font-black text-[#EFEFEF] uppercase mb-2">Admin Debug Data</p>
                     <pre className="text-[8px] text-[#A3A3A3] overflow-hidden truncate">
                       Role: {profile.role} | Branch: {profile.branch_code || 'null'} | Orders: {openOrders.length}
                     </pre>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* ===== STATS GRID LAYOUT ===== */}
        <div className="grid grid-cols-2 gap-3">

          {/* Card 1: ลงเวลางาน */}
          <motion.div
            layout
            onClick={() => setExpandedCard(expandedCard === 'attendance' ? null : 'attendance')}
            style={{ gridColumn: expandedCard === 'attendance' ? 'span 2' : 'span 1' }}
            className={`cursor-pointer border transition-colors ${expandedCard === 'attendance' ? 'border-[#111111]' : 'border-[#EFEFEF] bg-white hover:border-[#111111]'}`}
          >
            <div className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <ClockIcon className="w-5 h-5 text-[#111111]" />
                <span className="text-[9px] font-black uppercase tracking-widest text-[#A3A3A3]">{locale === 'en' ? 'ลงเวลางาน' : locale === 'zh' ? 'ลงเวลางาน' : 'ลงเวลางาน'}</span>
              </div>
              {expandedCard !== 'attendance' && (
                <p className="text-[10px] text-[#A3A3A3] mt-1">{locale === 'en' ? 'กดเพื่อลงเวลาเข้า-ออกงาน' : locale === 'zh' ? 'กดเพื่อลงเวลาเข้า-ออกงาน' : 'กดเพื่อลงเวลาเข้า-ออกงาน'}</p>
              )}
            </div>
            <AnimatePresence>
              {expandedCard === 'attendance' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <AttendanceCheckIn />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {!isCafe ? (
            <>
              {/* Card 2: สรุปงาน */}
              <motion.div
                layout
                onClick={() => setExpandedCard(expandedCard === 'summary' ? null : 'summary')}
                style={{ gridColumn: expandedCard === 'summary' ? 'span 2' : 'span 1' }}
                className={`cursor-pointer border transition-colors ${expandedCard === 'summary' ? 'border-[#111111] bg-[#111111] text-white' : 'border-[#EFEFEF] bg-white hover:border-[#111111]'}`}
              >
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <ChartBarIcon className={`w-5 h-5 ${expandedCard === 'summary' ? 'text-white' : 'text-[#111111]'}`} />
                    <span className={`text-[9px] font-black uppercase tracking-widest ${expandedCard === 'summary' ? 'text-white/50' : 'text-[#A3A3A3]'}`}>{locale === 'en' ? 'สรุปภาพรวม' : locale === 'zh' ? 'สรุปภาพรวม' : 'สรุปภาพรวม'}</span>
                  </div>
                  {expandedCard !== 'summary' && (
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl font-light text-[#111111]">{stats.today}</span>
                      <span className="text-[9px] text-[#A3A3A3]">{locale === 'en' ? 'งานวันนี้' : locale === 'zh' ? 'งานวันนี้' : 'งานวันนี้'}</span>
                    </div>
                  )}
                </div>
                <AnimatePresence>
                  {expandedCard === 'summary' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden px-4 pb-5"
                    >
                      <div className="grid grid-cols-2 gap-3 mt-2">
                        <div className="border border-white/20 p-4">
                          <span className="text-[8px] font-black uppercase tracking-widest text-white/40 block mb-2">{locale === 'en' ? 'วันนี้' : locale === 'zh' ? 'วันนี้' : 'วันนี้'}</span>
                          <div className="text-3xl font-light">{stats.today}</div>
                        </div>
                        <div className="border border-white/20 p-4">
                          <span className="text-[8px] font-black uppercase tracking-widest text-white/40 block mb-2">{locale === 'en' ? 'รอมอบหมาย' : locale === 'zh' ? 'รอมอบหมาย' : 'รอมอบหมาย'}</span>
                          <div className="text-3xl font-light">{stats.pending}</div>
                        </div>
                        <div className="border border-white/20 p-4">
                          <span className="text-[8px] font-black uppercase tracking-widest text-white/40 block mb-2">{locale === 'en' ? 'กำลังทำ' : locale === 'zh' ? 'กำลังทำ' : 'กำลังทำ'}</span>
                          <div className="text-3xl font-light">{stats.inProgress}</div>
                        </div>
                        <div className="border border-white/20 p-4">
                          <span className="text-[8px] font-black uppercase tracking-widest text-white/40 block mb-2">{locale === 'en' ? 'สำเร็จสัปดาห์นี้' : locale === 'zh' ? 'สำเร็จสัปดาห์นี้' : 'สำเร็จสัปดาห์นี้'}</span>
                          <div className="text-3xl font-light">{stats.completedThisWeek}</div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Card 3: คิวงาน */}
              <motion.div
                layout
                onClick={() => setExpandedCard(expandedCard === 'queue' ? null : 'queue')}
                style={{ gridColumn: expandedCard === 'queue' ? 'span 2' : 'span 1' }}
                className={`cursor-pointer border transition-colors ${expandedCard === 'queue' ? 'border-[#111111]' : 'border-[#EFEFEF] bg-white hover:border-[#111111]'}`}
              >
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <PlayIcon className="w-5 h-5 text-[#111111]" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#A3A3A3]">{locale === 'en' ? 'คิวงาน' : locale === 'zh' ? 'คิวงาน' : 'คิวงาน'}</span>
                  </div>
                  {expandedCard !== 'queue' && (
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl font-light text-[#111111]">{jobs.length}</span>
                      <span className="text-[9px] text-[#A3A3A3]">{locale === 'en' ? 'งานทั้งหมด' : locale === 'zh' ? 'งานทั้งหมด' : 'งานทั้งหมด'}</span>
                    </div>
                  )}
                </div>
                <AnimatePresence>
                  {expandedCard === 'queue' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="border-t border-[#EFEFEF]">
                        {jobs.length > 0 ? jobs.slice(0, 5).map((job) => {
                          const statusInfo = JobService.getStatusInfo(job.status);
                          return (
                            <div key={job.id} className="p-4 border-b border-[#EFEFEF] last:border-0">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="text-[9px] font-black text-[#111111] tracking-widest">#{job.id.slice(0, 8).toUpperCase()}</span>
                                <span className={`text-[7px] font-bold uppercase tracking-widest px-2 py-0.5 border ${statusInfo.color}`}>
                                  {statusInfo.text === 'Assigned' ? 'รอมอบหมาย' : statusInfo.text === 'In Progress' ? locale === 'en' ? 'In Progress' : locale === 'zh' ? '进行中' : 'กำลังดำเนินการ' : 'สำเร็จ'}
                                </span>
                              </div>
                              <p className="font-serif-thai text-sm font-light italic text-[#111111] mb-3">
                                {job.notes ? job.notes.split('\n')[0] : 'งานสวน'}
                              </p>
                              <div className="flex items-center gap-4 text-[9px] text-[#A3A3A3]">
                                <span>{formatDateByLocale(job.assigned_date, locale)}</span>
                                <span className="mx-2">.</span>
                                <span className="uppercase">{job.status === 'assigned' ? 'รอมอบหมาย' : locale === 'en' ? 'In Progress' : locale === 'zh' ? '进行中' : 'กำลังดำเนินการ'}</span>
                              </div>
                              {statusInfo.nextAction && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleUpdateStatus(job.id, statusInfo.nextStatus!); }}
                                  disabled={isUpdating === job.id}
                                  className="mt-3 w-full bg-[#111111] text-white py-3 font-bold text-[9px] uppercase tracking-[0.3em] hover:bg-[#1A3626] transition-all disabled:opacity-20"
                                >
                                  {isUpdating === job.id ? '...' : statusInfo.nextAction === 'Start' ? 'เริ่มงาน' : locale === 'en' ? 'Completed' : locale === 'zh' ? '已完成' : 'เสร็จสิ้น'}
                                </button>
                              )}
                            </div>
                          )
                        }) : (
                          <div className="p-8 text-center">
                            <p className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-[0.4em] italic">{locale === 'en' ? 'ไม่มีคิวงาน' : locale === 'zh' ? 'ไม่มีคิวงาน' : 'ไม่มีคิวงาน'}</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Card 4: ดูงานทั้งหมด */}
              <Link href="/dashboard/staff/jobs" className="border border-[#111111] bg-[#111111] p-4 flex flex-col justify-between hover:bg-[#1A3626] transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <ShieldCheckIcon className="w-5 h-5 text-white" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/50">{locale === 'en' ? 'ดูงานทั้งหมด' : locale === 'zh' ? 'ดูงานทั้งหมด' : 'ดูงานทั้งหมด'}</span>
                </div>
                <p className="text-[10px] text-white/60 mt-1">{locale === 'en' ? 'เปิดหน้ารายการงานเต็ม' : locale === 'zh' ? 'เปิดหน้ารายการงานเต็ม' : 'เปิดหน้ารายการงานเต็ม'}</p>
              </Link>
            </>
          ) : (
            <>
              {/* Cafe Card 2: ข้อมูลเชิงลึก */}
              <motion.div
                layout
                onClick={() => setExpandedCard(expandedCard === 'insight' ? null : 'insight')}
                style={{ gridColumn: expandedCard === 'insight' ? 'span 2' : 'span 1' }}
                className={`cursor-pointer border transition-colors ${expandedCard === 'insight' ? 'border-[#111111] bg-[#111111] text-white' : 'border-[#EFEFEF] bg-white hover:border-[#111111]'}`}
              >
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <ChartBarIcon className={`w-5 h-5 ${expandedCard === 'insight' ? 'text-white' : 'text-[#111111]'}`} />
                    <span className={`text-[9px] font-black uppercase tracking-widest ${expandedCard === 'insight' ? 'text-white/50' : 'text-[#A3A3A3]'}`}>{locale === 'en' ? 'ข้อมูลเชิงลึก' : locale === 'zh' ? 'ข้อมูลเชิงลึก' : 'ข้อมูลเชิงลึก'}</span>
                  </div>
                  {expandedCard !== 'insight' && (
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl font-light text-[#111111]">{(cafeStats.daysWorked / 24 * 100).toFixed(0)}%</span>
                      <span className="text-[9px] text-[#A3A3A3]">{locale === 'en' ? 'ความสม่ำเสมอ' : locale === 'zh' ? 'ความสม่ำเสมอ' : 'ความสม่ำเสมอ'}</span>
                    </div>
                  )}
                </div>
                <AnimatePresence>
                  {expandedCard === 'insight' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden px-4 pb-5"
                    >
                      <div className="space-y-6 mt-2">
                        <div className="flex justify-between items-end border-b border-white/10 pb-3">
                          <span className="text-[9px] font-bold text-white/60 uppercase tracking-widest">{locale === 'en' ? 'ความสม่ำเสมอ' : locale === 'zh' ? 'ความสม่ำเสมอ' : 'ความสม่ำเสมอ'}</span>
                          <span className="text-2xl font-light">{(cafeStats.daysWorked / 24 * 100).toFixed(0)}%</span>
                        </div>
                        <div className="flex justify-between items-end border-b border-white/10 pb-3">
                          <span className="text-[9px] font-bold text-white/60 uppercase tracking-widest">{locale === 'en' ? 'ความตรงต่อเวลา' : locale === 'zh' ? 'ความตรงต่อเวลา' : 'ความตรงต่อเวลา'}</span>
                          <span className="text-2xl font-light">{Math.max(0, 100 - (cafeStats.lateMinutes / 10)).toFixed(0)}%</span>
                        </div>
                        <div className="flex justify-between items-end border-b border-white/10 pb-3">
                          <span className="text-[9px] font-bold text-white/60 uppercase tracking-widest">{locale === 'en' ? 'แต้มบริการ' : locale === 'zh' ? 'แต้มบริการ' : 'แต้มบริการ'}</span>
                          <span className="text-2xl font-light">{profile?.loyalty_points || 0}</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Cafe Card 3: สถิติการทำงาน */}
              <motion.div
                layout
                onClick={() => setExpandedCard(expandedCard === 'cafestats' ? null : 'cafestats')}
                style={{ gridColumn: expandedCard === 'cafestats' ? 'span 2' : 'span 1' }}
                className={`cursor-pointer border transition-colors ${expandedCard === 'cafestats' ? 'border-[#111111]' : 'border-[#EFEFEF] bg-white hover:border-[#111111]'}`}
              >
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <CalendarDaysIcon className="w-5 h-5 text-[#111111]" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#A3A3A3]">{locale === 'en' ? 'สถิติการทำงาน' : locale === 'zh' ? 'สถิติการทำงาน' : 'สถิติการทำงาน'}</span>
                  </div>
                  {expandedCard !== 'cafestats' && (
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl font-light text-[#111111]">{cafeStats.daysWorked}</span>
                      <span className="text-[9px] text-[#A3A3A3]">{locale === 'en' ? 'วัน เดือนนี้' : locale === 'zh' ? 'วัน เดือนนี้' : 'วัน เดือนนี้'}</span>
                    </div>
                  )}
                </div>
                <AnimatePresence>
                  {expandedCard === 'cafestats' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden px-4 pb-5"
                    >
                      <div className="space-y-5 mt-2">
                        <div className="border border-[#EFEFEF] p-4">
                          <span className="text-[8px] font-black text-[#A3A3A3] uppercase tracking-widest block mb-2">{locale === 'en' ? 'มาทำงานรวม' : locale === 'zh' ? 'มาทำงานรวม' : 'มาทำงานรวม'}</span>
                          <div className="text-3xl font-light text-[#111111]">{cafeStats.daysWorked} <span className="text-sm text-[#A3A3A3]">{locale === 'en' ? 'day' : locale === 'zh' ? '天' : 'วัน'}</span></div>
                        </div>
                        <div className="border border-[#EFEFEF] p-4">
                          <span className="text-[8px] font-black text-[#A3A3A3] uppercase tracking-widest block mb-2">{locale === 'en' ? 'ชั่วโมงสะสม' : locale === 'zh' ? 'ชั่วโมงสะสม' : 'ชั่วโมงสะสม'}</span>
                          <div className="text-3xl font-light text-[#111111]">{cafeStats.totalHours} <span className="text-sm text-[#A3A3A3]">{locale === 'en' ? 'ชม.' : locale === 'zh' ? 'ชม.' : 'ชม.'}</span></div>
                        </div>
                        <div className="border border-[#EFEFEF] p-4">
                          <span className="text-[8px] font-black text-[#A3A3A3] uppercase tracking-widest block mb-2">{locale === 'en' ? 'สายสะสม' : locale === 'zh' ? 'สายสะสม' : 'สายสะสม'}</span>
                          <div className={`text-3xl font-light ${cafeStats.lateMinutes > 0 ? 'text-[#E54D2E]' : 'text-[#111111]'}`}>{cafeStats.lateMinutes} <span className="text-sm text-[#A3A3A3]">{locale === 'en' ? 'minute' : locale === 'zh' ? '分钟' : 'นาที'}</span></div>
                        </div>
                        <div className="border border-[#EFEFEF] p-4">
                          <span className="text-[8px] font-black text-[#A3A3A3] uppercase tracking-widest block mb-2">{locale === 'en' ? 'ล่วงเวลา' : locale === 'zh' ? 'ล่วงเวลา' : 'ล่วงเวลา'}</span>
                          <div className="text-3xl font-light text-[#111111]">{cafeStats.otMinutes} <span className="text-sm text-[#A3A3A3]">{locale === 'en' ? 'minute' : locale === 'zh' ? '分钟' : 'นาที'}</span></div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Cafe Card 4: POS */}
              <Link href="/dashboard/pos" className="border border-[#111111] bg-[#111111] p-4 flex flex-col justify-between hover:bg-[#1A3626] transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <ShieldCheckIcon className="w-5 h-5 text-white" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/50">{locale === 'en' ? 'เปิดหน้า POS' : locale === 'zh' ? 'เปิดหน้า POS' : 'เปิดหน้า POS'}</span>
                </div>
                <p className="text-[10px] text-white/60 mt-1">{locale === 'en' ? 'เครื่องขายหน้าร้าน' : locale === 'zh' ? 'เครื่องขายหน้าร้าน' : 'เครื่องขายหน้าร้าน'}</p>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Task Intelligence Overlay */}
      <AnimatePresence>
        {selectedOrderForDetail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-white flex flex-col pt-12"
          >
            <div className="px-8 pb-12 overflow-y-auto no-scrollbar">
              <div className="flex items-center justify-between mb-12">
                 <button onClick={() => setSelectedOrderForDetail(null)} className="w-12 h-12 flex items-center justify-center border border-[#111111] hover:bg-[#FAFAFA] transition-colors">
                    <XMarkIcon className="w-6 h-6" />
                 </button>
                 <span className="text-[9px] font-black uppercase tracking-[0.4em] text-[#A3A3A3]">{locale === 'en' ? 'ข้อมูลนัดหมายโดยละเอียด' : locale === 'zh' ? 'ข้อมูลนัดหมายโดยละเอียด' : 'ข้อมูลนัดหมายโดยละเอียด'}</span>
              </div>

              <div className="space-y-16">
                 {/* Header Info */}
                 <section>
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#A3A3A3] block mb-4">{selectedOrderForDetail.order_code || 'XLM-ORDER'}</span>
                    <div className="flex items-center gap-3 flex-wrap">
                     <h2 className="font-serif-thai text-5xl font-light text-[#111111] tracking-tighter uppercase leading-none">
                       {selectedOrderForDetail.services?.service_name}
                     </h2>
                     {isFollowUpOrder(selectedOrderForDetail) && (
                      <span className="border border-[#C9B37E] bg-[#FFF7E4] px-3 py-2 text-[8px] font-black uppercase tracking-[0.2em] text-[#7B5F22]">
                        Follow-up
                      </span>
                     )}
                    </div>
                 </section>

                 <div className="grid md:grid-cols-2 gap-16">
                    {/* Customer & Location */}
                    <section className="space-y-10">
                       <div className="flex items-start gap-6">
                          <div className="w-12 h-12 flex items-center justify-center border border-[#EFEFEF] bg-[#FAFAFA] shrink-0">
                             <UserIcon className="w-5 h-5" />
                          </div>
                          <div>
                             <span className="text-[8px] font-black uppercase tracking-widest text-[#A3A3A3] block mb-2">{locale === 'en' ? 'ข้อมูลลูกค้า' : locale === 'zh' ? 'ข้อมูลลูกค้า' : 'ข้อมูลลูกค้า'}</span>
                             <div className="text-xl font-serif-thai text-[#111111]">{selectedOrderForDetail.profiles?.display_name || 'ลูกค้าทั่วไป'}</div>
                             <div className="flex items-center gap-2 mt-3 cursor-pointer group">
                                <PhoneIcon className="w-3 h-3 text-[#A3A3A3]" />
                                <span className="text-[10px] font-bold text-[#A3A3A3] group-hover:text-[#111111] transition-colors">{selectedOrderForDetail.profiles?.phone || 'ไม่ระบุ'}</span>
                             </div>
                          </div>
                       </div>

                       <div className="flex items-start gap-6">
                          <div className="w-12 h-12 flex items-center justify-center border border-[#EFEFEF] bg-[#FAFAFA] shrink-0">
                             <MapPinIcon className="w-5 h-5" />
                          </div>
                          <div>
                             <span className="text-[8px] font-black uppercase tracking-widest text-[#A3A3A3] block mb-2">{locale === 'en' ? 'สถานที่จัดส่งบริการ' : locale === 'zh' ? 'สถานที่จัดส่งบริการ' : 'สถานที่จัดส่งบริการ'}</span>
                             <div className="text-xl font-serif-thai text-[#111111] mb-2">{selectedOrderForDetail.houses?.name}</div>
                             <p className="text-[11px] leading-relaxed text-[#717171] uppercase font-bold tracking-tight mb-6">
                                {selectedOrderForDetail.houses?.address}
                             </p>
                             
                             {selectedOrderForDetail.houses && (
                               <a 
                                 href={selectedOrderForDetail.houses.latitude && selectedOrderForDetail.houses.longitude 
                                   ? `https://www.google.com/maps/dir/?api=1&destination=${selectedOrderForDetail.houses.latitude},${selectedOrderForDetail.houses.longitude}`
                                   : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedOrderForDetail.houses.address || selectedOrderForDetail.houses.name || '')}`
                                 }
                                 target="_blank"
                                 rel="noopener noreferrer"
                                 className="inline-flex items-center gap-3 bg-[#111111] text-white px-6 py-4 text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-black transition-all"
                               >
                                  <MapPinIcon className="w-4 h-4" /> 
                                  {selectedOrderForDetail.houses.latitude ? 'นำทางด้วย GPS' : 'เปิดแผนที่ด้วยที่อยู่'}
                               </a>
                             )}
                          </div>
                       </div>
                    </section>

                    {/* Meta & Instructions */}
                    <section className="space-y-10">
                       <div className="grid grid-cols-2 gap-px bg-[#EFEFEF] border border-[#EFEFEF]">
                          <div className="bg-white p-6">
                             <span className="text-[8px] font-black uppercase tracking-widest text-[#A3A3A3] block mb-2">Site Code</span>
                             <div className="text-sm font-bold text-[#111111]">{selectedOrderForDetail.houses?.house_code || 'XLM-BASE'}</div>
                          </div>
                          <div className="bg-white p-6">
                             <span className="text-[8px] font-black uppercase tracking-widest text-[#A3A3A3] block mb-2">Zone</span>
                             <div className="text-sm font-bold text-[#111111]">{selectedOrderForDetail.houses?.zone_code || 'DEFAULT'}</div>
                          </div>
                       </div>

                       <div className="p-8 bg-[#FAFAFA] border border-[#EFEFEF]">
                          <span className="text-[8px] font-black uppercase tracking-widest text-[#111111] block mb-4">{locale === 'en' ? 'ข้อมูลเพิ่มเติมจากลูกค้า (สิทธิ์การเข้าพื้นที่)' : locale === 'zh' ? 'ข้อมูลเพิ่มเติมจากลูกค้า (สิทธิ์การเข้าพื้นที่)' : 'ข้อมูลเพิ่มเติมจากลูกค้า (สิทธิ์การเข้าพื้นที่)'}</span>
                          <p className="font-serif-thai italic text-lg text-[#717171] leading-relaxed">
                             {selectedOrderForDetail.notes || 'ลูกค้าไม่ได้ระบุข้อมูลเพิ่มเติม'}
                          </p>
                       </div>
                    </section>
                 </div>

                 {/* Action */}
                 <section className="pt-12 border-t border-[#EFEFEF]">
                    <button
                      onClick={() => { handleClaimOrder(selectedOrderForDetail); setSelectedOrderForDetail(null); }}
                      className="w-full bg-[#111111] text-white py-6 font-bold text-xs uppercase tracking-[0.5em] hover:scale-[1.01] active:scale-100 transition-all shadow-xl shadow-black/5"
                    >
                      {locale === 'en' ? '                       ยืนยันและรับงานทันที                     ' : locale === 'zh' ? '                       ยืนยันและรับงานทันที                     ' : '                       ยืนยันและรับงานทันที                     '}</button>
                    <p className="text-center text-[9px] text-[#A3A3A3] mt-6 font-bold uppercase tracking-widest">{locale === 'en' ? 'การกดรับงานหมายความว่าคุณพร้อมเข้าดำเนินการตามเวลานัดหมาย' : locale === 'zh' ? 'การกดรับงานหมายความว่าคุณพร้อมเข้าดำเนินการตามเวลานัดหมาย' : 'การกดรับงานหมายความว่าคุณพร้อมเข้าดำเนินการตามเวลานัดหมาย'}</p>
                 </section>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </>
  );
}
