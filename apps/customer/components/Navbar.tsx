import Link from 'next/link'

interface NavbarProps {
  // Add props here as needed
}

export default function Navbar(props: NavbarProps) {
  return (
    <nav className="sticky top-0 z-40">
      <div className="border-b border-[#2A2A2A] bg-[#1A1A1A]/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <Link href="/" className="text-sm font-bold uppercase tracking-[0.2em] text-[#D1D5DB] hover:text-white transition-colors">
            STUDIO
          </Link>

          <div className="flex items-center gap-2">
            <Link href="/login" className="xyl-btn-soft px-4 py-2 text-[9px]">
              Login
            </Link>
            <Link href="/register" className="xyl-btn-primary px-4 py-2 text-[9px]">
              Register
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
} 