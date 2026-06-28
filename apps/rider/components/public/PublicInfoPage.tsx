import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

type InfoSection = {
  title: string
  body: string[]
}

interface PublicInfoPageProps {
  kicker: string
  title: string
  intro: string
  sections: InfoSection[]
}

export default function PublicInfoPage({ kicker, title, intro, sections }: PublicInfoPageProps) {
  return (
    <>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700&family=Inter:wght@300;400;600;700&display=swap');
          .serif { font-family: 'Playfair Display', serif; }
          .sans { font-family: 'Inter', sans-serif; }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          .animate-fade-in { animation: fadeIn 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        `}
      </style>
      <main className="sans min-h-screen bg-white text-zinc-900 selection:bg-zinc-900 selection:text-white">
        
        {/* Navigation */}
        <nav className="border-b border-zinc-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <ArrowLeft size={16} className="text-zinc-400 group-hover:text-zinc-900 transition-colors" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-900 group-hover:tracking-[0.25em] transition-all">Back</span>
            </Link>
            <div className="flex flex-col items-center">
              <span className="serif text-xl font-bold tracking-tighter">XYL</span>
            </div>
            <div className="w-[60px]" /> {/* Spacer to balance flex-between */}
          </div>
        </nav>

        <div className="max-w-3xl mx-auto px-6 py-24 md:py-32">
          {/* Header */}
          <header className="mb-24 animate-fade-in" style={{ animationDelay: '0ms' }}>
            <div className="flex items-center gap-4 mb-8">
              <div className="h-px w-8 bg-zinc-900" />
              <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-500">{kicker}</span>
            </div>
            <h1 className="serif text-5xl md:text-6xl lg:text-7xl font-light tracking-tight leading-[1.1] mb-12">
              {title}
            </h1>
            <p className="text-sm md:text-base leading-relaxed text-zinc-500 max-w-2xl font-light tracking-wide">
              {intro}
            </p>
          </header>

          {/* Sections */}
          <div className="space-y-24">
            {sections.map((section, idx) => (
              <section 
                key={section.title} 
                className="animate-fade-in opacity-0"
                style={{ animationDelay: `${(idx + 1) * 150}ms` }}
              >
                <div className="border-t border-zinc-200 pt-12">
                  <h2 className="serif text-2xl md:text-3xl font-light tracking-tight text-zinc-900 mb-8">
                    {String(idx + 1).padStart(2, '0')}. {section.title}
                  </h2>
                  <div className="space-y-6">
                    {section.body.map((paragraph, pIdx) => (
                      <p key={pIdx} className="text-[13px] md:text-[15px] leading-[1.8] text-zinc-600 font-light">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
              </section>
            ))}
          </div>

          {/* Footer inside content area */}
          <footer className="mt-40 border-t border-zinc-200 pt-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 opacity-0 animate-fade-in" style={{ animationDelay: '800ms' }}>
            <div>
               <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-400 mb-2">© 2026 XYLEM STUDIO</p>
               <p className="text-[11px] text-zinc-500 font-light">Bespoke nature and collective management.</p>
            </div>
            <div className="flex items-center gap-6">
               <Link href="/privacy" className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 hover:text-zinc-900 transition-colors">Privacy</Link>
               <Link href="/terms" className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 hover:text-zinc-900 transition-colors">Terms</Link>
            </div>
          </footer>
        </div>
      </main>
    </>
  )
}