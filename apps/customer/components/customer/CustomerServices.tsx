'use client';
import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Search, Star, Clock, MapPin, CalendarDays, Users } from 'lucide-react'

const pressable = "active:scale-[0.96] transition-transform duration-300 ease-out"

interface CustomerServicesProps {
  bookingStep: number
  setBookingStep: (step: number) => void
  bookingSearch: string
  setBookingSearch: (val: string) => void
  services: any[]
  handleServiceSelectForBooking: (service: any) => void
  copy: any
  houses: any[]
  handleHouseSelectForBooking: (house: any) => void
  bookingHouseDraft: any
  setBookingHouseDraft: (fn: (prev: any) => any) => void
  bookingHouseError: string
  isCreatingBookingHouse: boolean
  handleCreateHouseForBooking: () => void
  showInlineHouseComposer: boolean
  setShowInlineHouseComposer: (fn: (prev: any) => any) => void
  availableBookingPeriods: string[]
  bookingPeriod: string
  setBookingPeriod: (period: any) => void
  bookingArea: number
  setBookingArea: (area: number) => void
  bookingPriority: string
  setBookingPriority: (priority: any) => void
  bookingPricingSummary: any
  selectedTemplateForBooking: any
  setSelectedTemplateForBooking: (tpl: any) => void
  calculatePricingSummary: any
  selectedServiceForBooking: any
  bookingPaymentMethod: string
  setBookingPaymentMethod: (method: any) => void
  bookingNotes: string
  setBookingNotes: (notes: string) => void
  handleConfirmBooking: () => void
  isSubmittingBooking: boolean
  error: string
  locale: string
  bookingHouseCopy: any
}

