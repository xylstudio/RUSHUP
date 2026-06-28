"use client";
import Link from 'next/link';
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { JobService, JobAssignment } from "@/lib/jobService";
import { 
  CalendarDaysIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  PlayIcon
} from "@heroicons/react/24/outline";
import { useSidebar } from '../_shared/sidebar-context'
import { useI18n } from "@/lib/I18nContext";

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

export default function StaffDashboard() {
    const { locale } = useI18n();
  const { sidebarLocked } = useSidebar();
  const { profile } = useAuth();
  
  // States
  const [jobs, setJobs] = useState<JobAssignment[]>([]);
  const [stats, setStats] = useState<TaskStats>({
    today: 0,
    pending: 0,
    inProgress: 0,
    completedThisWeek: 0,
    total: 0
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.id) {
      fetchJobs();
    }
  }, [profile]);

  // ดึงข้อมูลงานทั้งหมด
  const fetchJobs = async () => {
    if (!profile?.id) return;
    
    try {
      setLoading(true);
      setError("");
      
      const jobsData = await JobService.getStaffJobs(profile.id);
      setJobs(jobsData);
      
      // คำนวณสถิติ
      calculateStats(jobsData);
      
      // สร้างกิจกรรมล่าสุด
      generateRecentActivities(jobsData);
      
    } catch (err: any) {
      console.error('Error fetching jobs:', err);
      setError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูل');
    } finally {
      setLoading(false);
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
          description: `เสร็จสิ้นงาน #${job.id.slice(0, 8)}`,
          timestamp: job.completed_at,
          type: 'completed'
        });
      }
      
      if (job.started_at) {
        activities.push({
          id: job.id + '_started',
          description: `เริ่มงาน #${job.id.slice(0, 8)}`,
          timestamp: job.started_at,
          type: 'started'
        });
      }
      
      activities.push({
        id: job.id + '_assigned',
        description: `รับมอบหมายงาน #${job.id.slice(0, 8)}`,
        timestamp: job.created_at,
        type: 'assigned'
      });
    });

    // เรียงตามเวลาล่าสุด
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setRecentActivities(activities.slice(0, 5));
  };

  // ส่งแจ้งเตือน
  const sendNotification = (message: string, type: 'success' | 'info' | 'warning' = 'info') => {
    window.dispatchEvent(new CustomEvent('newNotification', {
      detail: { message, type, timestamp: new Date().toISOString() }
    }));
  };

  // อัปเดตสถานะงาน
  const handleUpdateStatus = async (jobId: string, newStatus: string) => {
    if (!profile?.id) return;
    
    try {
      setIsUpdating(jobId);
      
      console.log('🔄 Staff updating job status:', { jobId, newStatus, staffId: profile.id });
      
      await JobService.updateJobStatus(jobId, newStatus, profile.id);
      
      // รีเฟรชข้อมูล
      await fetchJobs();
      
      const statusMessages = {
        'in_progress': 'เริ่มงานเรียบร้อยแล้ว',
        'completed': 'งานเสร็จสิ้นแล้ว'
      };
      
      const successMessage = statusMessages[newStatus as keyof typeof statusMessages] || 'อัปเดตสถานะสำเร็จ';
      
      setMessage({
        type: 'success',
        text: successMessage
      });

      sendNotification(successMessage, 'success');
      
      // ลบข้อความหลัง 3 วินาที
      setTimeout(() => setMessage(null), 3000);
      
    } catch (error) {
      console.error('❌ Error updating job status:', error);
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด';
      setMessage({
        type: 'error',
        text: errorMessage
      });
      sendNotification(errorMessage, 'warning');
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setIsUpdating(null);
    }
  };

  // Helper functions
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'completed':
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case 'started':
        return <ClockIcon className="h-4 w-4 text-blue-500" />;
      case 'assigned':
        return <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />;
      default:
        return <CalendarDaysIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-200 rounded-full animate-spin border-t-green-600 mx-auto"></div>
          <div className="mt-4 text-gray-600 font-medium">{locale === 'en' ? 'Loading data...' : locale === 'zh' ? '正在加载数据...' : 'กำลังโหลดข้อมูล...'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`transition-all duration-300 ${sidebarLocked ? 'ml-64' : 'ml-0'} p-8 bg-gradient-to-br from-green-50 via-white to-blue-50 min-h-screen`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{locale === 'en' ? 'แดชบอร์ดพนักงาน' : locale === 'zh' ? 'แดชบอร์ดพนักงาน' : 'แดชบอร์ดพนักงาน'}</h1>
          <p className="text-gray-600 mt-1">{locale === 'en' ? 'ยินดีต้อนรับ, ' : locale === 'zh' ? 'ยินดีต้อนรับ, ' : 'ยินดีต้อนรับ, '}{profile?.display_name || 'พนักงาน'}</p>
        </div>
        <div className="flex gap-4">
          <Link
            href="/dashboard/staff/jobs"
            className="bg-xylem-dark text-white px-4 py-2 rounded-lg hover:bg-xylem-medium transition-colors shadow-md"
          >
            {locale === 'en' ? '             ดูงานทั้งหมด           ' : locale === 'zh' ? '             ดูงานทั้งหมด           ' : '             ดูงานทั้งหมด           '}</Link>
          <button
            onClick={fetchJobs}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors shadow-md"
          >
            {locale === 'en' ? 'Refresh' : locale === 'zh' ? '刷新' : '             รีเฟรช           '}</button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg transition-all duration-300 shadow-md ${
          message.type === 'success' 
            ? 'bg-green-100 text-green-700 border border-green-200' 
            : 'bg-red-100 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 shadow-md">
          <h3 className="text-red-800 font-medium">{locale === 'en' ? 'เกิดข้อผิดพลาด' : locale === 'zh' ? 'เกิดข้อผิดพลาด' : 'เกิดข้อผิดพลาด'}</h3>
          <p className="text-red-700 mt-1">{error}</p>
        </div>
      )}
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-2">{locale === 'en' ? 'งานวันนี้' : locale === 'zh' ? 'งานวันนี้' : 'งานวันนี้'}</h2>
              <p className="text-gray-600 text-sm">{locale === 'en' ? 'งานที่มอบหมายวันนี้' : locale === 'zh' ? 'งานที่มอบหมายวันนี้' : 'งานที่มอบหมายวันนี้'}</p>
            </div>
            <CalendarDaysIcon className="h-8 w-8 text-blue-500" />
          </div>
          <div className="mt-4 text-3xl font-bold text-blue-600">{stats.today}</div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-2">{locale === 'en' ? 'รอดำเนินการ' : locale === 'zh' ? 'รอดำเนินการ' : 'รอดำเนินการ'}</h2>
              <p className="text-gray-600 text-sm">{locale === 'en' ? 'งานที่ยังไม่เริ่ม' : locale === 'zh' ? 'งานที่ยังไม่เริ่ม' : 'งานที่ยังไม่เริ่ม'}</p>
            </div>
            <ExclamationTriangleIcon className="h-8 w-8 text-yellow-500" />
          </div>
          <div className="mt-4 text-3xl font-bold text-yellow-600">{stats.pending}</div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-2">{locale === 'en' ? 'in progress' : locale === 'zh' ? '进行中' : 'กำลังดำเนินการ'}</h2>
              <p className="text-gray-600 text-sm">{locale === 'en' ? 'งานที่กำลังทำ' : locale === 'zh' ? 'งานที่กำลังทำ' : 'งานที่กำลังทำ'}</p>
            </div>
            <ClockIcon className="h-8 w-8 text-orange-500" />
          </div>
          <div className="mt-4 text-3xl font-bold text-orange-600">{stats.inProgress}</div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-2">{locale === 'en' ? 'เสร็จสิ้น (สัปดาห์นี้)' : locale === 'zh' ? 'เสร็จสิ้น (สัปดาห์นี้)' : 'เสร็จสิ้น (สัปดาห์นี้)'}</h2>
              <p className="text-gray-600 text-sm">{locale === 'en' ? 'งานที่ทำสำเร็จ' : locale === 'zh' ? 'งานที่ทำสำเร็จ' : 'งานที่ทำสำเร็จ'}</p>
            </div>
            <CheckCircleIcon className="h-8 w-8 text-green-500" />
          </div>
          <div className="mt-4 text-3xl font-bold text-green-600">{stats.completedThisWeek}</div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Current Jobs */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <ClockIcon className="h-6 w-6 text-blue-500" />
                  {locale === 'en' ? '                   งานปัจจุบัน                 ' : locale === 'zh' ? '                   งานปัจจุบัน                 ' : '                   งานปัจจุบัน                 '}</h2>
                <span className="text-sm text-gray-500">
                  {jobs.length} {locale === 'en' ? ' งานทั้งหมด                 ' : locale === 'zh' ? ' งานทั้งหมด                 ' : ' งานทั้งหมด                 '}</span>
              </div>
            </div>
            <div className="p-6">
              {jobs.length > 0 ? (
                <div className="space-y-4">
                  {jobs.slice(0, 5).map((job) => {
                      const { locale } = useI18n();
                    const statusInfo = JobService.getStatusInfo(job.status);
                    const isUpdatingThis = isUpdating === job.id;
                    
                    return (
                      <div key={job.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold text-gray-800">{locale === 'en' ? 'งาน #' : locale === 'zh' ? 'งาน #' : 'งาน #'}{job.id.slice(0, 8)}</h3>
                            {job.order_id && (
                              <p className="text-sm text-gray-600">{locale === 'en' ? 'คำสั่งซื้อ: ' : locale === 'zh' ? 'คำสั่งซื้อ: ' : 'คำสั่งซื้อ: '}{job.order_id.slice(0, 8)}</p>
                            )}
                            {job.assigned_date && (
                              <p className="text-sm text-gray-600">
                                {locale === 'en' ? '                                 วันที่: ' : locale === 'zh' ? '                                 วันที่: ' : '                                 วันที่: '}{new Date(job.assigned_date).toLocaleDateString('th-TH')}
                              </p>
                            )}
                          </div>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${statusInfo.color}`}>
                            {statusInfo.text}
                          </span>
                        </div>

                        {job.notes && (
                          <div className="mb-3 p-3 bg-gray-50 rounded border-l-4 border-l-blue-500">
                            <p className="text-sm text-gray-700"><strong>{locale === 'en' ? 'note:' : locale === 'zh' ? '笔记：' : 'หมายเหตุ:'}</strong> {job.notes}</p>
                          </div>
                        )}

                        {statusInfo.nextAction && (
                          <div className="flex gap-2 mb-3">
                            <button
                              onClick={() => handleUpdateStatus(job.id, statusInfo.nextStatus!)}
                              disabled={isUpdatingThis}
                              className={`px-4 py-2 rounded-lg text-white font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                                statusInfo.nextStatus === 'in_progress' 
                                  ? 'bg-blue-500 hover:bg-blue-600' 
                                  : 'bg-green-500 hover:bg-green-600'
                              }`}
                            >
                              {isUpdatingThis ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-white rounded-full animate-spin border-t-transparent"></div>
                                  {locale === 'en' ? '                                   กำลังอัปเดต...                                 ' : locale === 'zh' ? '                                   กำลังอัปเดต...                                 ' : '                                   กำลังอัปเดต...                                 '}</>
                              ) : (
                                <>
                                  {statusInfo.nextStatus === 'in_progress' ? (
                                    <PlayIcon className="h-4 w-4" />
                                  ) : (
                                    <CheckCircleIcon className="h-4 w-4" />
                                  )}
                                  {statusInfo.nextAction}
                                </>
                              )}
                            </button>
                          </div>
                        )}

                        <div className="text-xs text-gray-500 border-t pt-3">
                          <div className="grid grid-cols-2 gap-2">
                            <p>{locale === 'en' ? 'สร้าง: ' : locale === 'zh' ? 'สร้าง: ' : 'สร้าง: '}{new Date(job.created_at).toLocaleString('th-TH')}</p>
                            <p>{locale === 'en' ? 'อัปเดต: ' : locale === 'zh' ? 'อัปเดต: ' : 'อัปเดต: '}{new Date(job.updated_at).toLocaleString('th-TH')}</p>
                            {job.started_at && <p>{locale === 'en' ? 'เริ่ม: ' : locale === 'zh' ? 'เริ่ม: ' : 'เริ่ม: '}{new Date(job.started_at).toLocaleString('th-TH')}</p>}
                            {job.completed_at && <p>{locale === 'en' ? 'เสร็จ: ' : locale === 'zh' ? 'เสร็จ: ' : 'เสร็จ: '}{new Date(job.completed_at).toLocaleString('th-TH')}</p>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <ClockIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">{locale === 'en' ? 'ไม่มีงานที่ได้รับมอบหมาย' : locale === 'zh' ? 'ไม่มีงานที่ได้รับมอบหมาย' : 'ไม่มีงานที่ได้รับมอบหมาย'}</p>
                  <p className="text-gray-400 text-sm mt-1">{locale === 'en' ? 'งานใหม่จะปรากฏที่นี่เมื่อได้รับมอบหมาย' : locale === 'zh' ? 'งานใหม่จะปรากฏที่นี่เมื่อได้รับมอบหมาย' : 'งานใหม่จะปรากฏที่นี่เมื่อได้รับมอบหมาย'}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <ChartBarIcon className="h-6 w-6 text-green-500" />
                {locale === 'en' ? '                 กิจกรรมล่าสุด               ' : locale === 'zh' ? '                 กิจกรรมล่าสุด               ' : '                 กิจกรรมล่าสุด               '}</h2>
            </div>
            <div className="p-6">
              {recentActivities.length > 0 ? (
                <div className="space-y-4">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex-shrink-0 mt-1">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">
                          {activity.description}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(activity.timestamp).toLocaleString('th-TH')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <ChartBarIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">{locale === 'en' ? 'ยังไม่มีกิจกรรม' : locale === 'zh' ? 'ยังไม่มีกิจกรรม' : 'ยังไม่มีกิจกรรม'}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
