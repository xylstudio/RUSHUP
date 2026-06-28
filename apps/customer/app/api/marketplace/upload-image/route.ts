import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const BUCKET = 'marketplace-images'

function getEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return { supabaseUrl, supabaseAnonKey, serviceRoleKey }
}

export async function POST(request: NextRequest) {
  try {
    const { supabaseUrl, supabaseAnonKey, serviceRoleKey } = getEnv()

    const authHeader = request.headers.get('authorization') || ''
    const token = authHeader.replace('Bearer ', '').trim()

    if (!token) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อนอัปโหลดรูป' }, { status: 401 })
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    })

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'สิทธิ์การใช้งานไม่ถูกต้อง' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await authClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'อนุญาตเฉพาะ admin เท่านั้น' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const fileName = (formData.get('fileName') as string | null)?.trim() || 'plant-image'

    if (!file) {
      return NextResponse.json({ error: 'ไม่พบไฟล์ที่อัปโหลด' }, { status: 400 })
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'ไฟล์ต้องเป็นรูปภาพเท่านั้น' }, { status: 400 })
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const bucketCheck = await adminClient.storage.getBucket(BUCKET)
    if (bucketCheck.error) {
      const createBucketResult = await adminClient.storage.createBucket(BUCKET, {
        public: true,
      })

      if (createBucketResult.error) {
        return NextResponse.json(
          { error: `สร้าง bucket ไม่สำเร็จ: ${createBucketResult.error.message}` },
          { status: 500 }
        )
      }
    }

    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
    const random = Math.random().toString(36).slice(2, 10)
    const objectPath = `plants/${Date.now()}_${random}_${safeName}`

    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await adminClient.storage
      .from(BUCKET)
      .upload(objectPath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json({ error: `อัปโหลดรูปไม่สำเร็จ: ${uploadError.message}` }, { status: 500 })
    }

    const { data: publicData } = adminClient.storage.from(BUCKET).getPublicUrl(objectPath)

    return NextResponse.json({
      publicUrl: publicData.publicUrl,
      path: objectPath,
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'ไม่สามารถอัปโหลดรูปได้',
        details: error?.message || 'unknown error',
      },
      { status: 500 }
    )
  }
}
