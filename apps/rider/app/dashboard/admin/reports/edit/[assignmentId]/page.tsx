'use client';
import { useState, useEffect, useCallback, useRef, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { notifyStaffStarted, notifyStaffCompleted } from '@/lib/notify'
import { trackProductEvent } from '@/lib/analytics/events'
import { useI18n } from '@/lib/I18nContext'
import { appCopy, assignmentStatusLabel, pickLocalizedText } from '@/lib/appLocale'
import { formatDateByLocale } from '@/lib/localeFormat'
import { normalizeAssignmentStatus } from '@/lib/serviceFlow'
import {
  Clock,
  MapPin,
  User,
  Calendar,
  Play,
  CheckCircle,
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  Trash2,
  ChevronLeft,
  AlertCircle,
  Plus,
  Camera,
  Sparkles,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/lib/AuthContext'

type WorkReportRow = {
  id: string
  job_assignment_id: string
  order_id: string
  staff_id: string
  customer_id: string
  work_done?: string | null
  problems_found?: string | null
  recommendations?: string | null
  next_visit_date?: string | null
  next_visit_time_start?: string | null
  next_visit_time_end?: string | null
  next_visit_notes?: string | null
  before_photos?: string[] | null
  after_photos?: string[] | null
  created_at?: string
  updated_at?: string
  zones?: any[] | null
}

type WorkReportZone = {
  id: string
  name: string
  work_done: string
  photos: string[]
  beforePhotos?: string[]
  afterPhotos?: string[]
}

type UploadProgressItem = {
  id: string
  name: string
  progress: number
  status: 'uploading' | 'done' | 'error'
  previewUrl?: string
}

type UploadNotice = {
  kind: 'idle' | 'uploading' | 'success' | 'error'
  message: string
}

const UPLOAD_TIMEOUT_MS = 45000
const SAVE_REPORT_TIMEOUT_MS = 15000
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024
const MAX_IMAGE_DIMENSION = 1920

const formatLocalizedMessage = (template: string, values: Record<string, string | number>) =>
  Object.entries(values).reduce((message, [key, value]) => message.split(`{${key}}`).join(String(value)), template)

const fileNameToJpeg = (name: string) => {
  const base = (name || 'photo').replace(/\.[^.]+$/, '')
  return `${base}.jpg`
}

const inferMimeFromName = (name: string) => {
  const lower = (name || '').toLowerCase()
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.gif')) return 'image/gif'
  if (lower.endsWith('.heic')) return 'image/heic'
  if (lower.endsWith('.heif')) return 'image/heif'
  return ''
}

const loadImageElement = (file: File, locale: 'th' | 'en' | 'zh'): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    const timer = setTimeout(() => {
      URL.revokeObjectURL(url)
      reject(new Error(pickLocalizedText(locale, appCopy.staffTaskDetail.imageLoadTimeout)))
    }, 15000)
    img.onload = () => {
      clearTimeout(timer)
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      clearTimeout(timer)
      URL.revokeObjectURL(url)
      reject(new Error(pickLocalizedText(locale, appCopy.staffTaskDetail.imageReadFailed)))
    }
    img.src = url
  })

const canvasToBlob = (canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> =>
  new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 10000)
    canvas.toBlob(
      (blob) => {
        clearTimeout(timer)
        resolve(blob)
      },
      'image/jpeg',
      quality
    )
  })

const fileToDataUrl = (file: File, locale: 'th' | 'en' | 'zh'): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => reject(new Error(pickLocalizedText(locale, appCopy.staffTaskDetail.previewFailed)))
    reader.readAsDataURL(file)
  })

const createLocalPreviewUrl = async (file: File, locale: 'th' | 'en' | 'zh'): Promise<string> => {
  try {
    return URL.createObjectURL(file)
  } catch {
    return await fileToDataUrl(file, locale)
  }
}

