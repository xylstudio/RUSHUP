import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { resolveRequestUser } from '@/lib/server/requestAuth'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const createServiceClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars')
  return createClient(url, key)
}

const sanitizeFileName = (name: string) =>
  name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 120)

const asText = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

const normalizeMime = (value: string) => value.split(';')[0].trim().toLowerCase()

const inferImageMimeFromName = (name: string) => {
  const lower = name.toLowerCase()
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.gif')) return 'image/gif'
  if (lower.endsWith('.heic')) return 'image/heic'
  if (lower.endsWith('.heif')) return 'image/heif'
  return ''
}

export async function POST(req: NextRequest) {
  try {
    const user = await resolveRequestUser(req)

    const supabase = createServiceClient()

    let file: File | null = null
    let orderId: string | null = null
    let assignmentId: string | null = null
    let kind: string | null = null

    const search = req.nextUrl.searchParams
    const queryOrderId = asText(search.get('orderId'))
    const queryAssignmentId = asText(search.get('assignmentId'))
    const queryKind = asText(search.get('kind'))
    const queryMode = asText(search.get('mode'))
    const queryName = asText(search.get('name')) || 'photo.jpg'
    const rawContentType = asText(req.headers.get('content-type'))
    const contentType = normalizeMime(rawContentType)
    const uploadMode = asText(req.headers.get('x-upload-mode'))
    const isBinaryMode =
      (queryOrderId && queryAssignmentId && queryKind && queryMode === 'binary') ||
      uploadMode === 'binary'

    // Fast path for mobile: raw binary upload (no multipart parser needed).
    if (isBinaryMode) {
      const buffer = await req.arrayBuffer()
      if (!buffer || buffer.byteLength === 0) {
        return NextResponse.json({ error: 'Empty file body' }, { status: 400 })
      }

      const inferredMime = contentType.startsWith('image/')
        ? contentType
        : inferImageMimeFromName(queryName) || 'image/jpeg'

      file = new File([buffer], queryName, { type: inferredMime })
      orderId = queryOrderId
      assignmentId = queryAssignmentId
      kind = queryKind
    } else {
      if (!rawContentType.toLowerCase().includes('multipart/form-data')) {
        return NextResponse.json({ error: 'Unsupported upload content type' }, { status: 415 })
      }

      // Fallback path: multipart/form-data
      const formData = await req.formData()
      file = formData.get('file') as File | null
      orderId = formData.get('orderId') as string | null
      assignmentId = formData.get('assignmentId') as string | null
      kind = formData.get('kind') as string | null
    }

    if (!file || !orderId || !assignmentId || !kind) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const isValidKind = ['before', 'after', 'zone'].includes(kind) || kind.startsWith('zone_')
    if (!isValidKind) {
      return NextResponse.json({ error: 'Invalid kind' }, { status: 400 })
    }

    // Verify assignment exists and belongs to the target order.
    const { data: assignment, error: assignmentError } = await supabase
      .from('job_assignments')
      .select('id, order_id, staff_id')
      .eq('id', assignmentId)
      .single()

    if (assignmentError || !assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    if (assignment.order_id !== orderId) {
      return NextResponse.json({ error: 'Assignment/order mismatch' }, { status: 400 })
    }

    // Preferred security path: if user session is available, enforce ownership/admin check.
    // Mobile in-app browsers may occasionally lose session headers/cookies, so we allow
    // upload by valid assignment+order pair as a fallback to keep field operation working.
    if (user) {
      if (assignment.staff_id !== user.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profile?.role !== 'admin') {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      }
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 })
    }

    // Limit file size to 25 MB (mobile camera images are often larger than 10 MB)
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 25 MB)' }, { status: 400 })
    }

    const safeName = sanitizeFileName(file.name || 'photo.jpg')
    const rand = Math.random().toString(36).slice(2, 10)
    const path = `${orderId}/${assignmentId}/${kind}/${Date.now()}_${rand}_${safeName}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    // Auto-create bucket if it doesn't exist (safety net)
    const { error: bucketCheckErr } = await supabase.storage.getBucket('work-reports')
    if (bucketCheckErr) {
      await supabase.storage.createBucket('work-reports', {
        public: true,
        fileSizeLimit: 25 * 1024 * 1024,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'],
      })
    }

    const { error: uploadError } = await supabase.storage
      .from('work-reports')
      .upload(path, buffer, { upsert: false, contentType: file.type })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: publicData } = supabase.storage.from('work-reports').getPublicUrl(path)

    return NextResponse.json({ success: true, url: publicData.publicUrl })
  } catch (err) {
    console.error('POST /api/staff/upload-work-photo error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
