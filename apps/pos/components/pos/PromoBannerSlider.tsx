'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export function PromoBannerSlider() {
  const [banners, setBanners] = useState<any[]>([])
  const [currentBanner, setCurrentBanner] = useState(0)

  useEffect(() => {
    const fetchBanners = async () => {
      const { data } = await supabase.from('pos_banners').select('*').eq('is_active', true).order('order_index')
      if (data && data.length > 0) {
        setBanners(data)
      }
    }
    fetchBanners()
  }, [])

  useEffect(() => {
    if (banners.length === 0) return
    const timer = setInterval(() => {
      setCurrentBanner(prev => (prev + 1) % banners.length)
    }, 4500)
    return () => clearInterval(timer)
  }, [banners.length])

  if (banners.length === 0) {
    return (
      <div className="w-full h-full bg-gray-100 animate-pulse flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer" />
        <div className="flex gap-2">
          <div className="w-2 h-2 rounded-full bg-gray-300"></div>
          <div className="w-2 h-2 rounded-full bg-gray-300"></div>
          <div className="w-2 h-2 rounded-full bg-gray-300"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full transition-transform duration-700 ease-out" style={{ transform: `translateX(-${currentBanner * 100}%)` }}>
      {banners.map((b: any) => (
        <div key={b.id} className="w-full h-full flex-shrink-0 relative">
          <img src={b.image_url || b.image} alt={b.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent flex flex-col justify-end p-4">
            <h2 className="text-white text-xs font-black uppercase">{b.title}</h2>
            <p className="text-white/80 text-[9px] mt-1 font-bold">{b.subtitle}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
