'use client';
import React, { useState, useEffect, useMemo } from 'react'
import { 
  Plus, Search, Edit3, Trash2, Loader2, 
  ChevronRight, Save, LayoutGrid, X,
  Menu as MenuIcon, LogOut, Settings, BarChart3,
  PieChart, FileText, Download, Calendar,
  ArrowUpRight, ArrowDownRight, Printer, RefreshCcw,
  Zap, Clock, DollarSign, Users, ShoppingBag,
  TrendingUp, CalendarDays, Filter, ChevronDown, Award,
  AlertTriangle, Info, TrendingDown, Package, FileSpreadsheet,
  Layers, CreditCard, Banknote, ArrowRight, Wallet, ChevronUp
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart as RePieChart, Pie, Legend, LabelList
} from 'recharts'
import { motion, AnimatePresence } from 'framer-motion'
import { calculateAttendanceStats, calculateSalary } from "@/lib/attendanceUtils"
import { useI18n } from "@/lib/I18nContext";

interface POSReportsProps {
  profile: any
  activeView: string
  allowedNav: any[]
  onSetView: (view: any) => void
  onShiftModalOpen?: () => void
  activeShift?: any
  shopSettings?: any
  setViewExtraHeader: (node: React.ReactNode) => void
}

type TimeRange = 'today' | '7d' | '30d' | 'this_month' | 'last_month' | 'last_3_months' | 'this_year' | 'all' | 'custom'
type ReportTab = 'overview' | 'menu' | 'payment' | 'inventory' | 'expenses' | 'discounts_voids'

const TIME_RANGE_OPTIONS = [
    { value: 'today', label: 'วันนี้' },
    { value: 'this_month', label: 'เดือนนี้' },
    { value: 'last_month', label: 'เดือนที่แล้ว' },
    { value: '7d', label: '7 วันที่ผ่านมา' },
    { value: '30d', label: '30 วันที่ผ่านมา' },
    { value: 'last_3_months', label: '3 เดือนที่ผ่านมา' },
    { value: 'this_year', label: 'ปีนี้' },
    { value: 'all', label: 'ทั้งหมด' },
    { value: 'custom', label: 'กำหนดเอง...' },
]

const DAY_MS = 24 * 60 * 60 * 1000

function resolveDateRange(timeRange: TimeRange, customRange: { start: string; end: string }) {
    const end = new Date()
    const start = new Date()

    if (timeRange === 'custom' && customRange.start && customRange.end) {
        const customStart = new Date(customRange.start)
        const customEnd = new Date(customRange.end)
        customStart.setHours(0, 0, 0, 0)
        customEnd.setHours(23, 59, 59, 999)
        return { startDate: customStart, endDate: customEnd }
    }

    if (timeRange === 'today') start.setHours(0,0,0,0)
    else if (timeRange === '7d') start.setDate(end.getDate() - 7)
    else if (timeRange === '30d') start.setDate(end.getDate() - 30)
    else if (timeRange === 'this_month') {
        start.setDate(1); start.setHours(0,0,0,0)
    }
    else if (timeRange === 'last_month') {
        start.setMonth(start.getMonth() - 1); start.setDate(1); start.setHours(0,0,0,0)
        end.setDate(0); end.setHours(23,59,59,999)
    }
    else if (timeRange === 'last_3_months') {
        start.setMonth(start.getMonth() - 3); start.setDate(1); start.setHours(0,0,0,0)
        end.setDate(0); end.setHours(23,59,59,999)
    }
    else if (timeRange === 'this_year') {
        start.setMonth(0); start.setDate(1); start.setHours(0,0,0,0)
    }
    else if (timeRange === 'all') start.setTime(0)

    return { startDate: start, endDate: end }
}

function getComparisonRange(timeRange: TimeRange, startDate: Date, endDate: Date) {
    if (timeRange === 'all') return null

    if (timeRange === 'today') {
        const compareStart = new Date(startDate.getTime() - DAY_MS)
        compareStart.setHours(0, 0, 0, 0)
        const compareEnd = new Date(startDate.getTime() - 1)
        return { startDate: compareStart, endDate: compareEnd, label: 'เทียบเมื่อวาน' }
    }

    if (timeRange === 'this_month') {
        const compareStart = new Date(startDate)
        compareStart.setMonth(compareStart.getMonth() - 1)
        compareStart.setDate(1)
        compareStart.setHours(0, 0, 0, 0)
        const compareEnd = new Date(startDate.getTime() - 1)
        return { startDate: compareStart, endDate: compareEnd, label: 'เทียบเดือนก่อน' }
    }

    if (timeRange === 'last_month') {
        const compareEnd = new Date(startDate.getTime() - 1)
        const compareStart = new Date(startDate)
        compareStart.setMonth(compareStart.getMonth() - 1)
        compareStart.setDate(1)
        compareStart.setHours(0, 0, 0, 0)
        return { startDate: compareStart, endDate: compareEnd, label: 'เทียบเดือนก่อนหน้า' }
    }

    if (timeRange === 'last_3_months') {
        const compareEnd = new Date(startDate.getTime() - 1)
        const compareStart = new Date(startDate)
        compareStart.setMonth(compareStart.getMonth() - 3)
        compareStart.setHours(0, 0, 0, 0)
        return { startDate: compareStart, endDate: compareEnd, label: 'เทียบ 3 เดือนก่อนหน้า' }
    }

    if (timeRange === 'this_year') {
        const compareStart = new Date(startDate)
        compareStart.setFullYear(compareStart.getFullYear() - 1)
        compareStart.setHours(0, 0, 0, 0)
        const compareEnd = new Date(startDate.getTime() - 1)
        return { startDate: compareStart, endDate: compareEnd, label: 'เทียบปีก่อน' }
    }

    const duration = endDate.getTime() - startDate.getTime() + 1
    if (duration <= 0) return null

    const compareEnd = new Date(startDate.getTime() - 1)
    const compareStart = new Date(compareEnd.getTime() - duration + 1)
    compareStart.setHours(0, 0, 0, 0)

    if (timeRange === '7d') return { startDate: compareStart, endDate: compareEnd, label: 'เทียบ 7 วันก่อนหน้า' }
    if (timeRange === '30d') return { startDate: compareStart, endDate: compareEnd, label: 'เทียบ 30 วันก่อนหน้า' }
    if (timeRange === 'custom') return { startDate: compareStart, endDate: compareEnd, label: 'เทียบช่วงก่อนหน้า' }

    return { startDate: compareStart, endDate: compareEnd, label: 'เทียบช่วงก่อนหน้า' }
}

