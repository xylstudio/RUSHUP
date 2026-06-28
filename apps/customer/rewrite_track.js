const fs = require('fs');

const fullFile = `'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ChevronLeft, 
  CheckCircle2, 
  Star, 
  MapPin, 
  ShoppingBag,
  History,
  Navigation,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';
import { useLiff } from '@/components/liff/LiffProvider';
import XYLLoader from '@/components/loaders/XYLLoader';
import { useI18n } from "@/lib/I18nContext";

// --- ☕ ICON 1: Preparing (Barista Shaking) ---
const PrepIcon = ({ isActive }: { isActive: boolean }) => (
  <g className={isActive ? "active-focus" : "inactive-node"}>
    {isActive && <circle r="35" fill="#10B981" opacity="0.15" />}
    <g className={isActive ? "wiggle-anim" : ""}>
      <ellipse cx="0" cy="8" rx="18" ry="14" fill={isActive ? "#10B981" : "#94A3B8"} />
      <circle cx="0" cy="5" r="7.5" fill={isActive ? "#064E3B" : "#475569"} />
      <g className={isActive ? "shaker-move" : ""}>
        <path d="M-10 6 Q -8 -6, -4 -10" stroke={isActive ? "#10B981" : "#94A3B8"} strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M10 6 Q 8 -6, 4 -10" stroke={isActive ? "#10B981" : "#94A3B8"} strokeWidth="6" fill="none" strokeLinecap="round" />
        <rect x="-5" y="-22" width="10" height="18" rx="2" fill="#334155" />
        <rect x="-6" y="-16" width="12" height="3" fill="#475569" />
      </g>
    </g>
  </g>
);

// --- 🛵 ICON 2: Delivery (Rider Top-down View) ---
const DeliveryIcon = ({ isActive }: { isActive: boolean }) => {
  const primary = isActive ? "#10B981" : "#94A3B8";
  const dark = isActive ? "#064E3B" : "#475569";
  return (
    <g className={isActive ? "active-focus" : "inactive-node"}>
      {isActive && <circle r="40" fill="#10B981" opacity="0.1" />}
      {isActive && (
        <g>
          <line x1="-45" y1="-15" x2="-25" y2="-15" stroke="#E2E8F0" strokeWidth="2" strokeLinecap="round" className="speed-anim-1" />
          <line x1="-50" y1="0" x2="-30" y2="0" stroke="#E2E8F0" strokeWidth="2" strokeLinecap="round" className="speed-anim-2" />
          <line x1="-45" y1="15" x2="-25" y2="15" stroke="#E2E8F0" strokeWidth="2" strokeLinecap="round" className="speed-anim-3" />
        </g>
      )}
      <g className={isActive ? "wiggle-anim" : ""}>
        <rect x="-25" y="-3" width="50" height="6" rx="3" fill="#CBD5E1" opacity="0.6" />
        <rect x="18" y="-15" width="4" height="30" rx="2" fill="#1E293B" />
        <circle cx="20" cy="-15" r="2.5" fill="#000" />
        <circle cx="20" cy="15" r="2.5" fill="#000" />
        <ellipse cx="-4" cy="0" rx="18" ry="14" fill={primary} />
        <circle cx="8" cy="0" r="8" fill={dark} />
        <rect x="6" y="-4" width="6" height="2" rx="1" fill="#FFF" opacity="0.2" />
        <path d="M-4 -10 Q 15 -12, 18 -12" stroke={primary} strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M-4 10 Q 15 12, 18 12" stroke={primary} strokeWidth="6" fill="none" strokeLinecap="round" />
        <rect x="-22" y="-9" width="12" height="18" rx="2" fill={isActive ? "#059669" : "#475569"} />
      </g>
    </g>
  );
};

// --- ✅ ICON 3: Completed ---
const CompletedIcon = ({ isActive }: { isActive: boolean }) => (
  <g className={isActive ? "active-focus" : "inactive-node"}>
    {isActive && <circle r="35" fill="#10B981" opacity="0.15" />}
    <g className={isActive ? "wiggle-anim" : ""}>
      <circle r="22" fill={isActive ? "#10B981" : "#94A3B8"} />
      <path d="M-10 0 L-2 8 L10 -8" stroke="white" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  </g>
);

export default function LiffTrackPage() {
    const { locale } = useI18n();
  const { id } = useParams();
  const router = useRouter();
  const supabase = createClient();
  const { lineProfile, loading: liffLoading } = useLiff();
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoverRating, setHoverRating] = useState(0);
  const formatModifierLabel = (modifier: any) => {
    if (!modifier) return '';
    const name = modifier.display_name || modifier.label || modifier.group_name || modifier.name || '';
    const value = modifier.value || modifier.selected_value || modifier.option_value || modifier.option_name || '';
    if ((modifier.is_note || name === 'หมายเหตุ') && value) return \`หมายเหตุ: \${value}\`;
    if (value && value !== name) return \`\${name}: \${value}\`;
    return name;
  };
  const [comment, setComment] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [queueAhead, setQueueAhead] = useState(0);
  const [isOnline, setIsOnline] = useState(true); // 📡 Connectivity Pulse

  const fetchQueuePosition = async (orderRow: any) => {
    try {
      const storedQueue = Number(orderRow?.queue_number);
      if (Number.isFinite(storedQueue) && storedQueue > 0) {
        setQueueAhead(Math.max(0, storedQueue - 1));
        return;
      }

      let queueQuery = supabase
        .from('pos_orders')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'paid', 'accepted', 'preparing'])
        .lt('created_at', orderRow.created_at);
      if (orderRow.shift_id) queueQuery = queueQuery.eq('shift_id', orderRow.shift_id);
      const { count } = await queueQuery;
      setQueueAhead(count || 0);
    } catch (err) {
      console.error('Failed to fetch queue position:', err);
    }
  };

  const fetchOrder = async () => {
    try {
      const { data, error } = await supabase
        .from('pos_orders')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (data) {
        setOrder(data);
        fetchQueuePosition(data);
        const { data: itemsData } = await supabase
          .from('pos_order_items')
          .select(\`*, pos_menu_items!pos_order_items_item_id_fkey(*)\`)
          .eq('order_id', id);
        if (itemsData) setItems(itemsData);
      }
    } catch (err) {
      console.error('Failed to fetch order:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();

    // 🔄 REAL-TIME SUBSCRIPTIONS
    // 1. Current Order Tracking
    const channelOrder = supabase
      .channel(\`order-track-\${id}\`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'pos_orders',
        filter: \`id=eq.\${id}\`
      }, (payload) => {
        setOrder(payload.new);
      })
      .subscribe();

    // 2. Queue Update Tracking (Global changes for active workflow)
    const channelQueue = supabase
      .channel(\`queue-global\`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'pos_orders'
      }, () => {
        if (order?.created_at) {
          fetchQueuePosition(order.created_at);
        }
      })
      .subscribe((status) => {
         setIsOnline(status === 'SUBSCRIBED');
      });

    // 📱 MOBILE RECOVERY: Sync on focus (handles sleep/idle)
    const handleFocus = () => {
       console.log('📡 Mobile Tracker Wake: Re-fetching latest status');
       fetchOrder();
    };

    window.addEventListener('focus', handleFocus);

    return () => { 
      supabase.removeChannel(channelOrder); 
      supabase.removeChannel(channelQueue);
      window.removeEventListener('focus', handleFocus);
    };
  }, [id, supabase, order?.created_at]);

  const handleRate = async (value: number) => {
    // Optimistic UI update
    setOrder((prev: any) => ({ ...prev, rating: value }));
    setHoverRating(0); // Clear hover state so the new rating sticks visually
    
    setIsSaving(true);
    try {
      await fetch('/api/orders/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, rating: value, comment })
      });
    } catch (err) {
      console.error('Failed to save rating:', err);
    } finally { setIsSaving(false); }
  };

  if (loading || liffLoading || !order) return (
    <XYLLoader tagline={locale === 'en' ? 'Following deliciousness signals...' : locale === 'zh' ? '遵循美味信号...' : 'กำลังติดตามสัญญาณความอร่อย...'} />
  );

  const status = order.status?.toLowerCase() || 'pending';
  const isPreparing = ['accepted', 'preparing', 'paid'].includes(status);
  const isShipping = ['shipping', 'out_for_delivery'].includes(status);
  const isCompleted = ['completed', 'delivered'].includes(status);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* 📡 CONNECTION PULSE INDICATOR (Customer Confidence) */}
      <div className="hidden">
          <div className={\`w-1 h-1 rounded-full \${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}\`} />
          <span className={\`text-[6px] font-black uppercase tracking-[0.3em] \${isOnline ? 'text-emerald-600' : 'text-red-500'}\`}>
              {isOnline ? '📡 SIGNAL LIVE' : '⚠️ OFFLINE'}
          </span>
      </div>

      {/* 📡 Boutique Header */}
      <header className="p-6 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-xl z-50 border-b border-gray-50">
        <button onClick={() => router.push('/liff/menu')} className="w-10 h-10 rounded-none bg-gray-50 flex items-center justify-center text-gray-400 active:scale-95 transition-all">
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <h1 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#1A1A18]">{locale === 'en' ? 'Track orders' : locale === 'zh' ? '追踪订单' : 'ติดตามออเดอร์'}</h1>
          <p className="text-[7px] font-bold text-emerald-500 uppercase mt-0.5 tracking-widest">{locale === 'en' ? 'Order number:' : locale === 'zh' ? '订单号：' : 'เลขที่ออเดอร์: '}{order.order_number?.startsWith('#') ? order.order_number : \`#\${order.order_number || String(id).slice(0,8).toUpperCase()}\`}</p>
        </div>
        <button onClick={() => router.push('/liff/history')} className="w-10 h-10 rounded-none bg-gray-50 flex items-center justify-center text-gray-400 active:scale-95 transition-all">
          <History size={18} />
        </button>
      </header>

      <main className="max-w-md mx-auto px-6 py-12">
        {/* 📟 HORIZONTAL LINEAR STEPPER */}
        <div className="bg-white border border-gray-100 p-8 mb-8 relative overflow-hidden">
           {/* 📢 New Acceptance Animation for Staff Acceptance */}
           {status === 'accepted' && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                className="absolute top-0 left-0 right-0 py-1.5 bg-emerald-500 text-white text-[7px] font-black uppercase tracking-[0.3em] text-center z-50"
              >
                {locale === 'en' ? 'The barista took the order. Starting to prepare drinks' : locale === 'zh' ? '咖啡师接了订单。开始准备饮料' : 'บาริสต้ารับออเดอร์แล้ว กำลังเริ่มเตรียมเครื่องดื่ม'}</motion.div>
           )}

           <div className="relative flex justify-between items-center mb-12 px-2 pt-4">
             {/* Background Progress Lines - Consistent Thickness */}
             <div className="absolute top-[32px] left-[15%] right-[15%] h-[3px] bg-gray-50 z-0" />
             <div className="absolute top-[32px] left-[15%] h-[3px] bg-emerald-500 z-0 transition-all duration-1000" style={{ 
               width: isCompleted ? '70%' : isShipping ? '35%' : (isPreparing || status === 'accepted') ? '5%' : '0%' 
             }} />

             {/* STEP 1: PREPARING */}
             <div className="relative z-10 flex flex-col items-center gap-3">
               <div className="w-14 h-14 bg-white">
                  <svg viewBox="-50 -50 100 100" className={\`w-full h-full \${status === 'accepted' ? 'animate-pulse scale-110' : ''}\`}>
                    <PrepIcon isActive={isPreparing || isShipping || isCompleted || status === 'accepted'} />
                  </svg>
               </div>
               <span className={\`text-[7px] font-black uppercase tracking-widest \${isPreparing || isShipping || isCompleted || status === 'accepted' ? 'text-emerald-500' : 'text-gray-300'}\`}>{locale === 'en' ? 'Preparing the menu' : locale === 'zh' ? '准备菜单' : 'กำลังเตรียมเมนู'}</span>
             </div>

             {/* STEP 2: SHIPPING */}
             <div className="relative z-10 flex flex-col items-center gap-3">
               <div className="w-14 h-14 bg-white">
                  <svg viewBox="-50 -50 100 100" className="w-full h-full">
                    <DeliveryIcon isActive={isShipping || isCompleted} />
                  </svg>
               </div>
               <span className={\`text-[7px] font-black uppercase tracking-widest \${isShipping || isCompleted ? 'text-emerald-500' : 'text-gray-300'}\`}>{locale === 'en' ? 'During delivery' : locale === 'zh' ? '交货期间' : 'ระหว่างนำส่ง'}</span>
             </div>

             {/* STEP 3: COMPLETED */}
             <div className="relative z-10 flex flex-col items-center gap-3">
               <div className="w-14 h-14 bg-white">
                  <svg viewBox="-50 -50 100 100" className="w-full h-full">
                    <CompletedIcon isActive={isCompleted} />
                  </svg>
               </div>
               <span className={\`text-[7px] font-black uppercase tracking-widest \${isCompleted ? 'text-emerald-500' : 'text-gray-300'}\`}>{locale === 'en' ? 'Successful delivery' : locale === 'zh' ? '发货成功' : 'จัดส่งสำเร็จ'}</span>
             </div>
           </div>

           {/* 🏷️ STATUS CARD */}
           <div className="text-center space-y-4 pt-6 border-t border-gray-50">
              <AnimatePresence mode="wait">
                <motion.div 
                  key={status}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="space-y-2"
                >
                   <h2 className="text-sm font-black uppercase text-[#1A1A18] tracking-[0.2em] mb-2 leading-none">
                     {status === 'payment_pending' ? 'รอการชำระเงิน' :
                      status === 'pending' ? (
                        queueAhead > 0 
                          ? \`คุณคือคิวที่ \${queueAhead + 1} (รอพนักงานรับออเดอร์)\` 
                          : 'กำลังแจ้งพนักงานให้นำส่งออเดอร์'
                      ) :
                      (isPreparing || status === 'accepted') ? (
                        queueAhead > 0
                          ? \`คิวที่ \${queueAhead + 1} • บาริสต้ากำลังเตรียมเครื่องดื่ม\`
                          : 'บาริสต้ากำลังเตรียมเมนูของคุณ'
                      ) :
                      isShipping ? 'ไรเดอร์กำลังนำส่งออเดอร์' :
                      isCompleted ? 'ออเดอร์ส่งถึงที่หมายแล้ว' :
                      status === 'cancelled' ? 'ออเดอร์ถูกยกเลิกแล้ว' :
                      'กำลังดำเนินการ...'}
                   </h2>
                   <p className="text-[9px] font-black uppercase text-emerald-500 tracking-[0.2em]">
                     {status === 'payment_pending' && 'สัญญาณเชื่อมต่อสำเร็จ รอคุณชำระเงินในขั้นตอนสุดท้าย'}
                     {status === 'pending' && (
                       <span className="flex items-center justify-center gap-2">
                         <span className="w-1.5 h-1.5 bg-emerald-500 rounded-none animate-pulse" />
                         {queueAhead > 0 
                           ? \`มีออเดอร์ก่อนหน้าคุณอีก \${queueAhead} คิว พนักงานกำลังเร่งเข้าตรวจสอบออเดอร์ของคุณ\`
                           : 'พนักงานกำลังเข้าตรวจสอบสัญญาณออเดอร์ของคุณ สักครู่เดียว...'}
                       </span>
                     )}
                     {(isPreparing || status === 'accepted') && (
                        queueAhead > 0 
                          ? \`มีอีก \${queueAhead} รายการก่อนหน้าคุณ เครื่องชงซิกเนเจอร์พร้อมดำเนินการทันทีที่คุณถึงคิว\`
                          : 'เครื่องชงกาแฟซิกเนเจอร์เริ่มทำงานพร้อมปรุงเมนูพิเศษสำหรับคุณ'
                     )}
                     {isShipping && 'ไรเดอร์กำลังนำออเดอร์มุ่งหน้าไปหาคุณโดยเร็วที่สุด'}
                     {isCompleted && 'ขอให้มีความสุขกับเมนูพิเศษของเรา ขอบคุณที่ใช้บริการ XYL STUDIO'}
                     {status === 'cancelled' && 'คำสั่งซื้อนี้ถูกยกเลิกโดยระบบหรือความต้องการลูกค้า'}
                   </p>
                </motion.div>
              </AnimatePresence>

              {/* 🌟 RATING SYSTEM */}
              {isCompleted && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  className="p-6 bg-gray-50/50 rounded-none border border-gray-100 mt-6"
                >
                   {order.rating > 0 ? (
                      <div className="text-center space-y-3">
                         <div className="flex justify-center mb-2">
                           <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center">
                             <CheckCircle2 size={24} className="text-emerald-500" />
                           </div>
                         </div>
                         <h3 className="text-[10px] font-black uppercase text-gray-900 tracking-[0.2em]">{locale === 'en' ? 'Thank you for your feedback' : locale === 'zh' ? '感谢您的反馈' : 'ขอบคุณสำหรับฟีดแบ็คครับ'}</h3>
                         <div className="flex justify-center gap-1">
                           {[1, 2, 3, 4, 5].map((val) => (
                             <Star 
                               key={val}
                               size={16} 
                               fill={val <= order.rating ? "#F6C144" : "none"} 
                               stroke={val <= order.rating ? "#F6C144" : "#E2E8F0"} 
                             />
                           ))}
                         </div>
                         {order.comment && (
                           <p className="text-[8px] font-bold text-gray-500 mt-2">{order.comment}</p>
                         )}
                      </div>
                   ) : (
                      <div className="space-y-6">
                         <p className="text-[7px] font-black uppercase tracking-[0.3em] text-gray-400 leading-none">{locale === 'en' ? 'Rate satisfaction' : locale === 'zh' ? '评价满意度' : 'ให้คะแนนความพึงพอใจ'}</p>
                         <div className="flex justify-center gap-3">
                           {[1, 2, 3, 4, 5].map((val) => (
                             <button
                               key={val}
                               onMouseEnter={() => setHoverRating(val)}
                               onMouseLeave={() => setHoverRating(0)}
                               onClick={() => setOrder((prev: any) => ({ ...prev, tempRating: val }))}
                               className="transition-all active:scale-90"
                             >
                               <Star 
                                 size={28} 
                                 fill={val <= (order.tempRating || hoverRating) ? "#F6C144" : "none"} 
                                 stroke={val <= (order.tempRating || hoverRating) ? "#F6C144" : "#E2E8F0"} 
                                 className="transition-colors"
                               />
                             </button>
                           ))}
                         </div>

                         <div className="space-y-3">
                           <label className="text-[7px] font-black uppercase tracking-[0.3em] text-gray-400 block text-left">{locale === 'en' ? 'Additional suggestions' : locale === 'zh' ? '附加建议' : 'ข้อเสนอแนะเพิ่มเติม'}</label>
                           <textarea 
                             value={comment}
                             onChange={(e: any) => setComment(e.target.value)}
                             placeholder={locale === 'en' ? 'What impressed you? Or would you like us to improve any part...' : locale === 'zh' ? '什么让你印象深刻？或者您希望我们改进任何部分...' : 'คุณประทับใจอะไร หรือต้องการให้เราปรับปรุงส่วนไหน...'}
                             className="w-full bg-white border border-gray-200 p-4 text-xs font-bold focus:ring-0 placeholder:text-gray-200 resize-none h-20 rounded-none"
                           />
                           <button 
                             onClick={() => {
                               if (!order.tempRating) {
                                 alert(locale === 'en' ? 'Please select a star rating first.' : 'กรุณากดเลือกดาวเพื่อประเมินความพึงพอใจก่อนครับ');
                                 return;
                               }
                               handleRate(order.tempRating);
                             }}
                             className={\`w-full py-3 text-[9px] font-black uppercase tracking-widest rounded-none active:scale-95 transition-all \${!order.tempRating ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-black text-white'}\`}
                           >
                             {isSaving ? 'กำลังบันทึก...' : 'บันทึกความคิดเห็น'}
                           </button>
                         </div>
                      </div>
                   )}
                </motion.div>
              )}
           </div>
        </div>

        {/* 📦 ORDER SUMMARY MINI-LIST */}
        <div className="mt-12 space-y-4">
           <div className="flex items-center justify-between px-2">
              <span className="text-[8px] font-black uppercase tracking-widest text-gray-300">{locale === 'en' ? 'Order list' : locale === 'zh' ? '订单清单' : 'รายการสั่งซื้อ'}</span>
              <span className="text-[8px] font-black uppercase tracking-widest text-gray-300">{locale === 'en' ? 'Total: ฿' : locale === 'zh' ? '总计：฿' : 'ยอดรวม: ฿'}{order.total_amount?.toLocaleString()}</span>
           </div>
           <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="p-4 bg-white border border-gray-100 rounded-none flex justify-between items-center transition-all hover:bg-gray-50">
                   <div className="flex items-center gap-4">
                      <span className="text-[10px] font-black text-emerald-500">{item.quantity}x</span>
                      <div>
                        <h4 className="text-[11px] font-bold uppercase tracking-tighter text-black">{item.pos_menu_items?.name || 'เมนูพิเศษ'}</h4>
                        <div className="flex flex-col gap-1 mt-1">
                          {item.selected_modifiers && item.selected_modifiers.length > 0 && (
                            <p className="text-[7px] font-black uppercase text-emerald-500 tracking-widest">
                              {item.selected_modifiers.map((m: any) => formatModifierLabel(m)).join(', ')}
                            </p>
                          )}
                          {item.sweetness && <p className="text-[7px] font-black uppercase text-gray-400 tracking-widest">Sweetness: {item.sweetness}</p>}
                        </div>
                      </div>
                   </div>
                   <div className="text-right">
                     <span className="text-[11px] font-black text-gray-900 leading-none block">{locale === 'en' ? '฿' : locale === 'zh' ? '฿' : '฿'}{item.subtotal?.toLocaleString()}</span>
                     {item.quantity > 1 && <span className="text-[7px] font-bold text-gray-400 uppercase tracking-tighter">{locale === 'en' ? '(฿' : locale === 'zh' ? '（฿' : '(฿'}{(item.unit_price).toLocaleString()} {locale === 'en' ? '/item)' : locale === 'zh' ? '/物品）' : ' /ชิ้น)'}</span>}
                   </div>
                </div>
              ))}
           </div>
        </div>

        <div className="py-12 pb-24 text-center opacity-10 pointer-events-none">
          <p className="text-[7px] font-black uppercase tracking-[0.4em] text-[#1A1A18]">
            Designed by XYL STUDIO • v1.0.32
          </p>
        </div>
      </main>

      <style jsx global>{\`
        @keyframes draw-check {
          0% { stroke-dashoffset: 40; }
          100% { stroke-dashoffset: 0; }
        }
        .draw-check {
          stroke-dasharray: 40;
          stroke-dashoffset: 40;
          animation: draw-check 0.6s ease-out forwards;
        }
        @keyframes wiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-5deg); }
          75% { transform: rotate(5deg); }
        }
        .wiggle-anim {
          animation: wiggle 2s infinite ease-in-out;
        }
        @keyframes shaker {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          20% { transform: translateY(-4px) rotate(-10deg); }
          40% { transform: translateY(-4px) rotate(10deg); }
          60% { transform: translateY(-4px) rotate(-10deg); }
          80% { transform: translateY(-4px) rotate(10deg); }
        }
        .shaker-move {
          animation: shaker 0.8s infinite ease-in-out;
          transform-origin: bottom center;
        }
        @keyframes speed-line {
          0% { transform: translateX(0); opacity: 0; }
          20% { opacity: 0.6; }
          80% { opacity: 0.6; }
          100% { transform: translateX(20px); opacity: 0; }
        }
        .speed-anim-1 { animation: speed-line 0.8s infinite ease-in; }
        .speed-anim-2 { animation: speed-line 0.8s infinite ease-in 0.2s; }
        .speed-anim-3 { animation: speed-line 0.8s infinite ease-in 0.4s; }
      \`}</style>
    </div>
  );
}
`;

fs.writeFileSync('app/liff/track/[id]/page.tsx', fullFile);
