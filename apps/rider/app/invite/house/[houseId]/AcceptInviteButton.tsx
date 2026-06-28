'use client';
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { useI18n } from "@/lib/I18nContext";

export default function AcceptInviteButton({ houseId, token, isLoggedIn }: { houseId: string, token?: string, isLoggedIn?: boolean }) {
    const { locale } = useI18n();
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleAccept = async () => {
    setLoading(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const sessionToken = sessionData?.session?.access_token

      const res = await fetch(`/api/houses/${houseId}/accept-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {})
        },
        body: JSON.stringify({ token })
      })
      const data = await res.json()

      if (res.status === 401) {
        router.push(`/login?next=/invite/house/${houseId}`)
        return
      }

      if (res.ok) {
        // Redirect to the house page
        router.push(`/dashboard/customer/houses/${houseId}?from=invite`)
      } else {
        alert(data.error || 'Failed to accept invitation.')
        setLoading(false)
      }
    } catch (err) {
      console.error(err)
      alert('An error occurred while accepting the invitation.')
      setLoading(false)
    }
  }

  return (
    <button 
      onClick={handleAccept}
      disabled={loading}
      className="w-full md:w-auto bg-[#111111] text-white py-4 px-12 text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
    >
      {loading ? (
        <><Loader2 size={14} className="animate-spin" /> {locale === 'en' ? 'In progress...' : locale === 'zh' ? '进行中...' : ' กำลังดำเนินการ...'}</>
      ) : (
        'ยอมรับสิทธิ์'
      )}
    </button>
  )
}
