'use client';
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Mail, Lock, ArrowRight, Apple, Chrome, Fingerprint, Loader2 } from 'lucide-react'
import PublicRoute from '@/components/PublicRoute'
import { getUserProfile, signIn, getCustomerHouses } from '../../lib/supabaseClient'
import { useI18n, type Locale } from '@/lib/I18nContext'

const copyByLocale: Record<Locale, Record<string, string>> = {
  th: {
    invalidCredentials: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
    emailNotConfirmed: 'กรุณายืนยันอีเมลในกล่องจดหมายของคุณ',
    loginError: 'ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง',
    lineLogin: 'Identify with LINE',
    signingIn: 'IDENTIFYING...',
  },
  en: {
    invalidCredentials: 'Incorrect email or password.',
    emailNotConfirmed: 'Please confirm your email in your inbox.',
    loginError: 'System error. Please try again.',
    lineLogin: 'Identify with LINE',
    signingIn: 'IDENTIFYING...',
  },
  zh: {
    invalidCredentials: '邮箱或密码错误。',
    emailNotConfirmed: '请检查邮箱并确认。',
    loginError: '系统错误，请重试。',
    lineLogin: 'Identify with LINE',
    signingIn: '正在验证...',
  },
}

export default function Login() {
  const { locale } = useI18n()
  const copy = copyByLocale[locale]
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [lineLoading, setLineLoading] = useState(false)
  const [error, setError] = useState('')
  const [nextPath, setNextPath] = useState('')
  const router = useRouter()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const nextCandidate = params.get('next') || ''
    if (nextCandidate.startsWith('/dashboard') || nextCandidate.startsWith('/invite')) setNextPath(nextCandidate)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data, error: signInError } = await signIn(email, password)
      if (signInError) {
        const msg = signInError instanceof Error ? signInError.message : String(signInError)
        if (msg.includes('Invalid login credentials')) setError(copy.invalidCredentials)
        else if (msg.includes('Email not confirmed')) setError(copy.emailNotConfirmed)
        else setError(copy.loginError)
      } else if (data?.user) {
        const { data: profile } = await getUserProfile()
        let target = nextPath
        
        // Prevent loop: If they logged out from a dashboard, ProtectedRoute might have appended it as ?next=.
        // If an admin logs in, we don't want them getting stuck in customer/staff dashboards unless it's a specific deep link (has query params).
        if (target) {
          const hasQueryParams = target.includes('?')
          if (!hasQueryParams) {
            if (target === '/dashboard/customer' || target.startsWith('/dashboard/customer/')) {
              target = ''
            } else if (target === '/dashboard/staff' || target.startsWith('/dashboard/staff/')) {
              target = ''
            }
          }
        }

        target = target || (
          (profile?.role === 'admin' || profile?.staff_level === 'admin')
            ? '/dashboard/admin' 
            : profile?.role === 'staff' 
              ? (profile?.is_pos_account ? '/dashboard/pos' : '/dashboard/staff')
              : '/dashboard/customer'
        )

        if (target === '/dashboard/customer' && profile?.id) {
           const { data: houses } = await getCustomerHouses(profile.id)
           if (!houses || houses.length === 0) {
              target = '/dashboard/customer/houses/add'
           }
        }

        router.push(target)
      }
    } catch (err) {
      setError(copy.loginError)
    } finally {
      setLoading(false)
    }
  }

  const handleLineSignIn = async () => {
    setLineLoading(true)
    setError('')
    const url = nextPath ? `/api/auth/line/login?next=${encodeURIComponent(nextPath)}` : '/api/auth/line/login'
    window.location.assign(url)
  }

  return (
    <PublicRoute>
      <div className="h-screen w-full bg-white flex flex-col items-center justify-center relative overflow-hidden font-sans text-zinc-900 select-none antialiased selection:bg-zinc-900 selection:text-white">
        
        {/* BACKGROUND IDENTITY */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none">
          <div className="text-[60vh] font-serif leading-[0.7] flex flex-col items-center rotate-[-10deg]">
            <span>X</span>
            <span>Y</span>
            <span className="italic">L</span>
          </div>
        </div>

        {/* ADDITIONAL DECOR */}
        <div className="absolute top-0 left-0 w-full h-1 bg-zinc-900"></div>
        <div className="absolute bottom-0 right-0 w-full h-1 bg-zinc-900"></div>
        <div className="absolute top-1/2 left-0 w-4 h-[2px] bg-zinc-900 -translate-y-1/2"></div>
        <div className="absolute top-1/2 right-0 w-4 h-[2px] bg-zinc-900 -translate-y-1/2"></div>

        {/* LOGIN CONTAINER */}
        <div className="relative z-10 w-full px-10 max-w-sm">
          
          <div className="mb-12 flex flex-col items-center">
            <div className="text-4xl font-serif tracking-tighter leading-none flex flex-col items-center mb-4">
              <span>X</span>
              <span className="my-[-6px]">Y</span>
              <span className="italic">L</span>
            </div>
            <div className="h-[1px] w-8 bg-zinc-300"></div>
            <p className="mt-4 text-[8px] tracking-[0.8em] text-zinc-400 uppercase font-bold">STUDIO</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-zinc-50 border-l border-zinc-900 text-[10px] text-zinc-600 uppercase tracking-widest leading-relaxed">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-0 shadow-[4px_4px_0px_0px_rgba(24,24,27,0.05)]">
              <div className="relative border-[1px] border-zinc-900 group">
                <div className="bg-white p-4 flex items-center transition-all group-focus-within:bg-zinc-50">
                  <Mail className="text-zinc-900 mr-4" size={16} />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder={locale === 'en' ? 'ชื่อผู้ใช้ / อีเมล' : locale === 'zh' ? 'ชื่อผู้ใช้ / อีเมล' : 'ชื่อผู้ใช้ / อีเมล'}
                    className="w-full bg-transparent border-none outline-none text-[11px] tracking-[0.2em] font-medium placeholder:text-zinc-300 placeholder:uppercase"
                  />
                </div>
              </div>

              <div className="relative border-[1px] border-zinc-900 border-t-0 group">
                <div className="bg-white p-4 flex items-center transition-all group-focus-within:bg-zinc-50">
                  <Lock className="text-zinc-900 mr-4" size={16} />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder={locale === 'en' ? 'password' : locale === 'zh' ? '密码' : 'รหัสผ่าน'}
                    className="w-full bg-transparent border-none outline-none text-[11px] tracking-[0.2em] font-medium placeholder:text-zinc-300 placeholder:uppercase"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-zinc-300 hover:text-zinc-900 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center px-1">
               <button type="button" className="text-[9px] text-zinc-400 uppercase tracking-widest hover:text-zinc-900 transition-colors">
                 {locale === 'en' ? '                  ลืมรหัสผ่าน?                ' : locale === 'zh' ? '                  ลืมรหัสผ่าน?                ' : '                  ลืมรหัสผ่าน?                '}</button>
               <div className="h-[1px] w-4 bg-zinc-200"></div>
               <button type="button" onClick={() => router.push('/register')} className="text-[9px] text-zinc-400 uppercase tracking-widest hover:text-zinc-900 transition-colors">
                 {locale === 'en' ? '                  ลงทะเบียน                ' : locale === 'zh' ? '                  ลงทะเบียน                ' : '                  ลงทะเบียน                '}</button>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-zinc-900 text-white py-5 mt-4 relative overflow-hidden group active:scale-[0.98] transition-all shadow-xl shadow-zinc-900/10"
            >
              {loading ? (
                <div className="flex justify-center items-center gap-2">
                  <div className="w-2 h-2 bg-white animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 bg-white animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-white animate-bounce"></div>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3">
                  <span className="tracking-[0.5em] uppercase text-[11px] font-bold">{locale === 'en' ? 'เข้าสู่ระบบ' : locale === 'zh' ? 'เข้าสู่ระบบ' : 'เข้าสู่ระบบ'}</span>
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </div>
              )}
            </button>
          </form>

          <div className="mt-16 flex flex-col items-center gap-6">
            <p className="text-[8px] tracking-[0.4em] text-zinc-300 uppercase">{locale === 'en' ? 'ระบบมีความปลอดภัยสูง' : locale === 'zh' ? 'ระบบมีความปลอดภัยสูง' : 'ระบบมีความปลอดภัยสูง'}</p>
            
            <button 
              onClick={handleLineSignIn}
              disabled={lineLoading}
              className="w-full py-4 bg-white border border-zinc-900 text-zinc-900 text-[10px] font-bold tracking-[0.4em] uppercase flex justify-center items-center gap-4 hover:bg-zinc-50 transition-all mb-2 shadow-sm active:scale-[0.98]"
            >
              {lineLoading ? <Loader2 className="w-4 h-4 animate-spin text-zinc-400" /> : (
                <img src="https://upload.wikimedia.org/wikipedia/commons/4/41/LINE_logo.svg" alt="LINE" className="w-[18px] h-[18px]" />
              )}
              {locale === 'en' ? '               เข้าสู่ระบบด้วย LINE             ' : locale === 'zh' ? '               เข้าสู่ระบบด้วย LINE             ' : '               เข้าสู่ระบบด้วย LINE             '}</button>
          </div>
        </div>

        <div className="absolute bottom-8 left-10 text-[10px] font-mono text-zinc-200 tracking-tighter">
          VER: 2.0.4 // XYL_STU
        </div>
        <div className="absolute top-8 right-10 text-[10px] font-mono text-zinc-200 tracking-tighter rotate-90 origin-right">
          EST. 2024
        </div>

      </div>
    </PublicRoute>
  )
}
