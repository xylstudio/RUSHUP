import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Home, MapPin, User, Check, ShieldAlert } from 'lucide-react'
import { createServiceRoleSupabaseClient, createAnonSupabaseServerClient } from '@/lib/server/compliance'
import AcceptInviteButton from './AcceptInviteButton'
import ProtectedRoute from '@/lib/ProtectedRoute'
import { useI18n } from "@/lib/I18nContext";

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function HouseInvitePage({
  params,
  searchParams
}: {
  params: { houseId: string }
  searchParams: { token?: string }
}) {
    const { locale } = useI18n();
  const { houseId } = params
  const token = searchParams.token

  // Fetch house details using Service Role (since user might not have access yet)
  const serviceSupabase = createServiceRoleSupabaseClient()
  let inviteData = null
  let isInviteUsed = false

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-xl text-center">
           <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-red-500">
              <ShieldAlert size={32} strokeWidth={1.5} />
           </div>
           <p className="text-red-500 uppercase tracking-[0.3em] font-bold text-[10px] mb-6">Invalid Link</p>
           <h2 className="text-3xl font-light leading-tight">{locale === 'en' ? 'Sorry, this invitation link is invalid (Token not found).' : locale === 'zh' ? '抱歉，此邀请链接无效（未找到令牌）。' : 'ขออภัย ลิงก์คำเชิญนี้ไม่ถูกต้อง (ไม่พบ Token)'}</h2>
           <div className="mt-12">
             <Link href="/dashboard/customer" className="bg-[#111111] text-white py-4 px-8 text-[10px] font-bold uppercase tracking-widest inline-block">
                {locale === 'en' ? 'Return to home page' : locale === 'zh' ? '返回首页' : '                 กลับสู่หน้าหลัก              '}</Link>
           </div>
        </div>
      </div>
    )
  }

  const { data: invite, error: inviteError } = await serviceSupabase
      .from('house_invites')
      .select('*')
      .eq('id', token)
      .eq('house_id', houseId)
      .maybeSingle()

    if (inviteError || !invite) {
      return (
        <div className="flex min-h-screen items-center justify-center px-6">
          <div className="w-full max-w-xl text-center">
             <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-red-500">
                <ShieldAlert size={32} strokeWidth={1.5} />
             </div>
             <p className="text-red-500 uppercase tracking-[0.3em] font-bold text-[10px] mb-6">Invalid Link</p>
             <h2 className="text-3xl font-light leading-tight">{locale === 'en' ? 'Sorry, this invitation link is invalid.' : locale === 'zh' ? '抱歉，此邀请链接无效。' : 'ขออภัย ลิงก์คำเชิญนี้ไม่ถูกต้อง'}</h2>
             <div className="mt-12">
               <Link href="/dashboard/customer" className="bg-[#111111] text-white py-4 px-8 text-[10px] font-bold uppercase tracking-widest inline-block">
                  {locale === 'en' ? 'Return to home page' : locale === 'zh' ? '返回首页' : '                   กลับสู่หน้าหลัก                '}</Link>
             </div>
          </div>
        </div>
      )
    }

    inviteData = invite
    isInviteUsed = !!invite.used_by

  const { data: house, error: houseError } = await serviceSupabase
    .from('houses')
    .select(`
      id,
      name,
      address,
      image_url,
      user_id,
      customer_id,
      profiles!houses_customer_id_fkey(display_name)
    `)
    .eq('id', houseId)
    .single()

  if (houseError || !house) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-xl text-center">
           <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-red-500">
              <ShieldAlert size={32} strokeWidth={1.5} />
           </div>
           <p className="text-red-500 uppercase tracking-[0.3em] font-bold text-[10px] mb-6">Invitation Invalid</p>
           <h2 className="text-3xl font-light leading-tight">{locale === 'en' ? 'Sorry, this invitation was not found or has been cancelled.' : locale === 'zh' ? '抱歉，未找到此邀请或已取消。' : 'ขออภัย ไม่พบคำเชิญนี้หรือถูกยกเลิกไปแล้ว'}</h2>
           <div className="mt-12">
             <Link href="/dashboard/customer" className="bg-[#111111] text-white py-4 px-8 text-[10px] font-bold uppercase tracking-widest inline-block">
                {locale === 'en' ? 'Return to home page' : locale === 'zh' ? '返回首页' : '                 กลับสู่หน้าหลัก              '}</Link>
           </div>
        </div>
      </div>
    )
  }

  const ownerName = house.profiles?.display_name || 'เจ้าของบ้าน'

  // Check if current user is logged in
  const anonSupabase = createAnonSupabaseServerClient()
  const { data: { session } } = await anonSupabase.auth.getSession()
  const isLoggedIn = !!session?.user

  // Ensure they don't accept their own house
  const isAlreadyOwner = session?.user && (house.user_id === session.user.id || house.customer_id === session.user.id)

  if (isAlreadyOwner) {
    redirect(`/dashboard/customer/houses/${houseId}`)
  }

  return (
    <ProtectedRoute allowedRoles={['customer']}>
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col font-sans text-zinc-900 selection:bg-zinc-900 selection:text-white">
      {/* Navigation */}
      <nav className="absolute top-0 left-0 w-full z-50 p-6 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 group">
          <ArrowLeft size={16} className="text-white group-hover:text-zinc-200 transition-colors" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white group-hover:tracking-[0.25em] transition-all">Back</span>
        </Link>
      </nav>

      {/* Hero Image */}
      <div className="relative w-full h-[50vh] md:h-[60vh]">
        <img 
          src={house.image_url || '/assets/default-house.png'}
          alt="House Preview"
          className="w-full h-full object-cover brightness-75"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#FAFAFA] via-transparent to-black/30" />
      </div>

      {/* Content */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-6 -mt-32 relative z-10 pb-24">
        <div className="bg-white p-8 md:p-12 shadow-2xl border border-zinc-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px w-8 bg-[var(--customer-accent)]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">{locale === 'en' ? 'Invitation to the project' : locale === 'zh' ? '项目邀请' : 'คำเชิญเข้าสู่โครงการ'}</span>
          </div>

          <h1 className="font-serif text-4xl md:text-5xl font-light tracking-tight mb-8">
            {house.name || 'โครงการไม่ระบุชื่อ'}
          </h1>

          <div className="space-y-4 mb-12">
            <div className="flex items-start gap-3">
              <MapPin size={18} className="text-zinc-400 mt-1" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">{locale === 'en' ? 'Location' : locale === 'zh' ? '地点' : 'สถานที่ตั้ง'}</p>
                <p className="text-[15px] text-zinc-700">{house.address || 'ไม่ระบุที่อยู่'}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <User size={18} className="text-zinc-400 mt-1" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">{locale === 'en' ? 'Project owner' : locale === 'zh' ? '项目业主' : 'เจ้าของโครงการ'}</p>
                <p className="text-[15px] text-zinc-700">{ownerName}</p>
              </div>
            </div>
          </div>

          {isInviteUsed ? (
            <div className="bg-red-50 border border-red-100 p-6 flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-full bg-red-100 text-red-500 flex items-center justify-center mb-4">
                <ShieldAlert size={20} strokeWidth={2} />
              </div>
              <h3 className="font-bold text-red-700 mb-2">{locale === 'en' ? 'This permission has already been used.' : locale === 'zh' ? '该权限已被使用。' : 'สิทธิ์นี้ถูกใช้ไปแล้ว'}</h3>
              <p className="text-sm text-red-600 mb-6">{locale === 'en' ? 'This invitation link has already been redeemed. and cannot be used again' : locale === 'zh' ? '该邀请链接已被兑换。并且不能再次使用' : 'ลิงก์คำเชิญนี้ถูกกดรับสิทธิ์ไปแล้ว และไม่สามารถใช้งานได้อีก'}</p>
              <Link href="/dashboard/customer" className="bg-[#111111] text-white py-3 px-8 text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-800 transition-colors">
                {locale === 'en' ? 'Return to home page' : locale === 'zh' ? '返回首页' : '                 กลับสู่หน้าหลัก               '}</Link>
            </div>
          ) : (
            <div className="bg-zinc-50 border border-zinc-100 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 shrink-0 rounded-full bg-green-100 text-green-600 flex items-center justify-center mt-1">
                  <Check size={20} strokeWidth={2} />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900 mb-1">{locale === 'en' ? 'Your access rights' : locale === 'zh' ? '您的访问权限' : 'สิทธิ์การเข้าถึงของคุณ'}</h3>
                  <p className="text-sm text-zinc-600 leading-relaxed">
                    {locale === 'en' ? 'When you press to accept the rights You will be able to view and manage this project immediately.' : locale === 'zh' ? '当您按下接受权利时，您将能够立即查看和管理该项目。' : '                     เมื่อกดยอมรับสิทธิ์ คุณจะสามารถเข้าดูและจัดการโครงการนี้ได้ทันที                   '}</p>
                </div>
              </div>
              
              <AcceptInviteButton houseId={houseId} token={token} isLoggedIn={isLoggedIn} />
            </div>
          )}
        </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