function TimeRangeSelector({ timeRange, setTimeRange, customRange, setCustomRange }: any) {
    const [isOpen, setIsOpen] = useState(false)
    const selectedLabel = TIME_RANGE_OPTIONS.find(o => o.value === timeRange)?.label || 'เลือกช่วงเวลา'
    
    return (
        <div className="flex items-center gap-4">
            {timeRange === 'custom' && (
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4">
                    <input type="date" value={customRange.start} onChange={e => setCustomRange((prev: any) => ({...prev, start: e.target.value}))} className="px-3 py-1.5 text-[10px] font-black uppercase border border-gray-200 rounded-sm outline-none focus:border-black" />
                    <span className="text-[10px] font-black text-gray-400">-</span>
                    <input type="date" value={customRange.end} onChange={e => setCustomRange((prev: any) => ({...prev, end: e.target.value}))} className="px-3 py-1.5 text-[10px] font-black uppercase border border-gray-200 rounded-sm outline-none focus:border-black" />
                </div>
            )}
            <div className="relative group">
                <button 
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-2 pl-4 pr-3 py-2.5 text-[11px] font-black uppercase tracking-widest bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-all text-gray-700 focus:outline-none focus:ring-2 focus:ring-black/5"
                >
                    <Calendar size={14} className="text-gray-400 group-hover:text-black transition-colors" />
                    <span>{selectedLabel}</span>
                    <ChevronDown size={14} className={`text-gray-400 group-hover:text-black transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden py-1 animate-in fade-in slide-in-from-top-2">
                            {TIME_RANGE_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => {
                                        setTimeRange(opt.value)
                                        setIsOpen(false)
                                    }}
                                    className={`w-full text-left px-4 py-2.5 text-[11px] font-black uppercase tracking-widest transition-colors ${timeRange === opt.value ? 'bg-gray-50 text-black' : 'text-gray-500 hover:bg-gray-50 hover:text-black'}`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

export default function POSReports({ 
  profile, activeView, allowedNav, onSetView, onShiftModalOpen, activeShift, shopSettings, setViewExtraHeader
}: POSReportsProps) {
  const { locale } = useI18n();
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<TimeRange>('today')
  const [activeTab, setActiveTab] = useState<ReportTab>('overview')
  const [customRange, setCustomRange] = useState({ start: '', end: '' })
  const [showAddExpense, setShowAddExpense] = useState(false)
  
  const [financials, setFinancials] = useState<any>({
    totalRevenue: 0, totalOrders: 0, laborCost: 0, totalWorkDays: 0, theoreticalCogs: 0, otherExpenses: 0, netProfit: 0,
    salesTrend: [], menuPerformance: [], expenseList: [],
    staffList: [], workedStaff: [], paymentData: [], varianceCost: 0,
    platformGpData: [], totalGpFee: 0, netAfterGp: 0,
    averageTicketSize: 0, discountTotal: 0, hourlyHeatmap: [], topModifiers: [], voidedOrders: [],
    comparisonPct: 0, comparisonLabel: 'เทียบช่วงก่อนหน้า', comparisonBaseNetRevenue: 0, comparisonDirection: 'neutral'
  })

  useEffect(() => {
    if (timeRange !== 'custom') {
        const { startDate: start, endDate: end } = resolveDateRange(timeRange, customRange)
        setCustomRange({ start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] })
    }
  }, [timeRange])

  useEffect(() => {
    fetchData()
    
    // Setup realtime subscription
    const branchId = shopSettings?.branch_id
    const channel = supabase.channel('pos_reports_orders')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'pos_orders' 
      }, (payload) => {
        // Only fetch if it belongs to our branch (or if branch is not set/admin)
        if (!branchId || payload.new.branch_id === branchId || payload.old?.branch_id === branchId) {
          fetchData()
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [timeRange, customRange.start, customRange.end, shopSettings?.branch_id])

  useEffect(() => {
    setViewExtraHeader(
      <div className="flex items-center justify-end flex-1 gap-4">
          <TimeRangeSelector 
              timeRange={timeRange} 
              setTimeRange={setTimeRange} 
              customRange={customRange} 
              setCustomRange={setCustomRange} 
          />
      </div>
    );
    return () => setViewExtraHeader(null);
  }, [setViewExtraHeader, timeRange, customRange]);

  const fetchData = async () => {
    setLoading(true)
    try {
      const { startDate, endDate } = resolveDateRange(timeRange, customRange)
      const comparisonRange = getComparisonRange(timeRange, startDate, endDate)
      const startISO = startDate.toISOString(); const endISO = endDate.toISOString()
      const startDateStr = startDate.toISOString().split('T')[0]; const endDateStr = endDate.toISOString().split('T')[0]
      
      let currentBCode = profile?.branch_code
      let bId = shopSettings?.branch_id || null
      let bCode = null

      if (bId) {
          const { data: bInfo } = await supabase.from('branches').select('branch_code').eq('id', bId).single()
          bCode = bInfo?.branch_code
      } else {
          if (!currentBCode) {
              const { data: { user } } = await supabase.auth.getUser()
              if (user) {
                  const { data: p } = await supabase.from('profiles').select('branch_code').eq('id', user.id).single()
                  currentBCode = p?.branch_code
              }
          }
          if (currentBCode) {
              const { data: branchInfo } = await supabase.from('branches').select('id, branch_code').or(`id.eq.${currentBCode},branch_code.eq.${currentBCode}`).single()
              bId = branchInfo?.id; bCode = branchInfo?.branch_code
          }
      }

      // 0. VOIDS & CANCELLED
      const { data: voidOrdersData, error: voidError } = await supabase.from('pos_orders')
         .select('*')
         .gte('created_at', startISO).lte('created_at', endISO)
         .in('status', ['cancelled', 'voided'])
         
      if (voidError) console.error('Error fetching void orders:', voidError)
         
      const branchVoids = (voidOrdersData || []).filter(o => !bId || o.branch_id === bId || (bCode && o.branch_code === bCode))

      if (branchVoids.length > 0) {
        const staffIds = branchVoids.map(o => o.staff_id).filter(Boolean)
        if (staffIds.length > 0) {
          const { data: staffProfiles } = await supabase.from('profiles').select('*').in('id', staffIds)
          if (staffProfiles) {
            branchVoids.forEach(o => {
              const profile = staffProfiles.find((p: any) => p.id === o.staff_id)
              if (profile) o.profiles = profile
            })
          }
        }
      }

      // 1. REVENUE
      const { data: allOrders } = await supabase.from('pos_orders').select('*').gte('created_at', startISO).lte('created_at', endISO).in('status', ['paid', 'completed'])
      const branchOrders = (allOrders || []).filter(o => !bId || o.branch_id === bId || (bCode && o.branch_code === bCode))
      const totalRevenue = branchOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
      const totalOrders = branchOrders.length
      const averageTicketSize = totalOrders > 0 ? totalRevenue / totalOrders : 0
      const discountTotal = branchOrders.reduce((sum, o) => sum + (Number(o.discount_amount) || 0), 0)
      const netRevenue = totalRevenue - discountTotal

      let comparisonPct = 0
      let comparisonBaseNetRevenue = 0
      let comparisonDirection: 'up' | 'down' | 'neutral' = 'neutral'
      const comparisonLabel = comparisonRange?.label || 'ไม่มีช่วงเปรียบเทียบ'

      if (comparisonRange) {
        const compareStartISO = comparisonRange.startDate.toISOString()
        const compareEndISO = comparisonRange.endDate.toISOString()
        const { data: previousOrders } = await supabase
          .from('pos_orders')
          .select('*')
          .gte('created_at', compareStartISO)
          .lte('created_at', compareEndISO)
          .in('status', ['paid', 'completed'])

        const branchPreviousOrders = (previousOrders || []).filter(o => !bId || o.branch_id === bId || (bCode && o.branch_code === bCode))
        const previousRevenue = branchPreviousOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
        const previousDiscount = branchPreviousOrders.reduce((sum, o) => sum + (Number(o.discount_amount) || 0), 0)
        comparisonBaseNetRevenue = previousRevenue - previousDiscount

        if (comparisonBaseNetRevenue === 0) {
          comparisonPct = netRevenue > 0 ? 100 : 0
        } else {
          comparisonPct = ((netRevenue - comparisonBaseNetRevenue) / Math.abs(comparisonBaseNetRevenue)) * 100
        }

        if (comparisonPct > 0.01) comparisonDirection = 'up'
        else if (comparisonPct < -0.01) comparisonDirection = 'down'
      }

      const trendMap: Record<string, number> = {}
      const paymentBreakdown: Record<string, number> = {}
      const hourlyHeatmapRaw: Record<number, { revenue: number, orders: number }> = {}

      for (let i = 0; i < 24; i++) hourlyHeatmapRaw[i] = { revenue: 0, orders: 0 }

      branchOrders.forEach(o => {
          const d = new Date(o.created_at); const k = timeRange === 'today' ? d.getHours().toString().padStart(2, '0') + ':00' : d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })
          trendMap[k] = (trendMap[k] || 0) + (o.total_amount || 0)
          
          const hour = d.getHours()
          hourlyHeatmapRaw[hour].revenue += (o.total_amount || 0)
          hourlyHeatmapRaw[hour].orders += 1

          const pm = o.payment_method || 'unknown'
          paymentBreakdown[pm] = (paymentBreakdown[pm] || 0) + (o.total_amount || 0)
      })
      const paymentData = Object.entries(paymentBreakdown).map(([method, amount]) => ({ method, amount }))
      const hourlyHeatmap = Object.entries(hourlyHeatmapRaw).map(([hour, data]) => ({ hour: `${hour.toString().padStart(2, '0')}:00`, revenue: data.revenue, orders: data.orders }))

      // 1b. PLATFORM GP BREAKDOWN
      const platformGpMap: Record<string, { revenue: number; gpFee: number; orders: number }> = {}
      branchOrders.forEach(o => {
        if (o.order_type === 'delivery' && o.delivery_platform) {
          const p = o.delivery_platform
          if (!platformGpMap[p]) platformGpMap[p] = { revenue: 0, gpFee: 0, orders: 0 }
          platformGpMap[p].revenue += (o.total_amount || 0)
          platformGpMap[p].gpFee += (Number(o.delivery_gp_amount) || 0)
          platformGpMap[p].orders += 1
        }
      })
      const platformGpData = Object.entries(platformGpMap).map(([platform, data]) => ({
        platform,
        revenue: data.revenue,
        gpFee: data.gpFee,
        netReceived: data.revenue - data.gpFee,
        orders: data.orders,
        gpRate: data.revenue > 0 ? ((data.gpFee / data.revenue) * 100).toFixed(1) : '0.0'
      }))
      const totalGpFee = platformGpData.reduce((sum, p) => sum + p.gpFee, 0)

      // 2. STAFF & ATTENDANCE (Filter by Branch AND Staff Type 'cafe' AND NOT POS Account)
      const { data: allStaff } = await supabase.from('profiles').select('*').eq('role', 'staff')
      const branchStaff = (allStaff || []).filter(s => 
          (!bId || s.branch_id === bId || (bCode && s.branch_code === bCode)) && 
          s.staff_type === 'cafe' &&
          s.is_pos_account !== true
      )
      
      let totalLaborCost = 0; let totalWorkDays = 0; const workedStaffList: any[] = []
      
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const reportDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

      if (branchStaff.length > 0) {
          const staffIds = branchStaff.map(s => s.id)
          const { data: logs } = await supabase.from('attendance_logs').select('*').in('profile_id', staffIds).gte('timestamp', startISO).lte('timestamp', endISO)
          
          branchStaff.forEach(s => {
              const sLogs = (logs || []).filter(l => l.profile_id === s.id)
              const stats = calculateAttendanceStats(sLogs, s.shift_start || "08:30", s.shift_end || "17:30")
              
              if (s.salary_type === 'monthly') {
                  const baseMonthly = s.daily_wage || 0;
                  const daysInMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate();
                  const dailyRate = baseMonthly / daysInMonth;
                  
                  let staffCost = dailyRate * reportDays;
                  const otHours = stats.approvedOtMinutes / 60;
                  staffCost += otHours * (s.overtime_rate_per_hour || 0);

                  totalLaborCost += staffCost;
                  totalWorkDays += reportDays;
                  workedStaffList.push({ name: s.display_name || `${s.first_name || ''} ${s.last_name || ''} (รายเดือน)`, wage: staffCost, days: reportDays })
              } else {
                  const salary = calculateSalary(stats, {
                      daily_wage: s.daily_wage || 0,
                      overtime_rate_per_hour: s.overtime_rate_per_hour || 0,
                      salary_type: 'daily',
                      target_working_days: s.target_working_days || 26
                  })
                  if (stats.daysWorked > 0) {
                      totalLaborCost += salary; totalWorkDays += stats.daysWorked
                      workedStaffList.push({ name: s.display_name || `${s.first_name || ''} ${s.last_name || ''}`, wage: salary, days: stats.daysWorked })
                  }
              }
          })
      }

      // Fetch inventory for dynamic cost calculation and variance
      let itemQuery = supabase.from('inventory_items').select('id, cost_price')
      if (bId) itemQuery = itemQuery.eq('branch_id', bId)
      else if (bCode) itemQuery = itemQuery.eq('branch_code', bCode)
      
      const { data: invItems } = await itemQuery
      const costMap = new Map((invItems || []).map((i: any) => [i.id, i.cost_price || 0]))

      const calculateDynamicCost = (recipe_data: any[]) => {
          return (recipe_data || []).reduce((sum: number, ing: any) => {
              const cost = costMap.get(ing.ingredient_id) || 0;
              return sum + (cost * Number(ing.quantity || 0) * (ing.factor || 1));
          }, 0);
      }

      // 3. MENU & EXPENSES
      const orderIds = branchOrders.map(o => o.id)
      let menuPerf: any[] = []
      let topModifiers: any[] = []
      let actualCogs = 0
      if (orderIds.length > 0) {
          const { data: items } = await supabase.from('pos_order_items').select('*').in('order_id', orderIds)
          const { data: menuList } = await supabase.from('pos_menu_items').select('id, name, recipe_data')
          const { data: modifierList } = await supabase.from('pos_menu_modifiers').select('id, name, recipe_data')
          const menuNameMap = new Map(menuList?.map(m => [m.id, m.name]))
          const itemAggr: Record<string, any> = {}
          const modAggr: Record<string, number> = {}

          items?.forEach(item => {
              const itemName = menuNameMap.get(item.item_id) || 'Unknown'
              if (!itemAggr[itemName]) itemAggr[itemName] = { name: itemName, quantity: 0, revenue: 0 }
              itemAggr[itemName].quantity += item.quantity || 0; itemAggr[itemName].revenue += Number(item.subtotal) || 0
              
              const menuRecipe = menuList?.find(m => m.id === item.item_id)?.recipe_data || [];
              const baseCost = calculateDynamicCost(menuRecipe);
              let modifierCost = 0;

              if (item.selected_modifiers && Array.isArray(item.selected_modifiers)) {
                  item.selected_modifiers.forEach((mod: any) => {
                      const modName = mod.name || mod.title || 'Unknown'
                      const modDb = modifierList?.find(m => m.name === modName || m.id === mod.id);
                      if (modDb) {
                          modifierCost += calculateDynamicCost(modDb.recipe_data || []);
                      }
                      modAggr[modName] = (modAggr[modName] || 0) + (item.quantity || 1)
                  })
              }

              const dynamicUnitCost = baseCost + modifierCost;
              const finalUnitCost = dynamicUnitCost > 0 ? dynamicUnitCost : (Number(item.cost_price) || 0);
              
              actualCogs += finalUnitCost * (item.quantity || 1)
          })
          menuPerf = Object.values(itemAggr).sort((a, b) => b.revenue - a.revenue)
          topModifiers = Object.entries(modAggr).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
      }

      let expenseQuery = supabase.from('pos_other_expenses')
          .select('*')
          .lte('date', endDateStr)
          .or(`expense_type.eq.monthly,date.gte.${startDateStr}`);
          
      if (bId) {
          if (bCode) expenseQuery = expenseQuery.or(`branch_id.eq.${bId},branch_code.eq.${bCode}`)
          else expenseQuery = expenseQuery.eq('branch_id', bId)
      } else if (bCode) {
          expenseQuery = expenseQuery.eq('branch_code', bCode)
      }
      const { data: expenses } = await expenseQuery
      
      let totalOtherExp = 0;
      const validExpenses: any[] = [];
      
      if (expenses) {
          expenses.forEach((e: any) => {
              const eDateStr = e.date; // YYYY-MM-DD
              const eDateObj = new Date(eDateStr);
              eDateObj.setHours(0,0,0,0);
              const isWithinRange = eDateStr >= startDateStr && eDateStr <= endDateStr;
              
              if (e.expense_type === 'monthly') {
                  let overlappingDays = 0;
                  let proratedAmount = 0;
                  
                  // Start counting from startDate or eDateObj, whichever is later
                  const countStart = new Date(Math.max(startDate.getTime(), eDateObj.getTime()));
                  const countEnd = new Date(endDate);
                  
                  for(let d = new Date(countStart); d <= countEnd; d.setDate(d.getDate() + 1)) {
                      const daysInThisMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
                      const dailyRate = Number(e.amount) / daysInThisMonth;
                      proratedAmount += dailyRate;
                      overlappingDays++;
                  }
                  
                  if (overlappingDays > 0) {
                      totalOtherExp += proratedAmount;
                      validExpenses.push({ 
                          ...e, 
                          proratedAmount, 
                          overlappingDays, 
                          dailyRate: Number(e.amount) / 30, // rough avg for display
                          isProrated: true 
                      });
                  }
              } else {
                  if (isWithinRange) {
                      totalOtherExp += Number(e.amount);
                      validExpenses.push({ ...e, proratedAmount: Number(e.amount), isProrated: false });
                  }
              }
          });
      }

      const netProfit = totalRevenue - discountTotal - actualCogs - totalLaborCost - totalOtherExp - totalGpFee

      // 4. INVENTORY VARIANCE
      let varianceCost = 0
      try {
          if (invItems && invItems.length > 0) {
              const itemIds = invItems.map((i: any) => i.id)
              
              const { data: movements } = await supabase.from('inventory_movements')
                  .select('item_id, change_amount, reason')
                  .in('item_id', itemIds)
                  .gte('created_at', startISO)
                  .lte('created_at', endISO)
                  
              if (movements) {
                  varianceCost = movements.reduce((sum, m) => {
                      if (m.change_amount < 0 && (m.reason === 'waste' || m.reason === 'loss' || m.reason === 'audit')) {
                          return sum + (Math.abs(m.change_amount) * costMap.get(m.item_id)!)
                      }
                      return sum
                  }, 0)
              }
          }
      } catch (e) {
          console.error('Error fetching inventory variance:', e)
      }

      setFinancials({
        totalRevenue, netRevenue, laborCost: totalLaborCost, totalWorkDays, theoreticalCogs: actualCogs, otherExpenses: totalOtherExp, netProfit, totalOrders, averageTicketSize, discountTotal, hourlyHeatmap, topModifiers, voidedOrders: branchVoids,
        salesTrend: Object.entries(trendMap).map(([name, value]) => ({ name, value })),
        menuPerformance: menuPerf, expenseList: validExpenses || [],
        staffList: branchStaff, workedStaff: workedStaffList,
        paymentData, varianceCost, platformGpData, totalGpFee, netAfterGp: netRevenue - totalGpFee,
        comparisonPct, comparisonLabel, comparisonBaseNetRevenue, comparisonDirection
      })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-3 sm:p-10 font-bold overflow-y-auto no-scrollbar bg-[#FDFDFB]">
      <div className="sm:hidden mb-8 overflow-x-auto no-scrollbar rounded-[1.75rem] bg-[#F4F4F1] p-1.5 shadow-sm">
          <div className="flex min-w-max items-center gap-2">
              {(['overview', 'menu', 'payment', 'inventory', 'expenses', 'discounts_voids'] as ReportTab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`min-w-[128px] rounded-[1.35rem] px-5 py-3 text-center text-[12px] font-black transition-all ${
                      activeTab === tab ? 'bg-white text-black shadow-sm' : 'text-gray-400'
                    }`}
                  >
                    {tab === 'overview' ? 'ภาพรวม' : tab === 'menu' ? 'อันดับขายดี' : tab === 'payment' ? 'สรุปการเงิน' : tab === 'inventory' ? 'สต็อก' : tab === 'expenses' ? 'ค่าใช้จ่าย' : 'ส่วนลด/ยกเลิก'}
                  </button>
              ))}
          </div>
      </div>

      <div className="hidden sm:flex items-center gap-1 bg-gray-50 p-1 rounded-sm border border-gray-100 mb-12 w-fit shadow-sm">
          {(['overview', 'menu', 'payment', 'inventory', 'expenses', 'discounts_voids'] as ReportTab[]).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-black shadow-sm ring-1 ring-black/5' : 'text-gray-400 hover:text-black'}`}>
                  {tab === 'overview' ? 'สรุปภาพรวม' : tab === 'menu' ? 'สินค้าขายดี' : tab === 'payment' ? 'สรุปการเงิน' : tab === 'inventory' ? 'สต็อก' : tab === 'expenses' ? 'ค่าใช้จ่ายอื่นๆ' : 'ส่วนลด/ยกเลิกบิล'}
              </button>
          ))}
      </div>

      {loading ? (
        <div className="h-[60vh] flex flex-col items-center justify-center opacity-20 font-bold gap-6">
            <Loader2 className="animate-spin" size={64} />
            <p className="text-[10px] font-black uppercase tracking-[0.4em]">{locale === 'en' ? 'กำลังคัดกรองพนักงานคาเฟ่เฉพาะสาขา...' : locale === 'zh' ? 'กำลังคัดกรองพนักงานคาเฟ่เฉพาะสาขา...' : 'กำลังคัดกรองพนักงานคาเฟ่เฉพาะสาขา...'}</p>
        </div>
      ) : (
        <div className="space-y-12 animate-in fade-in duration-700">
            {activeTab === 'overview' && <OverviewReport financials={financials} />}
            {activeTab === 'menu' && <MenuReport menuPerformance={financials.menuPerformance} topModifiers={financials.topModifiers} />}
            {activeTab === 'payment' && <PaymentReport paymentData={financials.paymentData} totalRevenue={financials.netRevenue} platformGpData={financials.platformGpData} totalGpFee={financials.totalGpFee} />}
            {activeTab === 'inventory' && <InventoryReport varianceCost={financials.varianceCost} />}
            {activeTab === 'expenses' && <ExpensesTab expenseList={financials.expenseList} total={financials.otherExpenses} onDelete={() => fetchData()} onAdd={() => setShowAddExpense(true)} />}
            {activeTab === 'discounts_voids' && <DiscountsVoidsReport discountTotal={financials.discountTotal} voidedOrders={financials.voidedOrders} />}
        </div>
      )}

      <AnimatePresence>
        {showAddExpense && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white p-10 w-full max-w-md shadow-2xl">
                    <div className="flex justify-between items-center mb-10"><h2 className="text-[12px] font-black uppercase tracking-widest">{locale === 'en' ? 'บันทึกค่าใช้จ่ายอื่นๆ' : locale === 'zh' ? 'บันทึกค่าใช้จ่ายอื่นๆ' : 'บันทึกค่าใช้จ่ายอื่นๆ'}</h2><button onClick={() => setShowAddExpense(false)}><X size={20}/></button></div>
                    <form onSubmit={async (e: any) => {
                        e.preventDefault(); const form = e.target
                        let branchCodeToSave = profile?.branch_code || 'hq'
                        if (shopSettings?.branch_id) {
                            const { data: b } = await supabase.from('branches').select('branch_code').eq('id', shopSettings.branch_id).single()
                            if (b?.branch_code) branchCodeToSave = b.branch_code
                        }
                        const { error } = await supabase.from('pos_other_expenses').insert({ 
                            name: form.name.value, amount: Number(form.amount.value), date: form.date.value, 
                            expense_type: form.expense_type.value,
                            branch_id: shopSettings?.branch_id || null,
                            branch_code: branchCodeToSave 
                        })
                        if (error) alert(error.message); else { setShowAddExpense(false); fetchData() }
                    }} className="space-y-6">
                        <input name="name" placeholder={locale === 'en' ? 'รายการ' : locale === 'zh' ? 'รายการ' : 'รายการ (เช่น ค่าเช่า, ค่าไฟ)'} required className="w-full p-4 bg-gray-50 border border-gray-100 text-[11px] font-black uppercase outline-none focus:border-black" />
                        <input name="amount" placeholder={locale === 'en' ? 'ยอดเงิน' : locale === 'zh' ? 'ยอดเงิน' : 'ยอดเงิน'} type="number" step="0.01" required className="w-full p-4 bg-gray-50 border border-gray-100 text-[11px] font-black outline-none focus:border-black" />
                        <select name="expense_type" className="w-full p-4 bg-gray-50 border border-gray-100 text-[11px] font-black outline-none focus:border-black appearance-none cursor-pointer">
                            <option value="one_time">จ่ายครั้งเดียว (One-time)</option>
                            <option value="monthly">รายเดือน/หารเฉลี่ยรายวัน (Monthly)</option>
                        </select>
                        <input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required className="w-full p-4 bg-gray-50 border border-gray-100 text-[11px] font-black outline-none focus:border-black" />
                        <button type="submit" className="w-full py-6 bg-black text-white text-[11px] font-black uppercase tracking-widest">{locale === 'en' ? 'บันทึกรายการ' : locale === 'zh' ? 'บันทึกรายการ' : 'บันทึกรายการ'}</button>
                    </form>
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  )
}

