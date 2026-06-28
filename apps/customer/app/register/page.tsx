'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import PublicRoute from '@/components/PublicRoute'
import { useI18n, type Locale } from '@/lib/I18nContext'

const copyByLocale: Record<Locale, Record<string, string>> = {
  th: {
    passwordMismatch: 'รหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง',
    passwordTooShort: 'เพื่อความปลอดภัย รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร',
    emailInUse: 'อีเมลนี้มีอยู่ในระบบแล้ว กรุณาใช้บัญชีเดิมเข้าสู่ระบบ',
    invalidEmail: 'รูปแบบอีเมลไม่ถูกต้อง',
    registerError: 'ระบบขัดข้องในการสร้างบัญชี กรุณาลองใหม่อีกครั้ง',
    registerSuccess: 'ลงทะเบียนสำเร็จ! ระบบกำลังพาท่านไปหน้าเข้าสู่ระบบ...',
    description: 'ร่วมเป็นส่วนหนึ่งของประสบการณ์จัดการภูมิทัศน์ระดับพรีเมียม และเข้าถึงสิทธิพิเศษสำหรับสมาชิก',
    firstNameLabel: 'First Name',
    lastNameLabel: 'Last Name',
    firstNamePlaceholder: 'ชื่อ',
    lastNamePlaceholder: 'นามสกุล',
    passwordLabel: 'Security Password',
    confirmPasswordLabel: 'Confirm Password',
    passwordPlaceholder: 'อย่างน้อย 6 ตัวอักษร',
    confirmPasswordPlaceholder: 'ยืนยันรหัสผ่าน',
    hidePassword: 'ซ่อน',
    showPassword: 'แสดง',
    creatingAccount: 'ENROLLING...',
    createWithEmail: 'REQUEST MEMBERSHIP',
    continueLine: 'CONTINUE WITH LINE',
    haveAccount: 'มีบัญชีสมาชิกอยู่แล้ว?',
    signIn: 'เข้าสู่ระบบ',
    acceptPolicies: 'ฉันยอมรับนโยบายความเป็นส่วนตัวและเงื่อนไขการใช้บริการ',
    marketingConsent: 'ฉันยินยอมรับข่าวสาร โปรโมชัน และอัปเดตบริการจาก Xylem Landscape',
    consentRequired: 'กรุณายอมรับนโยบายความเป็นส่วนตัวและเงื่อนไขการใช้บริการก่อนสมัครสมาชิก',
    privacyLabel: 'นโยบายความเป็นส่วนตัว',
    termsLabel: 'เงื่อนไขการใช้บริการ',
    projectStatus: 'Member Status',
    newMember: 'New Enrollment',
    heroAlt: 'XYLEM Landscape Architecture',
  },
  en: {
    passwordMismatch: 'Passwords do not match. Please try again.',
    passwordTooShort: 'For security, password must be at least 6 characters.',
    emailInUse: 'This email is already registered. Please sign in instead.',
    invalidEmail: 'The email format is invalid.',
    registerError: 'Failed to create account. Please try again later.',
    registerSuccess: 'Registration successful! Taking you to the login page...',
    description: 'Join the collective for premium landscape management and exclusive architectural insights.',
    firstNameLabel: 'First Name',
    lastNameLabel: 'Last Name',
    firstNamePlaceholder: 'First Name',
    lastNamePlaceholder: 'Last Name',
    passwordLabel: 'Security Password',
    confirmPasswordLabel: 'Confirm Password',
    passwordPlaceholder: 'At least 6 characters',
    confirmPasswordPlaceholder: 'Confirm Password',
    hidePassword: 'Hide',
    showPassword: 'Show',
    creatingAccount: 'ENROLLING...',
    createWithEmail: 'REQUEST MEMBERSHIP',
    continueLine: 'CONTINUE WITH LINE',
    haveAccount: 'Already a member?',
    signIn: 'Sign In',
    acceptPolicies: 'I accept the Privacy Policy and Terms of Service',
    marketingConsent: 'I agree to receive service updates, offers, and marketing communications from Xylem Landscape',
    consentRequired: 'Please accept the Privacy Policy and Terms of Service before registering.',
    privacyLabel: 'Privacy Policy',
    termsLabel: 'Terms of Service',
    projectStatus: 'Member Status',
    newMember: 'New Enrollment',
    heroAlt: 'XYLEM Landscape Architecture',
  },
  zh: {
    passwordMismatch: '密码不匹配，请重试。',
    passwordTooShort: '为了安全，密码至少需要 6 个字符。',
    emailInUse: '此邮箱已注册，请直接登录。',
    invalidEmail: '邮箱格式无效。',
    registerError: '账户创建失败，请稍后再试。',
    registerSuccess: '注册成功！正在跳转至登录页面...',
    description: '加入高端景观管理 collective，获取专属建筑见解。',
    firstNameLabel: 'First Name',
    lastNameLabel: 'Last Name',
    firstNamePlaceholder: '名字',
    lastNamePlaceholder: '姓氏',
    passwordLabel: 'Security Password',
    confirmPasswordLabel: 'Confirm Password',
    passwordPlaceholder: '至少 6 个字符',
    confirmPasswordPlaceholder: '确认密码',
    hidePassword: '隐藏',
    showPassword: '显示',
    creatingAccount: '正在注册...',
    createWithEmail: '申请会员',
    continueLine: '使用 LINE 继续',
    haveAccount: '已经是会员？',
    signIn: '登录',
    acceptPolicies: '我接受隐私政策和服务条款',
    marketingConsent: '我同意接收 Xylem Landscape 的服务更新、优惠和营销信息',
    consentRequired: '请先接受隐私政策和服务条款后再注册。',
    privacyLabel: '隐私政策',
    termsLabel: '服务条款',
    projectStatus: '会员状态',
    newMember: '新注册',
    heroAlt: 'XYLEM Landscape Architecture',
  },
}

