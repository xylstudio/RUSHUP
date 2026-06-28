"use client";
import { useState, useEffect, useCallback, useRef, Fragment } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../../lib/supabaseClient";
import { notifyStaffStarted, notifyStaffCompleted } from '../../../../../lib/notify';
import { trackProductEvent } from '../../../../../lib/analytics/events';
import { useI18n } from '@/lib/I18nContext';
import { appCopy, assignmentStatusLabel, pickLocalizedText } from '@/lib/appLocale';
import { formatDateByLocale } from '@/lib/localeFormat';
import { normalizeAssignmentStatus } from '@/lib/serviceFlow'
import { 
  ClockIcon,
  MapPinIcon,
  UserIcon,
  CalendarIcon,
  PlayIcon,
  CheckCircleIcon,
  ArrowUpTrayIcon,
  XMarkIcon,
  DocumentTextIcon,
  PhotoIcon,
  TrashIcon,
  PlusIcon,
  CameraIcon,
  ArrowLeftIcon,
  ChevronRightIcon,
  PhoneIcon
} from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";
import { CloudSun, Sparkles, Star, Smartphone } from 'lucide-react'
import { useAuth } from "@/lib/AuthContext";

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
  Object.entries(values).reduce(
    (message, [key, value]) => message.split(`{${key}}`).join(String(value)),
    template
  )

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

const loadImageElement = (
  file: File,
  locale: 'th' | 'en' | 'zh'
): Promise<HTMLImageElement> =>
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
    canvas.toBlob((blob) => { clearTimeout(timer); resolve(blob) }, 'image/jpeg', quality)
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
  'ตัดหญ้า', 'ตัดแต่งกิ่งไม้', 'ใส่ปุ๋ย', 'กำจัดวัชพืช', 'ล้างทำความสะอาดระบบน้ำ',
  'ตรวจสอบระบบน้ำ', 'กำจัดแมลง/ศัตรูพืช', 'ทำความสะอาดพื้นที่', 'ปลูกต้นไม้เพิ่ม', 'ซ่อมแซมระบบน้ำ',
]
const PROBLEMS_PRESET = [
  'ไม่มีปัญหา', 'พบโรคพืช', 'พบแมลงศัตรูพืช', 'ระบบน้ำรั่ว/อุดตัน', 'หญ้าและวัชพืชขึ้นหนา',
  'ดินแน่น/ขาดการระบายน้ำ', 'ต้นไม้แห้งตาย', 'ขาดการบำรุงเป็นเวลานาน',
]
const RECOMMEND_PRESET = [
  'รดน้ำช่วงเช้า', 'ลดปุ๋ยในช่วงนี้', 'เพิ่มความถี่การตัดหญ้า', 'ควรซ่อมระบบน้ำโดยเร็ว',
  'พ่นยาป้องกันแมลงเพิ่มเติม', 'ปรับตั้งเวลารดน้ำใหม่', 'เพิ่มปุ๋ยบำรุงดิน', 'ตัดแต่งกิ่งเป็นประจำทุกเดือน',
]

const parseChecklist = (text: string | null | undefined, presets: string[]): [string[], string] => {
  if (!text) return [[], '']
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const checked = lines.filter(l => presets.includes(l))
  const extra = lines.filter(l => !presets.includes(l)).join('\n')
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
    ...args.workDoneItems, ...args.problemsItems, ...args.recommendItems,
    args.workDoneExtra.trim(), args.problemsExtra.trim(), args.recommendExtra.trim(),
  ].filter(Boolean)
  const hasZonePhoto = args.zones.some(z => (z.afterPhotos?.length || 0) > 0 || (z.after_photos?.length || 0) > 0 || (z.photos?.length || 0) > 0)
  return notes.length > 0 && hasZonePhoto
}

interface JobAssignment {
  id: string; order_id: string; staff_id: string; assigned_date: string; status: string;
  notes?: string; started_at?: string; completed_at?: string; created_at: string; updated_at: string;
}
interface ServiceOrder {
  id: string; customer_id: string; house_id: string; service_id: string; price_template_id: string;
  order_code: string; service_area: number; base_price: number; calculated_price: number;
  total: number; total_price?: number; status: string; scheduled_date?: string; notes?: string;
  created_at: string; updated_at: string;
  pricing_period?: string; total_sessions?: number; completed_sessions?: number;
}
interface Service { id: string; service_name?: string; name?: string; description: string; estimated_duration?: number; }
interface Customer { id: string; display_name?: string; email: string; phone?: string; }
interface House { id: string; name: string; address: string; }
interface PriceTemplate { id: string; template_name: string; area_min: number; area_max: number; price_per_unit: number; base_price: number; description?: string; }
interface TaskDetail { assignment: JobAssignment; order: ServiceOrder; service: Service; customer: Customer; house: House; priceTemplate?: PriceTemplate; }