function OverviewReport({ financials }: any) {
    const { locale } = useI18n();
    const [expandLabor, setExpandLabor] = useState(false)
    const [expandExpenses, setExpandExpenses] = useState(false)
    const totalCosts = financials.theoreticalCogs + financials.laborCost + financials.otherExpenses + (financials.totalGpFee || 0)
    const comparisonPct = Number(financials.comparisonPct || 0)
    const comparisonDirection = financials.comparisonDirection || 'neutral'
    const comparisonLabel = financials.comparisonLabel || 'เทียบช่วงก่อนหน้า'
    const comparisonText = `${comparisonPct >= 0 ? '+' : ''}${comparisonPct.toFixed(1)}% ${comparisonLabel}`
    const comparisonTone = comparisonDirection === 'up'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
      : comparisonDirection === 'down'
        ? 'bg-red-50 text-red-700 border-red-100'
        : 'bg-gray-50 text-gray-500 border-gray-100'

    const mobileCharts = [
      {
        key: 'sales-trend',
        title: 'แนวโน้มรายได้',
        subtitle: 'ยอดขายตามช่วงเวลาที่เลือก',
        badge: comparisonText,
        badgeTone: comparisonTone,
        content: (
          <div className="h-[190px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={financials.salesTrend}>
                <CartesianGrid strokeDasharray="0" vertical={false} stroke="#ecebe8" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 800, fill: '#a3a3a3'}} />
                <YAxis hide />
                <Tooltip contentStyle={{backgroundColor: '#1A1A18', border: 'none', color: '#fff'}} />
                <Area type="monotone" dataKey="value" stroke="#111111" strokeWidth={3} fillOpacity={0.06} fill="#111111" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )
      },
      {
        key: 'hourly',
        title: 'ช่วงเวลาขายดี',
        subtitle: 'ดูยอดและจำนวนออเดอร์รายช่วงเวลา',
        badge: `${financials.hourlyHeatmap?.reduce((sum: number, item: any) => sum + (item.orders || 0), 0) || 0} ออเดอร์`,
        badgeTone: 'bg-[#F4F4F1] text-gray-600 border-gray-200',
        content: (
          <div className="h-[190px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financials.hourlyHeatmap}>
                <CartesianGrid strokeDasharray="0" vertical={false} stroke="#ecebe8" />
                <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 800, fill: '#a3a3a3'}} />
                <YAxis hide />
                <Tooltip contentStyle={{backgroundColor: '#1A1A18', border: 'none', color: '#fff'}} cursor={{fill: '#f5f5f5'}} />
                <Bar dataKey="revenue" fill="#1A1A18" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )
      },
      {
        key: 'cost-breakdown',
        title: 'ต้นทุนและกำไร',
        subtitle: 'ดูสัดส่วนเงินที่ออกจากยอดขาย',
        badge: financials.netProfit >= 0 ? 'กำไรสุทธิ' : 'ผลลัพธ์ติดลบ',
        badgeTone: financials.netProfit >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100',
        content: (
          <div className="space-y-3">
            {[
              { label: 'วัตถุดิบ', value: Number(financials.theoreticalCogs || 0), tone: 'bg-red-400' },
              { label: 'ค่าแรง', value: Number(financials.laborCost || 0), tone: 'bg-orange-400' },
              { label: 'ค่าใช้จ่ายอื่น', value: Number(financials.otherExpenses || 0), tone: 'bg-amber-300' },
              { label: 'GP Delivery', value: Number(financials.totalGpFee || 0), tone: 'bg-pink-300' },
              { label: 'กำไรสุทธิ', value: Math.max(Number(financials.netProfit || 0), 0), tone: 'bg-emerald-400' }
            ].filter(item => item.value > 0).map((item) => {
              const percent = financials.totalRevenue > 0 ? (item.value / financials.totalRevenue) * 100 : 0
              return (
                <div key={item.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-black">
                    <span className="text-[#1A1A18]">{item.label}</span>
                    <span className="text-gray-500">{percent.toFixed(1)}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-[#F4F4F1]">
                    <div className={`h-full rounded-full ${item.tone}`} style={{ width: `${Math.min(percent, 100)}%` }} />
                  </div>
                </div>
              )
            })}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="rounded-[1.25rem] bg-[#F8F8F6] px-4 py-3">
                <div className="text-[10px] font-black text-gray-400">ต้นทุนรวม</div>
                <div className="mt-1 text-[18px] font-black text-[#1A1A18]">฿{Number(totalCosts || 0).toLocaleString()}</div>
              </div>
              <div className="rounded-[1.25rem] bg-[#F8F8F6] px-4 py-3">
                <div className="text-[10px] font-black text-gray-400">กำไรสุทธิ</div>
                <div className={`mt-1 text-[18px] font-black ${financials.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  ฿{Number(financials.netProfit || 0).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        )
      }
    ]

    return (
        <div className="space-y-12">
            <div className="sm:hidden space-y-4">
                <div className="overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white shadow-sm">
                    <div className="flex items-start justify-between gap-3 p-4 pb-5">
                        <div>
                            <div className="text-[11px] font-black text-gray-400">รายได้สุทธิ (NET SALES)</div>
                            <div className="mt-3 text-[40px] leading-none font-black tracking-tighter text-[#1A1A18]">
                                ฿{Number(financials.netRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="mt-2 text-[10px] font-black text-gray-300">
                                ช่วงก่อนหน้า ฿{Number(financials.comparisonBaseNetRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        </div>
                        <div className={`max-w-[42%] rounded-[1rem] border px-3 py-2 text-right text-[10px] font-black leading-tight ${comparisonTone}`}>
                            {comparisonText}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 border-t border-gray-200">
                        <div className="border-r border-gray-200 p-4">
                            <div className="text-[11px] font-black text-gray-400">จำนวนบิลที่ปิด</div>
                            <div className="mt-2.5 flex items-end gap-2">
                                <span className="text-[30px] leading-none font-black text-[#1A1A18]">{financials.totalOrders || 0}</span>
                                <span className="pb-1 text-[12px] font-black text-gray-300">ออเดอร์</span>
                            </div>
                        </div>
                        <div className="p-4">
                            <div className="text-[11px] font-black text-gray-400">ยอดต่อบิลเฉลี่ย</div>
                            <div className="mt-2.5 text-[30px] leading-none font-black text-[#1A1A18]">
                                ฿{Number(financials.averageTicketSize || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3.5">
                        <div className="flex items-center gap-2.5 text-[11px] font-black text-gray-400">
                            <span className="h-2.5 w-2.5 rounded-full bg-amber-400"></span>
                            <span>ส่วนลดมอบแก่ลูกค้า</span>
                        </div>
                        <div className="text-[16px] font-black text-[#1A1A18]">
                            ฿{Number(financials.discountTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex items-end justify-between px-1">
                        <div>
                            <h3 className="text-[17px] font-black text-[#1A1A18]">กราฟสรุปภาพรวม</h3>
                            <p className="mt-1 text-[11px] font-black text-gray-300">เลื่อนซ้ายขวาเพื่อดูกราฟแต่ละมุม</p>
                        </div>
                        <div className="rounded-full bg-[#F4F4F1] px-3 py-1.5 text-[10px] font-black text-gray-500">
                            3 การ์ด
                        </div>
                    </div>
                    <div className="overflow-x-auto no-scrollbar">
                        <div className="flex gap-3 pr-3">
                            {mobileCharts.map((chart) => (
                                <div key={chart.key} className="min-w-[82vw] snap-start overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white p-4 shadow-sm">
                                    <div className="mb-4 flex items-start justify-between gap-3">
                                        <div>
                                            <h4 className="text-[15px] font-black text-[#1A1A18]">{chart.title}</h4>
                                            <p className="mt-1 text-[10px] font-black text-gray-300">{chart.subtitle}</p>
                                        </div>
                                        <div className={`rounded-full border px-3 py-1.5 text-[9px] font-black leading-none ${chart.badgeTone}`}>
                                            {chart.badge}
                                        </div>
                                    </div>
                                    {chart.content}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-[16px] font-black text-[#1A1A18]">งบกำไรขาดทุน</h3>
                        <div className={`rounded-full px-3 py-1.5 text-[10px] font-black ${financials.netProfit >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                            สุทธิ
                        </div>
                    </div>
                    <div className="space-y-2.5">
                        <div className="flex items-center justify-between rounded-[1.15rem] bg-[#F8F8F6] px-4 py-3">
                            <span className="text-[11px] font-black text-gray-400">รายได้ยอดขาย</span>
                            <span className="text-[14px] font-black text-[#1A1A18]">฿{Number(financials.totalRevenue || 0).toLocaleString()}</span>
                        </div>
                        {financials.discountTotal > 0 && (
                          <div className="flex items-center justify-between rounded-[1.15rem] bg-orange-50/70 px-4 py-3">
                              <span className="text-[11px] font-black text-orange-400">ส่วนลดที่ให้ลูกค้า</span>
                              <span className="text-[14px] font-black text-orange-600">-฿{Number(financials.discountTotal || 0).toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between rounded-[1.15rem] bg-red-50/70 px-4 py-3">
                            <span className="text-[11px] font-black text-red-400">ต้นทุนวัตถุดิบ</span>
                            <span className="text-[14px] font-black text-red-600">-฿{Number(financials.theoreticalCogs || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-[1.15rem] bg-red-50/40 px-4 py-3">
                            <span className="text-[11px] font-black text-red-400">ค่าแรงพนักงาน</span>
                            <span className="text-[14px] font-black text-red-600">-฿{Number(financials.laborCost || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-[1.15rem] bg-red-50/30 px-4 py-3">
                            <span className="text-[11px] font-black text-red-400">ค่าใช้จ่ายอื่นๆ</span>
                            <span className="text-[14px] font-black text-red-600">-฿{Number(financials.otherExpenses || 0).toLocaleString()}</span>
                        </div>
                        {financials.totalGpFee > 0 && (
                          <div className="flex items-center justify-between rounded-[1.15rem] bg-red-50/30 px-4 py-3">
                              <span className="text-[11px] font-black text-red-400">หัก GP Delivery</span>
                              <span className="text-[14px] font-black text-red-600">-฿{Number(financials.totalGpFee || 0).toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex items-end justify-between border-t border-gray-100 pt-4">
                            <span className="text-[12px] font-black text-gray-400">กำไรสุทธิ</span>
                            <span className={`text-[24px] leading-none font-black ${financials.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>฿{Number(financials.netProfit || 0).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="hidden sm:block space-y-12">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard title={locale === 'en' ? 'รายได้สุทธิ (Net Sales)' : locale === 'zh' ? 'รายได้สุทธิ (Net Sales)' : 'รายได้สุทธิ (Net Sales)'} value={financials.netRevenue} icon={<DollarSign size={20} />} color="bg-black text-white shadow-xl" noAbs={true} />
                <MetricCard title={locale === 'en' ? 'จำนวนบิล (ออเดอร์)' : locale === 'zh' ? 'จำนวนบิล' : 'จำนวนบิล (ออเดอร์)'} value={financials.totalOrders} icon={<FileText size={20} />} color="bg-white border-gray-100 text-black shadow-sm" noAbs={true} unit="บิล" />
                <MetricCard title={locale === 'en' ? 'ยอดต่อบิลเฉลี่ย' : locale === 'zh' ? 'ยอดต่อบิลเฉลี่ย' : 'ยอดต่อบิลเฉลี่ย'} value={financials.averageTicketSize} icon={<ShoppingBag size={20} />} color="bg-blue-50 text-blue-700 border-blue-100" noAbs={true} />
                <MetricCard title={locale === 'en' ? 'ส่วนลดที่ให้ลูกค้า' : locale === 'zh' ? 'ส่วนลด' : 'ส่วนลดที่ให้ลูกค้า'} value={financials.discountTotal} icon={<Wallet size={20} />} color="bg-orange-50 text-orange-700 border-orange-100" noAbs={true} />
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-white border border-[#F0F0E8] p-10 h-[400px] shadow-sm">
                    <div className="flex justify-between items-center mb-10"><h3 className="text-[11px] font-black uppercase tracking-[0.2em]">{locale === 'en' ? 'แนวโน้มรายได้ (รายวัน/รายชั่วโมง)' : locale === 'zh' ? 'แนวโน้มรายได้' : 'แนวโน้มรายได้'}</h3><TrendingUp size={16} className="text-gray-200" /></div>
                    <div className="h-[280px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={financials.salesTrend}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 900}} /><YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 900}} /><Tooltip contentStyle={{backgroundColor: '#1A1A18', border: 'none', color: '#fff'}} /><Area type="monotone" dataKey="value" stroke="#1A1A18" strokeWidth={3} fillOpacity={0.05} fill="#1A1A18" /></AreaChart></ResponsiveContainer></div>
                </div>
                
                <div className="bg-white border border-[#F0F0E8] p-10 h-[400px] shadow-sm">
                    <div className="flex justify-between items-center mb-10"><h3 className="text-[11px] font-black uppercase tracking-[0.2em]">{locale === 'en' ? 'ยอดขายตามช่วงเวลา (Heatmap)' : locale === 'zh' ? 'ยอดขายตามช่วงเวลา' : 'ยอดขายตามช่วงเวลา (Heatmap)'}</h3><Clock size={16} className="text-gray-200" /></div>
                    <div className="h-[280px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={financials.hourlyHeatmap}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" /><XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 900}} /><YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 900}} /><Tooltip contentStyle={{backgroundColor: '#1A1A18', border: 'none', color: '#fff'}} cursor={{fill: '#f5f5f5'}}/><Bar dataKey="revenue" fill="#1A1A18" radius={[4, 4, 0, 0]}><LabelList dataKey="orders" position="top" style={{fontSize: '9px', fontWeight: 'bold', fill: '#999'}} /></Bar></BarChart></ResponsiveContainer></div>
                </div>
            </div>

            <div className="bg-white border border-[#F0F0E8] p-10 shadow-sm">
                <h3 className="text-[12px] font-black uppercase tracking-widest mb-10 border-b border-gray-50 pb-6">{locale === 'en' ? 'งบกำไรขาดทุน (P&L)' : locale === 'zh' ? 'งบกำไรขาดทุน (P&L)' : 'งบกำไรขาดทุน (P&L)'}</h3>
                <div className="space-y-6">
                    <PLRow label={locale === 'en' ? 'รายได้ยอดขาย (Gross)' : locale === 'zh' ? 'รายได้ยอดขาย (Gross)' : 'รายได้ยอดขาย (Gross)'} value={financials.totalRevenue} color="text-black" />
                    <div className="pl-6 space-y-4 border-l-2 border-gray-50">
                        {financials.discountTotal > 0 && (
                            <PLRow label={locale === 'en' ? '(-) ส่วนลดที่ให้ลูกค้า' : locale === 'zh' ? '(-) ส่วนลดที่ให้ลูกค้า' : '(-) ส่วนลดที่ให้ลูกค้า'} value={-financials.discountTotal} color="text-orange-500" />
                        )}
                        <PLRow label={locale === 'en' ? '(-) ต้นทุนวัตถุดิบ (ตามจริง)' : locale === 'zh' ? '(-) ต้นทุนวัตถุดิบ' : '(-) ต้นทุนวัตถุดิบ (ตามจริง)'} value={-financials.theoreticalCogs} color="text-red-500" />
                        <div className="space-y-2">
                            <button onClick={() => setExpandLabor(!expandLabor)} className="flex items-center justify-between w-full hover:bg-gray-50 p-2 -ml-2 transition-all">
                                <div className="flex items-center gap-2"><span className="text-[10px] font-bold text-gray-400">{locale === 'en' ? '(-) ค่าแรงพนักงานคาเฟ่ (ตามจริง)' : locale === 'zh' ? '(-) ค่าแรงพนักงานคาเฟ่ (ตามจริง)' : '(-) ค่าแรงพนักงานคาเฟ่ (ตามจริง)'}</span>{expandLabor ? <ChevronUp size={10}/> : <ChevronDown size={10}/>}</div>
                                <span className="text-[12px] font-black text-red-500">{locale === 'en' ? '฿ ' : locale === 'zh' ? '฿ ' : '฿ '}{(-financials.laborCost).toLocaleString()}</span>
                            </button>
                            {expandLabor && (
                                <div className="pl-4 space-y-2">
                                    {financials.workedStaff.map((s: any, idx: number) => (
                                        <div key={idx} className="flex justify-between text-[9px] font-bold text-gray-500 bg-gray-50/50 p-2">
                                            <span>{s.name} ({s.days} {locale === 'en' ? ' วัน)' : locale === 'zh' ? ' วัน)' : ' วัน)'}</span>
                                            <span>{locale === 'en' ? '฿ ' : locale === 'zh' ? '฿ ' : '฿ '}{s.wage.toLocaleString()}</span>
                                        </div>
                                    ))}
                                    {financials.workedStaff.length === 0 && <div className="text-[8px] italic text-gray-300">{locale === 'en' ? 'ไม่มีข้อมูลการลงเวลา' : locale === 'zh' ? 'ไม่มีข้อมูลการลงเวลา' : 'ไม่มีข้อมูลการลงเวลา'}</div>}
                                </div>
                            )}
                        </div>
                        <div className="space-y-2">
                            <button onClick={() => setExpandExpenses(!expandExpenses)} className="flex items-center justify-between w-full hover:bg-gray-50 p-2 -ml-2 transition-all">
                                <div className="flex items-center gap-2"><span className="text-[10px] font-bold text-gray-400">{locale === 'en' ? '(-) ค่าใช้จ่ายอื่นๆ' : locale === 'zh' ? '(-) ค่าใช้จ่ายอื่นๆ' : '(-) ค่าใช้จ่ายอื่นๆ'}</span>{expandExpenses ? <ChevronUp size={10}/> : <ChevronDown size={10}/>}</div>
                                <span className="text-[12px] font-black text-red-500">{locale === 'en' ? '฿ ' : locale === 'zh' ? '฿ ' : '฿ '}{(-financials.otherExpenses).toLocaleString()}</span>
                            </button>
                            {expandExpenses && (
                                <div className="pl-4 space-y-2">
                                    {financials.expenseList.map((e: any, idx: number) => (
                                        <div key={idx} className="flex justify-between text-[9px] font-bold text-gray-500 bg-gray-50/50 p-2">
                                            <span>{e.name}</span>
                                            <span>{locale === 'en' ? '฿ ' : locale === 'zh' ? '฿ ' : '฿ '}{Number(e.amount).toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        {financials.totalGpFee > 0 && (
                          <PLRow
                            label={`(-) หัก GP Delivery (${financials.platformGpData.map((p: any) => p.platform.toUpperCase()).join(', ')})`}
                            value={-financials.totalGpFee}
                            color="text-red-500"
                          />
                        )}
                    </div>
                    <div className="pt-6 border-t border-black/5 flex justify-between items-end"><span className="text-[11px] font-black uppercase tracking-[0.2em]">{locale === 'en' ? 'กำไรสุทธิ' : locale === 'zh' ? 'กำไรสุทธิ' : 'กำไรสุทธิ'}</span><span className={`text-3xl font-black ${financials.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{locale === 'en' ? '฿ ' : locale === 'zh' ? '฿ ' : '฿ '}{financials.netProfit.toLocaleString()}</span></div>
                </div>
            </div>
            </div>
        </div>
    )
}

function MetricCard({ title, value, icon, color, unit = "บาท", noAbs = false }: any) {
    const displayValue = noAbs ? value : Math.abs(value)
    return (<div className={`p-8 border transition-all hover:-translate-y-1 duration-300 ${color}`}><div className="flex justify-between items-start mb-6"><div className="p-2 bg-white/10 rounded-sm">{icon}</div></div><div className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">{title}</div><div className="flex items-baseline gap-2"><span className="text-3xl font-black tracking-tighter">{displayValue.toLocaleString()}</span><span className="text-[10px] font-black uppercase opacity-60">{unit}</span></div></div>)
}

function PLRow({ label, value, color }: any) {
    const { locale } = useI18n();
    return (<div className="flex justify-between items-center group p-2 -ml-2"><span className="text-[10px] font-bold text-gray-400 group-hover:text-black transition-all">{label}</span><span className={`text-[12px] font-black ${color}`}>{locale === 'en' ? '฿ ' : locale === 'zh' ? '฿ ' : '฿ '}{value.toLocaleString()}</span></div>)
}

function MenuReport({ menuPerformance, topModifiers }: any) {
    const { locale } = useI18n(); 
    return (
        <>
        <div className="sm:hidden space-y-4">
            <div className="overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-sm">
                <h3 className="border-b border-gray-100 px-5 py-4 text-[16px] font-black text-[#1A1A18]">อันดับขายดี</h3>
                <div className="divide-y divide-gray-100">
                    {menuPerformance.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between px-5 py-4">
                          <div className="min-w-0 pr-4">
                              <div className="truncate text-[14px] font-black text-[#1A1A18]">{item.name}</div>
                              <div className="mt-1 text-[11px] font-black text-gray-400">{item.quantity} รายการ</div>
                          </div>
                          <div className="text-right text-[15px] font-black text-[#1A1A18]">฿{item.revenue.toLocaleString()}</div>
                      </div>
                    ))}
                </div>
            </div>
            <div className="overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-sm">
                <h3 className="border-b border-gray-100 px-5 py-4 text-[16px] font-black text-[#1A1A18]">ตัวเลือกเสริมยอดฮิต</h3>
                <div className="divide-y divide-gray-100">
                    {topModifiers?.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between px-5 py-4">
                          <div className="text-[14px] font-black text-[#1A1A18]">{item.name}</div>
                          <div className="text-[15px] font-black text-gray-500">{item.count}</div>
                      </div>
                    ))}
                    {(!topModifiers || topModifiers.length === 0) && <div className="px-5 py-6 text-center text-[11px] font-black text-gray-300">ไม่มีข้อมูลตัวเลือกเสริม</div>}
                </div>
            </div>
        </div>

        <div className="hidden sm:grid lg:grid-cols-2 gap-6">
            <div className="bg-white border border-[#F0F0E8] overflow-hidden shadow-sm">
                <h3 className="text-[12px] font-black uppercase tracking-widest p-6 border-b border-gray-100">{locale === 'en' ? 'สินค้าขายดี' : locale === 'zh' ? 'สินค้าขายดี' : 'สินค้าขายดี'}</h3>
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-[8px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">
                        <tr><th className="px-8 py-6">{locale === 'en' ? 'รายการเมนู' : locale === 'zh' ? 'รายการเมนู' : 'รายการเมนู'}</th><th className="px-8 py-6 text-center">{locale === 'en' ? 'quantity' : locale === 'zh' ? '数量' : 'จำนวน'}</th><th className="px-8 py-6 text-right">{locale === 'en' ? 'ยอดขายรวม' : locale === 'zh' ? 'ยอดขายรวม' : 'ยอดขายรวม'}</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {menuPerformance.map((item: any, idx: number) => (<tr key={idx} className="hover:bg-gray-50 transition-all"><td className="px-8 py-6 text-[11px] font-black uppercase">{item.name}</td><td className="px-8 py-6 text-center font-black">{item.quantity}</td><td className="px-8 py-6 text-right font-black">{locale === 'en' ? '฿ ' : locale === 'zh' ? '฿ ' : '฿ '}{item.revenue.toLocaleString()}</td></tr>))}
                    </tbody>
                </table>
            </div>
            
            <div className="bg-white border border-[#F0F0E8] overflow-hidden shadow-sm">
                <h3 className="text-[12px] font-black uppercase tracking-widest p-6 border-b border-gray-100">{locale === 'en' ? 'ตัวเลือกเสริมยอดฮิต (Modifiers/Add-ons)' : locale === 'zh' ? 'ตัวเลือกเสริมยอดฮิต' : 'ตัวเลือกเสริมยอดฮิต (Modifiers/Add-ons)'}</h3>
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-[8px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">
                        <tr><th className="px-8 py-6">ตัวเลือกเสริม</th><th className="px-8 py-6 text-right">จำนวนครั้งที่เลือก</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {topModifiers?.map((item: any, idx: number) => (<tr key={idx} className="hover:bg-gray-50 transition-all"><td className="px-8 py-6 text-[11px] font-black uppercase">{item.name}</td><td className="px-8 py-6 text-right font-black">{item.count}</td></tr>))}
                        {(!topModifiers || topModifiers.length === 0) && <tr><td colSpan={2} className="px-8 py-6 text-center text-[10px] text-gray-400 font-bold uppercase">ไม่มีข้อมูลตัวเลือกเสริม</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
        </>
    ) 
}

function PaymentReport({ paymentData, totalRevenue, platformGpData, totalGpFee }: any) {
    const { locale } = useI18n(); 
    return (
        <>
        <div className="sm:hidden space-y-4">
            <div className="rounded-[2rem] border border-gray-200 bg-white p-5 shadow-sm">
                <div className="text-[12px] font-black text-gray-400">ยอดรับรวมทั้งหมด</div>
                <div className="mt-3 text-[36px] leading-none font-black text-[#1A1A18]">฿{(totalRevenue || 0).toLocaleString()}</div>
                {totalGpFee > 0 && (
                  <div className="mt-4 rounded-2xl bg-red-50/60 px-4 py-3">
                      <div className="text-[11px] font-black text-red-400">หักค่า GP รวม</div>
                      <div className="mt-1 text-[18px] font-black text-red-600">-฿{totalGpFee.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
                  </div>
                )}
            </div>
            <div className="overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-sm">
                <h3 className="border-b border-gray-100 px-5 py-4 text-[16px] font-black text-[#1A1A18]">ช่องทางการรับชำระเงิน</h3>
                <div className="divide-y divide-gray-100">
                    {paymentData?.map((item: any, idx: number) => {
                      const percent = totalRevenue > 0 ? (item.amount / totalRevenue * 100).toFixed(1) : 0
                      return (
                        <div key={idx} className="flex items-center justify-between px-5 py-4">
                            <div>
                                <div className="text-[14px] font-black text-[#1A1A18]">{item.method === 'cash' ? 'เงินสด' : item.method === 'promptpay' ? 'พร้อมเพย์' : item.method === 'credit_card' ? 'บัตรเครดิต' : item.method}</div>
                                <div className="mt-1 text-[11px] font-black text-gray-400">{percent}%</div>
                            </div>
                            <div className="text-[15px] font-black text-emerald-600">฿{item.amount.toLocaleString()}</div>
                        </div>
                      )
                    })}
                </div>
            </div>
        </div>

        <div className="hidden sm:block bg-white border border-[#F0F0E8] overflow-hidden p-10 space-y-8">
            <h3 className="text-[14px] font-black uppercase tracking-widest border-b border-gray-100 pb-4">{locale === 'en' ? 'ช่องทางการรับชำระเงิน' : locale === 'zh' ? 'ช่องทางการรับชำระเงิน' : 'ช่องทางการรับชำระเงิน'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div>
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-[8px] font-black uppercase tracking-widest text-gray-400">
                            <tr><th className="px-6 py-4">{locale === 'en' ? 'ช่องทาง' : locale === 'zh' ? 'ช่องทาง' : 'ช่องทาง'}</th><th className="px-6 py-4 text-right">{locale === 'en' ? 'ยอดรับ (บาท)' : locale === 'zh' ? 'ยอดรับ (บาท)' : 'ยอดรับ (บาท)'}</th><th className="px-6 py-4 text-right">{locale === 'en' ? 'สัดส่วน' : locale === 'zh' ? 'สัดส่วน' : 'สัดส่วน'}</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {paymentData?.map((item: any, idx: number) => {
                                const percent = totalRevenue > 0 ? (item.amount / totalRevenue * 100).toFixed(1) : 0
                                return (
                                <tr key={idx} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-[11px] font-black uppercase">
                                        {item.method === 'cash' ? 'เงินสด' : item.method === 'promptpay' ? 'พร้อมเพย์' : item.method === 'credit_card' ? 'บัตรเครดิต' : item.method}
                                    </td>
                                    <td className="px-6 py-4 text-[11px] font-black text-right text-emerald-600">{locale === 'en' ? '฿ ' : locale === 'zh' ? '฿ ' : '฿ '}{item.amount.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-[10px] font-black text-right text-gray-400">{percent}%</td>
                                </tr>
                            )})}
                            {(!paymentData || paymentData.length === 0) && (
                                <tr><td colSpan={3} className="px-6 py-8 text-center text-[10px] text-gray-400 font-bold uppercase">{locale === 'en' ? 'ไม่มีข้อมูลการรับชำระเงิน' : locale === 'zh' ? 'ไม่มีข้อมูลการรับชำระเงิน' : 'ไม่มีข้อมูลการรับชำระเงิน'}</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="p-8 bg-gray-50 flex flex-col justify-center items-center">
                    <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">{locale === 'en' ? 'ยอดรับรวมทั้งหมด' : locale === 'zh' ? 'ยอดรับรวมทั้งหมด' : 'ยอดรับรวมทั้งหมด'}</div>
                    <div className="text-4xl font-black text-black">{locale === 'en' ? '฿ ' : locale === 'zh' ? '฿ ' : '฿ '}{(totalRevenue || 0).toLocaleString()}</div>
                    {totalGpFee > 0 && (
                      <div className="mt-4 text-center">
                        <div className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-1">หักค่า GP รวม</div>
                        <div className="text-2xl font-black text-red-600">-฿{totalGpFee.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-blue-500 mt-2 mb-1">ยอดสุทธิหลังหัก GP</div>
                        <div className="text-2xl font-black text-blue-700">฿{(totalRevenue - totalGpFee).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
                      </div>
                    )}
                </div>
            </div>

            {platformGpData && platformGpData.length > 0 && (
              <div className="mt-8">
                <h4 className="text-[12px] font-black uppercase tracking-widest border-b border-gray-100 pb-4 mb-4 flex items-center gap-2">
                  <span className="bg-red-100 text-red-700 px-2 py-0.5 text-[9px]">GP</span>
                  สรุป GP แต่ละแพลตฟอร์ม Delivery
                </h4>
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-[8px] font-black uppercase tracking-widest text-gray-400">
                    <tr>
                      <th className="px-6 py-4">แพลตฟอร์ม</th>
                      <th className="px-6 py-4 text-center">บิล</th>
                      <th className="px-6 py-4 text-right">ยอดขายรวม</th>
                      <th className="px-6 py-4 text-right text-red-500">หัก GP</th>
                      <th className="px-6 py-4 text-right">% GP</th>
                      <th className="px-6 py-4 text-right text-blue-600">ยอดสุทธิ (Net)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {platformGpData.map((p: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <span className="text-[11px] font-black uppercase bg-orange-100 text-orange-700 px-2 py-1">{p.platform}</span>
                        </td>
                        <td className="px-6 py-4 text-center text-[11px] font-black text-gray-500">{p.orders}</td>
                        <td className="px-6 py-4 text-right text-[11px] font-black text-emerald-600">฿{p.revenue.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right text-[11px] font-black text-red-600">-฿{p.gpFee.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                        <td className="px-6 py-4 text-right text-[10px] font-black text-gray-400">{p.gpRate}%</td>
                        <td className="px-6 py-4 text-right text-[11px] font-black text-blue-700">฿{p.netReceived.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 font-black">
                      <td className="px-6 py-4 text-[10px] font-black uppercase text-gray-600" colSpan={3}>รวมทั้งหมด</td>
                      <td className="px-6 py-4 text-right text-[11px] font-black text-red-600">-฿{platformGpData.reduce((s: number, p: any) => s + p.gpFee, 0).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                      <td></td>
                      <td className="px-6 py-4 text-right text-[11px] font-black text-blue-700">฿{platformGpData.reduce((s: number, p: any) => s + p.netReceived, 0).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
        </div>
        </>
    ) 
}

function ExpensesTab({ expenseList, total, onDelete, onAdd }: any) {
    const { locale } = useI18n(); 
    return (
        <div className="space-y-8">
            <div className="sm:hidden space-y-4">
                <div className="rounded-[2rem] bg-black p-5 text-white shadow-sm">
                    <div className="text-[11px] font-black text-white/60">รวมค่าใช้จ่าย</div>
                    <div className="mt-3 text-[32px] leading-none font-black">฿{total.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2})}</div>
                    <button onClick={onAdd} className="mt-5 rounded-2xl bg-white px-4 py-3 text-[12px] font-black text-black">เพิ่มรายการ</button>
                </div>
                <div className="space-y-3">
                    {expenseList.map((e: any) => (
                      <div key={e.id} className="rounded-[1.75rem] border border-gray-200 bg-white p-4 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                              <div>
                                  <div className="text-[14px] font-black text-[#1A1A18]">{e.name}</div>
                                  <div className="mt-1 text-[11px] font-black text-gray-400">{e.date}</div>
                              </div>
                              <button onClick={async () => {
                                const { supabase } = await import('@/lib/supabaseClient');
                                if (confirm('คุณต้องการลบรายการนี้ใช่หรือไม่?')) {
                                    await supabase.from('pos_other_expenses').delete().eq('id', e.id);
                                    onDelete();
                                }
                              }} className="text-gray-300 transition-colors hover:text-red-600"><Trash2 size={16}/></button>
                          </div>
                          <div className="mt-4 flex items-center justify-between">
                              <span className={`rounded-full px-3 py-1 text-[10px] font-black ${e.isProrated ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{e.isProrated ? 'รายเดือน' : 'ครั้งเดียว'}</span>
                              <span className="text-[16px] font-black text-red-600">-฿{e.proratedAmount.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2})}</span>
                          </div>
                      </div>
                    ))}
                    {expenseList.length === 0 && <div className="rounded-[1.75rem] border border-gray-200 bg-white px-5 py-6 text-center text-[11px] font-black text-gray-300 shadow-sm">ไม่มีรายการค่าใช้จ่าย</div>}
                </div>
            </div>

            <div className="hidden sm:block space-y-8">
            <div className="flex justify-between items-end">
                <div><h3 className="text-[14px] font-black uppercase tracking-widest">{locale === 'en' ? 'การจัดการค่าใช้จ่ายอื่นๆ' : locale === 'zh' ? 'การจัดการค่าใช้จ่ายอื่นๆ' : 'การจัดการค่าใช้จ่ายอื่นๆ'}</h3></div>
                <button onClick={onAdd} className="px-6 py-4 bg-black text-white text-[10px] font-black uppercase">{locale === 'en' ? 'Add item' : locale === 'zh' ? '添加项目' : 'เพิ่มรายการ'}</button>
            </div>
            <div className="grid lg:grid-cols-4 gap-6">
                <div className="p-8 bg-black text-white border shadow-xl">
                    <div className="text-[10px] font-black mb-2 opacity-60">{locale === 'en' ? 'รวมช่วงเวลานี้' : locale === 'zh' ? 'รวมช่วงเวลานี้' : 'รวมค่าใช้จ่ายเฉลี่ย (ตามช่วงเวลา)'}</div>
                    <div className="text-3xl font-black">{locale === 'en' ? '฿ ' : locale === 'zh' ? '฿ ' : '฿ '}{total.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2})}</div>
                </div>
                <div className="lg:col-span-3 bg-white border border-[#F0F0E8] overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-[8px] font-black uppercase tracking-widest text-gray-400">
                            <tr>
                                <th className="px-8 py-4">{locale === 'en' ? 'date' : locale === 'zh' ? '日期' : 'วันที่บันทึก'}</th>
                                <th className="px-8 py-4">{locale === 'en' ? 'รายการ' : locale === 'zh' ? 'รายการ' : 'รายการ'}</th>
                                <th className="px-8 py-4">{locale === 'en' ? 'ประเภท' : locale === 'zh' ? 'ประเภท' : 'ประเภท'}</th>
                                <th className="px-8 py-4 text-right">{locale === 'en' ? 'ยอดที่หัก (บาท)' : locale === 'zh' ? 'ยอดที่หัก' : 'ยอดที่นำมาหัก (ตามวัน)'}</th>
                                <th className="px-8 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {expenseList.map((e: any) => (
                                <tr key={e.id} className="hover:bg-gray-50">
                                    <td className="px-8 py-4 text-[10px] font-black text-gray-500">{e.date}</td>
                                    <td className="px-8 py-4">
                                        <div className="text-[11px] font-black uppercase">{e.name}</div>
                                        <div className="text-[9px] font-black text-gray-400">ยอดเต็ม: ฿{Number(e.amount).toLocaleString()}</div>
                                    </td>
                                    <td className="px-8 py-4">
                                        <span className={`px-2 py-1 text-[9px] font-black uppercase rounded-sm ${e.isProrated ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {e.isProrated ? 'รายเดือน (หารเฉลี่ย)' : 'ครั้งเดียว'}
                                        </span>
                                        {e.isProrated && <div className="text-[9px] font-black text-gray-400 mt-1">นำมาคิด {e.overlappingDays} วัน (วันละ ฿{e.dailyRate?.toLocaleString(undefined, {maximumFractionDigits:2})})</div>}
                                    </td>
                                    <td className="px-8 py-4 text-[11px] font-black text-right text-red-600">
                                        -฿ {e.proratedAmount.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2})}
                                    </td>
                                    <td className="px-8 py-4 text-right">
                                        <button onClick={async () => {
                                            const { supabase } = await import('@/lib/supabaseClient');
                                            if (confirm('คุณต้องการลบรายการนี้ใช่หรือไม่?')) {
                                                await supabase.from('pos_other_expenses').delete().eq('id', e.id);
                                                onDelete();
                                            }
                                        }} className="text-gray-300 hover:text-red-600 transition-colors p-2"><Trash2 size={16}/></button>
                                    </td>
                                </tr>
                            ))}
                            {expenseList.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-8 py-10 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">ไม่มีรายการค่าใช้จ่าย</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            </div>
        </div>
    )
}
function InventoryReport({ varianceCost }: any) {
    const { locale } = useI18n(); return <>
      <div className="sm:hidden rounded-[2rem] border border-gray-200 bg-white p-5 shadow-sm"><div className="text-[12px] font-black text-gray-400">{locale === 'en' ? 'ความสูญเสียในสต็อก' : locale === 'zh' ? 'ความสูญเสียในสต็อก' : 'ความสูญเสียในสต็อก'}</div><div className="mt-4 text-[34px] font-black text-red-600">฿{Math.abs(varianceCost).toLocaleString()}</div><div className="mt-2 text-[11px] font-black text-gray-300">{locale === 'en' ? 'มูลค่าความสูญเสียรวมจากการนับสต็อก' : locale === 'zh' ? 'มูลค่าความสูญเสียรวมจากการนับสต็อก' : 'มูลค่าความสูญเสียรวมจากการนับสต็อก'}</div></div>
      <div className="hidden sm:block bg-white border border-[#F0F0E8] overflow-hidden"><div className="p-8 border-b border-[#F0F0E8] bg-gray-50/50"><h3 className="text-[11px] font-black uppercase tracking-widest">{locale === 'en' ? 'ความสูญเสียในสต็อก' : locale === 'zh' ? 'ความสูญเสียในสต็อก' : 'ความสูญเสียในสต็อก'}</h3></div><div className="p-20 text-center"><div className="text-4xl font-black text-red-600 mb-4">{locale === 'en' ? '฿ ' : locale === 'zh' ? '฿ ' : '฿ '}{Math.abs(varianceCost).toLocaleString()}</div><div className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{locale === 'en' ? 'มูลค่าความสูญเสียรวมจากการนับสต็อก' : locale === 'zh' ? 'มูลค่าความสูญเสียรวมจากการนับสต็อก' : 'มูลค่าความสูญเสียรวมจากการนับสต็อก'}</div></div></div>
    </> }
function DiscountsVoidsReport({ discountTotal, voidedOrders }: any) {
    const { locale } = useI18n(); 
    return (
        <div className="space-y-8">
            <div className="sm:hidden space-y-4">
                <div className="rounded-[2rem] border border-blue-100 bg-blue-50 p-5 shadow-sm">
                    <div className="text-[11px] font-black text-blue-400">สรุปส่วนลดและโปรโมชั่น</div>
                    <div className="mt-3 text-[32px] leading-none font-black text-blue-700">฿{discountTotal.toLocaleString()}</div>
                </div>
                <div className="rounded-[2rem] border border-red-100 bg-red-50 p-5 shadow-sm">
                    <div className="text-[11px] font-black text-red-400">มูลค่าบิลที่ถูกยกเลิก</div>
                    <div className="mt-3 text-[32px] leading-none font-black text-red-700">฿{voidedOrders.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0).toLocaleString()}</div>
                    <div className="mt-2 text-[11px] font-black text-red-300">{voidedOrders.length} บิล</div>
                </div>
                <div className="overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-sm">
                    <h3 className="border-b border-gray-100 px-5 py-4 text-[16px] font-black text-[#1A1A18]">Void Report</h3>
                    <div className="divide-y divide-gray-100">
                        {voidedOrders.map((o: any, idx: number) => (
                          <div key={idx} className="px-5 py-4">
                              <div className="flex items-start justify-between gap-3">
                                  <div>
                                      <div className="text-[13px] font-black text-[#1A1A18]">{o.order_number}</div>
                                      <div className="mt-1 text-[11px] font-black text-gray-400">{new Date(o.created_at).toLocaleString('th-TH')}</div>
                                  </div>
                                  <div className="text-[14px] font-black text-red-500">฿{o.total_amount.toLocaleString()}</div>
                              </div>
                              <div className="mt-2 text-[11px] font-black text-gray-500">{o.void_reason || '-'}</div>
                          </div>
                        ))}
                        {voidedOrders.length === 0 && <div className="px-5 py-6 text-center text-[11px] font-black text-gray-300">ไม่มีรายการยกเลิกบิลในช่วงเวลานี้</div>}
                    </div>
                </div>
            </div>

            <div className="hidden sm:block space-y-8">
            <div className="grid lg:grid-cols-2 gap-6">
                <div className="p-8 bg-blue-50 text-blue-700 border border-blue-100 shadow-sm">
                    <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">สรุปส่วนลดและโปรโมชั่น (Discount)</div>
                    <div className="flex items-baseline gap-2"><span className="text-4xl font-black tracking-tighter">{discountTotal.toLocaleString()}</span><span className="text-[10px] font-black uppercase opacity-60">บาท</span></div>
                    <div className="text-[9px] font-bold mt-4 opacity-70">ยอดเงินรวมที่ลดให้ลูกค้าในช่วงเวลานี้</div>
                </div>
                <div className="p-8 bg-red-50 text-red-700 border border-red-100 shadow-sm">
                    <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">มูลค่าบิลที่ถูกยกเลิก (Voided)</div>
                    <div className="flex items-baseline gap-2"><span className="text-4xl font-black tracking-tighter">{voidedOrders.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0).toLocaleString()}</span><span className="text-[10px] font-black uppercase opacity-60">บาท</span></div>
                    <div className="text-[9px] font-bold mt-4 opacity-70">จำนวนทั้งหมด {voidedOrders.length} บิลที่ถูกยกเลิก</div>
                </div>
            </div>

            <div className="bg-white border border-[#F0F0E8] overflow-hidden shadow-sm">
                <h3 className="text-[12px] font-black uppercase tracking-widest p-6 border-b border-gray-100">รายงานการยกเลิกบิล (Void Report)</h3>
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-[8px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4">วันเวลา</th>
                            <th className="px-6 py-4">หมายเลขบิล</th>
                            <th className="px-6 py-4">พนักงานที่ทำรายการ</th>
                            <th className="px-6 py-4">เหตุผลในการยกเลิก</th>
                            <th className="px-6 py-4 text-right text-red-500">มูลค่าบิล</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {voidedOrders.map((o: any, idx: number) => (
                            <tr key={idx} className="hover:bg-gray-50 transition-all">
                                <td className="px-6 py-4 text-[10px] font-black">{new Date(o.created_at).toLocaleString('th-TH')}</td>
                                <td className="px-6 py-4 text-[11px] font-black uppercase">{o.order_number}</td>
                                <td className="px-6 py-4 text-[11px] font-black">{o.profiles?.display_name || o.profiles?.full_name || o.profiles?.first_name || o.cashier_name || 'ไม่ระบุ'}</td>
                                <td className="px-6 py-4 text-[11px] font-bold text-gray-500">{o.void_reason || '-'}</td>
                                <td className="px-6 py-4 text-[11px] font-black text-right text-red-500">฿{o.total_amount.toLocaleString()}</td>
                            </tr>
                        ))}
                        {voidedOrders.length === 0 && (
                            <tr><td colSpan={5} className="px-6 py-8 text-center text-[10px] text-gray-400 font-bold uppercase">ไม่มีรายการยกเลิกบิลในช่วงเวลานี้</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            </div>
        </div>
    ) 
}
