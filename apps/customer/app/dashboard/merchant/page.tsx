'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import StatCard from '../../../components/StatCard';
import { UsersIcon, BriefcaseIcon, Cog6ToothIcon, CurrencyDollarIcon, CheckCircleIcon, CalendarIcon, BellIcon } from '@heroicons/react/24/outline';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const [sendingReminders, setSendingReminders] = useState(false);

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

  return (
    <div className="max-w-7xl mx-auto py-6 px-2 md:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">{pickLocalizedText(locale, appCopy.adminDashboard.title)}</h1>
        <p className="text-gray-500 text-lg">{pickLocalizedText(locale, appCopy.adminDashboard.subtitle)}</p>
      </div>
      {error && <div className="text-red-600 mb-4">{error}</div>}

      <div className="flex overflow-x-auto scrollbar-hide gap-6 mb-8 flex-nowrap pb-2 -mx-2 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 md:gap-6 md:overflow-visible md:flex-none md:mx-0">
        <div className="animate-slide-in-up stagger-1">
          <StatCard icon={<CurrencyDollarIcon className="w-7 h-7" />} value={loading ? '...' : formatCurrencyByLocale(revenue ?? 0, locale)} label={pickLocalizedText(locale, appCopy.adminDashboard.revenueMonth)} subtext={pickLocalizedText(locale, appCopy.adminDashboard.lastUpdated)} loading={loading} />
        </div>
        <div className="animate-slide-in-up stagger-2">
          <StatCard icon={<BriefcaseIcon className="w-7 h-7" />} value={loading ? '...' : activeJobs ?? 0} label={pickLocalizedText(locale, appCopy.adminDashboard.activeJobs)} subtext={pickLocalizedText(locale, appCopy.adminDashboard.unfinishedJobs)} loading={loading} />
        </div>
        <div className="animate-slide-in-up stagger-3">
          <StatCard icon={<CheckCircleIcon className="w-7 h-7" />} value={loading ? '...' : completedJobs ?? 0} label={pickLocalizedText(locale, appCopy.adminDashboard.completedMonth)} subtext={pickLocalizedText(locale, appCopy.adminDashboard.completedAll)} loading={loading} />
        </div>
        <div className="animate-slide-in-up stagger-4">
          <StatCard icon={<UsersIcon className="w-7 h-7" />} value={loading ? '...' : customers ?? 0} label={pickLocalizedText(locale, appCopy.adminDashboard.totalCustomers)} subtext={pickLocalizedText(locale, appCopy.adminDashboard.newCustomersMonth)} loading={loading} />
        </div>
        <div className="animate-slide-in-up stagger-5">
          <StatCard icon={<BriefcaseIcon className="w-7 h-7" />} value={loading ? '...' : staff ?? 0} label={pickLocalizedText(locale, appCopy.adminDashboard.totalStaff)} subtext={pickLocalizedText(locale, appCopy.adminDashboard.staffOnline)} loading={loading} />
        </div>
        <div className="animate-slide-in-up stagger-6">
          <StatCard icon={<Cog6ToothIcon className="w-7 h-7" />} value={loading ? '...' : services ?? 0} label={pickLocalizedText(locale, appCopy.adminDashboard.totalServices)} subtext={pickLocalizedText(locale, appCopy.adminDashboard.allServiceTypes)} loading={loading} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="col-span-2 bg-white rounded-xl p-6 min-h-[220px] flex flex-col">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{pickLocalizedText(locale, appCopy.adminDashboard.revenueOverview)}</h2>
          <div className="flex-1 flex items-center justify-center text-gray-400">{pickLocalizedText(locale, appCopy.adminDashboard.revenuePlaceholder)}</div>
        </div>
        <div className="bg-white rounded-xl p-6 min-h-[220px] flex flex-col">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{pickLocalizedText(locale, appCopy.adminDashboard.recentActivity)}</h2>
          <ul className="flex-1 space-y-4">
            <li className="flex items-center justify-between">
              <div>
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2 align-middle"></span>
                <span className="font-medium text-gray-800">{pickLocalizedText(locale, appCopy.adminDashboard.installationDone)}</span>
                <div className="text-xs text-gray-500">{pickLocalizedText(locale, appCopy.adminDashboard.sampleHouse)}</div>
                <div className="text-xs text-gray-400">{pickLocalizedText(locale, appCopy.adminDashboard.fiveMinutesAgo)}</div>
              </div>
              <span className="text-gray-900 font-semibold">{formatCurrencyByLocale(2500, locale)}</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 mb-8 border border-gray-100">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">{pickLocalizedText(locale, appCopy.adminDashboard.notificationStatus)}</h2>
            <p className="text-sm text-gray-600">{pickLocalizedText(locale, appCopy.adminDashboard.notificationSubtitle)}</p>
          </div>
          <Link href="/dashboard/admin/audit-logs" className="inline-flex items-center rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800">{pickLocalizedText(locale, appCopy.adminDashboard.openAuditPage)}</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="text-sm text-red-700">{pickLocalizedText(locale, appCopy.adminDashboard.notificationFailedTotal)}</div>
            <div className="mt-1 text-2xl font-semibold text-red-800">{loading ? '...' : notificationFailuresTotal ?? 0}</div>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="text-sm text-amber-700">{pickLocalizedText(locale, appCopy.adminDashboard.notificationFailed24h)}</div>
            <div className="mt-1 text-2xl font-semibold text-amber-800">{loading ? '...' : notificationFailures24h ?? 0}</div>
          </div>
        </div>
      </div>

      {/* Quick System Controls */}
      <div className="bg-white rounded-xl p-6 mb-8 border border-[#E5E5DF] shadow-sm animate-slide-in-up stagger-7">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CheckCircleIcon className="h-5 w-5 text-[#1A1A1A]" /> {pickLocalizedText(locale, { th: 'ควบคุมระบบด่วน', en: 'Quick System Controls' })}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 border border-[#F1F1EB] hover:border-[#1A1A1A] transition-all group">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-[#A3A3A3] mb-2">{pickLocalizedText(locale, { th: 'การนัดหมาย', en: 'Appointments' })}</h3>
            <p className="text-sm text-[#70706B] mb-4">{pickLocalizedText(locale, { th: 'ส่งการแจ้งเตือนเตือนความจำสำหรับงานพรุ่งนี้ให้ลูกค้าทุกคน (LINE & In-app)', en: 'Send reminders for tomorrow\'s jobs to all customers (LINE & In-app).' })}</p>
            <button onClick={handleSendReminders} disabled={sendingReminders} className="w-full bg-[#1A1A1A] text-white py-2 text-[10px] font-black uppercase tracking-widest hover:bg-[#333] transition-all disabled:opacity-50">
              {sendingReminders ? 'Sending...' : pickLocalizedText(locale, { th: 'ส่งการแจ้งเตือนงานพรุ่งนี้', en: 'Send Tomorrow Reminders' })}
            </button>
          </div>
        </div>
      </div>

      {/* Upcoming Jobs */}
      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm animate-slide-in-up stagger-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-[#1A1A1A]" /> {pickLocalizedText(locale, appCopy.adminDashboard.upcomingJobs)}
        </h2>
        <div className="space-y-4">
          {loading ? (
            <div className="text-gray-400 py-4">{locale === 'en' ? 'Loading...' : locale === 'zh' ? '加载中...' : 'กำลังโหลด...'}</div>
          ) : upcomingJobsList.length === 0 ? (
            <div className="text-gray-400 py-4">{pickLocalizedText(locale, appCopy.adminDashboard.upcomingPlaceholder)}</div>
          ) : (
            upcomingJobsList.map((job) => (
              <div key={job.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-[#F1F1EB] hover:border-[#1A1A1A] transition-all gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 bg-[#FAFAF8] flex items-center justify-center text-[#1A1A1A] border border-[#F1F1EB]">
                    <BriefcaseIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#1A1A1A] uppercase tracking-wide">{job.services?.service_name}</h4>
                    <p className="text-[10px] font-black text-[#A3A3A3] uppercase tracking-widest">
                      {locale === 'en' ? 'customer:' : locale === 'zh' ? '顾客：' : '                       ลูกค้า: '}{job.profiles?.display_name} • {job.houses?.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between md:justify-end gap-6">
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#A3A3A3]">{locale === 'en' ? 'วันนัดหมาย' : locale === 'zh' ? 'วันนัดหมาย' : 'วันนัดหมาย'}</p>
                    <p className="text-sm font-medium text-[#1A1A1A]">{new Date(job.scheduled_date).toLocaleDateString('th-TH')}</p>
                  </div>
                  <button 
                    onClick={() => {
                      // Manual single notify
                      alert(`ส่งการแจ้งเตือนให้ ${job.profiles?.display_name} เรียบร้อยแล้ว (Mock)`);
                    }}
                    className="p-2 text-[#A3A3A3] hover:text-[#1A1A1A] transition-colors"
                  >
                    <BellIcon className="h-5 w-5" />
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