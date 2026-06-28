'use client'

import { useI18n, type Locale } from '@/lib/I18nContext'

const localeLabels: Record<Locale, string> = {
  th: 'ไทย',
  en: 'English',
  zh: '中文',
}

const copyByLocale = {
  th: {
    title: 'ภาษาของเว็บไซต์',
    description: 'ระบบจะอ่านค่าภาษาจากเครื่องหรือเบราว์เซอร์ของคุณเป็นหลัก และคุณสามารถปรับเปลี่ยนภาษาในระบบเองได้ภายหลัง',
    deviceLanguage: 'ภาษาของอุปกรณ์',
    deviceDescription: 'ค่าที่ตรวจพบจากเครื่องหรือเบราว์เซอร์ของอุปกรณ์นี้',
    currentLanguage: 'ภาษาที่ใช้ในเว็บไซต์',
    currentManual: 'กำลังใช้ค่าที่ตั้งเองในเว็บไซต์',
    currentSystem: 'กำลังใช้ค่าจากภาษาของเครื่อง',
    useSystem: 'ใช้ภาษาจากเครื่อง',
  },
  en: {
    title: 'Website Language',
    description: 'The site reads your device or browser language first, and you can override it in website settings at any time.',
    deviceLanguage: 'Device Language',
    deviceDescription: 'Detected from this device or browser.',
    currentLanguage: 'Current Website Language',
    currentManual: 'Using your manual website setting',
    currentSystem: 'Using your device language',
    useSystem: 'Use Device Language',
  },
  zh: {
    title: '网站语言',
    description: '系统会先读取设备或浏览器语言，您也可以稍后在网站设置中手动覆盖。',
    deviceLanguage: '设备语言',
    deviceDescription: '从当前设备或浏览器检测到的语言。',
    currentLanguage: '当前网站语言',
    currentManual: '正在使用您手动设置的网站语言',
    currentSystem: '正在使用设备语言',
    useSystem: '使用设备语言',
  },
} as const

export default function WebsiteLanguageSettings() {
  const { locale, setLocale, systemLocale, preferenceMode, resetLocaleToSystem } = useI18n()
  const copy = copyByLocale[locale]

  return (
    <div className="w-full">
      <div className="space-y-4">
        {/* Buttons for languages */}
        <div className="grid grid-cols-1 gap-3">
          {(['th', 'en', 'zh'] as Locale[]).map((lang) => {
            const active = locale === lang && preferenceMode === 'manual'
            return (
              <button
                key={lang}
                type="button"
                onClick={() => setLocale(lang)}
                className={`w-full py-4 border border-black sans-font text-[11px] font-black uppercase tracking-[0.2em] transition-all ${
                  active ? 'bg-black text-white' : 'bg-white text-black active:bg-gray-100'
                }`}
              >
                {localeLabels[lang]}
              </button>
            )
          })}
          
          <button
            type="button"
            onClick={resetLocaleToSystem}
            className={`w-full py-4 border border-black sans-font text-[11px] font-black uppercase tracking-[0.2em] transition-all mt-4 ${
              preferenceMode === 'system' ? 'bg-black text-white' : 'bg-white text-black active:bg-gray-100'
            }`}
          >
            {copy.useSystem}
          </button>
        </div>
      </div>
      
      {/* Current states shown below faintly */}
      <div className="mt-8 pt-8 border-t border-black/10 space-y-4 text-center">
        <div>
          <div className="text-[9px] font-bold uppercase tracking-widest text-black/30 mb-1">{copy.deviceLanguage}</div>
          <div className="text-sm font-semibold text-black/60">{localeLabels[systemLocale]}</div>
        </div>
        <div>
          <div className="text-[9px] font-bold uppercase tracking-widest text-black/30 mb-1">{copy.currentLanguage}</div>
          <div className="text-sm font-semibold text-black/60">{localeLabels[locale]}</div>
          <p className="mt-1 text-[10px] text-black/40">
            {preferenceMode === 'manual' ? copy.currentManual : copy.currentSystem}
          </p>
        </div>
      </div>
    </div>
  )
}