const prepareImageForUpload = async (file: File, locale: 'th' | 'en' | 'zh'): Promise<File> => {
  const mime = file.type || inferMimeFromName(file.name) || ''
  if (!mime.startsWith('image/')) {
    throw new Error(pickLocalizedText(locale, appCopy.staffTaskDetail.imageOnly))
  }
  const fixedFile = file.type ? file : new File([file], file.name, { type: mime })
  if (fixedFile.size <= MAX_UPLOAD_BYTES) return fixedFile

  const img = await loadImageElement(fixedFile, locale)
  const longest = Math.max(img.width, img.height)
  const scale = longest > MAX_IMAGE_DIMENSION ? MAX_IMAGE_DIMENSION / longest : 1
  const width = Math.max(1, Math.round(img.width * scale))
  const height = Math.max(1, Math.round(img.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error(pickLocalizedText(locale, appCopy.staffTaskDetail.imageProcessingFailed))
  ctx.drawImage(img, 0, 0, width, height)

  const qualities = [0.82, 0.72, 0.62, 0.52, 0.42]
  for (const q of qualities) {
    const blob = await canvasToBlob(canvas, q)
    if (!blob) continue
    if (blob.size <= MAX_UPLOAD_BYTES) {
      return new File([blob], fileNameToJpeg(file.name), { type: 'image/jpeg' })
    }
  }

  const fallbackBlob = await canvasToBlob(canvas, 0.35)
  if (fallbackBlob && fallbackBlob.size <= MAX_UPLOAD_BYTES) {
    return new File([fallbackBlob], fileNameToJpeg(file.name), { type: 'image/jpeg' })
  }

  throw new Error(pickLocalizedText(locale, appCopy.staffTaskDetail.imageTooLarge))
}

const WORK_DONE_PRESET = [
  'ตัดหญ้า',
  'ตัดแต่งกิ่งไม้',
  'ใส่ปุ๋ย',
  'กำจัดวัชพืช',
  'ล้างทำความสะอาดระบบน้ำ',
  'ตรวจสอบระบบน้ำ',
  'กำจัดแมลง/ศัตรูพืช',
  'ทำความสะอาดพื้นที่',
  'ปลูกต้นไม้เพิ่ม',
  'ซ่อมแซมระบบน้ำ',
]

const PROBLEMS_PRESET = [
  'ไม่มีปัญหา',
  'พบโรคพืช',
  'พบแมลงศัตรูพืช',
  'ระบบน้ำรั่ว/อุดตัน',
  'หญ้าและวัชพืชขึ้นหนา',
  'ดินแน่น/ขาดการระบายน้ำ',
  'ต้นไม้แห้งตาย',
  'ขาดการบำรุงเป็นเวลานาน',
]

const RECOMMEND_PRESET = [
  'รดน้ำช่วงเช้า',
  'ลดปุ๋ยในช่วงนี้',
  'เพิ่มความถี่การตัดหญ้า',
  'ควรซ่อมระบบน้ำโดยเร็ว',
  'พ่นยาป้องกันแมลงเพิ่มเติม',
  'ปรับตั้งเวลารดน้ำใหม่',
  'เพิ่มปุ๋ยบำรุงดิน',
  'ตัดแต่งกิ่งเป็นประจำทุกเดือน',
]

const parseChecklist = (text: string | null | undefined, presets: string[]): [string[], string] => {
  if (!text) return [[], '']
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  const checked = lines.filter((l) => presets.includes(l))
  const extra = lines.filter((l) => !presets.includes(l)).join('\n')
  return [checked, extra]
}

const hasCompletionDraft = (args: {
  workDoneItems: string[]
  workDoneExtra: string
  problemsItems: string[]
  problemsExtra: string
  recommendItems: string[]
  recommendExtra: string
  zones: any[]
}) => {
  const notes = [
    ...args.workDoneItems,
    ...args.problemsItems,
    ...args.recommendItems,
    args.workDoneExtra.trim(),
    args.problemsExtra.trim(),
    args.recommendExtra.trim(),
  ].filter(Boolean)

  const hasZonePhoto = args.zones.some(z => 
    (Array.isArray(z.afterPhotos) && z.afterPhotos.length > 0) || 
    (Array.isArray(z.photos) && z.photos.length > 0)
  )

  return notes.length > 0 && hasZonePhoto
}

interface JobAssignment {
  id: string
  order_id: string
  staff_id: string
  assigned_date: string
  status: string
  notes?: string
  started_at?: string
  completed_at?: string
  created_at: string
  updated_at: string
}

interface ServiceOrder {
  id: string
  customer_id: string
  house_id: string
  service_id: string
  price_template_id: string
  order_code: string
  service_area: number
  base_price: number
  calculated_price: number
  total: number
  total_price?: number
  status: string
  scheduled_date?: string
  notes?: string
  created_at: string
  updated_at: string
  pricing_period?: string
  total_sessions?: number
  completed_sessions?: number
}

interface Service {
  id: string
  service_name?: string
  name?: string
  description: string
  estimated_duration?: number
}

interface Customer {
  id: string
  display_name?: string
  email: string
  phone?: string
}

interface House {
  id: string
  name: string
  address: string
}

interface TaskDetail {
  assignment: JobAssignment
  order: ServiceOrder
  service: Service
  customer: Customer
  house: House
}

export default function AdminEditReportPage({ params }: { params: { assignmentId: string } }) {
  const router = useRouter()
  const { locale } = useI18n()
  const { profile } = useAuth()
  const copy = appCopy.staffTaskDetail

  const [task, setTask] = useState<TaskDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string>('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [workNotes, setWorkNotes] = useState('')

  const [reportLoading, setReportLoading] = useState(false)
  const [reportSaving, setReportSaving] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)
  const [report, setReport] = useState<WorkReportRow | null>(null)

  const [workDoneItems, setWorkDoneItems] = useState<string[]>([])
  const [workDoneExtra, setWorkDoneExtra] = useState('')
  const [problemsItems, setProblemsItems] = useState<string[]>([])
  const [problemsExtra, setProblemsExtra] = useState('')
  const [recommendItems, setRecommendItems] = useState<string[]>([])
  const [recommendExtra, setRecommendExtra] = useState('')
  const [nextVisitDate, setNextVisitDate] = useState('')
  const [nextVisitTimeStart, setNextVisitTimeStart] = useState('')
  const [nextVisitTimeEnd, setNextVisitTimeEnd] = useState('')
  const [nextVisitNotes, setNextVisitNotes] = useState('')
  const [zones, setZones] = useState<WorkReportZone[]>([])
  const [activeUploads, setActiveUploads] = useState<Record<string, UploadProgressItem[]>>({})
  const [previousReport, setPreviousReport] = useState<any>(null)

  const fetchTaskDetail = useCallback(async () => {
    try {
      if (!supabase) throw new Error(pickLocalizedText(locale, copy.dbUnavailable))

      const { data: assignment, error: assignmentError } = await supabase
        .from('job_assignments')
        .select('*')
        .eq('id', params.assignmentId)
        .single()

      if (assignmentError) throw assignmentError
      if (!assignment) throw new Error(pickLocalizedText(locale, copy.taskNotFound))

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', assignment.order_id)
        .single()

      if (orderError) throw orderError

      const { data: service, error: serviceError } = await supabase
        .from('services')
        .select('*')
        .eq('id', order.service_id)
        .single()

      if (serviceError) throw serviceError

      const { data: customer, error: customerError } = await supabase
        .from('profiles')
        .select('id, display_name, email, phone')
        .eq('id', order.customer_id)
        .single()

      if (customerError) throw customerError

      const { data: house, error: houseError } = await supabase
        .from('houses')
        .select('*')
        .eq('id', order.house_id)
        .single()

      if (houseError) throw houseError

      setTask({ assignment, order, service, customer, house })
      setWorkNotes(assignment.notes || '')

      setReportLoading(true)

      // Fetch previous visit for continuity
      const { data: prevData } = await supabase
        .from('work_reports')
        .select('work_done, problems_found, recommendations, updated_at, created_at')
        .eq('order_id', order.id)
        .neq('job_assignment_id', assignment.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      if (prevData) setPreviousReport(prevData)

      const { data: reportData, error: reportFetchError } = await supabase
        .from('work_reports')
        .select('*')
        .eq('job_assignment_id', assignment.id)
        .maybeSingle()

      if (reportFetchError) throw reportFetchError

      const safeReport = (reportData as WorkReportRow | null) || null
      setReport(safeReport)
      const [wi, we] = parseChecklist(safeReport?.work_done, WORK_DONE_PRESET)
      const [pi, pe] = parseChecklist(safeReport?.problems_found, PROBLEMS_PRESET)
      const [ri, re] = parseChecklist(safeReport?.recommendations, RECOMMEND_PRESET)
      setWorkDoneItems(wi)
      setWorkDoneExtra(we)
      setProblemsItems(pi)
      setProblemsExtra(pe)
      setRecommendItems(ri)
      setRecommendExtra(re)
      setNextVisitDate(String(safeReport?.next_visit_date || '').slice(0, 10))
      setNextVisitTimeStart(String(safeReport?.next_visit_time_start || '').slice(0, 5))
      setNextVisitTimeEnd(String(safeReport?.next_visit_time_end || '').slice(0, 5))
      setNextVisitNotes(String(safeReport?.next_visit_notes || ''))
      setZones(
        Array.isArray(safeReport?.zones)
          ? safeReport.zones.map((z: any) => ({
              id: String(z.id || Math.random().toString(36).slice(2, 9)),
              name: String(z.name || ''),
              work_done: String(z.work_done || ''),
              photos: Array.isArray(z.photos) ? z.photos : [],
              beforePhotos: Array.isArray(z.before_photos) ? z.before_photos : [],
              afterPhotos: Array.isArray(z.after_photos) ? z.after_photos : [],
            }))
          : []
      )
    } catch (err: unknown) {
      console.error('Error fetching task:', err)
      setError(err instanceof Error ? err.message : pickLocalizedText(locale, copy.taskMissing))
    } finally {
      setLoading(false)
      setReportLoading(false)
    }
  }, [params.assignmentId, locale, copy.dbUnavailable, copy.taskNotFound, copy.taskMissing])

  useEffect(() => {
    fetchTaskDetail()
  }, [fetchTaskDetail])

  const updateTaskStatus = async (newStatus: string) => {
    if (!task) return
    setUpdating(true)
    try {
      const currentStatus = normalizeAssignmentStatus(task.assignment.status)
      const targetStatus = normalizeAssignmentStatus(newStatus)

      if (targetStatus === 'completed') {
        const hasMinimumReport = hasCompletionDraft({
          workDoneItems,
          workDoneExtra,
          problemsItems,
          problemsExtra,
          recommendItems,
          recommendExtra,
          zones,
        })
        if (!hasMinimumReport) {
          throw new Error(pickLocalizedText(locale, {
            th: 'กรุณาใส่รายละเอียดงานและรูปภาพหลังทำให้ครบถ้วนก่อนปิดงาน',
            en: 'Please fill in work details and after photos before completing.',
            zh: '请在完成前填写工作详情和完成后照片。'
          }))
        }
        await persistReportForCustomer(undefined, true)
      }

      const updates: any = { status: newStatus, notes: workNotes }
      if (newStatus === 'in_progress' && !task.assignment.started_at) updates.started_at = new Date().toISOString()
      if (newStatus === 'completed' && !task.assignment.completed_at) updates.completed_at = new Date().toISOString()

      const { error: updateError } = await supabase.from('job_assignments').update(updates).eq('id', task.assignment.id)
      if (updateError) throw updateError

      let orderStatus = task.order.status
      if (newStatus === 'completed') orderStatus = 'completed'
      else if (newStatus === 'in_progress' && orderStatus === 'confirmed') orderStatus = 'in_progress'

      if (orderStatus !== task.order.status) {
        await supabase.from('orders').update({ status: orderStatus }).eq('id', task.order.id)
      }

      await fetchTaskDetail()

      if (newStatus === 'completed') {
        const staffName = profile?.display_name || 'Admin'
        const svcName = task.service?.service_name || task.service?.name || 'บริการ'
        
        // Internal notification
        void notifyStaffCompleted(task.order.customer_id, task.order.id, staffName, svcName)
        
        // Notify customer via API for LINE Flex Message
        const session = supabase ? (await supabase.auth.getSession()).data.session : null
        await fetch('/api/staff/work-reports/notify-customer', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          credentials: 'include',
          body: JSON.stringify({ orderId: task.order.id, assignmentId: task.assignment.id }),
        })
      }

      setShowSuccess(true)
      setTimeout(() => {
        router.push(`/dashboard/admin/customers/${task.order.customer_id}`)
      }, 2000)
    } catch (err: any) {
      alert(err.message || pickLocalizedText(locale, copy.updateFailed))
    } finally {
      setUpdating(false)
    }
  }

  const handleSaveAll = async () => {
    if (!task) return
    setReportSaving(true)
    setReportError(null)
    try {
      await supabase.from('job_assignments').update({ notes: workNotes }).eq('id', task.assignment.id)
      const joinField = (items: string[], extra: string) => {
        const parts = [...items, ...(extra.trim() ? [extra.trim()] : [])]
        return parts.length ? parts.join('\n') : null
      }
      const payload = {
        job_assignment_id: task.assignment.id,
        order_id: task.order.id,
        staff_id: task.assignment.staff_id,
        customer_id: task.order.customer_id,
        work_done: joinField(workDoneItems, workDoneExtra),
        problems_found: joinField(problemsItems, problemsExtra),
        recommendations: joinField(recommendItems, recommendExtra),
        next_visit_date: nextVisitDate || null,
        next_visit_time_start: nextVisitTimeStart || null,
        next_visit_time_end: nextVisitTimeEnd || null,
        next_visit_notes: nextVisitNotes.trim() || null,
        zones: zones.map((z) => ({
          id: z.id,
          name: z.name.trim() || 'Untitled',
          work_done: z.work_done.trim(),
          photos: z.photos,
          before_photos: z.beforePhotos,
          after_photos: z.afterPhotos,
        })),
      }
      const { data: saved, error: saveError } = await supabase
        .from('work_reports')
        .upsert(payload, { onConflict: 'job_assignment_id' })
        .select('*')
        .single()
      if (saveError) throw saveError
      setReport(saved as WorkReportRow)
      trackProductEvent('admin_work_report_saved', { orderId: task.order.id })
      await fetchTaskDetail()
      alert(pickLocalizedText(locale, copy.saveSuccess))
    } catch (err: any) {
      setReportError(err.message)
    } finally {
      setReportSaving(false)
    }
  }

  const persistReportForCustomer = async (token?: string, finalize?: boolean) => {
    const joinField = (items: string[], extra: string) => {
        const parts = [...items, ...(extra.trim() ? [extra.trim()] : [])]
        return parts.length ? parts.join('\n') : null
    }
    const payload = {
      job_assignment_id: task!.assignment.id,
      order_id: task!.order.id,
      staff_id: task!.assignment.staff_id,
      customer_id: task!.order.customer_id,
      work_done: joinField(workDoneItems, workDoneExtra),
      problems_found: joinField(problemsItems, problemsExtra),
      recommendations: joinField(recommendItems, recommendExtra),
      next_visit_date: nextVisitDate || null,
      next_visit_time_start: nextVisitTimeStart || null,
      next_visit_time_end: nextVisitTimeEnd || null,
      next_visit_notes: nextVisitNotes.trim() || null,
      zones: zones.map((z) => ({
        id: z.id,
        name: z.name.trim() || 'Untitled',
        work_done: z.work_done.trim(),
        photos: z.photos,
        before_photos: z.beforePhotos,
        after_photos: z.afterPhotos,
      })),
    }
    const session = supabase ? (await supabase.auth.getSession()).data.session : null
    await fetch('/api/staff/work-reports/upsert', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      credentials: 'include',
      body: JSON.stringify(finalize ? { ...payload, finalize: true } : payload),
    })
  }

  const removePhoto = (url: string, kind: 'before' | 'after') => {
    // Legacy support, usually not needed anymore
  }

  const handleAddZone = () =>
    setZones((p) => [...p, { id: Math.random().toString(36).slice(2, 9), name: '', work_done: '', photos: [], beforePhotos: [], afterPhotos: [] }])
  const handleRemoveZone = (id: string) => {
    if (confirm('Delete?')) setZones((p) => p.filter((z) => z.id !== id))
  }
  const handleUpdateZone = (id: string, updates: Partial<WorkReportZone>) =>
    setZones((p) => p.map((z) => (z.id === id ? { ...z, ...updates } : z)))

  const uploadSingleFile = async (file: File, kind: string, token?: string, previewUrl?: string): Promise<string> => {
    if (!task) throw new Error('Task missing')
    const fileId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    // Add to progress state
    setActiveUploads((prev) => ({
      ...prev,
      [kind]: [...(prev[kind] || []), { id: fileId, name: file.name, progress: 0, status: 'uploading', previewUrl }],
    }))

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('orderId', task.order.id)
      formData.append('assignmentId', task.assignment.id)
      formData.append('kind', kind)

      const response = await fetch('/api/staff/upload-work-photo', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      })
      const result = await response.json()

      if (response.ok && result?.url) {
        setActiveUploads((prev) => ({
          ...prev,
          [kind]: (prev[kind] || []).map((it) => (it.id === fileId ? { ...it, progress: 100, status: 'done' } : it)),
        }))
        return result.url
      }
      throw new Error(result?.error || 'Upload failed')
    } catch (err: any) {
      setActiveUploads((prev) => ({
        ...prev,
        [kind]: (prev[kind] || []).map((it) => (it.id === fileId ? { ...it, status: 'error' } : it)),
      }))
      throw err
    }
  }

  const handleUploadZonePhoto = async (zoneId: string, files: FileList | null, kind: 'before' | 'after') => {
    if (!files || !task) return
    const session = supabase ? (await supabase.auth.getSession()).data.session : null
    const uploadKind = `zone_${zoneId}_${kind}`
    for (let i = 0; i < files.length; i++) {
      try {
        const file = await prepareImageForUpload(files[i], locale)
        const preview = await createLocalPreviewUrl(file, locale)
        const url = await uploadSingleFile(file, uploadKind, session?.access_token, preview)
        if (url) {
          setZones((p) => p.map((z) => {
            if (z.id !== zoneId) return z
            const field = kind === 'before' ? 'beforePhotos' : 'afterPhotos'
            return { ...z, [field]: [...(z[field] || []), url] }
          }))
        }
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Upload failed')
      }
    }
  }

  const handleRemoveZonePhoto = (zoneId: string, url: string, kind: 'before' | 'after') =>
    setZones((p) => p.map((z) => {
      if (z.id !== zoneId) return z
      const field = kind === 'before' ? 'beforePhotos' : 'afterPhotos'
      return { ...z, [field]: (z[field] || []).filter((ph) => ph !== url) }
    }))

  if (loading) return <div className="p-8 text-center text-gray-500">{locale === 'en' ? 'Loading...' : locale === 'zh' ? '加载中...' : 'กำลังโหลด...'}</div>
  if (error || !task) return <div className="p-8 text-center text-red-500">{error || 'ไม่พบข้อมูล'}</div>

  const serviceName = task.service?.service_name || task.service?.name || 'บริการ'
  const normalizedStatus = normalizeAssignmentStatus(task.assignment.status)

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header & Navigation */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <button
            onClick={() => router.push('/dashboard/admin/reports')}
            className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#666666] hover:text-[#1A1A1A]"
          >
            <ChevronLeft size={18} /> {locale === 'en' ? 'Return to the admin report page.' : locale === 'zh' ? '返回管理报告页面。' : ' กลับหน้ารายงานแอดมิน           '}</button>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold text-[#1A1A1A]">{locale === 'en' ? 'Enter details of the work site report.' : locale === 'zh' ? '输入工作现场报告的详细信息。' : 'ลงรายละเอียดรายงานหน้างาน'}</h1>
            <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${
              normalizedStatus === 'completed' ? 'border-green-200 bg-green-50 text-green-700' : 'border-blue-200 bg-blue-50 text-blue-700'
            }`}>
              {assignmentStatusLabel(locale, task.assignment.status)}
            </span>
          </div>
          <p className="mt-1 text-sm text-[#666666] flex items-center gap-2">
            {locale === 'en' ? 'Order: #' : locale === 'zh' ? '命令： ＃' : '             ออเดอร์: #'}{task.order.order_code} • {serviceName}
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              task.order.pricing_period === 'yearly' ? 'bg-amber-100 text-amber-800' :
              task.order.pricing_period === 'monthly' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-600'
            }`}>
              {task.order.pricing_period === 'yearly' ? 'รายปี' :
               task.order.pricing_period === 'monthly' ? 'รายเดือน' :
               'รายครั้ง'}
            </span>
            {(task.order.pricing_period === 'monthly' || task.order.pricing_period === 'yearly') && (
              <span className="bg-[#1A3626] text-white text-xs px-2.5 py-1 rounded-full font-bold shadow-sm">
                {locale === 'en' ? 'The time' : locale === 'zh' ? '时间' : '                 ครั้งที่ '}{(task.order.completed_sessions || 0) + 1}/{task.order.total_sessions || 1}
              </span>
            )}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSaveAll}
            disabled={reportSaving}
            className="flex items-center gap-2 rounded-xl border border-[#D9DED8] bg-white px-5 py-2.5 text-sm font-semibold text-[#1A1A1A] hover:bg-gray-50 disabled:opacity-50"
          >
            {reportSaving ? 'กำลังบันทึก...' : 'บันทึกฉบับร่าง'}
          </button>
          {normalizedStatus !== 'completed' && (
            <button
              onClick={() => updateTaskStatus('completed')}
              disabled={updating}
              className="flex items-center gap-2 rounded-xl bg-[#1F3A2C] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#162A20] disabled:opacity-50"
            >
              {updating ? 'กำลังส่ง...' : 'ส่งรายงานให้ลูกค้า (LINE)'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column: Form Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Continuity Section */}
          {previousReport && (
            <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <FileText size={16} className="text-amber-700" />
                <span className="text-xs font-bold uppercase tracking-widest text-amber-800">
                  {locale === 'en' ? 'Observations from previous service visits (' : locale === 'zh' ? '之前服务访问的观察结果（' : '                   ข้อสังเกตจากการเข้าบริการครั้งก่อน ('}{new Date(previousReport.created_at).toLocaleDateString('th-TH')})
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {previousReport.work_done && (
                  <div>
                    <p className="text-[10px] font-bold text-amber-700/70 uppercase mb-1">{locale === 'en' ? 'Things that have been done' : locale === 'zh' ? '已经做过的事情' : 'สิ่งที่ทำไปแล้ว'}</p>
                    <p className="text-xs text-amber-900 line-clamp-3">"{previousReport.work_done}"</p>
                  </div>
                )}
                {previousReport.problems_found && (
                  <div className="bg-red-50 p-3 rounded-xl border border-red-100">
                    <p className="text-[10px] font-bold text-red-700 uppercase mb-1 flex items-center gap-1">
                      <AlertCircle size={12} /> {locale === 'en' ? 'Problems that need to be followed up' : locale === 'zh' ? '需要跟进的问题' : ' ปัญหาที่ต้องติดตาม                     '}</p>
                    <p className="text-xs text-red-800 font-medium">"{previousReport.problems_found}"</p>
                  </div>
                )}
              </div>
            </div>
          )}
          {/* Info Card */}
          <div className="rounded-2xl border border-[#E5E5DF] bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-[#1A1A1A]">{locale === 'en' ? 'Customer and location information' : locale === 'zh' ? '客户和位置信息' : 'ข้อมูลลูกค้าและสถานที่'}</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <User className="mt-0.5 text-gray-400" size={18} />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{locale === 'en' ? 'customer' : locale === 'zh' ? '顾客' : 'ลูกค้า'}</p>
                  <p className="text-sm font-medium text-gray-900">{task.customer.display_name || task.customer.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 text-gray-400" size={18} />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{locale === 'en' ? 'location' : locale === 'zh' ? '地点' : 'สถานที่'}</p>
                  <p className="text-sm font-medium text-gray-900">{task.house.name}</p>
                  <p className="text-xs text-gray-500">{task.house.address}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Checklist Sections */}
          <div className="rounded-2xl border border-[#E5E5DF] bg-white shadow-sm overflow-hidden">
             <div className="p-6 border-b border-[#F1F1EB]">
               <h3 className="text-lg font-semibold text-[#1A1A1A]">{locale === 'en' ? 'Work site report details' : locale === 'zh' ? '工作现场报告详情' : 'รายละเอียดรายงานหน้างาน'}</h3>
             </div>

             <div className="p-6 space-y-8">
               {/* Work Done */}
               <section>
                 <label className="mb-3 block text-sm font-bold text-[#1A1A1A]">{locale === 'en' ? 'Work performed (Checklist)' : locale === 'zh' ? '已完成的工作（清单）' : 'งานที่ดำเนินการ (Checklist)'}</label>
                 <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                   {WORK_DONE_PRESET.map(item => (
                     <label key={item} className="flex items-center gap-2 rounded-lg border border-[#E5E5DF] p-3 text-sm cursor-pointer hover:bg-gray-50 transition-colors">
                       <input
                        type="checkbox"
                        checked={workDoneItems.includes(item)}
                        onChange={e => e.target.checked ? setWorkDoneItems([...workDoneItems, item]) : setWorkDoneItems(workDoneItems.filter(i => i !== item))}
                        className="rounded border-gray-300 text-[#1F3A2C] focus:ring-[#1F3A2C]"
                       />
                       <span>{item}</span>
                     </label>
                   ))}
                 </div>
                 <textarea
                   value={workDoneExtra}
                   onChange={e => setWorkDoneExtra(e.target.value)}
                   rows={2}
                   className="mt-3 w-full rounded-xl border border-[#D9DED8] p-3 text-sm focus:ring-[#1F3A2C]"
                   placeholder={locale === 'en' ? 'Additional job details...' : locale === 'zh' ? '其他职位详细信息...' : 'รายละเอียดงานเพิ่มเติม...'}
                 />
               </section>

               {/* Problems Found */}
               <section>
                 <label className="mb-3 block text-sm font-bold text-[#1A1A1A]">{locale === 'en' ? 'Problems encountered' : locale === 'zh' ? '遇到的问题' : 'ปัญหาที่พบ'}</label>
                 <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                   {PROBLEMS_PRESET.map(item => (
                     <label key={item} className="flex items-center gap-2 rounded-lg border border-[#E5E5DF] p-3 text-sm cursor-pointer hover:bg-gray-50 transition-colors">
                       <input
                        type="checkbox"
                        checked={problemsItems.includes(item)}
                        onChange={e => e.target.checked ? setProblemsItems([...problemsItems, item]) : setProblemsItems(problemsItems.filter(i => i !== item))}
                        className="rounded border-gray-300 text-[#1F3A2C] focus:ring-[#1F3A2C]"
                       />
                       <span>{item}</span>
                     </label>
                   ))}
                 </div>
                 <textarea
                   value={problemsExtra}
                   onChange={e => setProblemsExtra(e.target.value)}
                   rows={2}
                   className="mt-3 w-full rounded-xl border border-[#D9DED8] p-3 text-sm focus:ring-[#1F3A2C]"
                   placeholder={locale === 'en' ? 'More problem details...' : locale === 'zh' ? '更多问题详情...' : 'รายละเอียดปัญหาเพิ่มเติม...'}
                 />
               </section>

               {/* Recommendations */}
               <section>
                 <label className="mb-3 block text-sm font-bold text-[#1A1A1A]">{locale === 'en' ? 'Advice from admin' : locale === 'zh' ? '管理员的建议' : 'คำแนะนำจากแอดมิน'}</label>
                 <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                   {RECOMMEND_PRESET.map(item => (
                     <label key={item} className="flex items-center gap-2 rounded-lg border border-[#E5E5DF] p-3 text-sm cursor-pointer hover:bg-gray-50 transition-colors">
                       <input
                        type="checkbox"
                        checked={recommendItems.includes(item)}
                        onChange={e => e.target.checked ? setRecommendItems([...recommendItems, item]) : setRecommendItems(recommendItems.filter(i => i !== item))}
                        className="rounded border-gray-300 text-[#1F3A2C] focus:ring-[#1F3A2C]"
                       />
                       <span>{item}</span>
                     </label>
                   ))}
                 </div>
                 <textarea
                   value={recommendExtra}
                   onChange={e => setRecommendExtra(e.target.value)}
                   rows={2}
                   className="mt-3 w-full rounded-xl border border-[#D9DED8] p-3 text-sm focus:ring-[#1F3A2C]"
                   placeholder={locale === 'en' ? 'Additional advice...' : locale === 'zh' ? '附加建议...' : 'คำแนะนำเพิ่มเติม...'}
                  />
                </section>
              </div>
            </div>

            {/* Zones Section */}
            <div className="rounded-2xl border border-[#E5E5DF] bg-white shadow-sm overflow-hidden">
              <div className="p-6 border-b border-[#F1F1EB] flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[#1A1A1A]">{locale === 'en' ? 'Care zones (Zones)' : locale === 'zh' ? '护理区（区）' : 'โซนดูแล (Zones)'}</h3>
                <button
                  type="button"
                  onClick={handleAddZone}
                  className="flex items-center gap-1 rounded-lg bg-[#1F3A2C] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#162A20] transition-all"
                >
                  <Plus size={14} /> {locale === 'en' ? 'Add a zone' : locale === 'zh' ? '添加区域' : ' เพิ่มโซน                 '}</button>
              </div>

              <div className="p-6 space-y-6">
                {zones.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <p className="text-sm text-gray-400">{locale === 'en' ? 'Haven\'t added a care zone yet.' : locale === 'zh' ? '还没有添加护理区。' : 'ยังไม่ได้เพิ่มโซนดูแล'}</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {zones.map((zone) => (
                      <div key={zone.id} className="relative rounded-2xl border border-[#F1F1EB] bg-[#FAFAF8] p-5">
                        <button
                          type="button"
                          onClick={() => handleRemoveZone(zone.id)}
                          className="absolute top-4 right-4 text-gray-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>

                        <div className="space-y-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{locale === 'en' ? 'Zone name' : locale === 'zh' ? '区域名称' : 'ชื่อโซน'}</label>
                            <input
                              type="text"
                              value={zone.name}
                              onChange={(e) => handleUpdateZone(zone.id, { name: e.target.value })}
                              placeholder={locale === 'en' ? 'Such as the front garden, 2nd floor balcony...' : locale === 'zh' ? '比如前花园、二楼阳台……' : 'เช่น สวนหน้าบ้าน, ระเบียงชั้น 2...'}
                              className="w-full bg-transparent border-b border-gray-200 py-1 text-base font-semibold focus:outline-none focus:border-[#1F3A2C] transition-colors"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{locale === 'en' ? 'Details of work in this zone' : locale === 'zh' ? '本区工作详情' : 'รายละเอียดงานในโซนนี้'}</label>
                            <textarea
                              value={zone.work_done}
                              onChange={(e) => handleUpdateZone(zone.id, { work_done: e.target.value })}
                              rows={2}
                              className="w-full rounded-xl border border-[#D9DED8] bg-white p-3 text-sm focus:ring-[#1F3A2C]"
                              placeholder={locale === 'en' ? 'What do employees do in this zone?' : locale === 'zh' ? '员工在这个区域做什么？' : 'พนักงานทำอะไรในโซนนี้บ้าง...'}
                            />
                          </div>

                          {/* Zone Before Photos */}
                          <div className="space-y-2 pt-2">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-[#A45A2A] flex items-center gap-1.5">
                              <ImageIcon size={12} />
                              {locale === 'en' ? 'Picture before operation (Before) (' : locale === 'zh' ? '操作前的图片（Before）（' : '                               รูปภาพก่อนดำเนินงาน (Before) ('}{(zone as any).beforePhotos?.length || 0})
                            </label>
                            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                              {((zone as any).beforePhotos || []).map((url: string, pIdx: number) => (
                                <div
                                  key={pIdx}
                                  className="relative flex-none w-20 aspect-square rounded-xl overflow-hidden border border-gray-200 group"
                                >
                                  <img src={url} className="w-full h-full object-cover" />
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveZonePhoto(zone.id, url, 'before')}
                                    className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <X size={10} />
                                  </button>
                                </div>
                              ))}

                              {/* Zone Uploading Progress */}
                              {(activeUploads[`zone_${zone.id}_before`] || []).filter((u) => u.status === 'uploading').map((u) => (
                                <div
                                  key={u.id}
                                  className="relative flex-none w-20 aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center p-2"
                                >
                                  {u.previewUrl && (
                                    <img
                                      src={u.previewUrl}
                                      className="absolute inset-0 w-full h-full object-cover opacity-20 blur-sm"
                                    />
                                  )}
                                  <div className="relative z-10 w-full bg-white/50 h-1 rounded-full overflow-hidden">
                                    <motion.div
                                      className="h-full bg-[#1F3A2C]"
                                      initial={{ width: 0 }}
                                      animate={{ width: `${u.progress}%` }}
                                    />
                                  </div>
                                </div>
                              ))}

                              <label className="flex-none w-20 aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center bg-white cursor-pointer hover:border-[#1F3A2C] hover:bg-gray-50 transition-all group">
                                <Camera size={20} className="text-gray-300 group-hover:text-[#1F3A2C] transition-colors" />
                                <span className="mt-1 text-[8px] font-bold uppercase text-gray-400 group-hover:text-[#1F3A2C]">
                                  {locale === 'en' ? 'Add a picture' : locale === 'zh' ? '添加图片' : '                                   เพิ่มรูป                                 '}</span>
                                <input
                                  type="file"
                                  multiple
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => handleUploadZonePhoto(zone.id, e.target.files, 'before')}
                                />
                              </label>
                            </div>
                          </div>

                          {/* Zone After Photos */}
                          <div className="space-y-2 border-t border-gray-100 pt-4">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-[#214031] flex items-center gap-1.5">
                              <Sparkles size={12} />
                              {locale === 'en' ? 'Picture after operation (After) (' : locale === 'zh' ? '术后照片（术后）（' : '                               รูปภาพหลังดำเนินงาน (After) ('}{(zone as any).afterPhotos?.length || 0})
                            </label>
                            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                              {((zone as any).afterPhotos || []).map((url: string, pIdx: number) => (
                                <div
                                  key={pIdx}
                                  className="relative flex-none w-20 aspect-square rounded-xl overflow-hidden border border-gray-200 group"
                                >
                                  <img src={url} className="w-full h-full object-cover" />
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveZonePhoto(zone.id, url, 'after')}
                                    className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <X size={10} />
                                  </button>
                                </div>
                              ))}

                              {/* Zone Uploading Progress */}
                              {(activeUploads[`zone_${zone.id}_after`] || []).filter((u) => u.status === 'uploading').map((u) => (
                                <div
                                  key={u.id}
                                  className="relative flex-none w-20 aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center p-2"
                                >
                                  {u.previewUrl && (
                                    <img
                                      src={u.previewUrl}
                                      className="absolute inset-0 w-full h-full object-cover opacity-20 blur-sm"
                                    />
                                  )}
                                  <div className="relative z-10 w-full bg-white/50 h-1 rounded-full overflow-hidden">
                                    <motion.div
                                      className="h-full bg-[#1F3A2C]"
                                      initial={{ width: 0 }}
                                      animate={{ width: `${u.progress}%` }}
                                    />
                                  </div>
                                </div>
                              ))}

                              <label className="flex-none w-20 aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center bg-white cursor-pointer hover:border-[#1F3A2C] hover:bg-gray-50 transition-all group">
                                <Camera size={20} className="text-gray-300 group-hover:text-[#1F3A2C] transition-colors" />
                                <span className="mt-1 text-[8px] font-bold uppercase text-gray-400 group-hover:text-[#1F3A2C]">
                                  {locale === 'en' ? 'Add a picture' : locale === 'zh' ? '添加图片' : '                                   เพิ่มรูป                                 '}</span>
                                <input
                                  type="file"
                                  multiple
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => handleUploadZonePhoto(zone.id, e.target.files, 'after')}
                                />
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

        {/* Right Column: Photos & Next Visit */}
        <div className="space-y-6">

           {/* Next Visit Section */}
           {(task?.order.pricing_period === 'monthly' || task?.order.pricing_period === 'yearly') && (
             <div className="rounded-2xl border border-[#E5E5DF] bg-white p-6 shadow-sm space-y-4">
                <h3 className="text-lg font-semibold text-[#1A1A1A]">{locale === 'en' ? 'Next appointment' : locale === 'zh' ? '下次预约' : 'นัดหมายครั้งถัดไป'}</h3>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-500">{locale === 'en' ? 'Appointment date' : locale === 'zh' ? '预约日期' : 'วันที่นัดหมาย'}</label>
                  <input
                    type="date"
                    value={nextVisitDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => setNextVisitDate(e.target.value)}
                    className="w-full rounded-xl border border-[#D9DED8] p-2.5 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-gray-500">{locale === 'en' ? 'start time' : locale === 'zh' ? '开始时间' : 'เริ่มเวลา'}</label>
                    <input type="time" value={nextVisitTimeStart} onChange={e => setNextVisitTimeStart(e.target.value)} className="w-full rounded-xl border border-[#D9DED8] p-2.5 text-sm" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-gray-500">{locale === 'en' ? 'end of time' : locale === 'zh' ? '时间结束' : 'สิ้นสุดเวลา'}</label>
                    <input type="time" value={nextVisitTimeEnd} onChange={e => setNextVisitTimeEnd(e.target.value)} className="w-full rounded-xl border border-[#D9DED8] p-2.5 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-500">{locale === 'en' ? 'Additional Notes' : locale === 'zh' ? '附加说明' : 'หมายเหตุเพิ่มเติม'}</label>
                  <textarea
                    value={nextVisitNotes}
                    onChange={e => setNextVisitNotes(e.target.value)}
                    rows={2}
                    className="w-full rounded-xl border border-[#D9DED8] p-2.5 text-sm"
                    placeholder={locale === 'en' ? 'Appointment details...' : locale === 'zh' ? '预约详情...' : 'รายละเอียดการนัดหมาย...'}
                  />
                </div>
             </div>
           )}

           {/* Internal Notes */}
           <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="text-amber-600" size={18} />
                <h3 className="text-sm font-bold text-amber-800 uppercase tracking-wider">{locale === 'en' ? 'Internal Notes (Admin sees only)' : locale === 'zh' ? '内部注释（仅限管理员查看）' : 'หมายเหตุภายใน (แอดมินเห็นเท่านั้น)'}</h3>
              </div>
              <textarea
                value={workNotes}
                onChange={e => setWorkNotes(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-amber-200 bg-white p-3 text-sm focus:ring-amber-500"
                placeholder={locale === 'en' ? 'Additional notes for the team...' : locale === 'zh' ? '团队的附加说明...' : 'โน้ตเพิ่มเติมสำหรับทีมงาน...'}
              />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-white/90 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 15 }}
              className="flex flex-col items-center gap-6 text-center"
            >
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#1F3A2C] text-white">
                <CheckCircle size={48} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[#1A1A1A]">{locale === 'en' ? 'The report has been sent.' : locale === 'zh' ? '报告已发送。' : 'ส่งรายงานเรียบร้อยแล้ว'}</h2>
                <p className="mt-2 text-[#666666]">{locale === 'en' ? 'You are being redirected back to the customer information page...' : locale === 'zh' ? '您将被重定向回客户信息页面...' : 'ระบบกำลังนำคุณกลับไปยังหน้าข้อมูลลูกค้า...'}</p>
              </div>
              <div className="mt-4 flex gap-2">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="h-2 w-2 rounded-full bg-[#1F3A2C]"
                />
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }}
                  className="h-2 w-2 rounded-full bg-[#1F3A2C]"
                />
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }}
                  className="h-2 w-2 rounded-full bg-[#1F3A2C]"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
