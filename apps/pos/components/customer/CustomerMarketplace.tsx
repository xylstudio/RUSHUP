'use client';
import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ShoppingBag, Search, Plus, ArrowRight } from 'lucide-react'
import { useI18n } from "@/lib/I18nContext";

interface CustomerMarketplaceProps {
  categories: any[]
  shopCategory: string
  setShopCategory: (cat: string) => void
  filteredPlants: any[]
  setSelectedPlant: (plant: any) => void
  setActiveSheet: (sheet: any) => void
  copy: any
  getSafePlantImage: (plant: any) => string
}

// Static Editorial Header for stability

const CustomerMarketplace: React.FC<CustomerMarketplaceProps> = ({
  categories,
  shopCategory,
  setShopCategory,
  filteredPlants,
  setSelectedPlant,
  setActiveSheet,
  copy,
  getSafePlantImage,
}) => {
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { type: 'spring', stiffness: 300, damping: 30 }
    }
  }

  return (
    <div className="screen-view h-full overflow-y-auto no-scrollbar pb-40 px-6 md:px-12 pt-12 max-w-[1400px] mx-auto">
      <header className="pt-16 pb-16 border-b border-black/10 mb-12">
        <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#AF907A] mb-4 block">{copy.curatedPieces}</span>
        <h1 className="customer-editorial-title !mt-0 !text-5xl uppercase md:!text-8xl text-[#111111]">{copy.shopTitle}</h1>
      </header>

      {/* Categories Scroller (Refined) */}
      <div className="sticky top-0 z-20 bg-[#FAF9F6]/80 backdrop-blur-2xl border-b border-black/[0.03] -mx-6 md:-mx-12 mb-12">
        <div className="flex overflow-x-auto no-scrollbar px-6 md:px-12 py-6 gap-3">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setShopCategory(cat.id)}
              className={`shrink-0 px-8 py-4 text-[8px] font-bold uppercase tracking-[0.3em] transition-all border rounded-none ${shopCategory === cat.id ? 'bg-[#111111] text-white border-[#111111]' : 'bg-white text-[#A3A3A3] border-[#F0F0F0] hover:border-[#111111] hover:text-[#111111]'}`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="pb-8">
        {filteredPlants.length === 0 ? (
          <div className="py-40 text-center opacity-30">
            <ShoppingBag size={64} strokeWidth={1} className="mx-auto mb-8" />
            <p className="font-serif-thai text-3xl lowercase">{copy.noPlants}.</p>
          </div>
        ) : (
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.05 } }
            }}
            className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8"
          >
            {filteredPlants.map((plant) => (
              <motion.button 
                key={plant.id}
                variants={itemVariants}
                onClick={() => {
                  setSelectedPlant(plant)
                  setActiveSheet('marketplace')
                }} 
                className="customer-editorial-card !p-6 text-left group transition-all hover:scale-[1.02] active:scale-95"
              >
                <div className="aspect-[4/5] bg-[#FAFAFA] mb-8 overflow-hidden rounded-none border border-black/[0.03]">
                  <img 
                    src={getSafePlantImage(plant)} 
                    alt={plant.name} 
                    className="h-full w-full object-cover transition-all duration-1000" 
                  />
                </div>
                <div className="px-1 space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-px bg-[#AF907A]" />
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#AF907A]">{plant.category || 'Architectural'}</span>
                  </div>
                  <h4 className="font-serif-thai text-2xl font-light text-[#111111] uppercase tracking-tighter leading-tight transition-all">{plant.name}</h4>
                  
                  <div className="flex items-center justify-between pt-6 border-t border-black/[0.02]">
                    <span className="text-[14px] font-bold text-[#111111]">{locale === 'en' ? '฿' : locale === 'zh' ? '฿' : '฿'}{plant.price?.toLocaleString() || '-'}</span>
                    <div className="w-10 h-10 rounded-full bg-[#111111] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <Plus size={18} strokeWidth={1} />
                    </div>
                  </div>
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
        
        {/* Newsletter / Highlight card */}
        <div className="mt-24 p-16 rounded-none bg-[#111111] text-white text-center relative overflow-hidden group">
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-20 h-20 rounded-none bg-white text-[#111111] flex items-center justify-center mb-8 shadow-2xl">
              <ShoppingBag size={24} strokeWidth={1} />
            </div>
            <h5 className="font-serif-thai text-5xl font-light text-white uppercase mb-6 tracking-tighter">{copy.shopCollection}.</h5>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.4em] leading-relaxed mb-12 max-w-sm mx-auto">
               {copy.selectedForYou || 'Exclusive botanical selections curated for your property.'}
            </p>
            <button className="px-12 py-6 bg-white text-[#111111] rounded-none text-[9px] font-bold uppercase tracking-[0.6em] transition-all hover:bg-[#EFEFEF]">
              {copy.browseAll}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CustomerMarketplace
