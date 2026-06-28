import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Initialize Supabase with Service Role Key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const action = formData.get('action') as string // 'upload' or 'submit' or 'check'
    const profileId = formData.get('profileId') as string

    if (!profileId) {
      return NextResponse.json({ error: 'Missing profileId' }, { status: 400 })
    }

    // CASE 0: CHECK ID CARD AVAILABILITY
    if (action === 'check') {
      const idCardNumber = formData.get('idCardNumber') as string
      if (!idCardNumber) return NextResponse.json({ error: 'Missing idCardNumber' }, { status: 400 })

      // 🔍 Fetch records with this ID Card Number
      const { data: existing } = await supabaseAdmin
        .from('staff_identity')
        .select('profile_id, verified_at')
        .eq('id_card_number', idCardNumber)
        .neq('profile_id', profileId) // Exclude current user
        .maybeSingle()

      // 🛑 Only block if it exists AND is already verified by someone else
      const isTaken = existing && existing.verified_at !== null

      return NextResponse.json({ exists: !!isTaken })
    }

    // CASE 1: JUST UPLOAD PHOTO
    if (action === 'upload') {
      const file = formData.get('file') as File
      if (!file) return NextResponse.json({ error: 'Missing file' }, { status: 400 })

      const fileExt = file.name.split('.').pop()
      const fileName = `verification/${profileId}_${Date.now()}.${fileExt}`
      const buffer = Buffer.from(await file.arrayBuffer())

      const { data, error: uploadError } = await supabaseAdmin.storage
        .from('marketplace-images')
        .upload(fileName, buffer, { contentType: file.type, upsert: true })

      if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

      const { data: { publicUrl } } = supabaseAdmin.storage
        .from('marketplace-images')
        .getPublicUrl(fileName)

      return NextResponse.json({ success: true, publicUrl })
    }

    // CASE 2: SUBMIT IDENTITY DATA
    if (action === 'submit') {
      const idCardNumber = formData.get('idCardNumber') as string
      const idCardPhotoUrl = formData.get('idCardPhotoUrl') as string
      const bankName = formData.get('bankName') as string
      const bankAccountNumber = formData.get('bankAccountNumber') as string

      // 🛑 Check for duplicate ID Card Number (Only block if ALREADY VERIFIED by someone else)
      const { data: existing } = await supabaseAdmin
        .from('staff_identity')
        .select('profile_id, verified_at')
        .eq('id_card_number', idCardNumber)
        .neq('profile_id', profileId)
        .maybeSingle()

      if (existing && existing.verified_at !== null) {
        return NextResponse.json({ error: 'มีข้อมูลในระบบแล้ว' }, { status: 400 })
      }

      // Use Admin privileges to UPSERT into staff_identity (bypasses RLS)
      const { error: dbError } = await supabaseAdmin
        .from('staff_identity')
        .upsert({
          profile_id: profileId,
          id_card_number: idCardNumber,
          id_card_photo_url: idCardPhotoUrl,
          bank_name: bankName,
          bank_account_number: bankAccountNumber,
          created_at: new Date().toISOString()
        })

      if (dbError) {
        console.error('DB Error:', dbError)
        return NextResponse.json({ error: dbError.message }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
