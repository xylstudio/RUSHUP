'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  UsersIcon, 
  BriefcaseIcon, 
  CurrencyDollarIcon, 
  CheckCircleIcon, 
  BuildingStorefrontIcon, 
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  ServerStackIcon,
  ArrowRightIcon,
  BellIcon
} from '@heroicons/react/24/outline';
import { supabase } from '../../../lib/supabaseClient';
import { useI18n } from '@/lib/I18nContext';
import { formatCurrencyByLocale } from '@/lib/localeFormat';

export default function AdminCommandCenter() {
  const { locale } = useI18n();
  const [revenue, setRevenue] = useState<number|null>(null);
  const [activeJobs, setActiveJobs] = useState<number|null>(null);
  const [customers, setCustomers] = useState<number|null>(null);
  const [staff, setStaff] = useState<number|null>(null);
  const [services, setServices] = useState<number|null>(null);
  const [completedJobs, setCompletedJobs] = useState<number|null>(null);
  const [notificationFailures24h, setNotificationFailures24h] = useState<number|null>(null);
  const [pendingMerchants, setPendingMerchants] = useState<any[]>([]);
  const [recentAuditLogs, setRecentAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);

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
        setError('Database connection unavailable');
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
              .gte('created_at', startOfMonth.toISOString())
              .eq('status', 'completed');
            if (!error && data && data.length > 0) {
              return data.reduce((sum: number, row: any) => sum + (Number(row?.[columnName]) || 0), 0) || 0;
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
          supabase.from('audit_logs').select('*', { count: 'exact', head: true }).eq('action', 'notification_delivery_failed').gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
          supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(6)
        ]);

        if (results[0].status === 'fulfilled') setRevenue(results[0].value as number);
        if (results[1].status === 'fulfilled') setActiveJobs((results[1] as any).value.count);
        if (results[2].status === 'fulfilled') setCompletedJobs((results[2] as any).value.count);
        if (results[3].status === 'fulfilled') setCustomers((results[3] as any).value.count);
        if (results[4].status === 'fulfilled') setStaff((results[4] as any).value.count);
        if (results[5].status === 'fulfilled') setServices((results[5] as any).value.count);
        if (results[6].status === 'fulfilled') setNotificationFailures24h((results[6] as any).value.count);
        if (results[7].status === 'fulfilled') setRecentAuditLogs((results[7] as any).value.data || []);

        await fetchPendingMerchants();

      } catch (err: any) {
        setError(err.message || 'Error loading dashboard data');
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [locale]);

  const handleApproveMerchant = async (id: string, branchCode: string) => {
    if (!confirm(`ยืนยันที่จะอนุมัติร้านค้ารหัส ${branchCode} เข้าร่วมระบบใช่หรือไม่?`)) return;
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
    <div className="min-h-screen bg-stone-950 text-stone-300 font-sans -mx-4 -mt-8 sm:-mx-8 p-4 sm:p-8">
      {/* Top Navigation Bar / Command Center Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 border-b border-stone-800 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <ServerStackIcon className="w-8 h-8 text-orange-500" />
            <h1 className="text-3xl font-black tracking-tight text-white uppercase font-mono">Platform Command Center</h1>
          </div>
          <p className="text-stone-500 font-mono text-sm tracking-widest uppercase">RUSHUP Admin Operations & Monitoring</p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center gap-4">
          <div className="flex items-center gap-2 bg-stone-900 px-4 py-2 rounded-md border border-stone-800">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs font-mono font-bold text-emerald-400 tracking-wider">SYSTEM OPTIMAL</span>
          </div>
          <button className="bg-stone-800 hover:bg-stone-700 text-stone-200 px-4 py-2 rounded-md border border-stone-700 text-xs font-mono font-bold uppercase tracking-wider transition-colors">
            Generate Report
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-950/50 border border-red-900 text-red-400 p-4 rounded-md mb-8 font-mono text-sm flex items-center gap-3">
          <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
          {error}
        </div>
      )}

      {/* Primary Metrics (Dense Layout) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <MetricBox title="M-TD Revenue" value={loading ? '...' : formatCurrencyByLocale(revenue ?? 0, locale)} icon={<CurrencyDollarIcon className="w-5 h-5"/>} />
        <MetricBox title="Active Jobs" value={loading ? '...' : activeJobs ?? 0} icon={<BriefcaseIcon className="w-5 h-5"/>} />
        <MetricBox title="Completed (Mo)" value={loading ? '...' : completedJobs ?? 0} icon={<CheckCircleIcon className="w-5 h-5"/>} />
        <MetricBox title="Total Customers" value={loading ? '...' : customers ?? 0} icon={<UsersIcon className="w-5 h-5"/>} />
        <MetricBox title="Active Staff" value={loading ? '...' : staff ?? 0} icon={<UsersIcon className="w-5 h-5"/>} />
        <MetricBox title="Total Services" value={loading ? '...' : services ?? 0} icon={<ChartBarIcon className="w-5 h-5"/>} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Alerts & Approvals */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Action Required: Merchant Approvals */}
          <div className="bg-stone-900 rounded-lg border border-stone-800 overflow-hidden">
            <div className="bg-stone-800/50 px-6 py-4 border-b border-stone-800 flex justify-between items-center">
              <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <BuildingStorefrontIcon className="w-5 h-5 text-orange-400" />
                Merchant Approvals Required
                {pendingMerchants.length > 0 && (
                  <span className="bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded-full ml-2">{pendingMerchants.length}</span>
                )}
              </h2>
            </div>
            <div className="p-0">
              {pendingMerchants.length === 0 ? (
                <div className="p-8 text-center text-stone-500 font-mono text-sm">No pending merchant approvals at this time.</div>
              ) : (
                <table className="w-full text-left text-sm font-mono">
                  <thead className="bg-stone-900/50 text-stone-400 text-xs uppercase tracking-wider border-b border-stone-800">
                    <tr>
                      <th className="px-6 py-3 font-medium">Merchant / Branch</th>
                      <th className="px-6 py-3 font-medium">Contact</th>
                      <th className="px-6 py-3 font-medium">Code</th>
                      <th className="px-6 py-3 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800">
                    {pendingMerchants.map((m) => (
                      <tr key={m.id} className="hover:bg-stone-800/30 transition-colors">
                        <td className="px-6 py-4 text-white font-medium">{m.display_name || 'Unnamed Branch'}</td>
                        <td className="px-6 py-4 text-stone-400">{m.email || m.phone || '-'}</td>
                        <td className="px-6 py-4 text-stone-500">{m.branch_code}</td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => handleApproveMerchant(m.id, m.branch_code)}
                            className="inline-flex items-center gap-1 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 px-3 py-1.5 rounded border border-orange-500/20 transition-colors text-xs font-bold uppercase tracking-wider"
                          >
                            <ShieldCheckIcon className="w-4 h-4" /> Approve
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* System Health / Alerts */}
          <div className="bg-stone-900 rounded-lg border border-stone-800 overflow-hidden">
            <div className="bg-stone-800/50 px-6 py-4 border-b border-stone-800 flex justify-between items-center">
              <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />
                System Alerts (24h)
              </h2>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between p-4 bg-red-950/20 border border-red-900/50 rounded-md">
                <div>
                  <h3 className="text-red-400 font-bold font-mono text-sm uppercase">Notification Delivery Failures</h3>
                  <p className="text-stone-400 text-xs mt-1">Failed LINE/Push messages in the last 24 hours.</p>
                </div>
                <div className="text-2xl font-black text-red-500 font-mono">
                  {loading ? '-' : notificationFailures24h ?? 0}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Audit Logs & Controls */}
        <div className="space-y-8">
          
          {/* Quick Actions */}
          <div className="bg-stone-900 rounded-lg border border-stone-800 overflow-hidden">
            <div className="bg-stone-800/50 px-6 py-4 border-b border-stone-800">
              <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                Terminal Commands
              </h2>
            </div>
            <div className="p-4 space-y-3">
              <button 
                onClick={() => alert('Manually triggering job reminders...')}
                className="w-full text-left px-4 py-3 bg-stone-800 hover:bg-stone-700 rounded-md border border-stone-700 transition-colors flex items-center justify-between group"
              >
                <div>
                  <div className="text-white font-mono text-sm font-bold">Trigger Reminders</div>
                  <div className="text-stone-500 text-xs mt-0.5">Force send scheduled job notifications</div>
                </div>
                <BellIcon className="w-5 h-5 text-stone-500 group-hover:text-white transition-colors" />
              </button>
              <Link href="/dashboard/admin/audit-logs" className="w-full text-left px-4 py-3 bg-stone-800 hover:bg-stone-700 rounded-md border border-stone-700 transition-colors flex items-center justify-between group block">
                <div>
                  <div className="text-white font-mono text-sm font-bold">View Full Logs</div>
                  <div className="text-stone-500 text-xs mt-0.5">Explore comprehensive system audit trails</div>
                </div>
                <ArrowRightIcon className="w-5 h-5 text-stone-500 group-hover:text-white transition-colors" />
              </Link>
            </div>
          </div>

          {/* Recent System Logs */}
          <div className="bg-stone-900 rounded-lg border border-stone-800 overflow-hidden">
            <div className="bg-stone-800/50 px-6 py-4 border-b border-stone-800">
              <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                Live Audit Stream
              </h2>
            </div>
            <div className="p-0">
              {recentAuditLogs.length === 0 ? (
                <div className="p-6 text-center text-stone-500 font-mono text-xs">Awaiting log entries...</div>
              ) : (
                <ul className="divide-y divide-stone-800/50">
                  {recentAuditLogs.map((log, idx) => (
                    <li key={log.id || idx} className="p-4 hover:bg-stone-800/30">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-orange-400 font-mono text-xs font-bold uppercase">{log.action || 'system_event'}</span>
                        <span className="text-stone-600 font-mono text-[10px]">{new Date(log.created_at).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-stone-400 text-xs font-mono mt-1 break-all">
                        {log.details ? JSON.stringify(log.details).substring(0, 60) + '...' : 'No details payload'}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function MetricBox({ title, value, icon }: { title: string, value: string | number, icon: React.ReactNode }) {
  return (
    <div className="bg-stone-900 p-4 rounded-lg border border-stone-800 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3">
        <span className="text-stone-500 font-mono text-[10px] uppercase tracking-widest font-bold">{title}</span>
        <div className="text-stone-600">{icon}</div>
      </div>
      <div className="text-2xl font-black text-white font-mono tracking-tight">{value}</div>
    </div>
  );
}