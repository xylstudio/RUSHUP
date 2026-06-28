'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Truck, Navigation, Clock, CheckCircle2, 
  Search, Phone, RefreshCcw, Volume2, VolumeX, ExternalLink, MapPin, X,
  Package, ShoppingBag, ChevronDown
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import XYLLoader from '@/components/loaders/XYLLoader'

export default function DeliveryManager({ unlockAudio, isAudioEnabled, variant = 'page', onClose, syncPulse }: any) {
  const isDrawer = variant === 'drawer'
  const [isLoading, setIsLoading] = useState(false)
  const [orders, setOrders] = useState<any[]>([])
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)

  const parseLegacyCoords = (comment?: string | null) => {
    if (!comment?.startsWith('COORD:')) return null

    const coordText = comment.replace('COORD:', '').trim()
    const [latText, lngText] = coordText.split(',')
    const latitude = Number(latText)
    const longitude = Number(lngText)

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null
    }

    return { latitude, longitude }
  }

  const getNavigationTarget = (order: any) => {
    const structuredLatitude = Number(order.delivery_latitude)
    const structuredLongitude = Number(order.delivery_longitude)

    if (Number.isFinite(structuredLatitude) && Number.isFinite(structuredLongitude)) {
      return { latitude: structuredLatitude, longitude: structuredLongitude }
    }

    return parseLegacyCoords(order.comment)
  }

  const getDisplayComment = (comment?: string | null) => {
    if (!comment || comment.startsWith('COORD:')) return ''
    return comment
      .split('\n')
      .filter((line) => !/^\s*(เวลารับ|pickup\s*time)\s*:/i.test(line))
      .join('\n')
      .trim()
  }

  const getPickupTime = (comment?: string | null) => {
    if (!comment) return ''
    const pickupMatch = comment.match(/เวลารับ\s*:\s*([^\n]+)/i) || comment.match(/pickup\s*time\s*:\s*([^\n]+)/i)
    return pickupMatch?.[1]?.trim() || ''
  }

  const getStatusMeta = (status?: string) => {
    switch (status) {
      case 'shipping':
        return { label: 'กำลังส่ง', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
      case 'preparing':
        return { label: 'กำลังเตรียม', className: 'bg-amber-100 text-amber-700 border-amber-200' }
      case 'accepted':
        return { label: 'รับออเดอร์', className: 'bg-sky-100 text-sky-700 border-sky-200' }
      case 'paid':
        return { label: 'จ่ายแล้ว', className: 'bg-violet-100 text-violet-700 border-violet-200' }
      case 'pending':
      default:
        return { label: 'รอรับออเดอร์', className: 'bg-neutral-100 text-neutral-600 border-neutral-200' }
    }
  }
  
  // 🏢 Fetch Data (Force All Statuses except completed)
  const fetchData = async (showLoading = true) => {
    if (showLoading) setIsLoading(true)
    const { data, error } = await supabase
      .from('pos_orders')
      .select('*, items:pos_order_items(*, item:pos_menu_items!item_id(*))')
      .in('order_type', ['delivery', 'takeaway'])
      .neq('status', 'completed')
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
    
    if (!error && data) {
      setOrders(data)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    if (syncPulse && syncPulse > 0) {
      fetchData(false)
    }
  }, [syncPulse])

  useEffect(() => {
    fetchData()
    const channel = supabase
      .channel('delivery-list-v1')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pos_orders' }, () => fetchData(false))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  useEffect(() => {
    if (!orders.length) {
      setExpandedOrderId(null)
      return
    }

    if (expandedOrderId && !orders.some(order => order.id === expandedOrderId)) {
      setExpandedOrderId(null)
    }
  }, [expandedOrderId, orders])

  const [finishModalOrder, setFinishModalOrder] = useState<any>(null)
  const [isFinishing, setIsFinishing] = useState(false)

  const handleStatus = async (id: string, status: string) => {
    setIsLoading(true)
    await supabase.from('pos_orders').update({ status }).eq('id', id)
    const targetOrder = orders.find((order) => order.id === id)
    if (targetOrder?.line_user_id && targetOrder.order_source === 'liff') {
      fetch('/api/line/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: targetOrder.line_user_id,
          type: 'flex',
          orderData: {
            status,
            orderNumber: targetOrder.order_number,
            orderId: targetOrder.id,
            totalAmount: Number(targetOrder.net_total || targetOrder.total_amount || 0),
            deliveryFee: Number(targetOrder.delivery_fee || 0),
            items: (targetOrder.items || []).map((item: any) => ({
              name: item.item?.name || item.name || 'Item',
              quantity: Number(item.quantity || 0),
              sale_price: Number(item.unit_price || 0),
            })),
          },
        }),
      }).catch((error) => console.error('Delivery LINE notify failed:', error))
    }
    fetchData()
  }

  const handleCompleteDelivery = async (method: 'cash' | 'transfer') => {
    if (!finishModalOrder || isFinishing) return
    setIsFinishing(true)
    
    try {
      const { data: existingPayments } = await supabase.from('pos_order_payments').select('id').eq('order_id', finishModalOrder.id)
      
      if (!existingPayments || existingPayments.length === 0) {
        await supabase.from('pos_order_payments').insert({
          order_id: finishModalOrder.id,
          payment_method: method,
          amount: Number(finishModalOrder.net_total || finishModalOrder.total_amount || 0),
          status: 'paid'
        })
        await supabase.from('pos_orders').update({ payment_method: method, paid_at: new Date().toISOString() }).eq('id', finishModalOrder.id)
      }

      // 🎁 Award Loyalty Points
      try {
        const { data: shopSettingsData } = await supabase.from('pos_shop_settings').select('loyalty_earn_rate').limit(1).maybeSingle()
        const earnRate = shopSettingsData?.loyalty_earn_rate || 100
        const totalAmount = finishModalOrder.net_total || finishModalOrder.total_amount || 0
        const pointsToEarn = Math.floor(totalAmount / earnRate)

        if (pointsToEarn > 0) {
          let memberId = finishModalOrder.customer_id
          
          if (!memberId && finishModalOrder.line_user_id) {
            const { data: memberData } = await supabase.from('pos_members').select('id').eq('line_user_id', finishModalOrder.line_user_id).maybeSingle()
            if (memberData?.id) memberId = memberData.id
          }
          
          if (!memberId && finishModalOrder.reference_name) {
            const { data: memberData } = await supabase.from('pos_members').select('id').eq('phone', finishModalOrder.reference_name).maybeSingle()
            if (memberData?.id) memberId = memberData.id
          }

          if (memberId) {
            await supabase.rpc('increment_member_points', {
              user_id: memberId,
              points_to_add: pointsToEarn,
            })
            await supabase.from('pos_points_history').insert({
              member_id: memberId,
              order_id: finishModalOrder.id,
              points: pointsToEarn,
              type: 'earn',
              description: `Earned from Delivery #${finishModalOrder.order_number}`,
            }).catch(() => {})
          }
        }
      } catch (err) {
        console.error('Failed to award points for delivery', err)
      }

      await handleStatus(finishModalOrder.id, 'completed')
    } catch (e) {
      console.error(e)
    } finally {
      setFinishModalOrder(null)
      setIsFinishing(false)
    }
  }

  // 🌍 Navigate Helper
  const openGoogleMaps = (order: any) => {
    const navigationTarget = getNavigationTarget(order)
    const url = navigationTarget
      ? `https://www.google.com/maps/dir/?api=1&destination=${navigationTarget.latitude},${navigationTarget.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.delivery_address || '')}`

    window.open(url, '_blank');
  }

  return (
    <div className={`flex flex-col overflow-hidden font-sans ${isDrawer ? 'h-full bg-white' : 'h-[calc(100vh-120px)] bg-[#F8F9FA]'}`}>
      
      {/* 🔝 PREMIUM HEADER */}
      <div className={`flex-none border-b border-gray-100 z-10 ${isDrawer ? 'px-8 pt-16 pb-8 bg-[#FDFDFB]' : 'p-6 bg-white'}`}>
        <div className="flex justify-between items-start">
          <div>
            <h1 className={`font-black text-[#1A1A18] flex items-center gap-4 ${isDrawer ? 'text-3xl' : 'text-2xl'}`}>
               <div className="w-14 h-14 bg-orange-50 text-orange-500 flex items-center justify-center rounded-2xl border border-orange-100 shadow-sm">
                 <Truck size={isDrawer ? 28 : 28} />
               </div>
               {isDrawer ? 'DELIVERY / TAKEAWAY' : 'DELIVERY MONITORING'}
            </h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] mt-4">
              {isDrawer ? 'จัดการออเดอร์เดลิเวอรี่และ Takeaway' : 'REAL-TIME ORDER STATUS'}
            </p>
          </div>
          <div className="flex gap-3">
              <button onClick={unlockAudio} className={`flex items-center justify-center w-14 h-14 rounded-2xl transition-all shadow-sm ${isAudioEnabled ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100 animate-pulse'}`}>
                  {isAudioEnabled ? <Volume2 size={22} /> : <VolumeX size={22} />}
              </button>
              <button onClick={fetchData} className={`flex items-center justify-center w-14 h-14 bg-white text-[#1A1A18] border border-gray-200 rounded-2xl hover:bg-gray-50 active:scale-95 transition-all shadow-sm`}>
                  <RefreshCcw size={22} className={isLoading ? 'animate-spin' : ''} />
              </button>
              {isDrawer && (
                <button
                  onClick={onClose}
                  className="flex items-center justify-center w-14 h-14 bg-[#1A1A18] text-white rounded-2xl hover:bg-black active:scale-95 transition-all shadow-xl shadow-black/20 ml-2"
                >
                  <X size={24} />
                </button>
              )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        
        {/* 📋 LIST VIEW (NO MAP) */}
        <div className={`flex-1 overflow-y-auto custom-scrollbar ${isDrawer ? 'p-6 pb-24 bg-[#FDFDFB] flex flex-col gap-6' : 'p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-[#F0F2F5]'}`}>
           {orders.length === 0 ? (
             <div className="col-span-full h-full flex flex-col items-center justify-center text-gray-300">
                <Package size={64} className="mb-4 opacity-20" />
                <p className="text-xs font-black uppercase tracking-[0.3em] text-gray-400">NO ACTIVE ORDERS</p>
             </div>
           ) : orders.map(order => {
            const statusMeta = getStatusMeta(order.status)
            const itemCount = (order.items || []).reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0)
            const isExpanded = expandedOrderId === order.id
            const note = getDisplayComment(order.comment)
            const pickupTime = getPickupTime(order.comment)
            const isTakeaway = order.order_type === 'takeaway'
            const orderTypeLabel = isTakeaway ? 'TAKEAWAY' : 'DELIVERY'

             if (isDrawer) {
               const canAcceptOrder = order.status === 'paid' || order.status === 'pending' || order.status === 'accepted'
               
               // Map order status to display info
               let displayStatus = 'PENDING'
               let statusClass = 'bg-gray-100 text-gray-500'
               if (order.status === 'preparing') { displayStatus = 'PREPARING'; statusClass = 'bg-amber-100 text-amber-700' }
               else if (order.status === 'shipping') { displayStatus = 'SHIPPING'; statusClass = 'bg-blue-100 text-blue-700' }
               else if (order.status === 'completed') { displayStatus = 'COMPLETED'; statusClass = 'bg-emerald-100 text-emerald-700' }

               return (
                  <div
                    key={order.id}
                    className="shrink-0 overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 flex flex-col"
                  >
                   {/* Header (Clickable) */}
                   <div
                     className="w-full p-6 sm:p-8 text-left transition-colors cursor-pointer"
                     onClick={() => setExpandedOrderId(current => current === order.id ? null : order.id)}
                   >
                     <div className="flex items-center justify-between gap-4">
                       <div className="min-w-0 flex-1">
                         <div className="flex items-center gap-3 mb-2">
                           <span className="text-[10px] font-black tracking-widest text-[#1A1A18] uppercase">
                             {order.order_number}
                           </span>
                           <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${isTakeaway ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                             {orderTypeLabel}
                           </span>
                           <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${statusClass}`}>
                             {displayStatus}
                           </span>
                         </div>
                         <h3 className="truncate text-2xl font-black text-[#1A1A18] uppercase tracking-tight leading-none">
                           {order.customer_name || 'GUEST'}
                         </h3>
                         {order.reference_name && (
                           <div className="flex items-center gap-1.5 mt-2 text-gray-500">
                             <Phone size={14} />
                             <span className="text-[12px] font-black">{order.reference_name}</span>
                           </div>
                         )}
                         <div className="mt-3 flex items-center gap-2">
                            <span className="text-xl font-black text-[#1A1A18]">฿{Number(order.net_total || order.total_amount || 0).toLocaleString()}</span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-1 rounded-lg">
                               {itemCount} ITEM{itemCount > 1 ? 'S' : ''}
                            </span>
                         </div>
                       </div>
                       <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-gray-50 text-gray-400 transition-transform">
                          <ChevronDown size={20} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                       </div>
                     </div>
                   </div>

                    {isExpanded && (
                      <div className="border-t border-gray-50">
                         <div className="p-6 sm:p-8 space-y-6 bg-gray-50/30">
                            
                            {/* Items Receipt Style */}
                            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                               <div className="mb-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                                 <ShoppingBag size={14} /> ORDER ITEMS
                               </div>
                               <div className="space-y-4">
                                 {(order.items || []).map((item: any, idx: number) => (
                                   <div key={idx} className="flex gap-4">
                                     <span className="text-sm font-black text-[#1A1A18]">
                                       {item.quantity}x
                                     </span>
                                     <div className="min-w-0 flex-1">
                                       <p className="text-sm font-bold leading-tight text-[#1A1A18] uppercase">
                                         {item.item?.name || item.name || 'Unknown Item'}
                                       </p>
                                       {item.selected_modifiers?.length > 0 && (
                                         <div className="mt-1.5 flex flex-wrap gap-1.5">
                                           {item.selected_modifiers.map((modifier: any, modifierIdx: number) => {
                                             const modifierLabel = modifier?.is_note
                                               ? `หมายเหตุ: ${modifier?.value || modifier?.name || ''}`
                                               : modifier?.value && modifier.value !== modifier.name
                                                 ? `${modifier.name}: ${modifier.value}`
                                                 : modifier?.name || ''

                                             if (!modifierLabel) return null

                                             return (
                                               <span
                                                 key={modifierIdx}
                                                 className="rounded-md bg-gray-50 border border-gray-100 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-gray-500"
                                               >
                                                 {modifierLabel}
                                               </span>
                                             )
                                           })}
                                         </div>
                                       )}
                                     </div>
                                   </div>
                                 ))}
                               </div>
                            </div>

                            {/* Delivery Address */}
                            {isTakeaway ? (
                              <div className="bg-amber-50/70 rounded-2xl p-5 border border-amber-100 shadow-sm">
                                 <div className="flex items-start gap-3 text-amber-700">
                                   <Clock size={18} className="mt-0.5 shrink-0" />
                                   <div className="flex-1">
                                     <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1">PICKUP TIME</p>
                                     <p className="text-sm font-bold leading-snug text-amber-950">
                                       {pickupTime || '-'}
                                     </p>
                                     {note && (
                                       <div className="mt-3 bg-white/70 p-3 rounded-xl border border-amber-100/50">
                                          <p className="text-[9px] font-black uppercase tracking-widest text-amber-600 mb-1">CUSTOMER NOTE</p>
                                          <p className="text-xs font-bold leading-snug text-amber-900">{note}</p>
                                       </div>
                                     )}
                                   </div>
                                 </div>
                              </div>
                            ) : (
                              <div className="bg-orange-50/50 rounded-2xl p-5 border border-orange-100 shadow-sm">
                                 <div className="flex items-start gap-3 text-orange-600">
                                   <MapPin size={18} className="mt-0.5 shrink-0" />
                                   <div className="flex-1">
                                     <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1">DELIVERY ADDRESS</p>
                                     <p className="text-sm font-bold leading-snug text-orange-950">
                                       {order.delivery_address || '-'}
                                     </p>
                                     {note && (
                                       <div className="mt-3 bg-white/60 p-3 rounded-xl border border-orange-100/50">
                                          <p className="text-[9px] font-black uppercase tracking-widest text-orange-500 mb-1">CUSTOMER NOTE</p>
                                          <p className="text-xs font-bold leading-snug text-orange-900">{note}</p>
                                       </div>
                                     )}
                                   </div>
                                 </div>
                              </div>
                            )}

                         </div>
                      </div>
                    )}

                    {/* Action Buttons Always Visible (At the bottom) */}
                    <div className="px-6 pb-6 pt-2 sm:px-8 sm:pb-8 sm:pt-4">
                       {(order.status === 'paid' || order.status === 'pending' || order.status === 'accepted') ? (
                         <button
                           onClick={() => handleStatus(order.id, 'preparing')}
                           className="w-full h-14 rounded-2xl bg-[#1A1A18] text-[11px] font-black uppercase tracking-[0.2em] text-white transition-all active:scale-[0.98] shadow-lg shadow-black/10 flex items-center justify-center gap-2"
                         >
                           <CheckCircle2 size={18} /> ACCEPT & PREPARE
                         </button>
                       ) : order.status === 'preparing' ? (
                         <button
                           onClick={() => handleStatus(order.id, 'shipping')}
                           className="w-full h-14 rounded-2xl bg-[#1A1A18] text-[11px] font-black uppercase tracking-[0.2em] text-white transition-all active:scale-[0.98] shadow-lg shadow-black/10 flex items-center justify-center gap-2"
                         >
                           <Truck size={18} /> DISPATCH ORDER
                         </button>
                       ) : (
                         <div className="grid grid-cols-2 gap-3">
                           <button
                             onClick={() => openGoogleMaps(order)}
                             className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-[0.98] hover:bg-blue-100"
                           >
                             <Navigation size={16} /> MAPS
                           </button>
                           <button
                             onClick={() => setFinishModalOrder(order)}
                             className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-[0.98] shadow-lg shadow-emerald-600/20 hover:bg-emerald-700"
                           >
                             <CheckCircle2 size={16} /> FINISH
                           </button>
                         </div>
                       )}
                    </div>
               </div>
               )
             }

             return (
             <div 
               key={order.id}
               className={`bg-white border-2 border-transparent hover:border-emerald-500 shadow-sm transition-all flex flex-col ${isDrawer ? 'rounded-[24px] p-5' : 'rounded-[32px] p-8'}`}
             >
                <div className="flex justify-between items-start mb-6">
                   <div className={`bg-[#1A1A18] text-white font-black rounded-2xl uppercase ${isDrawer ? 'px-3 py-1.5 text-[10px]' : 'px-4 py-2 text-[12px]'}`}>{order.order_number}</div>
                   <div className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase ${
                     order.status === 'shipping' ? 'bg-emerald-100 text-emerald-700' : 
                     order.status === 'preparing' ? 'bg-amber-100 text-amber-700' : 'bg-neutral-100 text-neutral-500'
                   }`}>
                      {order.status}
                   </div>
                </div>

                <div className="flex-1 mb-6">
                   <h2 className={`${isDrawer ? 'text-lg' : 'text-2xl'} font-black text-[#1A1A18] mb-1 uppercase`}>{order.customer_name || 'Customer'}</h2>
                   {order.reference_name && (
                     <div className="flex items-center gap-1.5 text-emerald-600 mb-3">
                       <Phone size={14} />
                       <span className="text-[14px] font-black">{order.reference_name}</span>
                     </div>
                   )}
                   <div className="flex items-start gap-2 text-neutral-400 mb-4">
                      <MapPin size={16} className="mt-1 flex-none" />
                      <div>
                        <p className="text-[14px] font-bold leading-tight text-neutral-500">{order.delivery_address}</p>
                        {getDisplayComment(order.comment) && (
                          <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                            NOTE: {getDisplayComment(order.comment)}
                          </p>
                        )}
                        {getNavigationTarget(order) && (
                          <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-emerald-600">
                            GPS READY
                          </p>
                        )}
                      </div>
                   </div>

                   {/* 📝 ORDER ITEMS & MODIFIERS (SYNCED) */}
                   <div className={`bg-neutral-50 rounded-2xl space-y-3 border border-neutral-100 ${isDrawer ? 'p-3' : 'p-4'}`}>
                      {order.items?.map((item: any, idx: number) => (
                        <div key={idx} className="flex gap-3">
                           <span className="text-xs font-black text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-lg h-fit">{item.quantity}x</span>
                           <div className="flex-1">
                              <p className="text-[12px] font-black text-[#1A1A18] uppercase tracking-tight leading-none mb-1">
                                {item.item?.name || item.name || 'Unknown Item'}
                              </p>
                              {item.selected_modifiers?.map((m: any, mIdx: number) => (
                                <span key={mIdx} className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest block">
                                   • {m.name}
                                </span>
                              ))}
                           </div>
                        </div>
                      ))}
                   </div>
                </div>

                {/* 🕹️ ACTIONS */}
                <div className="space-y-3">
                   {order.status === 'paid' || order.status === 'pending' || order.status === 'accepted' ? (
                     <button 
                       onClick={() => handleStatus(order.id, 'preparing')}
                       className={`w-full bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-emerald-600/20 ${isDrawer ? 'h-14 text-[11px]' : 'h-16'}`}
                     >
                        ACCEPT & PREPARE
                     </button>
                   ) : order.status === 'preparing' ? (
                     <button 
                       onClick={() => handleStatus(order.id, 'shipping')}
                       className={`w-full bg-[#1A1A18] text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all ${isDrawer ? 'h-14 text-[11px]' : 'h-16'}`}
                     >
                        START SHIPPING
                     </button>
                   ) : (
                     <div className="grid grid-cols-2 gap-3">
                        <button 
                          onClick={() => openGoogleMaps(order)}
                          className={`bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest flex flex-col items-center justify-center gap-1 active:scale-95 transition-all ${isDrawer ? 'h-14' : 'h-16'}`}
                        >
                           <ExternalLink size={18} />
                           <span className="text-[9px]">G-MAPS</span>
                        </button>
                        <button 
                          onClick={() => setFinishModalOrder(order)}
                          className={`bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest flex flex-col items-center justify-center gap-1 active:scale-95 transition-all ${isDrawer ? 'h-14' : 'h-16'}`}
                        >
                           <CheckCircle2 size={18} />
                           <span className="text-[9px]">FINISH</span>
                        </button>
                     </div>
                   )}
                </div>
             </div>
             )
           })}
        </div>
      </div>

      <AnimatePresence>
        {finishModalOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center"
            >
              <ShoppingBag size={48} className="text-emerald-500 mb-6" />
              <h3 className="text-2xl font-black text-center mb-2 uppercase text-[#1A1A18]">
                รับชำระเงิน
              </h3>
              <p className="text-xs font-bold text-neutral-400 text-center mb-8 uppercase tracking-widest">
                เลือกรุปแบบการชำระเงินสำหรับออเดอร์นี้
              </p>
              
              <div className="w-full space-y-3">
                <button
                  onClick={() => handleCompleteDelivery('cash')}
                  disabled={isFinishing}
                  className="w-full py-5 bg-emerald-50 text-emerald-700 border-2 border-emerald-200 rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-100 transition-colors disabled:opacity-50"
                >
                  💵 เงินสด (CASH)
                </button>
                <button
                  onClick={() => handleCompleteDelivery('transfer')}
                  disabled={isFinishing}
                  className="w-full py-5 bg-blue-50 text-blue-700 border-2 border-blue-200 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-100 transition-colors disabled:opacity-50"
                >
                  📱 โอนเงิน (TRANSFER)
                </button>
              </div>

              <button
                onClick={() => setFinishModalOrder(null)}
                disabled={isFinishing}
                className="mt-6 text-[10px] font-black text-neutral-400 uppercase tracking-widest hover:text-neutral-600 transition-colors"
              >
                ยกเลิก (CANCEL)
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}
