'use client'

import { useI18n } from '../lib/I18nContext'
import LanguageSwitcher from './LanguageSwitcher'

export default function I18nLanguageSwitcher() {
  const { locale, setLocale } = useI18n()
  
  return (
    <LanguageSwitcher 
      currentLanguage={locale}
      onLanguageChange={(lang) => setLocale(lang as 'th' | 'en' | 'zh')}
    />
  )
}