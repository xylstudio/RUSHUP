'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getUserProfile, supabase, getHouseCount } from '../../../lib/supabaseClient'
import XYLLoader from '@/components/loaders/XYLLoader'

const parseTokenParams = (hash: string, search: string) => {
  const hashParams = new URLSearchParams(hash.replace(/^#/, ''))
  const queryParams = new URLSearchParams(search.replace(/^\?/, ''))

  const readCookie = (name: string) => {
    const cookie = document.cookie
      .split('; ')
      .find((entry) => entry.startsWith(`${name}=`))
    return cookie ? decodeURIComponent(cookie.split('=').slice(1).join('=')) : ''
  }

  const accessToken =
    hashParams.get('access_token') ||
    queryParams.get('access_token') ||
    readCookie('line_access_token_fallback')

  const refreshToken =
    hashParams.get('refresh_token') ||
    queryParams.get('refresh_token') ||
    readCookie('line_refresh_token_fallback')

  // Read next path from search params first (most reliable), then hash, then cookie fallback
  const nextFromSearch = queryParams.get('next') || ''
  const nextFromHash = hashParams.get('next') || ''
  const nextFromCookie = readCookie('line_next_path_fallback')

  return {
    accessToken: accessToken || '',
    refreshToken: refreshToken || '',
    nextPath: nextFromSearch || nextFromHash || nextFromCookie,
  }
}

const resolveNextPath = (nextPath: string) => {
  if (!nextPath) return ''
  if (!nextPath.startsWith('/')) return ''
  if (!nextPath.startsWith('/dashboard') && !nextPath.startsWith('/invite')) return ''
  return nextPath
}

export default function AuthSuccessPage() {
  const router = useRouter()
  const [message, setMessage] = useState('กำลังเข้าสู่ระบบ...')

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const { accessToken, refreshToken, nextPath } = parseTokenParams(window.location.hash, window.location.search)
        const safeNextPath = resolveNextPath(nextPath)

        if (!accessToken || !refreshToken) {
          setMessage('ไม่พบข้อมูล session จาก LINE Login')
          setTimeout(() => router.replace('/login?error=missing_session&error_description=Missing%20token%20in%20LINE%20callback%20result'), 1200)
          return
        }

        document.cookie = 'line_access_token_fallback=; Path=/; Max-Age=0; SameSite=Lax'
        document.cookie = 'line_refresh_token_fallback=; Path=/; Max-Age=0; SameSite=Lax'
        document.cookie = 'line_next_path_fallback=; Path=/; Max-Age=0; SameSite=Lax'

        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })

        if (sessionError) {
          setMessage('ไม่สามารถตั้งค่า session ได้')
          setTimeout(() => router.replace('/login?error=session_failed&error_description=Unable%20to%20persist%20session%20on%20this%20browser'), 1200)
          return
        }

        const { data: profile } = await getUserProfile()

        if (safeNextPath) {
          router.replace(safeNextPath)
          return
        }

        if (profile?.role === 'admin') {
          router.replace('/dashboard/admin')
          return
        }

        if (profile?.role === 'staff') {
          router.replace('/dashboard/staff')
          return
        }

        if (profile?.id) {
          const { data: houseCount } = await getHouseCount(profile.id)
          if (houseCount === 0) {
            router.replace('/dashboard/customer/houses/add')
            return
          }
        }

        router.replace('/dashboard/customer')
      } catch (error) {
        console.error('Auth success page error:', error)
        setMessage('เกิดข้อผิดพลาดในการเข้าสู่ระบบ')
        setTimeout(() => router.replace('/login?error=auth_failed&error_description=Unhandled%20error%20on%20auth%20success%20page'), 1200)
      }
    }

    bootstrap()
  }, [router])

  return (
    <>
      <XYLLoader tagline={message} />
      <style jsx global>{`
        [data-project-header] {
          display: none !important;
        }
      `}</style>
    </>
  )
}