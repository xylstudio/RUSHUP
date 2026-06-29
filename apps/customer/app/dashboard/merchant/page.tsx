'use client';
import { useEffect, useState, FormEvent } from 'react';
import Link from 'next/link';
import StatCard from '../../../components/StatCard';
import { UsersIcon, BriefcaseIcon, Cog6ToothIcon, CurrencyDollarIcon, CheckCircleIcon, CalendarIcon, BellIcon, ArrowRightIcon, BuildingStorefrontIcon } from '@heroicons/react/24/outline';
import { supabase } from '../../../lib/supabaseClient';
import { useI18n } from '@/lib/I18nContext';
import { appCopy, pickLocalizedText } from '@/lib/appLocale';
import { formatCurrencyByLocale } from '@/lib/localeFormat';
import { useAuth } from '../../../lib/AuthContext';

export default function AdminDashboard() {
  const { locale } = useI18n();
  const { profile, refreshProfile } = useAuth();
  
  // States for Stats
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

  // States for Onboarding Form
  const [submittingOnboarding, setSubmittingOnboarding] = useState(false);
  const [onboardingError, setOnboardingError] = useState<string|null>(null);
  const [shopName, setShopName] = useState('');
  const [shopType, setShopType] = useState<'cafe' | 'garden' | 'both'>('both');
  const [shopAddress, setShopAddress] = useState('');
  const [shopPhone, setShopPhone] = useState('');
  const [shopEmail, setShopEmail] = useState(profile?.email || '');
  const [shopZips, setShopZips] = useState('');

  useEffect(() => {
    if (!profile?.branch_code || !profile?.is_verified) {
      setLoading(false);
      return;
    }

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
  }, [locale, profile?.branch_code, profile?.is_verified]);

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

  const handleRegisterOnboarding = async (e: FormEvent) => {
    e.preventDefault();
    setSubmittingOnboarding(true);
    setOnboardingError(null);

    if (!shopName || !shopAddress || !shopPhone) {
      setOnboardingError('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
      setSubmittingOnboarding(false);
      return;
    }

    try {
      // 1. Generate 2-char code
      const randCode = Math.random().toString(36).substring(2, 4).toUpperCase();

      // 2. Insert Branch
      const { data: branchData, error: branchErr } = await supabase
        .from('branches')
        .insert([{
          branch_code: randCode,
          branch_name: shopName,
          name: shopName,
          code: randCode,
          address: shopAddress,
          phone: shopPhone,
          email: shopEmail,
          service_zip_codes: shopZips ? shopZips.split(',').map(z => z.trim()) : [],
          branch_type: shopType,
          latitude: 13.7563,
          longitude: 100.5018
        }])
        .select()
        .single();

      if (branchErr) throw branchErr;

      // 3. Update User Profile
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({
          branch_code: randCode,
          is_verified: false
        })
        .eq('id', profile?.id);

      if (profileErr) throw profileErr;

      await refreshProfile();
    } catch (err: any) {
      setOnboardingError(err.message || 'เกิดข้อผิดพลาดในการลงทะเบียนร้านค้า');
    } finally {
      setSubmittingOnboarding(false);
    }
  };

  // Onboarding UI (No branch_code yet)
  if (profile && !profile.branch_code) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4">
        <div className="bg-white/80 backdrop-blur-xl rounded-[32px] p-8 border border-stone-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500/5 rounded-full blur-3xl -mr-24 -mt-24 pointer-events-none"></div>
          
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <BuildingStorefrontIcon className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-black text-stone-900 tracking-tight">สมัครเข้าร่วมเป็นร้านค้า RUSHUP</h1>
            <p className="text-stone-500 text-sm mt-2">กรอกข้อมูลรายละเอียดร้านค้าของคุณเพื่อส่งคำขอเปิดใช้งานระบบ</p>
          </div>

          {onboardingError && (
            <div className="bg-red-50 text-red-600 border border-red-100 rounded-2xl p-4 mb-6 text-sm font-medium">
              {onboardingError}
            </div>
          )}

          <form onSubmit={handleRegisterOnboarding} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">ชื่อร้านค้า / สาขา *</label>
              <input 
                type="text" 
                value={shopName} 
                onChange={e => setShopName(e.target.value)} 
                required 
                className="w-full px-4 py-3 rounded-2xl border border-stone-200 focus:outline-none focus:border-orange-500 font-medium text-stone-900"
                placeholder="เช่น กาแฟโบราณ สาขาบางนา" 
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">ประเภทบริการ *</label>
              <select 
                value={shopType} 
                onChange={e => setShopType(e.target.value as any)} 
                className="w-full px-4 py-3 rounded-2xl border border-stone-200 focus:outline-none focus:border-orange-500 font-medium text-stone-950 bg-white"
              >
                <option value="both">ร้านอาหาร และ บริการทั่วไป (Both)</option>
                <option value="cafe">ร้านอาหารและคาเฟ่ (Food & Cafe)</option>
                <option value="garden">บริการทำสวนและแต่งบ้าน (Garden Services)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">เบอร์โทรศัพท์ร้านค้า *</label>
              <input 
                type="tel" 
                value={shopPhone} 
                onChange={e => setShopPhone(e.target.value)} 
                required 
                className="w-full px-4 py-3 rounded-2xl border border-stone-200 focus:outline-none focus:border-orange-500 font-medium text-stone-900"
                placeholder="เช่น 02-123-4567" 
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">อีเมลติดต่อ</label>
              <input 
                type="email" 
                value={shopEmail} 
                onChange={e => setShopEmail(e.target.value)} 
                className="w-full px-4 py-3 rounded-2xl border border-stone-200 focus:outline-none focus:border-orange-500 font-medium text-stone-900"
                placeholder="shop@example.com" 
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">ที่อยู่ร้านค้า *</label>
              <textarea 
                value={shopAddress} 
                onChange={e => setShopAddress(e.target.value)} 
                required 
                rows={3}
                className="w-full px-4 py-3 rounded-2xl border border-stone-200 focus:outline-none focus:border-orange-500 font-medium text-stone-900"
                placeholder="กรอกที่อยู่เต็มของร้านค้า" 
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">รหัสไปรษณีย์ที่ให้บริการ (คั่นด้วยเครื่องหมายจุลภาค ,)</label>
              <input 
                type="text" 
                value={shopZips} 
                onChange={e => setShopZips(e.target.value)} 
                className="w-full px-4 py-3 rounded-2xl border border-stone-200 focus:outline-none focus:border-orange-500 font-medium text-stone-900"
                placeholder="เช่น 10110, 10250" 
              />
            </div>

            <button 
              type="submit" 
              disabled={submittingOnboarding}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-orange-200 hover:shadow-xl active:scale-98 transition-all disabled:opacity-50 mt-4"
            >
              {submittingOnboarding ? 'กำลังบันทึกข้อมูล...' : 'ส่งคำขออนุมัติร้านค้า'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Waiting Screen (branch_code exists but is_verified is false)
  if (profile && !profile.is_verified) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center">
        <div className="bg-white/80 backdrop-blur-xl rounded-[32px] p-8 border border-stone-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
          <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h1 className="text-2xl font-black text-stone-900 tracking-tight">อยู่ระหว่างการตรวจสอบ</h1>
          <p className="text-stone-500 text-sm mt-3 leading-relaxed">
            ข้อมูลร้านค้าของคุณได้ส่งไปยังระบบแล้ว ทีมงาน RUSHUP กำลังดำเนินการตรวจสอบเอกสารและความถูกต้องของร้านค้า
          </p>
          <div className="mt-8 pt-6 border-t border-stone-100">
            <p className="text-xs text-stone-400 font-medium">หากต้องการสอบถามเพิ่มเติม โปรดติดต่อฝ่ายสนับสนุนระบบ RUSHUP</p>
          </div>
        </div>
      </div>
    );
  }

  // Main Merchant Dashboard (Fully onboarded & verified)
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
        <div className="col-span-2 bg-white/80 backdrop-blur-xl rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-stone-100/50 p-6 min-h-[220px] flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl pointer-events-none -mr-32 -mt-32"></div>
          <h2 className="text-xl font-bold text-stone-900 mb-4 flex items-center gap-2">
            <CurrencyDollarIcon className="h-6 w-6 text-orange-500" />
            {pickLocalizedText(locale, appCopy.adminDashboard.revenueOverview)}
          </h2>
          <div className="flex-1 flex items-center justify-center text-stone-400 font-medium">{pickLocalizedText(locale, appCopy.adminDashboard.revenuePlaceholder)}</div>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-stone-100/50 p-6 min-h-[220px] flex flex-col">
          <h2 className="text-xl font-bold text-stone-900 mb-4">{pickLocalizedText(locale, appCopy.adminDashboard.recentActivity)}</h2>
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

      <div className="bg-white/80 backdrop-blur-xl rounded-[32px] p-6 mb-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-stone-100/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl pointer-events-none -mr-32 -mt-32"></div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-stone-900 mb-1">{pickLocalizedText(locale, appCopy.adminDashboard.notificationStatus)}</h2>
            <p className="text-[13px] font-medium text-stone-500">{pickLocalizedText(locale, appCopy.adminDashboard.notificationSubtitle)}</p>
          </div>
          <Link href="/dashboard/admin/audit-logs" className="inline-flex items-center rounded-2xl bg-stone-900 px-4 py-2 text-sm font-bold text-white hover:bg-stone-800 transition-colors shadow-md">{pickLocalizedText(locale, appCopy.adminDashboard.openAuditPage)}</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 relative z-10">
          <div className="rounded-2xl border border-red-200/50 bg-gradient-to-br from-red-50 to-white p-5 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wider text-red-600 mb-2">{pickLocalizedText(locale, appCopy.adminDashboard.notificationFailedTotal)}</div>
            <div className="text-3xl font-extrabold text-red-700">{loading ? '...' : notificationFailuresTotal ?? 0}</div>
          </div>
          <div className="rounded-2xl border border-amber-200/50 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-2">{pickLocalizedText(locale, appCopy.adminDashboard.notificationFailed24h)}</div>
            <div className="text-3xl font-extrabold text-amber-700">{loading ? '...' : notificationFailures24h ?? 0}</div>
          </div>
        </div>
      </div>

      {/* Quick System Controls */}
      <div className="bg-white/80 backdrop-blur-xl rounded-[32px] p-6 mb-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-stone-100/50 animate-slide-in-up stagger-7">
        <h2 className="text-xl font-bold text-stone-900 mb-6 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
            <CheckCircleIcon className="h-5 w-5 text-orange-600" />
          </div>
          {pickLocalizedText(locale, { th: 'ควบคุมระบบด่วน', en: 'Quick System Controls' })}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-stone-50/50 border border-stone-100 hover:border-orange-200 transition-all group hover:bg-orange-50/30">
            <h3 className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2 group-hover:text-orange-600 transition-colors">{pickLocalizedText(locale, { th: 'การนัดหมาย', en: 'Appointments' })}</h3>
            <p className="text-sm text-stone-600 mb-5 font-medium">{pickLocalizedText(locale, { th: 'ส่งการแจ้งเตือนเตือนความจำสำหรับงานพรุ่งนี้ให้ลูกค้าทุกคน (LINE & In-app)', en: 'Send reminders for tomorrow\'s jobs to all customers (LINE & In-app).' })}</p>
            <button onClick={handleSendReminders} disabled={sendingReminders} className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 rounded-xl text-sm font-bold shadow-md shadow-orange-200 hover:shadow-lg active:scale-95 transition-all disabled:opacity-50">
              {sendingReminders ? 'กำลังส่ง...' : pickLocalizedText(locale, { th: 'ส่งการแจ้งเตือน', en: 'Send Reminders' })}
            </button>
          </div>
        </div>
      </div>

      {/* Upcoming Jobs */}
      <div className="bg-white/80 backdrop-blur-xl rounded-[32px] p-6 border border-stone-100/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] animate-slide-in-up stagger-8 mb-20">
        <h2 className="text-xl font-bold text-stone-900 mb-6 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center">
            <CalendarIcon className="h-5 w-5 text-stone-700" />
          </div>
          {pickLocalizedText(locale, appCopy.adminDashboard.upcomingJobs)}
        </h2>
        <div className="space-y-4">
          {loading ? (
            <div className="text-stone-400 py-4 font-medium">{locale === 'en' ? 'Loading...' : locale === 'zh' ? '加载中...' : 'กำลังโหลด...'}</div>
          ) : upcomingJobsList.length === 0 ? (
            <div className="text-stone-400 py-4 font-medium">{pickLocalizedText(locale, appCopy.adminDashboard.upcomingPlaceholder)}</div>
          ) : (
            upcomingJobsList.map((job) => (
              <div key={job.id} className="flex flex-col md:flex-row md:items-center justify-between p-5 rounded-2xl bg-white border border-stone-100/50 hover:border-orange-200 transition-all hover:shadow-lg hover:shadow-orange-100 gap-4 group">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
                    <BriefcaseIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-stone-900 tracking-tight">{job.services?.service_name}</h4>
                    <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mt-1">
                      {job.profiles?.display_name} <span className="mx-1">•</span> {job.houses?.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between md:justify-end gap-6 border-t border-stone-50 pt-4 md:border-0 md:pt-0">
                  <div className="text-left md:text-right">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">{locale === 'en' ? 'Date' : 'วันที่'}</p>
                    <p className="text-sm font-bold text-stone-800">{new Date(job.scheduled_date).toLocaleDateString('th-TH')}</p>
                  </div>
                  <button 
                    onClick={() => alert(`ส่งการแจ้งเตือนให้ ${job.profiles?.display_name} เรียบร้อยแล้ว (Mock)`)}
                    className="p-3 bg-stone-50 rounded-xl text-stone-400 hover:text-white hover:bg-stone-900 transition-all"
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