'use client'

import Link from 'next/link'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../../../lib/supabaseClient'
import { useI18n } from '@/lib/I18nContext'
import { appCopy, pickLocalizedText } from '@/lib/appLocale'
import { formatDateByLocale } from '@/lib/localeFormat'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  TrendingUp, 
  Calendar, 
  Home as HomeIcon, 
  Star, 
  ChevronRight, 
  Activity, 
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight
} from 'lucide-react'
import { format, startOfWeek, addDays, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns'
import { th, enUS } from 'date-fns/locale'

// --- Types ---
type JobAssignmentRow = {
  id: string
  order_id: string | null
  staff_id: string
  status: string
  notes?: string | null
  created_at: string
  updated_at: string
  completed_at?: string | null
}

type OrderRow = {
  id: string
  order_code?: string | null
  status?: string | null
  scheduled_date?: string | null
  created_at?: string | null
  house_id?: string | null
  service_id?: string | null
}

type WorkReportFeedbackRow = {
  id: string
  report_id: string
  feedback_type: 'rating' | 'issue'
  rating?: number | null
  comment_message?: string | null
  issue_message?: string | null
  created_at?: string | null
}

type HouseRow = {
  id: string
  name: string
  address?: string | null
  house_code?: string | null
}

type CompletedItem = {
  assignment: JobAssignmentRow
  order: OrderRow
  house: HouseRow | null
  feedback: WorkReportFeedbackRow[]
}

// --- Helper Components ---

const InfographicCircle = ({ value, label, sublabel, color = "#1A3626" }: { value: number, label: string, sublabel: string, color?: string }) => {
  const radius = 36
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (value / 100) * circumference

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="relative h-24 w-24">
        <svg className="h-full w-full" viewBox="0 0 100 100">
          <circle
            className="text-[#E5E5DF]"
            strokeWidth="8"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx="50"
            cy="50"
          />
          <motion.circle
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeLinecap="round"
            stroke={color}
            fill="transparent"
            r={radius}
            cx="50"
            cy="50"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-xl font-bold text-[#1A1A1A]">
          {label}
        </div>
      </div>
      <div className="mt-3 text-center">
        <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#1A1A1A]">{sublabel}</div>
      </div>
    </div>
  )
}

const DateScroller = ({ selectedDate, onDateSelect, jobs }: { selectedDate: Date, onDateSelect: (d: Date) => void, jobs: CompletedItem[] }) => {
  const { locale } = useI18n()
  const dfnsLocale = locale === 'th' ? th : enUS
  
  // Generate 14 days centered around today
  const days = useMemo(() => {
    const today = new Date()
    return Array.from({ length: 14 }).map((_, i) => addDays(today, i - 3))
  }, [])

  return (
    <div className="no-scrollbar flex gap-3 overflow-x-auto pb-4 pt-2">
      {days.map((day) => {
        const active = isSameDay(day, selectedDate)
        const hasJobs = jobs.some(j => {
          const dateStr = j.assignment.completed_at || j.order.scheduled_date
          return dateStr && isSameDay(new Date(dateStr), day)
        })

        return (
          <button
            key={day.toISOString()}
            onClick={() => onDateSelect(day)}
            className={`relative flex h-20 w-14 shrink-0 flex-col items-center justify-center transition-all ${
              active ? 'bg-[#1A3626] text-white shadow-lg' : 'bg-white text-[#666666] border border-[#E5E5DF]'
            }`}
          >
            <div className="text-[10px] font-bold uppercase tracking-wider">{format(day, 'EEE', { locale: dfnsLocale })}</div>
            <div className="text-lg font-bold">{format(day, 'd')}</div>
            {hasJobs && (
              <div className={`mt-1 h-1 w-1 rounded-full ${active ? 'bg-white' : 'bg-[#1A3626]'}`} />
            )}
          </button>
        )
      })}
    </div>
  )
}

// --- Main Page ---

export default function StaffReportsPage() {
  const { locale } = useI18n()
  const [items, setItems] = useState<CompletedItem[]>([])
  const [houses, setHouses] = useState<HouseRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date())

  useEffect(() => {
    const load = async () => {
      if (!supabase) return
      setLoading(true)
      try {
        const { data: authData } = await supabase.auth.getUser()
        const user = authData?.user
        if (!user) throw new Error('Unauthorized')

        // Fetch all houses for overview
        const { data: housesData } = await supabase.from('houses').select('id, name, address, house_code')
        setHouses(housesData || [])

        // Fetch assignments (all, but typically limited to staff's domain in RLS)
        const { data: assignments, error: assignmentError } = await supabase
          .from('job_assignments')
          .select('id, order_id, staff_id, status, completed_at, updated_at')
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })

        if (assignmentError) throw assignmentError

        const safeAssignments = (assignments as JobAssignmentRow[]) || []
        const orderIds = safeAssignments.map(a => a.order_id).filter((id): id is string => !!id)

        if (orderIds.length === 0) {
          setItems([])
          return
        }

        const { data: orders } = await supabase
          .from('orders')
          .select('id, order_code, scheduled_date, created_at, house_id')
          .in('id', orderIds)

        const orderMap = new Map((orders || []).map(o => [o.id, o]))
        const houseMap = new Map((housesData || []).map(h => [h.id, h]))

        // Fetch feedback for all reports
        const { data: reports } = await supabase
          .from('work_reports')
          .select('id, job_assignment_id')
          .in('job_assignment_id', safeAssignments.map(a => a.id))

        const reportIds = (reports || []).map(r => r.id)
        const { data: feedback } = reportIds.length 
          ? await supabase.from('work_report_feedback').select('*').in('report_id', reportIds)
          : { data: [] }

        const feedbackByAssignmentId = new Map<string, WorkReportFeedbackRow[]>()
        reports?.forEach(r => {
          const f = feedback?.filter(fb => fb.report_id === r.id) || []
          feedbackByAssignmentId.set(r.job_assignment_id, f)
        })

        const merged: CompletedItem[] = safeAssignments.map(assignment => ({
          assignment,
          order: orderMap.get(assignment.order_id!) || { id: assignment.order_id! },
          house: houseMap.get(orderMap.get(assignment.order_id!)?.house_id!) || null,
          feedback: feedbackByAssignmentId.get(assignment.id) || []
        }))

        setItems(merged)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // --- Derived Data ---
  const stats = useMemo(() => {
    const totalJobs = items.length
    const avgRating = items.reduce((acc, item) => {
      const r = item.feedback.find(f => f.feedback_type === 'rating')?.rating || 0
      return acc + r
    }, 0) / (items.filter(item => item.feedback.some(f => f.feedback_type === 'rating')).length || 1)

    const thisWeekJobs = items.filter(item => {
      const d = new Date(item.assignment.completed_at || item.order.created_at || "")
      return d >= startOfWeek(new Date())
    }).length

    const targetJobs = 12 // Example target
    const weeklyProgress = Math.min(Math.round((thisWeekJobs / targetJobs) * 100), 100)
    const satisfactionScore = Math.round((avgRating / 5) * 100)

    return { totalJobs, weeklyProgress, satisfactionScore, avgRating }
  }, [items])

  const filteredJobs = useMemo(() => {
    return items.filter(j => {
      const dateStr = j.assignment.completed_at || j.order.scheduled_date
      return dateStr && isSameDay(new Date(dateStr), selectedDate)
    })
  }, [items, selectedDate])

  const houseHealth = useMemo(() => {
    return houses.map(house => {
      const lastJob = items.find(item => item.house?.id === house.id)
      const lastDate = lastJob ? new Date(lastJob.assignment.completed_at || lastJob.order.created_at || "") : null
      const daysSince = lastDate ? Math.floor((new Date().getTime() - lastDate.getTime()) / (1000 * 3600 * 24)) : 999
      return { ...house, daysSince, lastDate }
    }).sort((a, b) => b.daysSince - a.daysSince)
  }, [houses, items])

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[#FAF9F6] font-serif italic text-[#1A3626]">Curating reports...</div>

  return (
    <div className="customer-editorial-page pb-20">
      <div className="customer-editorial-container max-w-[500px]">
        
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <span className="customer-editorial-kicker">Operations Intelligence</span>
              <h1 className="customer-editorial-title">Reports</h1>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1A3626] text-white">
              <TrendingUp size={18} />
            </div>
          </div>
        </header>

        {/* Infographic Stats */}
        <section className="mb-8 grid grid-cols-2 gap-4">
          <div className="customer-editorial-card flex flex-col items-center justify-center">
            <InfographicCircle 
              value={stats.weeklyProgress} 
              label={`${stats.weeklyProgress}%`} 
              sublabel="Weekly Goal" 
            />
          </div>
          <div className="customer-editorial-card flex flex-col items-center justify-center">
            <InfographicCircle 
              value={stats.satisfactionScore} 
              label={stats.avgRating.toFixed(1)} 
              sublabel="Satisfaction" 
              color="#A45A2A"
            />
          </div>
        </section>

        {/* Unified Calendar */}
        <section className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[#1A1A1A]">Operational Flow</h2>
            <span className="text-[10px] text-[#A3A3A3]">{format(selectedDate, 'MMMM yyyy')}</span>
          </div>
          <DateScroller 
            selectedDate={selectedDate} 
            onDateSelect={setSelectedDate} 
            jobs={items} 
          />

          <AnimatePresence mode="wait">
            <motion.div
              key={selectedDate.toISOString()}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 space-y-3"
            >
              {filteredJobs.length === 0 ? (
                <div className="customer-editorial-empty py-8">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[#A3A3A3]">No deployments this day</div>
                </div>
              ) : (
                filteredJobs.map(job => (
                  <div key={job.assignment.id} className="customer-editorial-list-item bg-white p-4">
                    <div className="flex-1">
                      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#A45A2A]">
                        {job.house?.name || "Private Estate"}
                      </div>
                      <div className="mt-1 font-serif text-lg text-[#1A1A1A]">
                        {job.order.order_code || "Standard Care"}
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-[10px] text-[#666666]">
                        <span className="flex items-center gap-1"><Clock size={10} /> Completed</span>
                        <span className="flex items-center gap-1">
                          <Star size={10} className="fill-amber-400 text-amber-400" /> 
                          {job.feedback.find(f => f.feedback_type === 'rating')?.rating || "No rating"}
                        </span>
                      </div>
                    </div>
                    <Link href={`/dashboard/staff/tasks/${job.assignment.id}`} className="flex h-10 w-10 items-center justify-center border border-[#E5E5DF]">
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                ))
              )}
            </motion.div>
          </AnimatePresence>
        </section>

        {/* Property Health / Aggregate View */}
        <section className="mb-8">
          <div className="mb-4">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[#1A1A1A]">Property Health Overview</h2>
          </div>
          <div className="no-scrollbar flex gap-4 overflow-x-auto pb-4">
            {houseHealth.slice(0, 5).map((house) => {
              const isDue = house.daysSince > 14
              return (
                <div key={house.id} className="customer-editorial-card w-[200px] shrink-0 border-t-2 border-[#1A3626]">
                  <div className="flex justify-between items-start">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3]">{house.house_code || 'Estate'}</div>
                    {isDue ? <AlertCircle size={14} className="text-red-500" /> : <CheckCircle2 size={14} className="text-green-600" />}
                  </div>
                  <div className="mt-3 font-serif text-xl leading-tight text-[#1A1A1A] line-clamp-2 min-h-[3rem]">
                    {house.name}
                  </div>
                  <div className="mt-4 pt-4 border-t border-[#E5E5DF]">
                    <div className="text-[10px] text-[#666666]">Last Deployment</div>
                    <div className="text-xs font-bold text-[#1A1A1A]">{house.lastDate ? format(house.lastDate, 'd MMM yyyy') : 'Never'}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Call to action */}
        <section>
          <Link href="/dashboard/staff/tasks" className="customer-editorial-button-primary w-full justify-between group">
            <span>Access Mission Control</span>
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </section>

      </div>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  )
}