'use client'

import React, { useState, useEffect } from 'react'
import { X, Delete, ShieldAlert } from 'lucide-react'

interface POSPinModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  correctPin: string
  title?: string
  description?: string
}

export default function POSPinModal({
  isOpen,
  onClose,
  onSuccess,
  correctPin,
  title = 'MANAGER AUTHORIZATION',
  description = 'กรุณาใส่รหัสผ่านผู้จัดการเพื่อทำรายการนี้'
}: POSPinModalProps) {
  const [pin, setPin] = useState<string>('')
  const [error, setError] = useState<boolean>(false)

  useEffect(() => {
    if (isOpen) {
      setPin('')
      setError(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleKeyPress = (num: string) => {
    if (error) setError(false)
    if (pin.length < 6) {
      const nextPin = pin + num
      setPin(nextPin)
      
      // Auto-validate if PIN reaches correct length
      if (nextPin.length === correctPin.length) {
        if (nextPin === correctPin) {
          onSuccess()
          onClose()
        } else {
          // Play error flash
          setError(true)
          setPin('')
        }
      }
    }
  }

  const handleDelete = () => {
    if (error) setError(false)
    setPin(prev => prev.slice(0, -1))
  }

  const handleClear = () => {
    setPin('')
    setError(false)
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      {/* Backdrop with Blur */}
      <div 
        className="absolute inset-0 bg-[#1A1A18]/60 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className={`relative w-full max-w-md bg-white border border-[#F0F0E8] p-8 sm:p-10 shadow-2xl transition-all duration-300 transform scale-100 flex flex-col items-center justify-center text-black font-bold select-none ${error ? 'animate-shake border-red-500 bg-red-50/10' : ''}`}>
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-center text-gray-400 hover:text-black"
        >
          <X size={20} />
        </button>

        {/* Shield Icon / Title */}
        <div className="flex flex-col items-center text-center space-y-4 mb-8">
          <div className={`w-16 h-16 flex items-center justify-center rounded-none transition-colors ${error ? 'bg-red-100 text-red-500' : 'bg-gray-50 text-[#1A1A18]'}`}>
            <ShieldAlert size={28} />
          </div>
          <h3 className="text-sm font-black uppercase tracking-[0.25em] leading-tight text-[#1A1A18]">{title}</h3>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest max-w-[280px] leading-relaxed">
            {error ? 'รหัส PIN ไม่ถูกต้อง กรุณาลองใหม่' : description}
          </p>
        </div>

        {/* PIN Display Bullets */}
        <div className="flex gap-4 mb-10 h-6 items-center">
          {Array.from({ length: Math.max(correctPin.length, 4) }).map((_, idx) => {
            const isFilled = idx < pin.length
            return (
              <div 
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-150 ${error ? 'bg-red-500 scale-110' : isFilled ? 'bg-black scale-110' : 'bg-gray-100 border border-[#F0F0E8]'}`}
              />
            )
          })}
        </div>

        {/* Numeric Numpad */}
        <div className="grid grid-cols-3 gap-4 w-full max-w-[320px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              onClick={() => handleKeyPress(num)}
              className="h-20 bg-gray-50 hover:bg-black hover:text-white transition-all text-xl font-black uppercase tracking-widest flex items-center justify-center border border-transparent hover:border-black active:scale-95"
            >
              {num}
            </button>
          ))}
          
          {/* Clear button */}
          <button
            onClick={handleClear}
            className="h-20 bg-gray-50 hover:bg-gray-100 transition-all text-[10px] font-black uppercase tracking-widest flex items-center justify-center active:scale-95 text-gray-400 hover:text-black"
          >
            Clear
          </button>
          
          {/* Zero */}
          <button
            onClick={() => handleKeyPress('0')}
            className="h-20 bg-gray-50 hover:bg-black hover:text-white transition-all text-xl font-black uppercase tracking-widest flex items-center justify-center border border-transparent hover:border-black active:scale-95"
          >
            0
          </button>

          {/* Delete Backspace */}
          <button
            onClick={handleDelete}
            className="h-20 bg-gray-50 hover:bg-gray-100 transition-all text-[10px] font-black uppercase tracking-widest flex items-center justify-center active:scale-95 text-gray-400 hover:text-black"
          >
            <Delete size={20} />
          </button>
        </div>

      </div>

      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
        .animate-shake {
          animation: shake 0.2s ease-in-out 0s 2;
        }
      `}</style>
    </div>
  )
}
