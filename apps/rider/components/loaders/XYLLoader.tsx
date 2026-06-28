'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface XYLLoaderProps {
  mini?: boolean
  tagline?: string
}

const XYLLoader: React.FC<XYLLoaderProps> = ({ mini = false, tagline }) => {
  if (mini) {
    return (
      <div className="flex items-center justify-center p-2">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          className="h-5 w-5 border border-[#e8e8e8] border-t-[#1a1a1a] rounded-full"
        />
      </div>
    )
  }

  const studioLetters = ['S', 'T', 'U', 'D', 'I', 'O']

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[10000] flex flex-col items-center justify-center overflow-hidden"
        style={{
          backgroundColor: '#fdfdfd',
          backgroundImage: "url('https://www.transparenttextures.com/patterns/white-paperboard.png')",
          fontFamily: "'Playfair Display', serif"
        }}
      >
        <div className="flex flex-col items-center justify-center">
          {/* Orbit Box */}
          <div className="relative w-[140px] h-[140px] flex items-center justify-center mb-[30px]">
            {/* Outer Orbit */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: [0.5, 0.1, 0.4, 0.9] }}
              className="absolute inset-0 border border-[#e8e8e8] border-t-[#1a1a1a] rounded-full"
            />
            {/* Inner Orbit */}
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-[7.5%] border border-transparent border-b-[#cccccc] rounded-full opacity-50"
            />
            
            {/* Logo Stack */}
            <motion.div
              animate={{ opacity: [1, 0.85, 1], scale: [1, 0.98, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="flex flex-col items-center text-center select-none z-10 leading-[0.75]"
            >
              <span className="text-[36px] font-normal text-[#1a1a1a] tracking-wider">X</span>
              <span className="text-[36px] font-normal text-[#1a1a1a] tracking-wider">Y</span>
              <span className="text-[36px] font-normal italic text-[#1a1a1a] tracking-wider translate-x-[3px]">L</span>
            </motion.div>
          </div>

          {/* STUDIO Loader */}
          <div className="flex gap-3 mt-[5px]">
            {studioLetters.map((letter, i) => (
              <motion.span
                key={i}
                animate={{ color: ['#cccccc', '#1a1a1a', '#cccccc'] }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: i * 0.15
                }}
                className="text-[11px] font-normal tracking-[6px] uppercase"
              >
                {letter}
              </motion.span>
            ))}
          </div>

          {/* Optional Tagline */}
          {tagline && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 0.4, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-6 text-[9px] font-normal uppercase tracking-[0.4em] text-[#1a1a1a]"
            >
              {tagline}
            </motion.p>
          )}
        </div>

        {/* Local Styles for Font and Pattern fallback */}
        <style jsx global>{`
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap');
        `}</style>
      </motion.div>
    </AnimatePresence>
  )
}

export default XYLLoader
