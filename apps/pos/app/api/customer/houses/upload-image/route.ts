import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { resolveRequestUser } from '@/lib/server/requestAuth'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const BUCKET = 'house-images'

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

export async function POST(req: NextRequest) {
  try {
    const user = await resolveRequestUser(req)

    if (!user) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อนอัปโหลดรูป' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const houseId = String(formData.get('houseId') || '').trim()

    if (!file || !houseId) {
      return NextResponse.json({ error: 'ข้อมูลอัปโหลดไม่ครบถ้วน' }, { status: 400 })
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'อัปโหลดได้เฉพาะไฟล์รูปภาพเท่านั้น' }, { status: 400 })
    }

    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'ไฟล์ใหญ่เกินไป (สูงสุด 20 MB)' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { data: house, error: houseError } = await supabase
      .from('houses')
      .select('id, user_id')
      .eq('id', houseId)
      .single()

    if (houseError || !house) {
      return NextResponse.json({ error: 'ไม่พบบ้านที่ต้องการอัปโหลดรูป' }, { status: 404 })
    }

    if (house.user_id !== user.id) {
      return NextResponse.json({ error: 'คุณไม่มีสิทธิ์แก้ไขบ้านหลังนี้' }, { status: 403 })
    }

    const { error: bucketCheckError } = await supabase.storage.getBucket(BUCKET)
    if (bucketCheckError) {
      await supabase.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: 20 * 1024 * 1024,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'],
      })
    }

    const safeName = sanitizeFileName(file.name || 'house-image.jpg')
    const rand = Math.random().toString(36).slice(2, 10)
    const objectPath = `${user.id}/${houseId}/${Date.now()}_${rand}_${safeName}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(objectPath, buffer, { upsert: false, contentType: file.type })

    if (uploadError) {
      return NextResponse.json({ error: `อัปโหลดรูปไม่สำเร็จ: ${uploadError.message}` }, { status: 500 })
    }

    const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(objectPath)

    const { error: updateError } = await supabase
      .from('houses')
      .update({ image_url: publicData.publicUrl })
      .eq('id', houseId)

    if (updateError) {
      console.error('Failed to update house image_url:', updateError)
    }

    return NextResponse.json({ success: true, imageUrl: publicData.publicUrl, path: objectPath })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'ไม่สามารถอัปโหลดรูปบ้านได้',
        details: error?.message || 'unknown error',
      },
      { status: 500 }
    )
  }
}