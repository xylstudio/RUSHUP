'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import StatCard from '../../../components/StatCard';
import { UsersIcon, BriefcaseIcon, Cog6ToothIcon, CurrencyDollarIcon, CheckCircleIcon, CalendarIcon, BellIcon, ArrowRightIcon, BuildingStorefrontIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { supabase } from '../../../lib/supabaseClient';
import { useI18n } from '@/lib/I18nContext';
import { appCopy, pickLocalizedText } from '@/lib/appLocale';
import { formatCurrencyByLocale } from '@/lib/localeFormat';

export default function AdminDashboard() {
  const { locale } = useI18n();
  const [revenue, setRevenue] = useState<number|null>(null);
  const [activeJobs, setActiveJobs] = useState<number|null>(null);
  const [customers, setCustomers] = useState<number|null>(null);
  const [staff, setStaff] = useState<number|null>(null);
  const [services, setServices] = useState<number|null>(null);
  const [completedJobs, setCompletedJobs] = useState<number|null>(null);
  const [notificationFailuresTotal, setNotificationFailuresTotal] = useState<number|null>(null);
  const [notificationFailures24h, setNotificationFailures24h] = useState<number|null>(null);
  const [upcomingJobsList, setUpcomingJobsList] = useState<any[]>([]);
  const [pendingMerchants, setPendingMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const [sendingReminders, setSendingReminders] = useState(false);

  async function fetchPendingMerchants() {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'merchant')
      .eq('is_verified', false);
    if (!error) {
      setPendingMerchants(data || []);
    }
  }

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      setError(null);
      if (!supabase) {
        setError(pickLocalizedText(locale, appCopy.adminDashboard.dbUnavailable));
        setLoading(false);
        return;
      }
      try {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0,0,0,0);

        const fetchRevenue = async () => {
          const candidateColumns = ['total', 'total_price', 'calculated_price', 'base_price'];
          for (const columnName of candidateColumns) {
            const { data, error } = await supabase
              .from('orders')
              .select(`${columnName}`)
              .gte('created_at', startOfMonth.toISOString());
            if (!error) {
              return data?.reduce((sum: number, row: any) => sum + (Number(row?.[columnName]) || 0), 0) || 0;
            }
          }
          return 0;
        };

        const results = await Promise.allSettled([
          fetchRevenue(),
          supabase.from('job_assignments').select('*', { count: 'exact', head: true }).in('status', ['assigned', 'accepted', 'in_progress']),
          supabase.from('job_assignments').select('*', { count: 'exact', head: true }).eq('status', 'completed').gte('completed_at', startOfMonth.toISOString()),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'staff'),
          supabase.from('services').select('*', { count: 'exact', head: true }),
          (async () => {
            const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const [all, recent] = await Promise.all([
              supabase.from('audit_logs').select('*', { count: 'exact', head: true }).eq('action', 'notification_delivery_failed'),
              supabase.from('audit_logs').select('*', { count: 'exact', head: true }).eq('action', 'notification_delivery_failed').gte('created_at', since24h)
            ]);
            return { total: all.count || 0, recent24h: recent.count || 0 };
          })(),
          (async () => {
            const now = new Date().toISOString().split('T')[0];
            const { data } = await supabase
              .from('orders')
              .select('*, profiles!orders_customer_id_fkey(display_name, line_user_id), services(service_name), houses(name)')
              .gte('scheduled_date', now)
              .in('status', ['pending', 'confirmed'])
              .order('scheduled_date', { ascending: true })
              .limit(5);
            return data || [];
          })()
        ]);

        if (results[0].status === 'fulfilled') setRevenue(results[0].value as number);
        if (results[1].status === 'fulfilled') setActiveJobs((results[1] as any).value.count);
        if (results[2].status === 'fulfilled') setCompletedJobs((results[2] as any).value.count);
        if (results[3].status === 'fulfilled') setCustomers((results[3] as any).value.count);
        if (results[4].status === 'fulfilled') setStaff((results[4] as any).value.count);
        if (results[5].status === 'fulfilled') setServices((results[5] as any).value.count);
        if (results[6].status === 'fulfilled') {
          setNotificationFailuresTotal((results[6] as any).value.total);
          setNotificationFailures24h((results[6] as any).value.recent24h);
        }
        if (results[7].status === 'fulfilled') setUpcomingJobsList(results[7].value as any[]);

        await fetchPendingMerchants();

      } catch (err: any) {
        setError(err.message || pickLocalizedText(locale, appCopy.adminDashboard.loadError));
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [locale]);

  const handleSendReminders = async () => {
    if (!confirm(pickLocalizedText(locale, { th: 'คุณต้องการส่งการแจ้งเตือนงานพรุ่งนี้ให้ลูกค้าทุกคนใช่หรือไม่?', en: 'Are you sure you want to send reminders for tomorrow\'s jobs to all customers?' }))) return;
    setSendingReminders(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/admin/notifications/reminders', { 
        method: 'POST',
        headers: {
          'Authorization': session?.access_token ? `Bearer ${session.access_token}` : ''
        }
      });
      const result = await response.json();
      if (result.success) {
        alert(pickLocalizedText(locale, { th: `ส่งการแจ้งเตือนสำเร็จ! พบงานพรุ่งนี้ ${result.count} รายการ`, en: `Reminders sent successfully! Found ${result.count} jobs for tomorrow.` }));
      } else throw new Error(result.error || 'Failed');
    } catch (err: any) { alert('Error: ' + err.message); } finally { setSendingReminders(false); }
  };

  const handleApproveMerchant = async (id: string) => {
    if (!confirm('ยืนยันที่จะอนุมัติร้านค้านี้เข้าร่วมระบบใช่หรือไม่?')) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_verified: true })
        .eq('id', id);

      if (error) throw error;
      alert('อนุมัติร้านค้าเรียบร้อยแล้ว!');
      fetchPendingMerchants();
    } catch (err: any) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 md:px-8">
      {/* Header Section */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-stone-900 mb-2">{pickLocalizedText(locale, appCopy.adminDashboard.title)}</h1>
          <p className="text-stone-500 text-lg font-medium">{pickLocalizedText(locale, appCopy.adminDashboard.subtitle)}</p>
        </div>
        <div className="flex items-center gap-3">
            <span className="inline-flex h-3 w-3 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-sm font-bold text-stone-600 uppercase tracking-widest">System Online</span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 border border-red-200 rounded-2xl p-4 mb-8 font-medium">
          {error}
        </div>
      )}

      {/* KPI Stats */}
      <div className="flex overflow-x-auto scrollbar-hide gap-6 mb-10 flex-nowrap pb-4 -mx-4 px-4 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 md:gap-6 md:overflow-visible md:flex-none md:px-0 md:mx-0">
        <div className="animate-slide-in-up stagger-1 min-w-[240px] md:min-w-0">
          <StatCard icon={<CurrencyDollarIcon className="w-7 h-7" />} value={loading ? '...' : formatCurrencyByLocale(revenue ?? 0, locale)} label={pickLocalizedText(locale, appCopy.adminDashboard.revenueMonth)} subtext={pickLocalizedText(locale, appCopy.adminDashboard.lastUpdated)} loading={loading} />
        </div>
        <div className="animate-slide-in-up stagger-2 min-w-[240px] md:min-w-0">
          <StatCard icon={<BriefcaseIcon className="w-7 h-7" />} value={loading ? '...' : activeJobs ?? 0} label={pickLocalizedText(locale, appCopy.adminDashboard.activeJobs)} subtext={pickLocalizedText(locale, appCopy.adminDashboard.unfinishedJobs)} loading={loading} />
        </div>
        <div className="animate-slide-in-up stagger-3 min-w-[240px] md:min-w-0">
          <StatCard icon={<CheckCircleIcon className="w-7 h-7" />} value={loading ? '...' : completedJobs ?? 0} label={pickLocalizedText(locale, appCopy.adminDashboard.completedMonth)} subtext={pickLocalizedText(locale, appCopy.adminDashboard.completedAll)} loading={loading} />
        </div>
        <div className="animate-slide-in-up stagger-4 min-w-[240px] md:min-w-0">
          <StatCard icon={<UsersIcon className="w-7 h-7" />} value={loading ? '...' : customers ?? 0} label={pickLocalizedText(locale, appCopy.adminDashboard.totalCustomers)} subtext={pickLocalizedText(locale, appCopy.adminDashboard.newCustomersMonth)} loading={loading} />
        </div>
        <div className="animate-slide-in-up stagger-5 min-w-[240px] md:min-w-0">
          <StatCard icon={<UsersIcon className="w-7 h-7" />} value={loading ? '...' : staff ?? 0} label={pickLocalizedText(locale, appCopy.adminDashboard.totalStaff)} subtext={pickLocalizedText(locale, appCopy.adminDashboard.staffOnline)} loading={loading} />
        </div>
        <div className="animate-slide-in-up stagger-6 min-w-[240px] md:min-w-0">
          <StatCard icon={<Cog6ToothIcon className="w-7 h-7" />} value={loading ? '...' : services ?? 0} label={pickLocalizedText(locale, appCopy.adminDashboard.totalServices)} subtext={pickLocalizedText(locale, appCopy.adminDashboard.allServiceTypes)} loading={loading} />
        </div>
      </div>

      {/* Pending Approvals Section */}
      {pendingMerchants.length > 0 && (
        <div className="bg-white/80 backdrop-blur-xl rounded-[32px] p-8 border border-orange-200 shadow-[0_8px_30px_rgb(249,115,22,0.05)] animate-slide-in-up mb-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl pointer-events-none -mr-32 -mt-32"></div>
          <h2 className="text-2xl font-bold text-stone-900 mb-6 flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
              <BuildingStorefrontIcon className="h-6 w-6" />
            </div>
            คำขออนุมัติร้านค้าใหม่ ({pendingMerchants.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
            {pendingMerchants.map((merchant) => (
              <div key={merchant.id} className="p-5 rounded-2xl bg-white border border-stone-100 shadow-sm flex flex-col justify-between gap-4">
                <div>
                  <h3 className="font-extrabold text-stone-900 text-lg">{merchant.display_name || 'ไม่ระบุชื่อร้าน'}</h3>
                  <p className="text-sm text-stone-500 font-medium mt-1">อีเมลติดต่อ: {merchant.email}</p>
                  <p className="text-xs text-stone-400 font-mono mt-1">รหัสสาขา: {merchant.branch_code}</p>
                </div>
                <button
                  onClick={() => handleApproveMerchant(merchant.id)}
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 rounded-xl font-bold text-sm hover:from-orange-600 hover:to-orange-700 shadow-md shadow-orange-200 transition-all flex items-center justify-center gap-2"
                >
                  <ShieldCheckIcon className="h-5 w-5" /> อนุมัติร้านค้า
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        {/* Revenue Overview Chart Area */}
        <div className="col-span-1 lg:col-span-2 bg-white/80 backdrop-blur-xl rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-stone-100/50 p-8 min-h-[300px] flex flex-col relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-orange-400/10 to-orange-500/5 rounded-full blur-3xl pointer-events-none -mr-32 -mt-32 transition-transform duration-700 group-hover:scale-150"></div>
          <div className="flex items-center justify-between mb-8 relative z-10">
              <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
                    <CurrencyDollarIcon className="h-6 w-6" />
                </div>
                {pickLocalizedText(locale, appCopy.adminDashboard.revenueOverview)}
              </h2>
              <button className="text-sm font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 transition-colors">
                  View Details <ArrowRightIcon className="h-4 w-4" />
              </button>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center text-stone-400 font-medium bg-stone-50/50 rounded-2xl border border-stone-100 border-dashed relative z-10">
              <span className="text-4xl mb-4">📈</span>
              {pickLocalizedText(locale, appCopy.adminDashboard.revenuePlaceholder)}
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="col-span-1 bg-white/80 backdrop-blur-xl rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-stone-100/50 p-8 min-h-[300px] flex flex-col">
          <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-stone-900">{pickLocalizedText(locale, appCopy.adminDashboard.recentActivity)}</h2>
          </div>
          <ul className="flex-1 space-y-5">
            <li className="flex items-start gap-4 p-4 rounded-2xl hover:bg-stone-50 transition-colors group cursor-pointer">
              <div className="w-2 h-2 mt-2 bg-orange-500 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.6)] group-hover:scale-150 transition-transform"></div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-stone-900 leading-tight">{pickLocalizedText(locale, appCopy.adminDashboard.installationDone)}</span>
                    <span className="text-sm font-bold text-orange-600">{formatCurrencyByLocale(2500, locale)}</span>
                </div>
                <div className="text-sm text-stone-500 font-medium">{pickLocalizedText(locale, appCopy.adminDashboard.sampleHouse)}</div>
                <div className="text-xs font-bold text-stone-400 uppercase tracking-wider mt-2">{pickLocalizedText(locale, appCopy.adminDashboard.fiveMinutesAgo)}</div>
              </div>
            </li>
            <li className="flex items-start gap-4 p-4 rounded-2xl hover:bg-stone-50 transition-colors group cursor-pointer">
              <div className="w-2 h-2 mt-2 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)] group-hover:scale-150 transition-transform"></div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-stone-900 leading-tight">New user registered</span>
                </div>
                <div className="text-sm text-stone-500 font-medium">customer@example.com</div>
                <div className="text-xs font-bold text-stone-400 uppercase tracking-wider mt-2">12 minutes ago</div>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          {/* Quick System Controls */}
          <div className="bg-white/80 backdrop-blur-xl rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-stone-100/50 animate-slide-in-up stagger-7 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-stone-200/20 to-stone-100/5 rounded-full blur-3xl pointer-events-none -mr-32 -mt-32"></div>
            <h2 className="text-2xl font-bold text-stone-900 mb-6 flex items-center gap-3 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center">
                <Cog6ToothIcon className="h-6 w-6 text-stone-700" />
              </div>
              {pickLocalizedText(locale, { th: 'ควบคุมระบบด่วน', en: 'Quick System Controls' })}
            </h2>
            <div className="grid grid-cols-1 gap-4 relative z-10">
              <div className="p-6 rounded-2xl bg-white border border-stone-100 hover:border-orange-200 transition-all group hover:shadow-lg hover:shadow-orange-500/5">
                <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                        <BellIcon className="h-5 w-5" />
                    </div>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-stone-900">{pickLocalizedText(locale, { th: 'การนัดหมาย', en: 'Appointments' })}</h3>
                </div>
                <p className="text-sm text-stone-500 mb-6 font-medium leading-relaxed">{pickLocalizedText(locale, { th: 'ส่งการแจ้งเตือนเตือนความจำสำหรับงานพรุ่งนี้ให้ลูกค้าทุกคน (LINE & In-app)', en: 'Send reminders for tomorrow\'s jobs to all customers (LINE & In-app).' })}</p>
                <button 
                  onClick={handleSendReminders} 
                  disabled={sendingReminders} 
                  className="w-full bg-gradient-to-r from-stone-900 to-stone-800 text-white py-4 rounded-xl text-sm font-bold shadow-md hover:shadow-xl active:scale-[0.98] transition-all disabled:opacity-50 hover:from-orange-600 hover:to-orange-500 group-hover:shadow-orange-500/20"
                >
                  {sendingReminders ? 'กำลังส่ง...' : pickLocalizedText(locale, { th: 'ส่งการแจ้งเตือน', en: 'Send Reminders' })}
                </button>
              </div>
            </div>
          </div>

          {/* System Health / Notifications */}
          <div className="bg-white/80 backdrop-blur-xl rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-stone-100/50 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl pointer-events-none -mr-32 -mt-32"></div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 relative z-10">
              <div>
                <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-3 mb-1">
                    <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                        <CheckCircleIcon className="h-6 w-6 text-red-500" />
                    </div>
                    {pickLocalizedText(locale, appCopy.adminDashboard.notificationStatus)}
                </h2>
                <p className="text-[13px] font-medium text-stone-500 ml-13 pl-13">{pickLocalizedText(locale, appCopy.adminDashboard.notificationSubtitle)}</p>
              </div>
              <Link href="/dashboard/admin/audit-logs" className="inline-flex items-center rounded-2xl bg-stone-100 px-5 py-3 text-sm font-bold text-stone-700 hover:bg-stone-200 hover:text-stone-900 transition-colors">
                  {pickLocalizedText(locale, appCopy.adminDashboard.openAuditPage)}
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 relative z-10">
              <div className="rounded-2xl border border-red-100 bg-gradient-to-br from-red-50/50 to-white p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-xs font-bold uppercase tracking-wider text-red-500 mb-2">{pickLocalizedText(locale, appCopy.adminDashboard.notificationFailedTotal)}</div>
                <div className="text-4xl font-extrabold text-red-700">{loading ? '...' : notificationFailuresTotal ?? 0}</div>
              </div>
              <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50/50 to-white p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-2">{pickLocalizedText(locale, appCopy.adminDashboard.notificationFailed24h)}</div>
                <div className="text-4xl font-extrabold text-amber-700">{loading ? '...' : notificationFailures24h ?? 0}</div>
              </div>
            </div>
          </div>
      </div>

      {/* Upcoming Jobs */}
      <div className="bg-white/80 backdrop-blur-xl rounded-[32px] p-8 border border-stone-100/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] animate-slide-in-up stagger-8 mb-20">
        <h2 className="text-2xl font-bold text-stone-900 mb-8 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
            <CalendarIcon className="h-6 w-6 text-orange-600" />
          </div>
          {pickLocalizedText(locale, appCopy.adminDashboard.upcomingJobs)}
        </h2>
        <div className="space-y-4">
          {loading ? (
            <div className="text-stone-400 py-8 text-center font-medium">{locale === 'en' ? 'Loading data...' : locale === 'zh' ? '加载中...' : 'กำลังโหลดข้อมูล...'}</div>
          ) : upcomingJobsList.length === 0 ? (
            <div className="text-stone-400 py-8 text-center font-medium bg-stone-50 rounded-2xl border border-stone-100 border-dashed">{pickLocalizedText(locale, appCopy.adminDashboard.upcomingPlaceholder)}</div>
          ) : (
            upcomingJobsList.map((job) => (
              <div key={job.id} className="flex flex-col md:flex-row md:items-center justify-between p-6 rounded-2xl bg-white border border-stone-100 hover:border-orange-200 transition-all hover:shadow-xl hover:shadow-orange-500/10 gap-6 group cursor-pointer">
                <div className="flex items-center gap-6">
                  <div className="h-14 w-14 rounded-2xl bg-stone-50 flex items-center justify-center text-stone-400 group-hover:bg-orange-50 group-hover:text-orange-500 transition-all duration-300">
                    <BriefcaseIcon className="h-7 w-7" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-stone-900 tracking-tight group-hover:text-orange-600 transition-colors">{job.services?.service_name}</h4>
                    <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mt-1.5 flex items-center gap-2">
                      <span className="bg-stone-100 px-2 py-1 rounded text-stone-600">{job.profiles?.display_name}</span>
                      <span>•</span> 
                      <span>{job.houses?.name}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between md:justify-end gap-8 border-t border-stone-50 pt-4 md:border-0 md:pt-0 w-full md:w-auto">
                  <div className="text-left md:text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">{locale === 'en' ? 'Scheduled For' : 'วันที่นัดหมาย'}</p>
                    <p className="text-base font-extrabold text-stone-800">{new Date(job.scheduled_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      alert(`ระบบจำลอง: ส่งแจ้งเตือนหาคุณ ${job.profiles?.display_name} แล้ว`);
                    }}
                    className="p-3.5 bg-stone-50 rounded-xl text-stone-400 hover:text-white hover:bg-orange-500 hover:shadow-lg hover:shadow-orange-500/30 transition-all active:scale-95"
                    title="ส่งการแจ้งเตือน (Mock)"
                  >
                    <BellIcon className="h-6 w-6" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}