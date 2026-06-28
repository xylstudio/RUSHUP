'use client';
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useI18n } from "@/lib/I18nContext";

export default function ReschedulePage({ params }: { params: { id: string } }) {
    const { locale } = useI18n();
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const { data: { session, user } } = await supabase.auth.getSession()
        if (!session) {
          router.push(`/login?next=/dashboard/customer/reschedule/${params.id}`)
          return
        }

        const rawId = params.id
        const cleanId = typeof rawId === 'string' ? rawId.trim() : ''
        
        if (!cleanId) {
          throw new Error('ไม่พบ ID สำหรับการเลื่อนนัดหมาย')
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user?.id)
          .maybeSingle()

        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId)
        let query = supabase.from('orders').select('id, house_id, customer_id')
        
        if (isUuid) {
          query = query.eq('id', cleanId)
        } else {
          query = query.or(`house_code.eq."${cleanId}",order_code.eq."${cleanId}"`)
            .order('created_at', { ascending: false })
            .limit(1)
        }

        const { data, error: fetchError } = await query.maybeSingle()

        if (fetchError) {
          throw new Error(`ฐานข้อมูลขัดข้อง: ${fetchError.message}`)
        }

        if (!data) {
          throw new Error('ไม่พบข้อมูลนัดหมายนี้ในระบบ')
        }
        
        const orderData = Array.isArray(data) ? data[0] : data
        
        const userRole = profile?.role || 'unknown'
        const isOwner = orderData.customer_id === session.user.id
        const isStaff = userRole === 'admin' || userRole === 'staff'

        if (!isOwner && !isStaff) {
          throw new Error('คุณไม่มีสิทธิ์เข้าถึงนัดหมายนี้')
        }

        if (!orderData.house_id) {
          throw new Error('ไม่พบข้อมูลบ้านสำหรับนัดหมายนี้')
        }

        router.replace(`/dashboard/customer/houses/${encodeURIComponent(orderData.house_id)}?calendar=open&action=reschedule&orderId=${encodeURIComponent(orderData.id)}`)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [params.id])

  if (loading) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-[#fcfcf9]">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mb-4" />
        <p className="text-[#70706B] font-medium animate-pulse">{locale === 'en' ? 'Taking you to the home calendar...' : locale === 'zh' ? '带您进入家庭日历...' : 'กำลังพาไปยังปฏิทินของบ้าน...'}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 bg-[#fcfcf9] min-h-screen">
        <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-red-600 mb-6">
          {error}
        </div>
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[#70706B] font-medium"
        >
          {locale === 'en' ? 'Return to the previous page.' : locale === 'zh' ? '返回上一页。' : '           กลับหน้าเดิม         '}</button>
      </div>
    )
  }

  return null
}
