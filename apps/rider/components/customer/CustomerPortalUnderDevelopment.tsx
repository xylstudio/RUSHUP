'use client';
import { useState } from 'react'
import { Noto_Serif_Thai, Manrope } from 'next/font/google'
import { signOut } from '@/lib/supabaseClient'
import { useI18n } from "@/lib/I18nContext";

const headlineFont = Noto_Serif_Thai({
  subsets: ['thai', 'latin'],
  weight: ['300', '400'],
})

const bodyFont = Manrope({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
})

const message = 'อยู่ระหว่างการพัฒนา'

export default function CustomerPortalUnderDevelopment() {
    const { locale } = useI18n();
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = async () => {
    setIsSigningOut(true)
    await signOut()
    window.location.assign('/login')
  }

  return (
    <main className={`${bodyFont.className} relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-black text-white selection:bg-white/20 selection:text-white`}>
      <div className="absolute inset-0 overflow-hidden grayscale">
        <img
          src="https://lh3.googleusercontent.com/aida/ADBb0uhrXoErL5OZUQ9NI_BLjrmcsvOViEiph3sq6uHrCh5Y1aoQ-ytx2Z0PId3JrUZhLrI4KhrjEDDw7kVwgKh2pXzzO5Q8e9tETI0EefAt_Rkx9sWVBK5vWQmQUwFIMHeG7gF6BPP8446dAJUMNi1Uh9FOcqhPvbVzEPVJjoQEt5qKtOcRxvF4mxUWxJ0dQmXS6-t26YIfBzNDc-oCIvKBK9K2Nx8YAvAE7KfcgchxwjYMC6qMZ5PPafdd3Bo6eqf0zcBBZfks04ncpQ"
          alt="Lush green landscape design backdrop"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/70 backdrop-blur-[1px]" />
      </div>

      <div className="absolute left-0 top-10 z-20 w-full px-6 text-center sm:px-8 sm:text-left">
        <span className={`${headlineFont.className} text-lg font-light tracking-[0.38em] sm:text-xl`}>
          XYLEM
        </span>
      </div>

      <div className="relative z-10 w-full max-w-4xl px-6 text-center">
        <p className="animate-subtitle mb-8 text-[11px] font-light uppercase tracking-[0.45em] text-white/40 sm:text-sm">
          {locale === 'en' ? '           ความงดงามกำลังเติบโตที่นี่         ' : locale === 'zh' ? '           ความงดงามกำลังเติบโตที่นี่         ' : '           ความงดงามกำลังเติบโตที่นี่         '}</p>
        <h1 className={`${headlineFont.className} mb-6 text-2xl font-light leading-relaxed tracking-[0.12em] text-white sm:text-3xl md:text-4xl`}>
          {message.split('').map((char, index) => (
            <span
              key={`${char}-${index}`}
              className="typewriter-letter inline-block"
              style={{ animationDelay: `${index * 0.1 + 0.5}s` }}
            >
              {char === ' ' ? '\u00A0' : char}
            </span>
          ))}
        </h1>
        <p className="animate-subtitle text-sm font-light uppercase tracking-[0.3em] text-white/60 sm:text-base">
          {locale === 'en' ? '           พบกันเร็วๆ นี้         ' : locale === 'zh' ? '           พบกันเร็วๆ นี้         ' : '           พบกันเร็วๆ นี้         '}</p>
        <div className="animate-subtitle mt-10 flex items-center justify-center">
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="inline-flex min-w-[180px] items-center justify-center border border-white/15 bg-transparent px-5 py-3 text-xs font-medium uppercase tracking-[0.28em] text-white/75 transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSigningOut ? 'กำลังออกจากระบบ' : 'ออกจากระบบ'}
          </button>
        </div>
      </div>

      <div className="absolute bottom-10 left-0 z-20 w-full px-6 text-center sm:px-8 sm:text-left">
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">
          © 2026 XYLEM Landscape Design
        </p>
      </div>

      <style jsx>{`
        @keyframes letterFadeIn {
          0% {
            opacity: 0;
            transform: translateY(4px);
            filter: blur(4px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
          }
        }

        @keyframes subtitleFadeIn {
          0% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }

        .typewriter-letter {
          opacity: 0;
          animation: letterFadeIn 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        .animate-subtitle {
          opacity: 0;
          animation: subtitleFadeIn 2s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          animation-delay: 2.5s;
        }
      `}</style>
    </main>
  )
}