export default function TaskDetails({ params }: { params: { taskId: string } }) {
  const router = useRouter();
  const { locale } = useI18n();
  const { profile } = useAuth();
  const copy = appCopy.staffTaskDetail;
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string>("");
  const [workNotes, setWorkNotes] = useState("");
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
  const [currentStaffName, setCurrentStaffName] = useState('')
  const [activeTab, setActiveTab] = useState<'info' | 'log' | 'summary'>('info');
  const [previousReport, setPreviousReport] = useState<any>(null)
  const beforeInputRef = useRef<HTMLInputElement>(null)
  const afterInputRef = useRef<HTMLInputElement>(null)
  const workDoneOptions = copy.workDoneOptions
  const problemOptions = copy.problemOptions
  const recommendationOptions = copy.recommendationOptions

  const fetchTaskDetail = useCallback(async () => {
    try {
      if (!supabase) throw new Error(pickLocalizedText(locale, copy.dbUnavailable));
      const { data: assignment, error: assignmentError } = await supabase.from('job_assignments').select('*').eq('id', params.taskId).single();
      if (assignmentError) throw assignmentError;
      if (!assignment) throw new Error(pickLocalizedText(locale, copy.taskNotFound));
      const { data: order, error: orderError } = await supabase.from('orders').select('*').eq('id', assignment.order_id).single();
      if (orderError) throw orderError;
      const { data: service, error: serviceError } = await supabase.from('services').select('*').eq('id', order.service_id).single();
      if (serviceError) throw serviceError;
      const { data: customer, error: customerError } = await supabase.from('profiles').select('id, display_name, email, phone').eq('id', order.customer_id).single();
      if (customerError) throw customerError;
      const { data: house, error: houseError } = await supabase.from('houses').select('*').eq('id', order.house_id).single();
      if (houseError) throw houseError;
      let priceTemplate = null;
      if (order.price_template_id) {
        const { data: templateData, error: templateError } = await supabase.from('price_templates').select('*').eq('id', order.price_template_id).single();
        if (!templateError) priceTemplate = templateData;
      }
      setTask({ assignment, order, service, customer, house, priceTemplate });
      setWorkNotes(assignment.notes || "");
      setReportLoading(true)
      const { data: reportData, error: reportFetchError } = await supabase.from('work_reports').select('*').eq('job_assignment_id', assignment.id).maybeSingle()
      if (reportFetchError) throw reportFetchError
      const safeReport = (reportData as WorkReportRow | null) || null
      setReport(safeReport)
      
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
      const [wi, we] = parseChecklist(safeReport?.work_done, WORK_DONE_PRESET)
      const [pi, pe] = parseChecklist(safeReport?.problems_found, PROBLEMS_PRESET)
      const [ri, re] = parseChecklist(safeReport?.recommendations, RECOMMEND_PRESET)
      setWorkDoneItems(wi); setWorkDoneExtra(we)
      setProblemsItems(pi); setProblemsExtra(pe)
      setRecommendItems(ri); setRecommendExtra(re)
      setNextVisitDate(String(safeReport?.next_visit_date || '').slice(0, 10))
      setNextVisitTimeStart(String(safeReport?.next_visit_time_start || '').slice(0, 5))
      setNextVisitTimeEnd(String(safeReport?.next_visit_time_end || '').slice(0, 5))
      setNextVisitNotes(String(safeReport?.next_visit_notes || ''))
      setBeforePhotos(safeReport?.before_photos || [])
      setAfterPhotos(safeReport?.after_photos || [])
      setZones(Array.isArray(safeReport?.zones) ? safeReport.zones.map((z: any) => ({
        id: String(z.id || Math.random().toString(36).slice(2, 9)),
        name: String(z.name || ''),
        work_done: String(z.work_done || ''),
        photos: Array.isArray(z.photos) ? z.photos : [],
        beforePhotos: Array.isArray(z.before_photos) ? z.before_photos : [],
        afterPhotos: Array.isArray(z.after_photos) ? z.after_photos : [],
      })) : [])
    } catch (err: any) {
      setError(err.message || pickLocalizedText(locale, copy.taskMissing));
    } finally {
      setLoading(false); setReportLoading(false)
    }
  }, [params.taskId, locale, copy]);

  useEffect(() => { fetchTaskDetail(); }, [fetchTaskDetail]);

  useEffect(() => {
    void (async () => {
      if (!supabase) return
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', user.id).single()
        setCurrentStaffName(profile?.display_name || user.email || pickLocalizedText(locale, copy.defaultStaff))
      }
    })()
  }, [locale, copy.defaultStaff])

  const updateTaskStatus = async (newStatus: string) => {
    if (!task) return;
    setUpdating(true);
    try {
      const currentStatus = normalizeAssignmentStatus(task.assignment.status)
      const targetStatus = normalizeAssignmentStatus(newStatus)
      if (targetStatus === 'in_progress' && !['assigned', 'accepted'].includes(currentStatus)) {
        throw new Error(locale === 'th' ? 'เริ่มงานได้เฉพาะงานที่รับมอบหมายแล้วเท่านั้น' : 'Only assigned tasks can be started.')
      }
      if (targetStatus === 'completed') {
        if (currentStatus !== 'in_progress') throw new Error(locale === 'th' ? 'ต้องเริ่มงานก่อนจึงจะปิดงานได้' : 'Task must be started first.')
        if (!hasCompletionDraft({ workDoneItems, workDoneExtra, problemsItems, problemsExtra, recommendItems, recommendExtra, zones })) {
          throw new Error(locale === 'th' ? 'กรุณาใส่รายละเอียดงานและรูปหลังทำอย่างน้อยหนึ่งรูปในโซน' : 'Add details and at least one after photo in zones.')
        }
        const session = supabase ? (await supabase.auth.getSession()).data.session : null
        await persistReportForCustomer(undefined, session?.access_token, true)
      }
      const updates: any = { status: newStatus, notes: workNotes };
      if (newStatus === 'in_progress' && !task.assignment.started_at) updates.started_at = new Date().toISOString();
      if (newStatus === 'completed' && !task.assignment.completed_at) updates.completed_at = new Date().toISOString();
      await supabase.from('job_assignments').update(updates).eq('id', task.assignment.id);
      let orderStatus = task.order.status;
      if (newStatus === 'in_progress' && orderStatus === 'confirmed') orderStatus = 'in_progress';
      else if (newStatus === 'completed') orderStatus = 'completed';
      if (orderStatus !== task.order.status) await supabase.from('orders').update({ status: orderStatus }).eq('id', task.order.id);
      await fetchTaskDetail();
      const svcName = task.service?.service_name || (task.service as any)?.name || 'Service'
      const staffDisplayName = currentStaffName || 'Staff'
      if (newStatus === 'in_progress') void notifyStaffStarted(task.order.customer_id, task.order.id, staffDisplayName, svcName)
      else if (newStatus === 'completed') {
        void notifyStaffCompleted(task.order.customer_id, task.order.id, staffDisplayName, svcName)
        try {
          const session = supabase ? (await supabase.auth.getSession()).data.session : null
          await fetch('/api/staff/work-reports/notify-customer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
            body: JSON.stringify({ orderId: task.order.id, assignmentId: task.assignment.id }),
          })
        } catch (e) {}
      }
      alert(pickLocalizedText(locale, copy.updateSuccess));
    } catch (err: any) {
      alert(err.message || pickLocalizedText(locale, copy.updateFailed));
    } finally { setUpdating(false); }
  };

  const handleAddZone = () => setZones(p => [...p, { id: Math.random().toString(36).slice(2, 9), name: '', work_done: '', photos: [], beforePhotos: [], afterPhotos: [] }])
  const handleRemoveZone = (id: string) => { if (confirm('Delete?')) setZones(p => p.filter(z => z.id !== id)) }
  const handleUpdateZone = (id: string, updates: Partial<WorkReportZone>) => setZones(p => p.map(z => z.id === id ? { ...z, ...updates } : z))
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
          setZones(p => p.map(z => {
            if (z.id !== zoneId) return z
            const field = kind === 'before' ? 'beforePhotos' : 'afterPhotos'
            return { ...z, [field]: [...(z[field] || []), url] }
          }))
        }
      } catch (e) { alert(e instanceof Error ? e.message : 'Upload failed') }
    }
  }
  const handleRemoveZonePhoto = (zoneId: string, url: string, kind: 'before' | 'after') => setZones(p => p.map(z => {
    if (z.id !== zoneId) return z
    const field = kind === 'before' ? 'beforePhotos' : 'afterPhotos'
    return { ...z, [field]: (z[field] || []).filter(ph => ph !== url) }
  }))

  const handleSaveAll = async () => {
    if (!task || !supabase) return
    setReportSaving(true); setReportError(null)
    try {
      await supabase.from('job_assignments').update({ notes: workNotes }).eq('id', task.assignment.id)
      const joinField = (items: string[], extra: string) => {
        const parts = [...items, ...(extra.trim() ? [extra.trim()] : [])]
        return parts.length ? parts.join('\n') : null
      }
      const payload = {
        job_assignment_id: task.assignment.id, order_id: task.order.id, staff_id: task.assignment.staff_id, customer_id: task.order.customer_id,
        work_done: joinField(workDoneItems, workDoneExtra), problems_found: joinField(problemsItems, problemsExtra), recommendations: joinField(recommendItems, recommendExtra),
        next_visit_date: nextVisitDate || null, next_visit_time_start: nextVisitTimeStart || null, next_visit_time_end: nextVisitTimeEnd || null, next_visit_notes: nextVisitNotes.trim() || null,
        zones: zones.map(z => ({ 
          id: z.id, 
          name: z.name.trim() || 'Untitled', 
          work_done: z.work_done.trim(), 
          photos: z.photos,
          before_photos: z.beforePhotos,
          after_photos: z.afterPhotos
        })),
      }
      const { data: saved, error: saveError } = await supabase.from('work_reports').upsert(payload, { onConflict: 'job_assignment_id' }).select('*').single()
      if (saveError) throw saveError
      setReport(saved as WorkReportRow)
      trackProductEvent('work_report_submitted', { orderId: task.order.id, assignmentId: task.assignment.id })
      await fetchTaskDetail()
    } catch (err: any) {
      setReportError(err.message); alert(err.message)
    } finally { setReportSaving(false) }
  }

  const persistReportForCustomer = async (override?: any, token?: string, finalize?: boolean) => {
    if (!task) return
    const joinField = (items: string[], extra: string) => {
      const parts = [...items, ...(extra.trim() ? [extra.trim()] : [])]
      return parts.length ? parts.join('\n') : null
    }
    const payload = {
      job_assignment_id: task.assignment.id, order_id: task.order.id, staff_id: task.assignment.staff_id, customer_id: task.order.customer_id,
      work_done: joinField(workDoneItems, workDoneExtra), problems_found: joinField(problemsItems, problemsExtra), recommendations: joinField(recommendItems, recommendExtra),
      next_visit_date: nextVisitDate || null, next_visit_time_start: nextVisitTimeStart || null, next_visit_time_end: nextVisitTimeEnd || null, next_visit_notes: nextVisitNotes.trim() || null,
      before_photos: override?.before ?? beforePhotos, after_photos: override?.after ?? afterPhotos,
      zones: zones.map(z => ({ 
        id: z.id, 
        name: z.name.trim() || 'Untitled', 
        work_done: z.work_done.trim(), 
        photos: z.photos,
        before_photos: z.beforePhotos,
        after_photos: z.afterPhotos
      })),
    }
    const response = await fetch('/api/staff/work-reports/upsert', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(finalize ? { ...payload, finalize: true } : payload),
    })
    if (!response.ok) throw new Error('Failed to persist report')
    const result = await response.json()
    if (result?.report) setReport(result.report as WorkReportRow)
  }

  // Track all uploads in a single map or state to avoid kind-specific logic

  const uploadSingleFile = async (file: File, kind: string, token?: string, previewUrl?: string): Promise<string> => {
    if (!task) throw new Error('Task missing')
    const fileId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    
    // Add to progress state
    setActiveUploads(prev => ({
      ...prev,
      [kind]: [...(prev[kind] || []), { id: fileId, name: file.name, progress: 0, status: 'uploading', previewUrl }]
    }))

    try {
      const formData = new FormData(); 
      formData.append('file', file); 
      formData.append('orderId', task.order.id); 
      formData.append('assignmentId', task.assignment.id); 
      formData.append('kind', kind);
      
      const response = await fetch('/api/staff/upload-work-photo', { 
        method: 'POST', 
        headers: token ? { Authorization: `Bearer ${token}` } : {}, 
        body: formData 
      })
      const result = await response.json()
      
      if (response.ok && result?.url) {
        setActiveUploads(prev => ({
          ...prev,
          [kind]: (prev[kind] || []).map(it => it.id === fileId ? { ...it, progress: 100, status: 'done' } : it)
        }))
        return result.url
      }
      throw new Error(result?.error || 'Upload failed')
    } catch (err: any) {
      setActiveUploads(prev => ({
        ...prev,
        [kind]: (prev[kind] || []).map(it => it.id === fileId ? { ...it, status: 'error' } : it)
      }))
      throw err
    }
  }


  const removePhoto = (url: string, kind: 'before' | 'after') => {
    // Legacy support
  }

  if (loading) return <div className="p-8 animate-pulse bg-gray-50 min-h-screen" />
  if (error || !task) return <div className="p-8 text-red-500 bg-red-50 min-h-screen">{error || 'Task not found'}</div>

  const serviceName = task.service?.service_name || task.service?.name || pickLocalizedText(locale, appCopy.staffTasks.unspecifiedService)
  const customerName = task.customer?.display_name || task.customer?.email || pickLocalizedText(locale, appCopy.staffTasks.unspecifiedCustomer)
  const normalizedAssignmentStatusValue = normalizeAssignmentStatus(task.assignment.status)
  const statusSteps = [
    { key: 'assigned', label: pickLocalizedText(locale, copy.pending) },
    { key: 'in_progress', label: pickLocalizedText(locale, copy.inProgress) },
    { key: 'completed', label: pickLocalizedText(locale, copy.completed) },
  ]
  const currentStepIdx = statusSteps.findIndex(s => s.key === (normalizedAssignmentStatusValue === 'accepted' ? 'assigned' : normalizedAssignmentStatusValue))

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#111111] font-sans">
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-[#F0EFEB]">
        <div className="max-w-2xl mx-auto px-5 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/dashboard/staff/tasks')} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
              <ArrowLeftIcon className="h-5 w-5 text-[#111111]" />
            </button>
            <div className="min-w-0">
               <div className="flex items-center gap-2 leading-none mb-1">
                 <span className="text-[9px] font-bold uppercase tracking-widest text-[#AF907A]">Order {task?.order.order_code}</span>
                 {(task?.order.pricing_period === 'monthly' || task?.order.pricing_period === 'yearly') && (
                   <span className="bg-[#1A3626] text-white text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter shadow-sm">
                     Session {(task.order.completed_sessions || 0) + 1}/{task.order.total_sessions || 1}
                   </span>
                 )}
               </div>
               <h1 className="text-sm font-bold truncate max-w-[150px] md:max-w-xs">{serviceName}</h1>
            </div>
          </div>
          <button onClick={handleSaveAll} disabled={reportSaving} className={`h-10 px-5 rounded-full text-xs font-bold uppercase tracking-widest transition-all shadow-sm ${reportSaving ? 'bg-gray-100 text-gray-400' : 'bg-[#111111] text-white hover:bg-black active:scale-95'}`}>
            {reportSaving ? pickLocalizedText(locale, copy.saving) : pickLocalizedText(locale, copy.saveAll)}
          </button>
        </div>
        <div className="max-w-2xl mx-auto px-5">
           <div className="flex border-t border-[#F0EFEB]">
              {(['info', 'log', 'summary'] as const).map((tab) => {
                const label = { th: { info: 'ข้อมูลงาน', log: 'บันทึกงาน', summary: 'สรุปงาน' }, en: { info: 'Overview', log: 'Work Log', summary: 'Summary' }, zh: { info: '任务概览', log: '工作日志', summary: '任务总结' } }[(locale as 'th'|'en'|'zh')||'th'][tab];
                const active = activeTab === tab;
                return (
                  <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-3 text-[11px] font-bold uppercase tracking-widest transition-all relative ${active ? 'text-[#1A3626]' : 'text-gray-400 hover:text-gray-600'}`}>
                    {label}{active && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1A3626]" />}
                  </button>
                );
              })}
           </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-8 pb-32">
        <AnimatePresence mode="wait">
          {activeTab === 'info' && (
            <motion.div key="info" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-6">
              <div className="bg-white rounded-3xl border border-[#F0EFEB] shadow-[0_4px_20px_rgba(0,0,0,0.02)] p-6">
                 <div className="flex items-center justify-between mb-8">
                    {statusSteps.map((step, idx) => {
                      const done = idx <= currentStepIdx; const active = idx === currentStepIdx;
                      return (
                        <Fragment key={step.key}>
                           <div className="flex flex-col items-center gap-2">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${done ? 'bg-[#1A3626] text-white' : 'bg-gray-50 text-gray-300 border border-gray-100'}`}>{done ? '✓' : idx + 1}</div>
                              <span className={`text-[10px] font-bold uppercase tracking-tighter ${active ? 'text-[#111111]' : 'text-gray-400'}`}>{step.label}</span>
                           </div>
                           {idx < statusSteps.length - 1 && <div className={`flex-1 h-[1px] -mt-6 mx-2 ${idx < currentStepIdx ? 'bg-[#1A3626]' : 'bg-gray-100'}`} />}
                        </Fragment>
                      )
                    })}
                 </div>
                 {normalizedAssignmentStatusValue === 'declined' ? (
                   <div className="w-full py-4 text-center text-xs font-bold text-red-600 bg-red-50 rounded-2xl uppercase tracking-widest">{pickLocalizedText(locale, copy.cancelledBanner)}</div>
                 ) : normalizedAssignmentStatusValue === 'completed' ? (
                   <div className="w-full py-4 text-center text-xs font-bold text-[#1A3626] bg-[#F1F5F2] rounded-2xl uppercase tracking-widest">✓ {pickLocalizedText(locale, copy.completedBanner)}</div>
                 ) : (
                   <button onClick={() => updateTaskStatus(normalizedAssignmentStatusValue === 'in_progress' ? 'completed' : 'in_progress')} disabled={updating} className="w-full group flex items-center justify-center gap-3 bg-[#1A3626] text-white py-4 rounded-2xl font-bold text-xs uppercase tracking-[0.2em] hover:bg-black transition-all shadow-lg active:scale-[0.98]">
                     {updating ? '...' : normalizedAssignmentStatusValue === 'in_progress' ? pickLocalizedText(locale, copy.finishWork) : pickLocalizedText(locale, copy.startWork)}
                   </button>
                 )}
              </div>
              <div className="bg-white rounded-3xl border border-[#F0EFEB] shadow-[0_4px_20px_rgba(0,0,0,0.02)] p-6">
                 <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-full bg-[#FAFAF8] border border-[#F0EFEB] flex items-center justify-center text-[#AF907A]"><UserIcon className="h-6 w-6" /></div>
                    <div className="min-w-0 flex-1">
                       <p className="text-[10px] font-bold text-[#AF907A] uppercase tracking-widest mb-0.5">{pickLocalizedText(locale, appCopy.staffTasks.unspecifiedCustomer)}</p>
                       <h3 className="text-lg font-bold text-[#111111] truncate">{customerName}</h3>
                    </div>
                    {task?.customer.phone && <a href={`tel:${task.customer.phone}`} className="w-10 h-10 rounded-full bg-[#1A3626] flex items-center justify-center text-white shadow-lg active:scale-90 transition-all"><PhoneIcon className="h-5 w-5" /></a>}
                 </div>
                 <div className="space-y-4 pt-4 border-t border-[#F0EFEB]">
                    <div className="flex gap-3"><MapPinIcon className="h-5 w-5 text-[#AF907A] shrink-0" /><div className="space-y-1"><p className="text-xs font-bold text-[#111111]">{task?.house.name}</p><p className="text-[11px] text-gray-500 leading-relaxed">{task?.house.address}</p></div></div>
                    <div className="flex gap-3"><CalendarIcon className="h-5 w-5 text-[#AF907A] shrink-0" /><p className="text-[11px] font-bold text-[#111111]">{task?.order.scheduled_date ? formatDateByLocale(task.order.scheduled_date, locale) : '...'}</p></div>
                 </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'log' && (
            <motion.div key="log" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-8">
              {/* Continuity Section */}
              {previousReport && (
                <div className="bg-[#FAF7F2] border border-[#E9E1D4] rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="bg-[#AF907A] p-1 rounded-lg">
                      <ClipboardList size={14} className="text-white" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#AF907A]">
                      Observation from Last Visit ({formatDateShort(new Date(previousReport.created_at))})
                    </span>
                  </div>
                  <div className="space-y-3">
                    {previousReport.work_done && (
                      <div>
                        <p className="text-[9px] font-bold text-[#AF907A]/70 uppercase tracking-widest mb-1">Previously Done</p>
                        <p className="text-xs text-[#5C4D3E] leading-relaxed line-clamp-3 italic">"{previousReport.work_done}"</p>
                      </div>
                    )}
                    {previousReport.problems_found && (
                      <div className="bg-white/50 p-3 rounded-xl border border-[#E9E1D4]/50">
                        <p className="text-[9px] font-bold text-red-800 uppercase tracking-widest mb-1 flex items-center gap-1">
                          <AlertTriangle size={10} /> Needs Follow-up
                        </p>
                        <p className="text-xs text-red-900 leading-relaxed font-medium">"{previousReport.problems_found}"</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {[
                { title: copy.workDoneTitle, items: workDoneOptions, selected: workDoneItems, setSelected: setWorkDoneItems, extra: workDoneExtra, setExtra: setWorkDoneExtra, placeholder: copy.otherWorkPlaceholder },
                { title: copy.problemsTitle, items: problemOptions, selected: problemsItems, setSelected: setProblemsItems, extra: problemsExtra, setExtra: setProblemsExtra, placeholder: copy.moreProblemsPlaceholder },
                { title: copy.recommendationsTitle, items: recommendationOptions, selected: recommendItems, setSelected: setRecommendItems, extra: recommendExtra, setExtra: setRecommendExtra, placeholder: copy.moreRecommendationsPlaceholder }
              ].map((section, sIdx) => (
                <div key={sIdx} className="space-y-4">
                  <div className="flex items-center justify-between"><h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#AF907A]">{pickLocalizedText(locale, section.title)}</h3></div>
                  <div className="grid grid-cols-2 gap-3">
                    {section.items.map((item) => {
                      const checked = section.selected.includes(item.value);
                      return (
                        <button key={item.value} type="button" onClick={() => section.setSelected((prev: any) => checked ? prev.filter((x: any) => x !== item.value) : [...prev, item.value])} className={`p-4 rounded-2xl border text-left transition-all relative ${checked ? 'bg-white border-[#111111] shadow-md' : 'bg-white border-[#F0EFEB]'}`}>
                           {checked && <div className="absolute top-0 right-0 w-8 h-8 bg-[#111111] flex items-center justify-center rounded-bl-xl"><CheckCircleIcon className="w-4 h-4 text-white"/></div>}
                           <span className={`text-[12px] font-bold ${checked ? 'text-[#111111]' : 'text-gray-500'}`}>{pickLocalizedText(locale, item.label)}</span>
                        </button>
                      )
                    })}
                  </div>
                  <textarea value={section.extra} onChange={(e) => section.setExtra(e.target.value)} rows={2} className="w-full p-4 bg-white border border-[#F0EFEB] rounded-2xl text-[13px] focus:outline-none focus:ring-1 focus:ring-[#111111]" placeholder={pickLocalizedText(locale, section.placeholder)} />
                </div>
              ))}
              <div className="space-y-4 pt-8 border-t border-[#F0EFEB]">
                 <div className="flex items-center justify-between"><h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#AF907A]">Zones</h3><button type="button" onClick={handleAddZone} className="h-8 px-4 bg-[#1A3626] text-white rounded-full text-[10px] font-bold uppercase">+ Add Zone</button></div>
                 <div className="space-y-6">
                    {zones.map((zone) => (
                      <div key={zone.id} className="bg-white rounded-3xl border border-[#F0EFEB] p-6 relative">
                        <button type="button" onClick={() => handleRemoveZone(zone.id)} className="absolute top-4 right-4 text-gray-300 hover:text-red-500"><TrashIcon className="h-4 w-4" /></button>
                        <div className="space-y-4">
                          <input type="text" value={zone.name} onChange={(e) => handleUpdateZone(zone.id, { name: e.target.value })} placeholder="Zone Name" className="w-full px-0 py-1 bg-transparent border-b border-[#F0EFEB] text-base font-bold focus:outline-none" />
                          <textarea value={zone.work_done} onChange={(e) => handleUpdateZone(zone.id, { work_done: e.target.value })} rows={2} className="w-full p-4 bg-[#FAFAF8] rounded-2xl text-[13px] border-none" placeholder="Work done in this zone..." />
                          {/* Before Photos */}
                          <div className="space-y-2">
                             <p className="text-[10px] font-bold text-[#A45A2A] uppercase tracking-widest flex items-center gap-1">
                                <PhotoIcon className="h-3 w-3" />
                                Before ({(zone as any).beforePhotos?.length || 0})
                             </p>
                             <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-2 px-2">
                                {((zone as any).beforePhotos || []).map((url: string, pIdx: number) => (
                                  <div key={pIdx} className="relative flex-none w-20 aspect-square rounded-xl overflow-hidden border border-[#F0EFEB] group shadow-sm">
                                    <img src={url} className="w-full h-full object-cover" />
                                    <button 
                                      type="button" 
                                      onClick={() => handleRemoveZonePhoto(zone.id, url, 'before')} 
                                      className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                    >
                                      <TrashIcon className="w-3 h-3"/>
                                    </button>
                                  </div>
                                ))}

                                {/* Zone Uploading Progress */}
                                {(activeUploads[`zone_${zone.id}_before`] || []).filter(u => u.status === 'uploading').map((u) => (
                                  <div key={u.id} className="relative flex-none w-20 aspect-square rounded-xl overflow-hidden border border-[#F0EFEB] bg-gray-50 flex flex-col items-center justify-center p-2">
                                     {u.previewUrl && <img src={u.previewUrl} className="absolute inset-0 w-full h-full object-cover opacity-20 blur-sm" />}
                                     <div className="relative z-10 w-full bg-white/50 h-0.5 rounded-full overflow-hidden">
                                        <motion.div 
                                          className="h-full bg-[#1A3626]" 
                                          initial={{ width: 0 }} 
                                          animate={{ width: `${u.progress}%` }} 
                                        />
                                     </div>
                                  </div>
                                ))}

                                <label className="flex-none w-20 aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center bg-white cursor-pointer hover:border-[#1A3626] hover:bg-[#F1F5F2] transition-all group">
                                   <CameraIcon className="h-4 w-4 text-gray-300 group-hover:text-[#1A3626]" />
                                   <span className="mt-1 text-[7px] font-bold uppercase text-gray-300 group-hover:text-[#1A3626]">Add</span>
                                   <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleUploadZonePhoto(zone.id, e.target.files, 'before')} />
                                </label>
                             </div>
                          </div>

                          {/* After Photos */}
                          <div className="space-y-2 border-t border-gray-50 pt-4">
                             <p className="text-[10px] font-bold text-[#214031] uppercase tracking-widest flex items-center gap-1">
                                <Sparkles className="h-3 w-3" />
                                After ({(zone as any).afterPhotos?.length || 0})
                             </p>
                             <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-2 px-2">
                                {((zone as any).afterPhotos || []).map((url: string, pIdx: number) => (
                                  <div key={pIdx} className="relative flex-none w-20 aspect-square rounded-xl overflow-hidden border border-[#F0EFEB] group shadow-sm">
                                    <img src={url} className="w-full h-full object-cover" />
                                    <button 
                                      type="button" 
                                      onClick={() => handleRemoveZonePhoto(zone.id, url, 'after')} 
                                      className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                    >
                                      <TrashIcon className="w-3 h-3"/>
                                    </button>
                                  </div>
                                ))}

                                {/* Zone Uploading Progress */}
                                {(activeUploads[`zone_${zone.id}_after`] || []).filter(u => u.status === 'uploading').map((u) => (
                                  <div key={u.id} className="relative flex-none w-20 aspect-square rounded-xl overflow-hidden border border-[#F0EFEB] bg-gray-50 flex flex-col items-center justify-center p-2">
                                     {u.previewUrl && <img src={u.previewUrl} className="absolute inset-0 w-full h-full object-cover opacity-20 blur-sm" />}
                                     <div className="relative z-10 w-full bg-white/50 h-0.5 rounded-full overflow-hidden">
                                        <motion.div 
                                          className="h-full bg-[#1A3626]" 
                                          initial={{ width: 0 }} 
                                          animate={{ width: `${u.progress}%` }} 
                                        />
                                     </div>
                                  </div>
                                ))}

                                <label className="flex-none w-20 aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center bg-white cursor-pointer hover:border-[#1A3626] hover:bg-[#F1F5F2] transition-all group">
                                   <CameraIcon className="h-4 w-4 text-gray-300 group-hover:text-[#1A3626]" />
                                   <span className="mt-1 text-[7px] font-bold uppercase text-gray-300 group-hover:text-[#1A3626]">Add</span>
                                   <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleUploadZonePhoto(zone.id, e.target.files, 'after')} />
                                </label>
                             </div>
                          </div>
                        </div>
                      </div>
                    ))}
                 </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'summary' && (
            <motion.div key="summary" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-8">
              <div className="bg-white rounded-3xl border border-[#F0EFEB] p-6 shadow-sm">
                 <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#AF907A] mb-4">Internal Notes</h3>
                 <textarea value={workNotes} onChange={(e) => setWorkNotes(e.target.value)} rows={3} className="w-full p-4 bg-[#FAFAF8] rounded-2xl text-[13px] border-none" placeholder="Internal notes..." />
              </div>
               {(task?.order.pricing_period === 'monthly' || task?.order.pricing_period === 'yearly') && (
                 <div className="bg-white rounded-3xl border border-[#F0EFEB] p-6 shadow-sm">
                    <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#AF907A] mb-6">Next Visit</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <input type="date" value={nextVisitDate} min={new Date().toISOString().split('T')[0]} onChange={(e) => setNextVisitDate(e.target.value)} className="w-full p-4 bg-[#FAFAF8] rounded-2xl text-sm border-none" />
                       <div className="flex gap-2"><input type="time" value={nextVisitTimeStart} onChange={(e) => setNextVisitTimeStart(e.target.value)} className="flex-1 p-4 bg-[#FAFAF8] rounded-2xl text-sm border-none" /><input type="time" value={nextVisitTimeEnd} onChange={(e) => setNextVisitTimeEnd(e.target.value)} className="flex-1 p-4 bg-[#FAFAF8] rounded-2xl text-sm border-none" /></div>
                    </div>
                    <textarea value={nextVisitNotes} onChange={(e) => setNextVisitNotes(e.target.value)} rows={2} className="w-full p-4 mt-4 bg-[#FAFAF8] rounded-2xl text-sm border-none" placeholder="Next visit notes..." />
                 </div>
               )}
            </motion.div>
          )}
        </AnimatePresence>
        <div className="fixed bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-white via-white to-transparent z-30">
           <div className="max-w-2xl mx-auto"><button onClick={handleSaveAll} disabled={reportSaving} className={`w-full py-5 rounded-2xl font-bold text-xs uppercase tracking-[0.2em] transition-all shadow-xl active:scale-[0.98] ${reportSaving ? 'bg-gray-100 text-gray-400' : 'bg-[#1A3626] text-white hover:bg-black shadow-[#1A3626]/20'}`}>{reportSaving ? 'Saving...' : 'Save All'}</button></div>
        </div>
      </div>
    </div>
  )
}