const CustomerServices: React.FC<CustomerServicesProps> = ({
  bookingStep,
  setBookingStep,
  services,
  handleServiceSelectForBooking,
  setBookingPeriod,
  setBookingArea,
  bookingPricingSummary,
  selectedServiceForBooking,
  bookingPaymentMethod,
  setBookingPaymentMethod,
  bookingNotes,
  setBookingNotes,
  handleConfirmBooking,
  isSubmittingBooking,
  error,
}) => {
  const stepVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  }

  // Force one-time booking and area=1 behind the scenes
  React.useEffect(() => {
    setBookingPeriod('one-time')
    setBookingArea(1)
  }, [setBookingPeriod, setBookingArea])

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden relative">
      
      {/* Header */}
      <header className="bg-white px-5 pt-12 pb-4 flex-shrink-0 z-50">
        <div className="flex items-center gap-4">
          {bookingStep > 1 ? (
            <button onClick={() => setBookingStep(bookingStep - 1)} className={`w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 ${pressable}`}>
              <ArrowLeft size={20} />
            </button>
          ) : (
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
              <Search size={20} />
            </div>
          )}
          <div>
            <h1 className="text-xl font-black text-slate-900">
              {bookingStep === 1 ? 'Explore Experiences' : 
               bookingStep === 2 ? 'Experience Details' : 
               bookingStep === 3 ? 'Select Options' : 'Checkout'}
            </h1>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar relative z-10 pb-32">
        <AnimatePresence mode="wait">
          <motion.div
            key={bookingStep}
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {/* STEP 1: All Tours */}
            {bookingStep === 1 && (
              <div className="p-5 flex flex-col gap-6">
                {services.map((s, idx) => (
                  <div 
                    key={s.id} 
                    onClick={() => handleServiceSelectForBooking(s)}
                    className={`bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm cursor-pointer ${pressable}`}
                  >
                    <div className="w-full h-48 relative bg-slate-200">
                      <img src={s.thumbnail_url || s.image_url || `https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&q=80&w=800`} className="w-full h-full object-cover" alt={s.service_name} />
                    </div>
                    <div className="p-5">
                      <h3 className="text-lg font-bold text-slate-900 mb-2 leading-tight">{s.service_name}</h3>
                      <div className="flex items-center gap-3 mb-3 text-sm font-bold text-slate-600">
                        <div className="flex items-center gap-1"><Star size={16} className="text-amber-400 fill-amber-400" /> 4.8</div>
                        <div className="flex items-center gap-1"><Clock size={16} /> 4 Hours</div>
                      </div>
                      <p className="text-sm text-slate-500 line-clamp-2 mb-4">{s.description}</p>
                      <div className="text-blue-600 font-black text-lg">
                        {s.base_price ? `฿${s.base_price.toLocaleString()}` : 'Check Prices'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* STEP 2: Detail View (Bypasses old Step 2) */}
            {bookingStep === 2 && (
              <div className="pb-10">
                <div className="w-full h-64 relative">
                   <img src={selectedServiceForBooking?.image_url || 'https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&q=80&w=800'} className="w-full h-full object-cover" alt="" />
                </div>
                <div className="p-6 bg-white rounded-t-3xl -mt-6 relative z-10 shadow-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">Top Rated</span>
                    <span className="flex items-center gap-1 text-sm font-bold"><Star size={14} className="text-amber-400 fill-amber-400" /> 4.9 (120)</span>
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 mb-4">{selectedServiceForBooking?.service_name}</h2>
                  <div className="flex items-center gap-4 text-sm font-medium text-slate-600 mb-6 pb-6 border-b border-slate-100">
                    <div className="flex items-center gap-1.5"><Clock size={18} className="text-blue-500"/> 4 Hours</div>
                    <div className="flex items-center gap-1.5"><MapPin size={18} className="text-blue-500"/> Meeting Point</div>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Experience Overview</h3>
                  <p className="text-sm text-slate-600 leading-relaxed mb-8">{selectedServiceForBooking?.description}</p>
                  
                  <button onClick={() => setBookingStep(4)} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-blue-500/30 active:scale-95 transition-transform">
                    Book Now - ฿{selectedServiceForBooking?.base_price?.toLocaleString()}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3 is skipped in the flow above (goes straight to 4), but keep if they navigate manually */}
            {bookingStep === 3 && (
              <div className="p-5 text-center mt-20">
                <p>Redirecting...</p>
                {setTimeout(() => setBookingStep(4), 100) && ''}
              </div>
            )}

            {/* STEP 4: Checkout */}
            {bookingStep === 4 && (
              <div className="max-w-lg mx-auto space-y-6 p-5">
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                  <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
                     <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-100 flex-shrink-0">
                        <img src={selectedServiceForBooking?.image_url || 'https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&q=80&w=800'} className="w-full h-full object-cover" alt="" />
                     </div>
                     <div>
                        <h2 className="text-base font-bold text-slate-900 line-clamp-2">{selectedServiceForBooking?.service_name}</h2>
                        <p className="text-xs text-slate-500 mt-1">1 x Adult Ticket</p>
                     </div>
                  </div>

                  <h3 className="font-bold text-slate-900 mb-4">Select Date</h3>
                  <div className="flex gap-3 mb-6 overflow-x-auto pb-2 no-scrollbar">
                     {['Today', 'Tomorrow', 'Oct 24'].map((day, i) => (
                        <div key={day} className={`px-5 py-3 rounded-2xl border-2 font-bold text-sm whitespace-nowrap cursor-pointer ${i===0 ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-600'}`}>
                           {day}
                        </div>
                     ))}
                  </div>

                  <h3 className="font-bold text-slate-900 mb-4">Payment Method</h3>
                  <div className="grid grid-cols-2 gap-3 mb-8">
                    <button onClick={() => setBookingPaymentMethod('promptpay')} className={`py-4 px-3 rounded-2xl border-2 transition-all font-bold text-sm ${bookingPaymentMethod === 'promptpay' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-200 text-slate-600'}`}>
                      PromptPay QR
                    </button>
                    <button onClick={() => setBookingPaymentMethod('stripe')} className={`py-4 px-3 rounded-2xl border-2 transition-all font-bold text-sm ${bookingPaymentMethod === 'stripe' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-200 text-slate-600'}`}>
                      Credit Card
                    </button>
                  </div>

                  <h3 className="font-bold text-slate-900 mb-3">Special Requests</h3>
                  <textarea 
                    value={bookingNotes} 
                    onChange={e => setBookingNotes(e.target.value)} 
                    placeholder="Any dietary requirements or special needs?" 
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm mb-6 outline-none focus:ring-2 focus:ring-blue-600/20" 
                  />

                  <div className="flex justify-between items-end mb-6 pt-4 border-t border-slate-100">
                    <span className="font-bold text-slate-900 text-lg">Total</span>
                    <span className="text-3xl font-black text-blue-600">฿{bookingPricingSummary?.total?.toLocaleString() || selectedServiceForBooking?.base_price?.toLocaleString()}</span>
                  </div>

                  {error && <div className="mb-6 p-4 bg-red-50 text-red-600 text-xs font-bold rounded-xl">{error}</div>}

                  <button 
                    onClick={handleConfirmBooking} 
                    disabled={isSubmittingBooking}
                    className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-blue-500/30 active:scale-95 transition-transform disabled:opacity-50 flex justify-center items-center gap-2"
                  >
                    {isSubmittingBooking ? (
                      <><div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> Processing...</>
                    ) : (
                      'Confirm Booking'
                    )}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

export default CustomerServices
