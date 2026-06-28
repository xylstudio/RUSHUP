'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  MapPin, ChevronDown, Heart, ShoppingCart, Leaf, Sprout,
  ClipboardList, Package, Stethoscope, Home,
  Receipt, MessageCircle, Menu, ChevronRight, Bell,
  Sparkles, Search, CheckCircle2, ChevronLeft,
  Scissors, PenTool, TreePine, Calendar, ArrowUpRight, ArrowRight,
  Building2, Ruler
} from 'lucide-react'
import CustomerReportDetailPanel from '@/components/customer/CustomerReportDetailPanel'

// --- Spring Animation Utility Class ---
const springTrans = "transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)], opacity-duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
const pressable = "active:scale-[0.96] transition-transform duration-300 ease-out"

const formatDateByLocale = (date: any, locale: string) => {
  if (!date) return ''
  try {
    const d = new Date(date)
    return d.toLocaleDateString(locale === 'th' ? 'th-TH' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  } catch (e) {
    return ''
  }
}

const getOrderStatusText = (status: string, locale: string, copy: any) => {
  switch (status) {
    case 'pending': return copy.pendingOrder || 'รอดำเนินการ'
    case 'in_progress': return copy.inProgressOrder || 'กำลังดำเนินการ'
    case 'confirmed': return copy.confirmedOrder || 'ยืนยันแล้ว'
    case 'completed': return copy.completedOrder || 'เสร็จสมบูรณ์'
    default: return copy.pendingOrder || 'รอดำเนินการ'
  }
}

const translateDBText = (text: string | undefined | null, locale: string) => {
  if (!text) return ''
  if (locale === 'th') return text

  const dict: Record<string, Record<string, string>> = {
    'ดูแลสวน': { en: 'Garden Maintenance', zh: '园林养护' },
    'ติดตั้งระบบน้ำ': { en: 'Water System Installation', zh: '水系统安装' },
    'ออกแบบจัดสวน': { en: 'Landscape Design', zh: '景观设计' },
    'ประเมินหน้างาน': { en: 'Site Assessment', zh: '现场评估' },
    'ตัดแต่งต้นไม้ใหญ่': { en: 'Tree Trimming', zh: '大树修剪' },
    'บริการดูแลสวน': { en: 'Garden Care Service', zh: '园林养护服务' },
  }

  // Exact match
  if (dict[text] && dict[text][locale]) {
    return dict[text][locale]
  }

  return text
}

interface CustomerOverviewProps {
  displayName: string
  shortName: string
  activeHouse: any
  activeTab: string
  setActiveTab: (tab: any) => void
  primaryAction: any
  overviewActiveOrders: any[]
  nextVisitItems: any[]
  rotatingVisitIndex: number
  isNextVisitVisible: boolean
  currentNextVisit: any
  progressMap: Record<string, any>
  getCustomerServiceFlow: any
  locale: 'th' | 'en' | 'zh'
  copy: any
  overviewReports: any[]
  onReportClick: (report: any) => void
  setActiveSheet: (sheet: any) => void
  overviewStats: any[]
  featuredServices: any[]
  services: any[]
  handleServiceSelectForBooking: (service: any) => void
  featuredPlants: any[]
  setSelectedPlant: (plant: any) => void
  isThaiLocale: boolean
  localeLabelClass: string
  localeCapsClass: string
  localeMicroLabelClass: string
  localeButtonClass: string
  latestOrder?: any
  notifications: any[]
  features?: {
    marketplace_enabled: boolean
    service_booking_enabled: boolean
  }
  houses?: any[]
  documents?: any[]
  activeMaintenancePlans?: any[]
  setActiveHouseId?: (id: string) => void
}

const CustomerOverview: React.FC<CustomerOverviewProps> = ({
  displayName,
  shortName,
  activeHouse,
  activeTab,
  setActiveTab,
  primaryAction,
  overviewActiveOrders,
  nextVisitItems,
  rotatingVisitIndex,
  isNextVisitVisible,
  currentNextVisit,
  progressMap,
  getCustomerServiceFlow,
  locale,
  copy,
  overviewReports,
  onReportClick,
  setActiveSheet,
  overviewStats,
  featuredServices,
  services,
  handleServiceSelectForBooking,
  featuredPlants,
  setSelectedPlant,
  isThaiLocale,
  localeLabelClass,
  localeCapsClass,
  localeMicroLabelClass,
  localeButtonClass,
  latestOrder,
  notifications,
  features,
  houses = [],
  documents,
  activeMaintenancePlans,
  setActiveHouseId,
}) => {
  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [selectedService, setSelectedService] = useState<any>(null)
  const [currentLoc, setCurrentLoc] = useState<any>(activeHouse || houses[0] || null)
  const [swipeDirection, setSwipeDirection] = useState<number>(0)

  useEffect(() => {
    if (activeHouse) {
      setCurrentLoc(activeHouse)
    }
  }, [activeHouse])

  // Map real houses to locationsData format
  const locationsData = houses.map((h, idx) => ({
    id: h.id,
    name: h.name || copy.unnamedHouse,
    address: h.address || h.address_text || h.house_code || copy.noAddressData,
    image: h.image_url || h.cover_image || '/default_house_bg.JPG',
    original: h
  }))

  const displayLoc = locationsData.find(l => l.id === currentLoc?.id) || locationsData[0] || {
    id: '1', name: copy.noHouseData, address: copy.pleaseAddHouseData, image: '/default_house_bg.JPG'
  }

  // 🛡️ PROFESSIONAL LOGIC: Strictly scoped Activity Log
  const houseActivities = useMemo(() => {
    if (!currentLoc?.id) return []

    // 1. Filter reports strictly by house and existence of order details
    const filteredReports = (overviewReports || [])
      .filter(r => 
        (r.houseId === currentLoc.id || r.houseCode === currentLoc.original?.house_code) &&
        !!r.orderCode // Ensure it's linked to a valid, existing order
      )
      .map(r => ({
        id: r.id,
        title: r.serviceName ? translateDBText(r.serviceName, locale) : copy.activeOrders,
        date: r.createdAt ? formatDateByLocale(r.createdAt, locale) : copy.recently,
        status: copy.completed,
        icon: Scissors,
        bgColor: 'bg-[#F2F8F4]',
        textColor: 'text-[#4A5D4E]',
        original: r,
        type: 'report' as const
      }))

    // 2. Filter active orders strictly by house
    const filteredOrders = (overviewActiveOrders || [])
      .filter(o => 
        o.house_id === currentLoc.id || o.house_code === currentLoc.original?.house_code
      )
      .map(o => ({
        id: o.id,
        title: o.services?.service_name ? translateDBText(o.services.service_name, locale) : copy.activeOrders,
        date: o.scheduled_date ? formatDateByLocale(o.scheduled_date, locale) : copy.waitingAssign,
        status: getOrderStatusText(o.status, locale, copy),
        icon: Sprout,
        bgColor: 'bg-[#F9F1EE]',
        textColor: 'text-[#D87A60]',
        original: o,
        type: 'order' as const
      }))

    // Merge and show latest 4 items
    return [...filteredReports, ...filteredOrders].slice(0, 4)
  }, [overviewReports, overviewActiveOrders, currentLoc, locale, copy])

  // Alias for backward compatibility in the JSX below
  const recentActivities = houseActivities;

  useEffect(() => {
    if (activeModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [activeModal])

  const activeMaintenance = activeMaintenancePlans?.find(o =>
    o.house_id === displayLoc.id || o.house_code === displayLoc.original?.house_code
  );

  const maintenanceProgress = activeMaintenance
    ? Math.min(100, (activeMaintenance.completedCount / activeMaintenance.totalCount) * 100)
    : 0;

  const handleSwipe = (direction: 'left' | 'right') => {
    if (!houses || houses.length <= 1) return;
    const currentIndex = houses.findIndex(h => h.id === currentLoc?.id);
    let nextIndex = direction === 'left' ? currentIndex + 1 : currentIndex - 1;

    setSwipeDirection(direction === 'left' ? 1 : -1);

    if (nextIndex >= houses.length) nextIndex = 0;
    if (nextIndex < 0) nextIndex = houses.length - 1;

    const nextHouse = houses[nextIndex];
    if (nextHouse && setActiveHouseId) {
      const mappedNext = locationsData.find(l => l.id === nextHouse.id);
      if (mappedNext) {
        setCurrentLoc(mappedNext);
        setActiveHouseId(nextHouse.id);
      }
    }
  };

  const housesWithMaintenance = React.useMemo(() => {
    if (!activeMaintenancePlans) return {};
    const map: Record<string, any> = {};
    activeMaintenancePlans.forEach(o => {
      const hId = o.house_id || o.house_code;
      if (hId) map[hId] = o;
    });
    return map;
  }, [activeMaintenancePlans]);

  const housesWithNextVisit = React.useMemo(() => {
    if (!nextVisitItems) return {};
    const map: Record<string, any> = {};
    nextVisitItems.forEach(v => {
      if (v.key) map[v.key] = v;
    });
    return map;
  }, [nextVisitItems]);

  const earliestGlobalVisit = nextVisitItems?.[0] || null;
  const isEarliestForCurrent = earliestGlobalVisit && (earliestGlobalVisit.key === displayLoc.id || earliestGlobalVisit.key === displayLoc.original?.house_code);

  const openService = (service: any) => {
    if (service.action === 'marketplace') {
      setActiveTab('marketplace')
    } else if (service.action === 'reports') {
      setActiveTab('reports')
    } else if (service.action === 'select-service') {
      setActiveModal('select-service')
    } else {
      setSelectedService(service)
      setActiveModal('service')
    }
  }

  const closeModal = () => {
    setActiveModal(null)
    setTimeout(() => setSelectedService(null), 500)
  }

  const serviceIcons = [PenTool, TreePine, Scissors, Sprout, Leaf]
  const serviceColors = [
    'bg-emerald-50 text-emerald-600',
    'bg-[#F9F1EE] text-[#D87A60]',
    'bg-[#F2F4F2] text-[#6A7B6B]',
    'bg-teal-50 text-teal-600'
  ]

  const mappedServicesList = (services || []).map((s, idx) => ({
    id: s.id,
    title: translateDBText(s.service_name, locale),
    desc: s.description || copy.serviceDescPlaceholder,
    icon: serviceIcons[idx % serviceIcons.length],
    price: s.base_price ? `${copy.from} ฿${s.base_price.toLocaleString()}` : copy.siteAssessment,
    image: s.thumbnail_url || `/assets/services/service-${(idx % 4) + 1}.jpg`,
    tag: 'Service',
    color: serviceColors[idx % serviceColors.length],
    isDark: false,
    original: s
  }))

  const slideVariants = {
    initial: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0
    }),
    animate: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -300 : 300,
      opacity: 0
    })
  };

  return (
    <div className="flex-1 overflow-x-hidden font-sans text-[#1A1A1A] bg-[#FAFAFA]">

      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait" initial={false} custom={swipeDirection}>
          <motion.div
            key={displayLoc.id}
            custom={swipeDirection}
            variants={slideVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ 
              x: { type: "spring", stiffness: 350, damping: 35 },
              opacity: { duration: 0.2 }
            }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.7}
            onDragEnd={(e, info) => {
              const threshold = 40;
              if (info.offset.x < -threshold) handleSwipe('left');
              else if (info.offset.x > threshold) handleSwipe('right');
            }}
            className="touch-pan-y select-none"
          >
            <header className="relative w-full h-[32vh] min-h-[260px] overflow-hidden">
              {displayLoc.image ? (
                <img
                  src={displayLoc.image}
                  alt={displayLoc.name}
                  className="absolute inset-0 w-full h-full object-cover grayscale-[15%] contrast-[1.1]"
                />
              ) : (
                <div className="absolute inset-0 bg-[#2E3526]" />
              )}

              <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-transparent to-black/75" />

              <div className="absolute top-0 left-0 w-full pt-12 pb-4 px-6 flex justify-between items-start text-white z-10">
                <div
                  id="tour-location-selector"
                  className={`flex flex-col cursor-pointer ${pressable}`}
                  onClick={() => setActiveModal('location')}
                >
                  <span className="text-[9px] font-bold tracking-[0.3em] text-white/60 uppercase mb-2">
                    {copy.managedProjects}
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[16px] font-medium tracking-widest text-white drop-shadow">
                      {displayLoc.name || copy.selectProject}
                    </span>
                    {displayLoc.original?.role && (
                      <span className="text-[9px] font-bold px-2 py-0.5 bg-white/20 text-white rounded-full">
                        {displayLoc.original.role.toUpperCase()}
                      </span>
                    )}
                    {!displayLoc.original?.role && displayLoc.original?.has_collaborators && (
                      <span className="text-[9px] font-bold px-2 py-0.5 bg-blue-500/80 text-white rounded-full">
                        SHARED
                      </span>
                    )}
                    <ChevronDown size={14} className="opacity-60 text-white" />
                  </div>
                  {earliestGlobalVisit && !isEarliestForCurrent && (
                    <div className="mt-2 flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-white px-2 py-0.5 rounded-full w-fit border border-white/20">
                      <Calendar size={9} />
                      <span className="text-[9px] font-bold uppercase tracking-wider">{copy.nextVisit}: {earliestGlobalVisit.houseName}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setActiveModal('notifications')}
                    className={`relative ${pressable}`}
                  >
                    <Bell size={20} strokeWidth={1.2} className="text-white drop-shadow" />
                    {notifications?.length > 0 && (
                      <span className="absolute -top-2 -right-2 min-w-[14px] h-[14px] px-1 bg-red-600 text-white text-[8px] font-bold flex items-center justify-center rounded-full border border-black/20 shadow-sm">
                        {notifications.length > 9 ? '9+' : notifications.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>

            </header>

            {activeMaintenance ? (
              <div className="pt-8 pb-10 border-b border-[#E5E5E5]">
                <div className="px-6 flex justify-between items-end mb-5">
                  <h2 className="text-[11px] font-bold tracking-[0.22em] text-[#1A1A1A] uppercase">{copy.projectStatus}</h2>
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1A1A1A] opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#1A1A1A]" />
                    </span>
                    <span className="text-[10px] tracking-[0.1em] text-[#1A1A1A] uppercase font-bold">{copy.activeOperation}</span>
                  </div>
                </div>

                <div className="px-6">
                  <Link
                    id="tour-next-visit"
                    href={`/dashboard/customer/houses/${displayLoc.id}`}
                    className="block border border-[#1A1A1A] bg-white p-6 relative overflow-hidden group hover:bg-[#FAFAFA] transition-colors cursor-pointer shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] hover:translate-x-[2px] hover:translate-y-[2px] duration-200"
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <span className="text-[9px] tracking-[0.22em] text-[#737373] uppercase mb-1.5 block">{copy.operation}</span>
                        <h3 className="text-[15px] font-medium tracking-wide text-[#1A1A1A] uppercase">{displayLoc.name}</h3>
                      </div>
                      <div className="text-right">
                        <span className="text-[36px] font-light tracking-tighter leading-none">
                          {Math.round(maintenanceProgress)}
                          <span className="text-[16px] text-[#A3A3A3]">%</span>
                        </span>
                        <p className="text-[10px] text-[#A3A3A3] tracking-widest mt-0.5 uppercase">
                          {activeMaintenance.completedCount}/{activeMaintenance.totalCount} {copy.sessions}
                        </p>
                      </div>
                    </div>

                    <div className="mb-5">
                      <div className="flex justify-between items-end text-[10px] tracking-widest text-[#1A1A1A] uppercase mb-3">
                        <span className="font-bold">{activeMaintenance.planName || copy.maintenanceCat}</span>
                        <span className="text-[#737373]">{copy.processing}</span>
                      </div>
                      <div className="w-full h-[2px] bg-[#E5E5E5] relative">
                        <div
                          className="absolute top-0 left-0 h-full bg-[#1A1A1A] transition-all duration-1000 ease-out"
                          style={{ width: `${maintenanceProgress}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-[#E5E5E5]">
                      <div className="flex flex-col">
                        <span className="text-[9px] tracking-[0.22em] text-[#737373] uppercase mb-1">{copy.nextScheduledDate}</span>
                        <span className="text-[11px] font-bold tracking-widest text-[#1A1A1A] uppercase">
                          {currentNextVisit
                            ? formatDateByLocale(currentNextVisit.date, locale)
                            : copy.awaitingAppointment}
                        </span>
                      </div>
                      <div className="w-8 h-8 flex items-center justify-center border border-[#1A1A1A] rounded-full group-hover:bg-[#1A1A1A] group-hover:text-white transition-colors duration-300">
                        <ArrowRight size={14} />
                      </div>
                    </div>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="pt-8 pb-8 border-b border-[#E5E5E5] px-6">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-[9px] tracking-[0.22em] text-[#737373] uppercase block mb-1">{copy.activePropertyLabel}</span>
                    <h2 className="text-[16px] font-medium tracking-widest text-[#1A1A1A] uppercase">{displayLoc.name}</h2>
                    {displayLoc.original?.area_size && (
                      <p className="text-[11px] text-[#737373] mt-1">{displayLoc.original.area_size} {copy.sqmSpace}</p>
                    )}
                  </div>
                  <Link
                    href={`/dashboard/customer/houses/${displayLoc.id}`}
                    className={`border border-[#1A1A1A] px-4 py-2 text-[10px] font-bold tracking-[0.2em] uppercase text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-colors ${pressable}`}
                  >
                    {copy.openDetails}
                  </Link>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>


      {houses.length > 1 && (
        <div className="flex justify-center gap-2 mt-[-20px] mb-8 relative z-10">
          {houses.map((h) => (
            <button
              key={h.id}
              onClick={() => {
                const mapped = locationsData.find((l) => l.id === h.id)
                if (mapped) { 
                  setSwipeDirection(houses.findIndex(x => x.id === h.id) > houses.findIndex(x => x.id === currentLoc?.id) ? 1 : -1);
                  setCurrentLoc(mapped); 
                  if (setActiveHouseId) setActiveHouseId(h.id) 
                }
              }}
              className={`h-1.5 rounded-full transition-all duration-300 ${h.id === currentLoc?.id ? 'w-8 bg-[#1A1A1A]' : 'w-2 bg-[#C5C4BE]'}`}
            />
          ))}
        </div>
      )}

      <div className="py-8 border-b border-[#E5E5E5]">
        <div className="px-6 mb-5 flex justify-between items-end">
          <h2 className="text-[11px] font-bold tracking-[0.22em] text-[#1A1A1A] uppercase">{copy.serviceCatalog}</h2>
          <span
            onClick={() => setActiveTab('orders')}
            className="text-[10px] tracking-[0.1em] text-[#737373] uppercase cursor-pointer hover:text-[#1A1A1A] transition-colors"
          >
            {copy.viewAll}
          </span>
        </div>

        <div className="flex overflow-x-auto gap-5 px-6 pb-3 snap-x snap-mandatory no-scrollbar" style={{ scrollbarWidth: 'none' }}>
          {mappedServicesList.length > 0 ? mappedServicesList.map((srv, idx) => {
            const cardImage = srv.image
            return (
              <div
                key={srv.id}
                onClick={() => openService(srv)}
                className={`snap-start flex-shrink-0 w-[185px] group cursor-pointer ${pressable}`}
              >
                <div className="w-full h-[230px] bg-[#E5E5E5] overflow-hidden relative mb-3">
                  <img
                    src={cardImage}
                    alt={srv.title}
                    className="w-full h-full object-cover grayscale-[15%] group-hover:scale-105 transition-transform duration-1000 ease-out"
                  />
                </div>
                <div className="border-t border-[#E5E5E5] pt-3">
                  <span className="text-[9px] font-bold tracking-[0.22em] text-[#737373] block mb-1">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <h3 className="text-[12px] font-medium tracking-widest text-[#1A1A1A] uppercase leading-tight mb-1">{srv.title}</h3>
                  <p className="text-[10px] text-[#737373]">{srv.price}</p>
                </div>
              </div>
            )
          }) : (
            <div className="px-2 py-8 text-[#A3A3A3] text-[12px] tracking-widest uppercase">
              {copy.noServices}
            </div>
          )}
        </div>
      </div>

      <div className="py-8">
        <div className="px-6 mb-5 flex justify-between items-end">
          <h2 className="text-[11px] font-bold tracking-[0.22em] text-[#1A1A1A] uppercase">{copy.activityLog}</h2>
          <span
            onClick={() => setActiveTab('orders')}
            className="text-[10px] tracking-[0.1em] text-[#737373] uppercase cursor-pointer hover:text-[#1A1A1A] transition-colors"
          >
            {copy.historicalRecords}
          </span>
        </div>
        <div className="border-t border-[#E5E5E5] pb-32">
          {recentActivities.map((activity) => {
            const isReport = activity.type === 'report'
            const report = activity.original
            const thumbnail = isReport && (report.afterPhotos?.[0] || report.beforePhotos?.[0])

            return (
              <div
                key={activity.id}
                onClick={() => {
                  if (isReport) {
                    onReportClick(report)
                  } else {
                    setActiveTab('orders')
                  }
                }}
                className={`px-6 py-5 border-b border-[#E5E5E5] flex justify-between items-center group cursor-pointer hover:bg-[#F5F5F5] transition-colors ${pressable}`}
              >
                <div className="flex flex-col flex-1 min-w-0 pr-4">
                  <span className="text-[9px] tracking-[0.22em] text-[#737373] uppercase mb-1">
                    {activity.date}
                  </span>
                  <h4 className="text-[13px] font-medium tracking-wide text-[#1A1A1A] uppercase truncate">
                    {activity.title}
                  </h4>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {thumbnail && (
                    <div className="w-10 h-10 overflow-hidden grayscale-[20%] border border-[#E5E5E5]">
                      <img src={thumbnail} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <span className="text-[10px] font-bold tracking-widest text-[#1A1A1A] uppercase hidden sm:block">
                    {activity.status}
                  </span>
                  <ChevronRight size={16} className="text-[#A3A3A3] group-hover:translate-x-1 transition-transform" strokeWidth={1} />
                </div>
              </div>
            )
          })}

          {recentActivities.length === 0 && (
            <div className="px-6 py-12 text-center">
              <p className="text-[10px] tracking-[0.22em] text-[#A3A3A3] uppercase">{copy.noRecentActivity}</p>
            </div>
          )}
        </div>
      </div>

      <div
        className={`fixed inset-0 z-[500] bg-[#FAFAFA] flex flex-col overflow-hidden transform transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${activeModal ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ width: '100%', height: '100dvh' }}
      >
        <div className="pt-12 pb-4 px-6 flex items-center justify-between border-b border-[#E5E5E5] bg-[#FAFAFA] relative z-20 flex-shrink-0">
          <button
            onClick={closeModal}
            className={`flex items-center text-[#1A1A1A] gap-2 ${pressable}`}
          >
            <ChevronLeft size={20} strokeWidth={1} />
            <span className="text-[11px] font-bold tracking-[0.22em] uppercase">{copy.back}</span>
          </button>
          <h1 className="text-[10px] font-bold text-[#737373] uppercase tracking-[0.3em] absolute left-1/2 -translate-x-1/2">
            {activeModal === 'location' && copy.selectProject}
            {activeModal === 'service' && copy.catalog}
            {activeModal === 'select-service' && copy.featuredServices}
            {activeModal === 'notifications' && copy.newsUpdates}
          </h1>
          <div className="w-16" />
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[#FAFAFA]">

          {activeModal === 'location' && (
            <div className="p-6 pb-32">
              <h2 className="text-[24px] font-light tracking-tight text-[#1A1A1A] mb-8">{copy.selectProject}.</h2>
              <div className="space-y-5">
                {locationsData.map((loc, idx) => {
                  const mInfo = housesWithMaintenance[loc.id] || housesWithMaintenance[loc.original?.house_code]
                  const vInfo = housesWithNextVisit[loc.id] || housesWithNextVisit[loc.original?.house_code]
                  const isActive = currentLoc?.id === loc.id

                  return (
                    <div
                      key={loc.id}
                      onClick={() => { setCurrentLoc(loc); if (setActiveHouseId) setActiveHouseId(loc.id); setTimeout(closeModal, 300) }}
                      className={`group border bg-white p-4 flex gap-4 transition-all cursor-pointer ${pressable} ${isActive ? 'border-[#1A1A1A] shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]' : 'border-[#E5E5E5] hover:border-[#1A1A1A] hover:shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]'}`}
                    >
                      {loc.image && (
                        <div className="w-20 h-20 bg-[#E5E5E5] overflow-hidden flex-shrink-0 grayscale-[30%]">
                          <img src={loc.image} alt={loc.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex-1 py-1 flex flex-col min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 className={`font-medium text-[14px] tracking-widest uppercase ${isActive ? 'text-[#1A1A1A]' : 'text-[#737373] group-hover:text-[#1A1A1A]'}`}>
                            {loc.name}
                          </h4>
                          {loc.original?.role && (
                            <span className="text-[8px] font-bold px-1.5 py-0.5 border border-[#1A1A1A] tracking-widest uppercase text-[#737373]">
                              {loc.original.role}
                            </span>
                          )}
                          {!loc.original?.role && loc.original?.has_collaborators && (
                            <span className="text-[8px] font-bold px-1.5 py-0.5 border border-blue-500 tracking-widest uppercase text-blue-500">
                              SHARED
                            </span>
                          )}
                          {mInfo && <span className="text-[8px] font-bold px-1.5 py-0.5 border border-[#1A1A1A] tracking-widest uppercase">{copy.activeOperation}</span>}
                        </div>
                        <p className="text-[11px] text-[#737373] truncate">{loc.address}</p>
                        {vInfo && (
                          <p className="text-[10px] text-[#1A1A1A] mt-1 font-medium tracking-wide">
                            {copy.nextVisit}: {formatDateByLocale(vInfo.date, locale)}
                          </p>
                        )}
                        {isActive && (
                          <div className="mt-auto pt-2 flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-[#1A1A1A] uppercase">
                            <div className="w-1.5 h-1.5 bg-[#1A1A1A] rounded-full" /> {copy.activeOperation}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}

                <Link
                  href="/dashboard/customer/houses/add-quick"
                  className={`block w-full py-5 mt-4 text-[11px] font-bold tracking-[0.22em] uppercase text-[#1A1A1A] border border-[#1A1A1A] text-center hover:bg-[#1A1A1A] hover:text-white transition-colors ${pressable}`}
                >
                  + {copy.addHome}
                </Link>
              </div>
            </div>
          )}

          {activeModal === 'select-service' && (
            <div className="flex-1 flex flex-col h-full pt-2 pb-8 px-6">
              <div className="mb-6 pt-2 flex-shrink-0">
                <h2 className="text-[24px] font-light tracking-tight text-[#1A1A1A] mb-1">{copy.serviceCatalog}.</h2>
                <p className="text-[11px] tracking-[0.15em] text-[#737373] uppercase">{copy.chooseService}</p>
              </div>
              <div className="flex-1 overflow-y-auto space-y-4 pb-20">
                {mappedServicesList.map((srv) => (
                  <div
                    key={srv.id}
                    onClick={() => { setSelectedService(srv); setActiveModal('service') }}
                    className={`border border-[#E5E5E5] bg-white p-4 flex gap-4 cursor-pointer group hover:border-[#1A1A1A] transition-all ${pressable}`}
                  >
                    <div className="w-20 h-20 overflow-hidden flex-shrink-0 bg-[#F5F5F5]">
                      {srv.image
                        ? <img src={srv.image} alt={srv.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        : <srv.icon size={28} strokeWidth={1.5} className="m-auto mt-6 text-[#737373]" />
                      }
                    </div>
                    <div className="flex flex-col justify-center flex-1">
                      <h3 className="text-[13px] font-medium tracking-widest text-[#1A1A1A] uppercase mb-1">{srv.title}</h3>
                      <p className="text-[11px] text-[#737373] line-clamp-2 mb-2">{srv.desc}</p>
                      <span className="text-[11px] font-bold tracking-widest text-[#1A1A1A] uppercase">{srv.price}</span>
                    </div>
                    <div className="flex items-center">
                      <ChevronRight size={16} className="text-[#A3A3A3] group-hover:translate-x-1 transition-transform" strokeWidth={1} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeModal === 'service' && selectedService && (
            <div className="flex flex-col bg-[#FAFAFA] pb-12">
              <div className="relative w-full aspect-[4/3] bg-[#E5E5E5] overflow-hidden">
                {selectedService.image
                  ? <img src={selectedService.image} alt={selectedService.title} className="absolute inset-0 w-full h-full object-cover grayscale-[15%]" />
                  : (
                    <div className="absolute inset-0 bg-[#2E3526] flex items-center justify-center">
                      <selectedService.icon size={48} strokeWidth={1} className="text-white/40" />
                    </div>
                  )
                }
              </div>

              <div className="px-6 py-8">
                <div className="border-b border-[#E5E5E5] pb-6 mb-6">
                  <span className="text-[9px] font-bold tracking-[0.3em] text-[#737373] uppercase block mb-3">{copy.openDetails}</span>
                  <h2 className="text-[28px] font-light text-[#1A1A1A] leading-tight mb-2 tracking-tight">
                    {selectedService.title}
                  </h2>
                  <span className="text-[12px] font-bold tracking-widest text-[#1A1A1A] uppercase">{selectedService.price}</span>
                </div>

                <h3 className="text-[10px] font-bold tracking-[0.22em] text-[#1A1A1A] uppercase mb-4">{copy.serviceInfo}</h3>
                <p className="text-[#737373] text-[14px] leading-[1.8] font-light">
                   {selectedService.desc}<br /><br />
                  {copy.serviceBullet1 || '• ประเมินพื้นที่และให้คำปรึกษาฟรี'}<br />
                  {copy.serviceBullet2 || '• เลือกใช้วัสดุออร์แกนิก ปลอดภัยต่อผู้อยู่อาศัย'}<br />
                  {copy.serviceBullet3 || '• มีระบบติดตามผลหลังการให้บริการ'}
                </p>
              </div>
            </div>
          )}

          {activeModal === 'notifications' && (
            <div className="p-6 pb-32">
              <h2 className="text-[24px] font-light tracking-tight text-[#1A1A1A] mb-8">{copy.newsUpdates}.</h2>
              {notifications && notifications.length > 0 ? (
                <div className="border-t border-[#E5E5E5]">
                  {notifications.map((notif: any) => (
                    <div key={notif.id} className="px-0 py-5 border-b border-[#E5E5E5] flex gap-4 items-start">
                      <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 border border-[#E5E5E5] bg-white mt-0.5">
                        <Bell size={14} strokeWidth={1} />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-[13px] font-medium tracking-wide text-[#1A1A1A] uppercase mb-1">{notif.title || (copy.newUpdate || 'อัปเดตใหม่')}</h4>
                        <p className="text-[12px] text-[#737373] leading-relaxed">{notif.message || notif.content}</p>
                        <span className="text-[9px] tracking-[0.22em] text-[#A3A3A3] uppercase mt-2 block">
                          {formatDateByLocale(notif.created_at, locale)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 border border-[#E5E5E5]">
                  <Bell size={32} strokeWidth={1} className="mx-auto text-[#C5C4BE] mb-4" />
                  <p className="text-[10px] tracking-[0.22em] text-[#A3A3A3] uppercase">{copy.noNewNotifications || 'ไม่มีการแจ้งเตือนใหม่'}</p>
                </div>
              )}
            </div>
          )}

        </div>

        {activeModal === 'service' && selectedService && (
          <div className="flex-shrink-0 p-6 pb-10 bg-[#FAFAFA] border-t border-[#E5E5E5] shadow-[0_-10px_30px_-5px_rgba(0,0,0,0.05)]">
            <button
              onClick={() => { handleServiceSelectForBooking(selectedService.original); closeModal() }}
              className={`w-full bg-[#1A1A1A] text-white font-bold tracking-[0.22em] uppercase text-[12px] py-5 hover:bg-black transition-colors ${pressable}`}
            >
              {copy.bookAppointment}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default CustomerOverview
