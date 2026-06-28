'use client';
import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, Home, Leaf, Search, Plus, Activity } from 'lucide-react'
import { useI18n } from "@/lib/I18nContext";

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
  isThaiLocale: boolean
  localeLabelClass: string
  localeMicroLabelClass: string
  localeButtonClass: string
  bookingHouseCopy: any
}

const CustomerServices: React.FC<CustomerServicesProps> = ({
  bookingStep,
  setBookingStep,
  bookingSearch,
  setBookingSearch,
  services,
  handleServiceSelectForBooking,
  copy,
  houses,
  handleHouseSelectForBooking,
  bookingHouseDraft,
  setBookingHouseDraft,
  bookingHouseError,
  isCreatingBookingHouse,
  handleCreateHouseForBooking,
  showInlineHouseComposer,
  setShowInlineHouseComposer,
  availableBookingPeriods,
  bookingPeriod,
  setBookingPeriod,
  bookingArea,
  setBookingArea,
  bookingPriority,
  setBookingPriority,
  bookingPricingSummary,
  selectedTemplateForBooking,
  setSelectedTemplateForBooking,
  calculatePricingSummary,
  selectedServiceForBooking,
  bookingPaymentMethod,
  setBookingPaymentMethod,
  bookingNotes,
  setBookingNotes,
  handleConfirmBooking,
  isSubmittingBooking,
  error,
  locale,
  isThaiLocale,
  localeLabelClass,
  localeMicroLabelClass,
  localeButtonClass,
  bookingHouseCopy,
}) => {
  const stepVariants = {
    initial: { opacity: 0, x: 20, scale: 0.98 },
    animate: { opacity: 1, x: 0, scale: 1 },
    exit: { opacity: 0, x: -20, scale: 0.98 }
  }

  const transition = { type: 'spring', stiffness: 300, damping: 30 }

  return (
    <div className="screen-view h-full overflow-hidden no-scrollbar pt-0 relative select-none touch-pan-x" style={{ backgroundColor: '#FAF9F6', display: 'flex', flexDirection: 'column', touchAction: 'pan-x' }}>
      {/* Botanical Background Accent */}
      <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-[#E8F0E3] rounded-none blur-[120px] opacity-40 pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-[#F3E9E2] rounded-none blur-[100px] opacity-30 pointer-events-none" />

      {/* Edge-to-edge Progress Bar */}
      <div className="w-full h-1.5 bg-[#1D2D24]/5 flex-shrink-0 flex relative z-50 overflow-hidden">
        {[1, 2, 3, 4].map(step => (
          <div 
            key={step} 
            className={`h-full transition-all duration-700 ease-in-out ${bookingStep >= step ? 'bg-[#1D2D24]' : 'bg-transparent'}`} 
            style={{ width: '25%' }}
          />
        ))}
      </div>

      <div className="flex-1 flex flex-col px-4 md:px-12 pt-6 md:pt-12 min-h-0 relative z-20">
        <header className="flex items-end justify-between mb-4 border-b border-[#1D2D24]/10 pb-5 flex-shrink-0 relative z-30">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 mb-0.5">
               <div className="w-1 h-1 bg-[#AF907A]" />
               <p className="text-[7px] font-bold text-[#AF907A] uppercase tracking-[0.4em] mb-0">Xylem Landscape.</p>
            </div>
            <h1 className="customer-editorial-title !text-3xl md:!text-6xl !mb-0 uppercase tracking-tighter font-black text-[#1D2D24] leading-none">
              {bookingStep === 1 ? copy.catalog : bookingStep === 2 ? copy.estatesTitle : bookingStep === 3 ? copy.billingPeriod : copy.paymentConfirm}
            </h1>
          </div>
          
          <div className="text-right">
             <div className="text-[8px] font-black tracking-[0.4em] text-[#AF907A] mb-0.5 uppercase opacity-60">
               {bookingStep === 1 ? copy.chooseService : bookingStep === 2 ? copy.selectProperty : bookingStep === 3 ? copy.selectPlan : copy.confirmAndPay}
             </div>
             <div className="text-2xl font-serif-thai italic text-[#1D2D24] leading-tight">
                <span className="text-[#AF907A]">0{bookingStep}</span> <span className="mx-0.5 opacity-10">/</span> <span className="opacity-20 text-sm">04</span>
             </div>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={bookingStep}
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={transition}
            className="flex-1 max-w-[1600px] mx-auto w-full flex flex-col min-h-0"
          >
            {/* STEP 1: Choose Service */}
            {bookingStep === 1 && (
              <div className="flex-1 flex flex-col min-h-0 justify-center">
                <div className="flex-1 min-h-0 relative flex items-center overflow-visible">
                  <div className="flex overflow-x-auto gap-2 md:gap-6 snap-x snap-mandatory no-scrollbar px-3 md:px-[12.5vw] py-4 w-full items-center">
                    {services.map((s, idx) => {
                        const { locale } = useI18n();
                      const serviceImg = s.image_url || `/assets/services/service-${(idx % 4) + 1}.jpg`;
                      return (
                        <div key={s.id} className="snap-center flex-shrink-0 w-[94vw] md:w-[75vw] lg:w-[65vw]">
                          <motion.button
                            initial={false}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleServiceSelectForBooking(s)}
                            className="group w-full aspect-[4/5] md:aspect-[2.2/1] !p-0 overflow-hidden flex flex-col transition-all duration-300 shadow-[0_20px_40px_rgba(0,0,0,0.2)] relative border border-[#1D2D24]/10 rounded-none bg-white"
                          >
                            <div className="relative h-full w-full overflow-hidden">
                              <img src={serviceImg} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt={s.service_name} />
                              <div className="absolute inset-0 bg-gradient-to-t from-[var(--customer-ink)] via-[var(--customer-ink)]/20 to-transparent opacity-90" />
                              <div className="absolute top-8 left-8 flex items-center gap-2 z-20">
                                <div className="px-3 py-1 bg-white text-[#1D2D24] text-[7px] font-black uppercase tracking-[0.3em]">{copy.featured || 'Premium Selection'}</div>
                              </div>
                              <div className="absolute inset-y-0 left-0 p-8 md:p-16 flex flex-col justify-center h-full max-w-[70%]">
                                <div className="space-y-6">
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-4">
                                      <div className="w-8 h-[1px] bg-[#AF907A]" />
                                      <p className="text-[9px] font-bold text-[#AF907A] uppercase tracking-[0.5em] mb-0">Project {String(idx + 1).padStart(2, '0')}</p>
                                    </div>
                                    <h3 className="!text-white !text-4xl md:!text-7xl leading-none uppercase tracking-tighter font-black">{s.service_name}</h3>
                                  </div>
                                  <p className="text-[12px] md:text-[16px] font-medium text-white/70 italic leading-relaxed line-clamp-3 font-serif-thai max-w-lg">{s.description || copy.goServices}</p>
                                  <div className="pt-8 flex items-center gap-10">
                                    <div className="flex flex-col">
                                      <span className="text-[9px] font-bold text-white/30 uppercase tracking-[0.3em] mb-1">Starting At</span>
                                      <span className="text-3xl md:text-5xl font-bold text-white tracking-tighter tabular-nums">{locale === 'en' ? '฿' : locale === 'zh' ? '฿' : '฿'}{(s.base_price || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="w-16 h-16 bg-white text-[#1D2D24] flex items-center justify-center transition-all group-hover:bg-[#AF907A] group-hover:text-white rounded-none">
                                      <ArrowRight size={24} />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Choose House */}
            {bookingStep === 2 && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-6 flex-shrink-0">
                  <button onClick={() => setBookingStep(1)} className="customer-editorial-kicker !mb-0 flex items-center gap-2 hover:opacity-50 transition-opacity">
                    <ArrowLeft size={14} /> {copy.back}
                  </button>
                  <p className="customer-editorial-kicker !mb-0 !text-[8px]">02 / 04</p>
                </div>
                <div className="mb-6 flex-shrink-0">
                  <h2 className="customer-editorial-title !text-3xl">{copy.selectProperty}</h2>
                </div>
                <div className="flex-1 overflow-y-auto no-scrollbar pr-1 pb-32">
                  {houses.length === 0 ? (
                    <div className="customer-editorial-panel !p-6 space-y-6">
                      <div>
                        <p className="customer-editorial-kicker !mb-1 !text-[8px]">{bookingHouseCopy.title}</p>
                        <p className="customer-editorial-card-title !text-xl">{bookingHouseCopy.subtitle}</p>
                      </div>
                      <div className="space-y-4">
                        <input type="text" value={bookingHouseDraft.name} onChange={e => setBookingHouseDraft(prev => ({ ...prev, name: e.target.value }))} placeholder={bookingHouseCopy.name} className="customer-editorial-input w-full p-4 !text-[11px]" />
                        <textarea value={bookingHouseDraft.address} onChange={e => setBookingHouseDraft(prev => ({ ...prev, address: e.target.value }))} placeholder={bookingHouseCopy.address} className="customer-editorial-input w-full min-h-[80px] p-4 !text-[11px] rounded-none" />
                        <input type="number" min={1} value={bookingHouseDraft.areaSize} onChange={e => setBookingHouseDraft(prev => ({ ...prev, areaSize: e.target.value }))} placeholder={bookingHouseCopy.area} className="customer-editorial-input w-full p-4 !text-[11px]" />
                      </div>
                      {bookingHouseError && <div className="p-3 border border-red-200 bg-red-50 text-red-600 text-[8px] font-bold uppercase tracking-widest">{bookingHouseError}</div>}
                      <button type="button" onClick={handleCreateHouseForBooking} disabled={isCreatingBookingHouse} className="w-full bg-[var(--customer-ink)] text-white py-4 text-[9px] font-bold uppercase tracking-[0.3em] active:scale-[0.98] transition-all">{isCreatingBookingHouse ? copy.confirmingText : bookingHouseCopy.create}</button>
                    </div>
                  ) : (
                    <>
                      <div className="grid gap-3">
                        {/* Only show houses the user owns or has editor/manager access to — not viewer-only */}
                        {houses.filter((h: any) => !h.role || h.role !== 'viewer').map(h => (
                          <button key={h.id} onClick={() => handleHouseSelectForBooking(h)} className="customer-editorial-card group flex items-center justify-between !p-4 active:scale-[0.98] transition-all">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-[var(--customer-paper-strong)] flex items-center justify-center border border-[var(--customer-line)]">
                                <Home size={18} strokeWidth={1} />
                              </div>
                              <div className="text-left">
                                <h3 className="customer-editorial-card-title !text-xl">{h.name}</h3>
                                <p className="text-[8px] font-bold text-[var(--customer-muted)] uppercase tracking-widest mt-1">{h.area_size || '—'} {copy.sqmSpace}</p>
                              </div>
                            </div>
                            <div className="w-8 h-8 rounded-full border border-[var(--customer-line)] flex items-center justify-center group-hover:bg-[var(--customer-ink)] group-hover:text-white transition-all">
                              <ArrowRight size={14} />
                            </div>
                          </button>
                        ))}
                      </div>
                      <div className="pt-6">
                        <button type="button" onClick={() => setShowInlineHouseComposer(prev => !prev)} className="w-full py-4 text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--customer-ink)] border border-[var(--customer-line)] hover:bg-[var(--customer-paper-strong)] transition-all active:scale-[0.98]">
                          {showInlineHouseComposer ? bookingHouseCopy.cancel : bookingHouseCopy.open}
                        </button>
                        <AnimatePresence>
                          {showInlineHouseComposer && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                              <div className="customer-editorial-panel mt-4 !p-6 space-y-4">
                                <input type="text" value={bookingHouseDraft.name} onChange={e => setBookingHouseDraft(prev => ({ ...prev, name: e.target.value }))} placeholder={bookingHouseCopy.name} className="customer-editorial-input w-full p-4 !text-[11px]" />
                                <textarea value={bookingHouseDraft.address} onChange={e => setBookingHouseDraft(prev => ({ ...prev, address: e.target.value }))} placeholder={bookingHouseCopy.address} className="customer-editorial-input w-full min-h-[80px] p-4 !text-[11px]" />
                                <input type="number" min={1} value={bookingHouseDraft.areaSize} onChange={e => setBookingHouseDraft(prev => ({ ...prev, areaSize: e.target.value }))} placeholder={bookingHouseCopy.area} className="customer-editorial-input w-full p-4 !text-[11px] rounded-none" />
                                {bookingHouseError && <div className="p-4 border border-red-200 bg-red-50 text-red-600 text-[8px] font-bold uppercase tracking-widest">{bookingHouseError}</div>}
                                <button type="button" onClick={handleCreateHouseForBooking} disabled={isCreatingBookingHouse} className="w-full bg-[var(--customer-ink)] text-white py-4 text-[9px] font-bold uppercase tracking-[0.24em] active:scale-[0.98] transition-all rounded-none">{isCreatingBookingHouse ? copy.confirmingText : bookingHouseCopy.create}</button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* STEP 3: Choose Plan */}
            {bookingStep === 3 && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-6 flex-shrink-0">
                  <button onClick={() => setBookingStep(2)} className="customer-editorial-kicker !mb-0 flex items-center gap-2 hover:opacity-50 transition-opacity">
                    <ArrowLeft size={14} /> {copy.back}
                  </button>
                  <p className="customer-editorial-kicker !mb-0 !text-[8px]">03 / 04</p>
                </div>
                <div className="flex-1 overflow-y-auto no-scrollbar pr-1 pb-32 space-y-10">
                  <div className="customer-editorial-panel !p-6 !rounded-none">
                    <p className="customer-editorial-kicker !mb-4 !text-center !text-[8px]">{copy.billingPeriod}</p>
                    <div className="grid grid-cols-3 gap-2">
                      {[{ id: 'one-time', label: copy.oneTime }, { id: 'monthly', label: copy.monthly }, { id: 'yearly', label: copy.yearly }].map(option => {
                        const isAvailable = availableBookingPeriods.includes(option.id as any);
                        return (
                          <button key={option.id} type="button" disabled={!isAvailable} onClick={() => isAvailable && setBookingPeriod(option.id as any)} className={`py-3 px-1 text-center border transition-all text-[8px] font-bold uppercase tracking-widest ${bookingPeriod === option.id ? 'bg-[var(--customer-ink)] text-white border-[var(--customer-ink)]' : 'bg-white border-[var(--customer-line)] text-[var(--customer-muted)]'} ${!isAvailable && 'opacity-20 grayscale'} rounded-none`}>
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="customer-editorial-kicker !mb-2 !text-[8px]">{copy.gardenArea}</p>
                    <div className="inline-block relative">
                      <input type="number" value={bookingArea} onChange={e => setBookingArea(Number(e.target.value))} className="customer-editorial-input !border-0 !bg-transparent text-center !text-5xl !p-0 max-w-[150px] font-light tracking-tighter" />
                      <div className="text-[8px] font-bold text-[var(--customer-muted)] uppercase tracking-[0.2em] mt-2">{copy.sqmSpace}</div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <p className="customer-editorial-kicker !text-center !text-[8px]">{copy.matchedPackages}</p>
                    {(() => {
                                          const { locale } = useI18n();
                      const filteredTpls = bookingPricingSummary.availableTemplates;
                      if (filteredTpls.length === 0) {
                        return (
                          <div className="customer-editorial-panel !bg-[var(--customer-paper-strong)] !p-6 text-center !rounded-none">
                            <h4 className="customer-editorial-card-title !text-xl mb-4">{copy.personalizedQuote}</h4>
                            <div className="text-3xl font-black text-[var(--customer-ink)] tracking-tighter">{locale === 'en' ? '฿' : locale === 'zh' ? '฿' : '฿'}{bookingPricingSummary.subtotal.toLocaleString()}</div>
                          </div>
                        );
                      }
                      return (
                        <div className="grid gap-2 max-w-xl mx-auto w-full">
                          {filteredTpls.map(t => {
                              const { locale } = useI18n();
                            const active = selectedTemplateForBooking?.id === t.id;
                            const templatePricing = calculatePricingSummary({ service: selectedServiceForBooking, templates: [t], selectedTemplate: t, area: bookingArea, period: bookingPeriod, priority: 'normal' });
                            return (
                              <button key={t.id} onClick={() => setSelectedTemplateForBooking(t)} className={`customer-editorial-card group flex items-center justify-between !p-5 transition-all ${active ? '!bg-[var(--customer-ink)] !text-white' : ''} rounded-none`}>
                                <div className="text-left">
                                  <h3 className={`customer-editorial-card-title !text-lg ${active ? 'text-white' : ''}`}>{t.template_name}</h3>
                                  <p className={`text-[8px] font-bold uppercase tracking-widest mt-1 ${active ? 'text-white/60' : 'text-[var(--customer-muted)]'}`}>{copy.selectPlan}</p>
                                </div>
                                <div className="text-xl font-bold">{locale === 'en' ? '฿' : locale === 'zh' ? '฿' : '฿'}{templatePricing.subtotal.toLocaleString()}</div>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                  <div className="space-y-4">
                    <p className="customer-editorial-kicker !text-center !text-[8px]">{copy.priority}</p>
                    <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto">
                      {[{ id: 'normal', label: copy.normal }, { id: 'urgent', label: copy.urgent }].map(p => (
                        <button key={p.id} onClick={() => setBookingPriority(p.id as any)} className={`py-4 border text-[9px] font-bold uppercase tracking-widest transition-all ${bookingPriority === p.id ? 'bg-[var(--customer-ink)] text-white border-[var(--customer-ink)]' : 'bg-white border-[var(--customer-line)] text-[var(--customer-muted)]'} rounded-none`}>
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: Checkout & Payment */}
            {bookingStep === 4 && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-6 flex-shrink-0">
                  <button onClick={() => setBookingStep(3)} className="customer-editorial-kicker !mb-0 flex items-center gap-2 hover:opacity-50 transition-opacity">
                    <ArrowLeft size={14} /> {copy.back}
                  </button>
                  <p className="customer-editorial-kicker !mb-0 !text-[8px]">04 / 04</p>
                </div>
                <div className="flex-1 overflow-y-auto no-scrollbar pr-1 pb-32">
                  <div className="customer-editorial-panel !p-8 !rounded-none">
                    <p className="customer-editorial-kicker !mb-2 !text-[8px]">{copy.summary}</p>
                    <h2 className="customer-editorial-card-title !text-2xl !leading-tight mb-8">{selectedServiceForBooking?.service_name}.</h2>
                    <div className="space-y-8">
                      <div className="bg-[var(--customer-paper-strong)] border border-[var(--customer-line)] p-6 space-y-6">
                        {(() => {
                                                  const { locale } = useI18n();
                          const baseSub = bookingPricingSummary.subtotal;
                          const priorityFee = bookingPricingSummary.priorityFee;
                          const finalTotal = bookingPricingSummary.total;
                          return (
                            <>
                              <div className="flex justify-between items-center pb-4 border-b border-[var(--customer-line)]">
                                <span className="text-[8px] font-bold uppercase tracking-widest text-[var(--customer-muted)]">{copy.subtotal}</span>
                                <span className="text-lg font-bold text-[var(--customer-ink)]">{locale === 'en' ? '฿' : locale === 'zh' ? '฿' : '฿'}{baseSub.toLocaleString()}</span>
                              </div>
                              {priorityFee > 0 && (
                                <div className="flex justify-between items-center pb-4 border-b border-[var(--customer-line)]">
                                  <span className="text-[8px] font-bold uppercase tracking-widest text-red-500 italic">{copy.urgentPriority}</span>
                                  <span className="text-lg font-bold text-red-500">{locale === 'en' ? '+฿' : locale === 'zh' ? '+฿' : '+฿'}{priorityFee.toLocaleString()}</span>
                                </div>
                              )}
                              <div className="flex justify-between items-end pt-6">
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--customer-ink)]">{copy.totalDue}</span>
                                  <span className="text-[8px] font-bold uppercase tracking-widest text-[var(--customer-muted)] mt-1 italic">{bookingPeriod}</span>
                                </div>
                                <span className="text-5xl font-black text-[var(--customer-ink)] leading-none tracking-tighter">{locale === 'en' ? '฿' : locale === 'zh' ? '฿' : '฿'}{finalTotal.toLocaleString()}</span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                      <div className="space-y-4">
                        <p className="customer-editorial-kicker !text-center !text-[8px]">{copy.methodLabel}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <button type="button" onClick={() => setBookingPaymentMethod('promptpay')} className={`p-5 border transition-all text-left ${bookingPaymentMethod === 'promptpay' ? 'bg-[var(--customer-ink)] text-white' : 'bg-white border-[var(--customer-line)]'} rounded-none`}>
                            <div className="flex items-center justify-between gap-3 mb-2">
                              <span className="text-[8px] font-bold uppercase tracking-widest">{copy.promptPayQr}</span>
                              {bookingPaymentMethod === 'promptpay' && <div className="w-2 h-2 bg-white rounded-full" />}
                            </div>
                            <p className={`text-[8px] leading-relaxed ${bookingPaymentMethod === 'promptpay' ? 'text-white/60' : 'text-[var(--customer-muted)]'}`}>{copy.promptPayHint}</p>
                          </button>
                          <button type="button" onClick={() => setBookingPaymentMethod('stripe')} className={`p-5 border transition-all text-left ${bookingPaymentMethod === 'stripe' ? 'bg-[var(--customer-ink)] text-white' : 'bg-white border-[var(--customer-line)]'} rounded-none`}>
                            <div className="flex items-center justify-between gap-3 mb-2">
                              <span className="text-[8px] font-bold uppercase tracking-widest">{copy.creditCard}</span>
                              {bookingPaymentMethod === 'stripe' && <div className="w-2 h-2 bg-white rounded-full" />}
                            </div>
                            <p className={`text-[8px] leading-relaxed ${bookingPaymentMethod === 'stripe' ? 'text-white/60' : 'text-[var(--customer-muted)]'}`}>{copy.cardHint}</p>
                          </button>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <p className="customer-editorial-kicker !text-center !text-[8px]">{copy.specialNotes}</p>
                        <textarea value={bookingNotes} onChange={e => setBookingNotes(e.target.value)} placeholder={copy.notesPlaceholder} className="customer-editorial-input w-full p-4 min-h-[100px] !text-[11px] rounded-none" />
                      </div>
                      {error && <div className="p-4 border border-red-200 bg-red-50 text-red-600 text-[8px] font-bold uppercase tracking-widest rounded-none">{error}</div>}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* FIXED FOOTER FOR STEPS 3 & 4 */}
        {(bookingStep === 3 || bookingStep === 4) && (
          <div className="flex-shrink-0 p-6 pb-10 bg-[#FAF9F6] border-t border-[#F0F0F0] shadow-[0_-10px_30px_-5px_rgba(0,0,0,0.03)] z-50">
            {bookingStep === 3 ? (
              <button
                onClick={() => setBookingStep(4)}
                className="w-full py-6 bg-[#111111] text-white text-[10px] font-bold uppercase tracking-[0.5em] rounded-none shadow-2xl transition-all active:scale-[0.98]"
              >
                {copy.continuePayment}
              </button>
            ) : (
              <div className="space-y-4">
                <button
                  onClick={handleConfirmBooking}
                  disabled={isSubmittingBooking}
                  className="w-full py-6 bg-[#111111] text-white text-[10px] font-bold uppercase tracking-[0.5em] rounded-none shadow-2xl transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {isSubmittingBooking ? (
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-3 h-3 border-2 border-white/20 border-t-white animate-spin" />
                      <span>PROCESSING...</span>
                    </div>
                  ) : copy.confirmAndPay}
                </button>
                <button
                  onClick={() => setBookingStep(3)}
                  className="w-full py-3 bg-white text-[#111111] text-[8px] font-bold uppercase tracking-[0.4em] rounded-none border border-[#F0F0F0] transition-all"
                >
                  {copy.backToPlan}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default CustomerServices
