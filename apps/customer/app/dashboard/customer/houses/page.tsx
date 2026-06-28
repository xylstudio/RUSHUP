'use client';
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { 
  ArrowRight, 
  ChevronLeft, 
  Plus, 
  Home, 
  LandPlot,
  Users
} from 'lucide-react'
import XYLLoader from '@/components/loaders/XYLLoader'
import { useAuth } from '../../../../lib/AuthContext'
import { useI18n } from '@/lib/I18nContext'
import { getCustomerHouses } from '../../../../lib/supabaseClient'
import type { HouseData } from '../../../../lib/supabaseClient'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'

export default function CustomerHousesPage() {
  const { profile } = useAuth()
  const { locale } = useI18n()
  const router = useRouter()
  
  const copyChoices = {
    th: {
      title: 'รายชื่อโครงการ',
      subtitle: 'ของคุณ',
      desc: 'สำรวจผลงานสถาปัตยกรรมและรายงานอัปเดตจากทีมงาน',
      addNew: 'ลงทะเบียนโครงการใหม่',
      addDesc: 'สร้างโปรไฟล์สถานที่ใหม่สำหรับรับบริการ',
      area: 'ขนาดพื้นที่',
      sqm: 'ตร.ม.',
      emptyTitle: 'ยังไม่พบโครงการในระบบ',
      emptyDesc: 'เริ่มต้นบันทึกพื้นที่ของคุณเพื่อรับการดูแลและออกแบบระดับพรีเมียม',
      openHouse: 'เปิดดูโครงการ',
      estates: 'คลังผลงานสถาปัตยกรรม',
      sharedTitle: 'โครงการที่ได้รับแชร์',
      sharedDesc: 'โครงการที่คุณได้รับสิทธิ์ให้ร่วมดูแล'
    },
    en: {
      title: 'Property',
      subtitle: 'Collection',
      desc: 'Review your portfolio and latest updates from the team.',
      addNew: 'New Project',
      addDesc: 'Create a new profile for a property',
      area: 'DIMENSIONS',
      sqm: 'sq m',
      emptyTitle: 'No projects yet',
      emptyDesc: 'Add your first property to start services and monitor garden health end-to-end.',
      openHouse: 'Open Project',
      estates: 'Architectural Portfolio',
      sharedTitle: 'Shared Projects',
      sharedDesc: 'Projects shared with you as a collaborator'
    }
  }

  const copy = copyChoices[locale as keyof typeof copyChoices] || copyChoices.th
  const [houses, setHouses] = useState<HouseData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      if (!profile) return
      setLoading(true)
      try {
        const { data: nextHouses } = await getCustomerHouses(profile.id)
        setHouses(nextHouses || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [profile])

  if (loading) return (
    <XYLLoader tagline={locale === 'en' ? 'กำลังซิงค์คลังข้อมูลของคุณ...' : locale === 'zh' ? 'กำลังซิงค์คลังข้อมูลของคุณ...' : 'กำลังซิงค์คลังข้อมูลของคุณ...'} />
  )

  const ownedHouses = houses.filter(h => h.user_id === profile.id || h.customer_id === profile.id)
  const sharedHouses = houses.filter(h => h.user_id !== profile.id && h.customer_id !== profile.id)

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 15, scale: 0.98 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { type: 'spring', stiffness: 300, damping: 30 }
    }
  }

  const renderHouseCard = (h: HouseData, isShared: boolean = false) => (
    <motion.button 
      key={h.id}
      variants={itemVariants}
      onClick={() => router.push(`/dashboard/customer/houses/${h.id}`)}
      className="w-full group relative flex items-center justify-between p-4 md:p-5 rounded-none transition-all duration-300 border shadow-sm hover:shadow-md bg-white border-[#EFEFEF] hover:border-[#1A3626]"
    >
      <div className="flex items-center gap-4 md:gap-5 min-w-0 flex-1">
        <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-none overflow-hidden bg-[#FAFAFA] border border-[#EFEFEF] flex-shrink-0">
          {h.image_url ? (
            <img src={h.image_url} alt={h.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[#111111]/20 bg-[#F9F9F9]">
              <Home size={28} strokeWidth={1} />
            </div>
          )}
          {isShared && (
            <div className="absolute top-1 left-1 bg-black/60 backdrop-blur-md text-white p-1 rounded-none">
               <Users size={12} />
            </div>
          )}
        </div>
        <div className="text-left flex-1 min-w-0 pr-4">
          <h3 className="font-serif-thai text-xl md:text-2xl font-medium tracking-tight truncate text-[#111111]">
            {h.name}
          </h3>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-[#A3A3A3]">
              {h.area_size ? `${h.area_size} ${copy.sqm}` : '—'}
            </p>
            {h.address && !isShared && (
               <span className="px-2 py-0.5 rounded-none text-[9px] font-bold uppercase tracking-widest bg-[#E8F3EB] text-[#1A3626]">
                 Active
               </span>
            )}
            {isShared && (
               <span className="px-2 py-0.5 rounded-none text-[9px] font-bold uppercase tracking-widest bg-blue-50 text-blue-600">
                 Shared
               </span>
            )}
          </div>
        </div>
      </div>
      <div className="w-10 h-10 md:w-12 md:h-12 rounded-none flex items-center justify-center shrink-0 transition-all duration-300 bg-[#FAFAFA] text-[#111111] group-hover:bg-[#1A3626] group-hover:text-white">
        <ArrowRight size={18} />
      </div>
    </motion.button>
  )

  return (
    <div className="min-h-screen bg-[#FAFAFA] selection:bg-[#111111] selection:text-white pb-32">
      <div className="max-w-4xl mx-auto px-4 md:px-8">
        
        {/* Header Section */}
        <header className="pt-8 md:pt-12 pb-6">
          <button 
            onClick={() => router.push('/dashboard/customer?tab=profile')} 
            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#111111] opacity-60 hover:opacity-100 transition-opacity mb-6"
            type="button"
          >
            <ChevronLeft size={16} strokeWidth={2} />
            <span>{locale === 'en' ? 'retrospective' : locale === 'zh' ? '回顾性的' : 'ย้อนกลับ'}</span>
          </button>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#AF907A] mb-2 block">
              {locale === 'en' ? '               คลังข้อมูล 01             ' : locale === 'zh' ? '               คลังข้อมูล 01             ' : '               คลังข้อมูล 01             '}</p>
            <h1 className="font-serif-thai text-3xl md:text-5xl font-light tracking-tight text-[#111111] leading-tight uppercase">
              {copy.title} {copy.subtitle}
            </h1>
            <p className="mt-4 text-sm md:text-base text-[#666666] max-w-xl font-serif-thai leading-relaxed">
              {copy.desc}
            </p>
          </motion.div>
        </header>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6 mt-6"
        >
          {/* Add New Project Card */}
          <motion.div variants={itemVariants}>
            <Link 
              href="/dashboard/customer/houses/add-quick"
              className="w-full flex items-center justify-between bg-white text-[#111111] p-4 md:p-6 rounded-none border-2 border-dashed border-[#E5E5E5] hover:bg-[#F9F9F9] hover:border-[#AF907A] transition-all group"
            >
              <div className="flex items-center gap-4 md:gap-6">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-none bg-[#FAFAFA] flex items-center justify-center border border-[#F0F0F0] shadow-sm group-hover:scale-105 transition-transform duration-300 shrink-0">
                  <Plus size={24} className="text-[#AF907A]" />
                </div>
                <div className="text-left">
                  <span className="text-sm md:text-base font-bold text-[#111111]">{copy.addNew}</span>
                  <p className="text-[10px] md:text-xs text-[#A3A3A3] mt-1 font-serif-thai leading-relaxed">
                    {copy.addDesc}
                  </p>
                </div>
              </div>
              <div className="w-10 h-10 rounded-none bg-white flex items-center justify-center shadow-sm border border-[#F0F0F0] group-hover:bg-[#AF907A] group-hover:text-white group-hover:border-[#AF907A] transition-colors shrink-0">
                <ArrowRight size={18} />
              </div>
            </Link>
          </motion.div>

          {houses.length === 0 ? (
            <div className="py-24 text-center rounded-none bg-white border border-[#F0F0F0] mt-6">
               <LandPlot size={48} strokeWidth={1} className="mx-auto mb-6 text-[#111111]/20" />
               <h3 className="font-serif-thai text-xl md:text-2xl font-light text-[#111111] mb-3">{copy.emptyTitle}</h3>
               <p className="text-sm text-[#A3A3A3] max-w-sm mx-auto font-serif-thai px-6">{copy.emptyDesc}</p>
            </div>
          ) : (
            <>
              {ownedHouses.length > 0 && (
                <div className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {ownedHouses.map(h => renderHouseCard(h, false))}
                  </div>
                </div>
              )}

              {sharedHouses.length > 0 && (
                <div className="pt-8">
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#1A3626] mb-4">
                    {copy.sharedTitle}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sharedHouses.map(h => renderHouseCard(h, true))}
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>

      </div>
    </div>
  )
}