export default function Register() {
  const { locale } = useI18n()
  const copy = copyByLocale[locale]
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [acceptedPolicies, setAcceptedPolicies] = useState(false)
  const [marketingConsent, setMarketingConsent] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Add logic here if needed
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (password !== confirmPassword) {
      setError(copy.passwordMismatch)
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError(copy.passwordTooShort)
      setLoading(false)
      return
    }

    if (!acceptedPolicies) {
      setError(copy.consentRequired)
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          password,
          locale,
          consents: {
            privacyPolicy: acceptedPolicies,
            termsOfService: acceptedPolicies,
            marketing: marketingConsent,
          },
        }),
      })

      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        const msg = typeof result?.error === 'string' ? result.error : ''
        if (msg.includes('already registered')) setError(copy.emailInUse)
        else if (msg.includes('อีเมล')) setError(copy.invalidEmail)
        else setError(msg || copy.registerError)
      } else if (result?.success) {
        setSuccess(copy.registerSuccess)
        setTimeout(() => router.push('/login'), 5000)
      }
    } catch (err) {
      setError(copy.registerError)
    } finally {
      setLoading(false)
    }
  }

  const handleLineSignUp = () => {
    window.location.assign('/api/auth/line/login')
  }

  return (
    <PublicRoute>
      <>
        <style>
          {`
            @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700&family=Inter:wght@300;400;700&display=swap');
            :root { --accent: #111111; --soft: #717171; --bg: #FFFFFF; }
            body { font-family: 'Inter', sans-serif; background: var(--bg); color: var(--accent); }
            .serif { font-family: 'Playfair Display', serif; }
            .input-box { width: 100%; border: 1px solid #E5E5E5; padding: 18px 24px; font-size: 14px; border-radius: 0; transition: border-color 0.4s; }
            .input-box:focus { border-color: var(--accent); outline: none; }
            .btn-black { width: 100%; background: var(--accent); color: #FFF; padding: 22px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4em; border-radius: 0; display: flex; align-items: center; justify-content: center; transition: background 0.4s; }
            .btn-black:hover { background: #222; }
            .btn-line { width: 100%; background: #06C755; color: #FFF; padding: 22px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3em; border-radius: 0; display: flex; align-items: center; justify-content: center; gap: 12px; transition: opacity 0.4s; }
            .btn-line:hover { opacity: 0.95; }
            @keyframes slideUp { from { opacity:0; transform: translateY(15px); } to { opacity:1; transform: translateY(0); } }
            .fade-in { animation: slideUp 0.8s ease forwards; }
          `}
        </style>

        <div className="relative flex min-h-screen w-full bg-white">
          <div className="flex w-full flex-col justify-center px-8 sm:px-16 md:px-24 lg:w-[45%]">
            <div className="w-full max-w-[450px] fade-in">
              <div className="mb-24">
                 <span className="text-[10px] font-bold uppercase tracking-[0.5em]">XYLEM STUDIO</span>
                 <div className="h-0.5 w-10 bg-black mt-4" />
              </div>

              <div className="mb-12">
                <h1 className="serif text-5xl font-light uppercase tracking-tighter leading-[0.85]">
                  Join the<br/>Collective.
                </h1>
                <p className="mt-8 text-[11px] font-medium leading-relaxed text-[#717171] uppercase tracking-widest max-w-[340px]">
                  {copy.description}
                </p>
              </div>

              {error && (
                <div className="mb-8 border-l-2 border-red-500 bg-red-50 p-6 text-[10px] font-bold uppercase tracking-widest text-red-800">
                  {error}
                </div>
              )}

              {success && (
                <div className="mb-8 border-l-2 border-emerald-500 bg-emerald-50 p-6 text-[10px] font-bold uppercase tracking-widest text-emerald-800 leading-relaxed">
                  {success}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mb-10 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-[0.3em] text-[#A3A3A3] mb-3 block">{copy.firstNameLabel}</label>
                    <input type="text" value={firstName} onChange={(e)=>setFirstName(e.target.value)} required placeholder="FIRST" className="input-box placeholder:uppercase font-bold tracking-widest" />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-[0.3em] text-[#A3A3A3] mb-3 block">{copy.lastNameLabel}</label>
                    <input type="text" value={lastName} onChange={(e)=>setLastName(e.target.value)} required placeholder="LAST" className="input-box placeholder:uppercase font-bold tracking-widest" />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-bold uppercase tracking-[0.3em] text-[#A3A3A3] mb-3 block">Email Address</label>
                  <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required placeholder="EMAIL@SERVER.COM" className="input-box placeholder:uppercase font-bold tracking-widest" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-[0.3em] text-[#A3A3A3] mb-3 block">{copy.passwordLabel}</label>
                    <div className="relative">
                      <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e)=>setPassword(e.target.value)} required placeholder="••••••••" className="input-box" />
                      <button type="button" onClick={()=>setShowPassword(!showPassword)} className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-widest text-[#D4D4D4] hover:text-black">
                        {showPassword ? copy.hidePassword : copy.showPassword}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-[0.3em] text-[#A3A3A3] mb-3 block">{copy.confirmPasswordLabel}</label>
                    <div className="relative">
                      <input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e)=>setConfirmPassword(e.target.value)} required placeholder="••••••••" className="input-box" />
                      <button type="button" onClick={()=>setShowConfirmPassword(!showConfirmPassword)} className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-widest text-[#D4D4D4] hover:text-black">
                        {showConfirmPassword ? copy.hidePassword : copy.showPassword}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 border border-[#E5E5E5] p-5 text-[11px] leading-relaxed text-[#525252]">
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={acceptedPolicies}
                      onChange={(e) => setAcceptedPolicies(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-[#D4D4D4]"
                    />
                    <span>
                      {copy.acceptPolicies}{' '}
                      <Link href="/privacy" className="font-semibold text-black underline underline-offset-4">
                        {copy.privacyLabel}
                      </Link>{' '}
                      &{' '}
                      <Link href="/terms" className="font-semibold text-black underline underline-offset-4">
                        {copy.termsLabel}
                      </Link>
                    </span>
                  </label>

                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={marketingConsent}
                      onChange={(e) => setMarketingConsent(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-[#D4D4D4]"
                    />
                    <span>{copy.marketingConsent}</span>
                  </label>
                </div>

                <button type="submit" disabled={loading} className="btn-black">
                  {loading ? copy.creatingAccount : copy.createWithEmail}
                </button>
              </form>

              <div className="space-y-6">
                <div className="relative flex items-center justify-center">
                  <div className="h-px w-full bg-[#EFEFEF]" />
                  <span className="absolute bg-white px-4 text-[8px] font-black uppercase tracking-[0.4em] text-[#D4D4D4]">Social Sync</span>
                </div>
                <button type="button" onClick={handleLineSignUp} className="btn-line shadow-lg">
                  <svg className="h-5 w-5 fill-white" viewBox="0 0 24 24"><path d="M24 10.304c0-5.369-5.383-9.738-12-9.738-6.616 0-12 4.369-12 9.738 0 4.814 3.938 8.892 9.4 9.613.366.079.873.242 1.001.554.116.279.076.716.035.908-.052.247-.336 1.637-.411 1.991-.097.46-.465 2.249 1.968 1.226 2.431-1.024 13.04-7.662 13.04-14.292H24zm-14.891 3.23h-2.923v-5.263h2.923c.318 0 .576.258.576.576s-.258.576-.576.576h-2.346v1.48h2.346c.318 0 .576.258.576.576s-.258.576-.576.576h-2.346v1.48h2.346c.318 0 .576.258.576.576s-.258.575-.576.575zm3.606 0h-1.152c-.318 0-.576-.258-.576-.576v-5.263c0-.318.258-.576.576-.576h1.152c.318 0 .576.258.576.576v5.263c0 .318-.258.576-.576.576zm5.138 0h-1.18c-.143 0-.28-.052-.387-.148l-2.484-2.227v1.8c0 .318-.258.576-.576.576h-1.152c-.318 0-.576-.258-.576-.576v-5.263c0-.318.258-.576.576-.576h1.18c.143 0 .28.052.387.148l2.484 2.227v-1.8c0-.318.258-.576.576-.576h-1.152c.318 0 .576.258.576.576v5.263c0 .318-.258.576-.576.576zm3.308-3.535h-2.346v-1.48h2.346c.318 0 .576-.258.576-.576s-.258-.576-.576-.576h-2.923c-.318 0-.576.258-.576.576v5.263c0 .318.258.576.576.576h2.923c.318 0 .576-.258.576-.576s-.258-.576-.576-.576h-2.346v-1.48h2.346c.318 0 .576-.258.576-.576s-.258-.576-.576-.576z" /></svg>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{copy.continueLine}</span>
                </button>
              </div>

              <div className="mt-16 pt-12 border-t border-[#F5F5F3]">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#A3A3A3]">
                  {copy.haveAccount}{' '}
                  <Link href="/login" className="text-black border-b border-black pb-1 hover:tracking-[0.4em] transition-all">
                    {copy.signIn}
                  </Link>
                </p>
              </div>
            </div>
          </div>

          <div className="relative hidden w-[55%] lg:block overflow-hidden bg-[#FAFAFA]">
             <img src="https://images.unsplash.com/photo-1597055181300-e3633a207519?q=80&w=2000&auto=format&fit=crop" className="h-full w-full object-cover grayscale-[0.2] transition-transform duration-[60s] hover:scale-110" />
             <div className="absolute inset-0 bg-gradient-to-r from-black/10 via-transparent to-transparent" />
             <div className="absolute top-20 right-20 fade-in delay-200">
                <div className="bg-white p-12 border border-black shadow-2xl max-w-[300px]">
                   <span className="text-[10px] font-black uppercase tracking-[0.5em] mb-8 block">{copy.newMember}</span>
                   <h2 className="serif text-4xl font-light uppercase tracking-tighter leading-none mb-8">Bespoke<br/>Nature.</h2>
                   <div className="h-px w-10 bg-black/10 mb-8" />
                   <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#A3A3A3]">© XYLEM STUDIO 2026</p>
                </div>
             </div>
          </div>
        </div>
      </>
    </PublicRoute>
  )
}
