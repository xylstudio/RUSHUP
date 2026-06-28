'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, Leaf, ShoppingBag, User, Activity, Lock } from 'lucide-react'

// --- Editorial Animation Utility ---
const pressable = "active:scale-90 transition-transform duration-200 ease-out"

interface CustomerPremiumNavProps {
  activeTab: string
  setActiveTab: (tab: any) => void
  copy: any
  features?: {
    marketplace_enabled: boolean
    service_booking_enabled: boolean
  }
}

const CustomerPremiumNav: React.FC<CustomerPremiumNavProps> = ({ 
  activeTab, 
  setActiveTab, 
  copy,
  features = { marketplace_enabled: true, service_booking_enabled: true }
}) => {

  const tabs = [
    { id: 'overview', label: copy.overview || 'ภาพรวม', icon: Home },
    { id: 'orders', label: copy.orders || 'งาน', icon: Leaf, isLocked: !features.service_booking_enabled },
    { id: 'marketplace', label: copy.marketplace || 'สินค้า', icon: ShoppingBag, isLocked: !features.marketplace_enabled },
    { id: 'reports', label: copy.reports || 'รายงาน', icon: Activity },
    { id: 'profile', label: copy.profile || 'โปรไฟล์', icon: User },
  ]

  return (
    <div className="fixed bottom-0 left-0 w-full z-[400]">
      <div className="absolute inset-0 bg-white/80 backdrop-blur-2xl border-t border-black/5" />
      
      <nav className="relative flex justify-around items-center h-20 max-w-lg mx-auto px-6 pb-safe">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          const isLocked = tab.isLocked
          
          return (
            <button
              key={tab.id}
              id={`tour-nav-${tab.id}`}
              onClick={() => {
                if (!isLocked) setActiveTab(tab.id)
              }}
              className={`relative flex flex-col items-center justify-center flex-1 h-full min-w-0 transition-all duration-500 ${isLocked ? 'opacity-20 cursor-not-allowed' : 'active:scale-90'}`}
            >
              <div className="relative flex flex-col items-center py-2">
                <motion.div
                  animate={{ 
                    scale: isActive ? 1.15 : 1,
                    y: isActive ? -4 : 0
                  }}
                  transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                >
                  <Icon 
                    size={22} 
                    strokeWidth={isActive ? 1.8 : 1} 
                    className={`transition-colors duration-500 ${isActive ? 'text-[#111111]' : 'text-[#A3A3A3]'}`} 
                  />
                </motion.div>
                
                {isLocked && (
                  <div className="absolute top-1 right-0">
                    <Lock size={8} className="text-[#111111]" />
                  </div>
                )}

                <span className={`text-[7px] font-bold tracking-[0.25em] uppercase mt-2 transition-all duration-500 ${isActive ? 'text-[#111111] opacity-100' : 'text-[#A3A3A3] opacity-60'}`}>
                  {tab.label}
                </span>

                {isActive && (
                  <motion.div
                    layoutId="navIndicator"
                    className="absolute bottom-0 w-1 h-1 bg-[#111111] rounded-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </div>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

export default CustomerPremiumNav
