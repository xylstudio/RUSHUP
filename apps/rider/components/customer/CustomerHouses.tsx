'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Home, Plus, ArrowRight, LandPlot } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface CustomerHousesProps {
  houses: any[]
  copy: any
  activeHouse: any
  setActiveHouseId: (id: string) => void
}

const CustomerHouses: React.FC<CustomerHousesProps> = ({ 
  houses, 
  copy, 
  activeHouse, 
  setActiveHouseId 
}) => {
  const router = useRouter()

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
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

  return (
    <div className="screen-view h-full overflow-y-auto no-scrollbar max-w-4xl mx-auto pb-40">
      <header className="px-6 md:px-12 pt-8 md:pt-12 pb-8 mb-6 border-b border-[#F0F0F0]/50">
        <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#AF907A] mb-3 block">{copy.estates}</span>
        <h1 className="font-serif-thai text-3xl md:text-5xl font-light tracking-tight text-[#111111] leading-tight uppercase">
          {copy.estates}
        </h1>
      </header>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="px-6 md:px-12 space-y-4"
      >
        <motion.div variants={itemVariants}>
          <Link 
            href="/dashboard/customer/houses/add-quick"
            className="w-full flex items-center justify-between bg-[#FAFAFA] text-[#111111] p-4 md:p-6 rounded-3xl border-2 border-dashed border-[#E5E5E5] hover:bg-[#F5F5F5] hover:border-[#AF907A] transition-all group mb-8"
          >
            <div className="flex items-center gap-4 md:gap-6">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white flex items-center justify-center border border-[#F0F0F0] shadow-sm group-hover:scale-105 transition-transform duration-300 shrink-0">
                <Plus size={24} className="text-[#AF907A]" />
              </div>
              <div className="text-left">
                <span className="text-sm md:text-base font-bold text-[#111111]">{copy.addHome || 'เพิ่มโครงการ'}</span>
                <p className="text-[10px] md:text-xs text-[#A3A3A3] mt-1 font-serif-thai leading-relaxed">
                  {copy.addHomeDesc || 'สร้างโปรไฟล์สถานที่ใหม่สำหรับรับบริการ'}
                </p>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border border-[#F0F0F0] group-hover:bg-[#AF907A] group-hover:text-white group-hover:border-[#AF907A] transition-colors shrink-0">
              <ArrowRight size={18} />
            </div>
          </Link>
        </motion.div>

        {houses.length === 0 ? (
          <div className="py-24 text-center rounded-3xl bg-white border border-[#F0F0F0]">
             <LandPlot size={48} strokeWidth={1} className="mx-auto mb-6 text-[#111111]/20" />
             <p className="font-serif-thai text-xl font-light text-[#A3A3A3]">{copy.noHousesMessage || 'ยังไม่มีโครงการในระบบ'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {houses.map((h) => (
              <motion.button 
                key={h.id}
                variants={itemVariants}
                onClick={() => {
                   setActiveHouseId(h.id)
                   router.push(`/dashboard/customer/houses/${h.id}`)
                }}
                className={`w-full group relative flex items-center justify-between p-4 md:p-5 rounded-3xl transition-all duration-300 border shadow-sm hover:shadow-md ${activeHouse?.id === h.id ? 'bg-[#1A3626] text-white border-[#1A3626]' : 'bg-white border-[#EFEFEF] hover:border-[#1A3626]'}`}
              >
                <div className="flex items-center gap-4 md:gap-5 min-w-0 flex-1">
                  <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden bg-[#FAFAFA] border border-[#EFEFEF] flex-shrink-0">
                    {h.image_url ? (
                      <img src={h.image_url} alt={h.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#111111]/20 bg-[#F9F9F9]">
                        <Home size={28} strokeWidth={1} />
                      </div>
                    )}
                  </div>
                  <div className="text-left flex-1 min-w-0 pr-4">
                    <h3 className={`font-serif-thai text-xl md:text-2xl font-medium tracking-tight truncate ${activeHouse?.id === h.id ? 'text-white' : 'text-[#111111]'}`}>
                      {h.name}
                    </h3>
                    <div className="mt-2.5 flex items-center gap-3">
                      <p className={`text-[10px] md:text-xs font-bold uppercase tracking-widest ${activeHouse?.id === h.id ? 'text-[#A3E6B2]' : 'text-[#A3A3A3]'}`}>
                        {h.area_size ? `${h.area_size} ${copy.sqmSpace || 'ตร.ม.'}` : '—'}
                      </p>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest ${
                        activeHouse?.id === h.id 
                          ? 'bg-white/20 text-white' 
                          : h.address ? 'bg-[#E8F3EB] text-[#1A3626]' : 'bg-[#FFF3E0] text-[#E65100]'
                      }`}>
                        {h.address ? 'Active' : 'Draft'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${activeHouse?.id === h.id ? 'bg-white/10 text-white' : 'bg-[#FAFAFA] text-[#111111] group-hover:bg-[#1A3626] group-hover:text-white'}`}>
                  <ArrowRight size={18} />
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}

export default CustomerHouses
