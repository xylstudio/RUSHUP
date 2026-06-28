'use client'

import { format } from 'date-fns'
import { th, enUS } from 'date-fns/locale'
import { ChevronRight, TrendingUp, TrendingDown, LayoutGrid, List, Activity, ShieldCheck } from 'lucide-react'
import { motion } from 'framer-motion'
import type { House, CustomerReportItem } from '@/lib/supabaseClient'
import { useState } from 'react'

interface PropertyPortfolioTableProps {
  houses: House[]
  reports: CustomerReportItem[]
  viewDate: Date
  locale: string
  onFilterHouse: (id: string | null) => void
  activeHouseId: string | null
}

export default function PropertyPortfolioTable({ houses, reports, viewDate, locale, onFilterHouse, activeHouseId }: PropertyPortfolioTableProps) {
  const isThai = locale === 'th'
  const dfnsLocale = isThai ? th : enUS
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const parseSafeDate = (d: any) => {
    if (!d) return null
    const date = new Date(d)
    return isNaN(date.getTime()) ? null : date
  }

  return (
    <div className="w-full">
      <div className="px-4 py-6 flex items-center justify-between border-b border-[#F0EFEB]">
        <div className="flex items-center gap-2">
           <Activity size={16} className="text-[#AF907A]" />
           <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#111111]">
             {isThai ? 'วิเคราะห์ข้อมูลรายโครงการ' : 'PROJECT ANALYTICS'}
           </h3>
        </div>
        <div className="flex border border-[#111111] p-0.5 shadow-[1px_1px_0px_0px_rgba(17,17,17,1)]">
          <button 
            onClick={() => setViewMode('grid')}
            className={`p-1.5 transition-all ${viewMode === 'grid' ? 'bg-[#111111] text-white' : 'text-[#A3A3A3] hover:text-[#111111]'}`}
          >
            <LayoutGrid size={12} />
          </button>
          <button 
            onClick={() => setViewMode('list')}
            className={`p-1.5 transition-all ${viewMode === 'list' ? 'bg-[#111111] text-white' : 'text-[#A3A3A3] hover:text-[#111111]'}`}
          >
            <List size={12} />
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className={`no-scrollbar ${viewMode === 'grid' ? 'flex overflow-x-auto gap-4 pb-6 pt-2 snap-x snap-mandatory' : 'space-y-3'}`}>
          {/* ALL Option */}
          <motion.div
            whileTap={{ scale: 0.98 }}
            onClick={() => onFilterHouse(null)}
            className={`${viewMode === 'grid' ? 'snap-start flex-shrink-0 w-[140px] aspect-[4/5]' : 'w-full'} border cursor-pointer transition-all ${!activeHouseId ? 'bg-[#111111] border-[#111111] shadow-[4px_4px_0px_0px_rgba(17,17,17,1)]' : 'bg-white border-[#F0EFEB] hover:border-[#111111]'}`}
          >
            <div className={`h-full flex flex-col items-center justify-center p-4 text-center ${!activeHouseId ? 'text-white' : 'text-[#111111]'}`}>
              <div className={`w-10 h-10 border flex items-center justify-center mb-3 ${!activeHouseId ? 'border-white/20 bg-white/10' : 'border-[#F0EFEB] bg-[#F9F8F4]'}`}>
                <Activity size={20} className={!activeHouseId ? 'text-[#AF907A]' : 'text-[#A3A3A3]'} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest">{isThai ? 'ทั้งหมด' : 'ALL'}</span>
              <p className={`text-[8px] mt-1 opacity-60 uppercase tracking-tighter`}>{reports.length} {isThai ? 'รายการ' : 'TOTAL'}</p>
            </div>
          </motion.div>

          {houses.map((house) => {
            const houseReports = reports.filter(r => r.houseId === house.id || r.houseCode === house.house_code)
            const latestReport = houseReports[0]
            const isActive = activeHouseId === house.id

            const healthScore = latestReport?.rating ? (latestReport.rating / 5) * 100 : 0
            const scoreColor = healthScore >= 80 ? 'text-[#1A3626]' : healthScore >= 60 ? 'text-[#AF907A]' : 'text-[#D14343]'
            const bgColor = healthScore >= 80 ? 'bg-[#F2F8F4]' : healthScore >= 60 ? 'bg-[#F9F8F4]' : 'bg-[#FFF5F5]'

            return (
              <motion.div
                key={house.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => onFilterHouse(house.id)}
                className={`${viewMode === 'grid' ? 'snap-start flex-shrink-0 w-[240px]' : 'w-full'} border cursor-pointer transition-all ${isActive ? 'bg-[#111111] border-[#111111] shadow-[4px_4px_0px_0px_rgba(17,17,17,1)] text-white' : 'bg-white border-[#F0EFEB] hover:border-[#111111]'}`}
              >
                <div className="p-4">
                  <div className="flex justify-between items-start mb-6">
                    <div className="min-w-0 pr-4">
                       <span className={`text-[8px] font-bold uppercase tracking-widest block mb-1 ${isActive ? 'text-[#AF907A]' : 'text-[#A3A3A3]'}`}>
                         {house.house_code || 'PROPERTY'}
                       </span>
                       <h4 className="font-serif-thai text-lg font-light truncate uppercase leading-none">{house.name}</h4>
                    </div>
                    <div className={`w-10 h-10 border flex items-center justify-center shrink-0 ${isActive ? 'border-white/10 bg-white/5' : 'border-[#F0EFEB] bg-[#F9F8F4]'}`}>
                       {house.image_url ? (
                         <img src={house.image_url} className="w-full h-full object-cover grayscale opacity-50" />
                       ) : (
                         <ShieldCheck size={16} className={isActive ? 'text-[#AF907A]' : 'text-[#A3A3A3]'} />
                       )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-current opacity-10"></div>

                  <div className="grid grid-cols-2 gap-4 mt-2">
                     <div>
                        <span className={`text-[7px] font-bold uppercase tracking-widest block mb-1 ${isActive ? 'text-white/40' : 'text-[#A3A3A3]'}`}>Health Index</span>
                        <div className="flex items-baseline gap-1">
                           <span className={`text-xl font-bold font-serif-thai ${isActive ? 'text-white' : scoreColor}`}>
                             {healthScore > 0 ? `${healthScore.toFixed(0)}%` : '-'}
                           </span>
                        </div>
                     </div>
                     <div className="text-right">
                        <span className={`text-[7px] font-bold uppercase tracking-widest block mb-1 ${isActive ? 'text-white/40' : 'text-[#A3A3A3]'}`}>Service Date</span>
                        <span className="text-[10px] font-bold">
                          {(() => {
                            const d = parseSafeDate(latestReport?.date)
                            return d ? format(d, 'd MMM yy', { locale: dfnsLocale }) : '-'
                          })()}
                        </span>
                     </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
