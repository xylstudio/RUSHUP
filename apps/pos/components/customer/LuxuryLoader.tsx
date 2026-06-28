'use client'

import React from 'react'
import { motion } from 'framer-motion'

interface LuxuryLoaderProps {
  tagline?: string
}

export const LuxuryLoader: React.FC<LuxuryLoaderProps> = ({ tagline = 'Loading...' }) => {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/90 backdrop-blur-md">
      <div className="relative flex flex-col items-center">
        {/* Animated Brand Ring */}
        <div className="relative w-24 h-24 flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 border-t-2 border-r-2 border-black rounded-full"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="absolute inset-2 border-b-2 border-l-2 border-gray-200 rounded-full"
          />
          <span className="text-sm font-black tracking-widest text-black">XYL</span>
        </div>

        {/* Text Content */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 text-center"
        >
          <h2 className="text-[10px] font-bold tracking-[0.3em] uppercase text-black mb-2">XYL STUDIO</h2>
          <p className="text-[11px] text-gray-400 font-light tracking-widest uppercase animate-pulse">
            {tagline}
          </p>
        </motion.div>
      </div>
    </div>
  )
}
