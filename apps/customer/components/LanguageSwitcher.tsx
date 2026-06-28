import { useState } from 'react'

interface LanguageSwitcherProps {
  currentLanguage?: string
  onLanguageChange?: (language: string) => void
}

// Standalone version - parent component must handle i18n integration
export default function LanguageSwitcher({ 
  currentLanguage = 'th', 
  onLanguageChange 
}: LanguageSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  const languages = [
    { code: 'th', name: 'ไทย', shortName: 'TH' },
    { code: 'en', name: 'English', shortName: 'EN' },
    { code: 'zh', name: '中文', shortName: '中文' },
  ]

  const effectiveLang = currentLanguage
  const currentLang = languages.find(lang => lang.code === effectiveLang) || languages[0]

  const handleLanguageSelect = (langCode: string) => {
    setIsOpen(false)
    if (onLanguageChange) {
      onLanguageChange(langCode)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="flex items-center space-x-2 rounded-full border border-[#D9DED8] bg-white px-3 py-2 text-sm text-[#1A1A1A] transition-colors hover:border-[#2A4532]"
      >
        <span className="rounded-full bg-[#F3F5F1] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#2A4532]">{currentLang.shortName}</span>
        <span className="font-medium">{currentLang.name}</span>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 z-10 mt-2 w-44 overflow-hidden rounded-2xl border border-[#D9DED8] bg-white shadow-sm" role="listbox">
          {languages.map((language) => (
            <button
              key={language.code}
              onClick={() => handleLanguageSelect(language.code)}
              type="button"
              className="flex w-full items-center justify-between px-3 py-3 text-sm text-[#1A1A1A] transition-colors hover:bg-[#F7F7F2]"
            >
              <span className="rounded-full bg-[#F3F5F1] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#2A4532]">{language.shortName}</span>
              <span className="font-medium">{language.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
} 