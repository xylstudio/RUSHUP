'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, 
  History, 
  ShoppingBag, 
  CheckCircle2, 
  Clock, 
  ChevronRight,
  User,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';
import { useLiff } from '@/components/liff/LiffProvider';
import { HistoryListSkeleton } from '@/components/liff/LiffSkeleton';
import XYLLoader from '@/components/loaders/XYLLoader';
import { useI18n } from "@/lib/I18nContext";

export default function LiffHistoryPage() {
    const { locale } = useI18n();
  const router = useRouter();
  const supabase = createClient();
  const { lineProfile, phone, loading: liffLoading, hasSeenLoader } = useLiff();
  const [pastOrders, setPastOrders] = useState<any[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const formatModifierLabel = (modifier: any) => {
    if (!modifier) return '';
    const name = modifier.display_name || modifier.label || modifier.group_name || modifier.name || '';
    const value = modifier.value || modifier.selected_value || modifier.option_value || modifier.option_name || '';
    if ((modifier.is_note || name === 'หมายเหตุ') && value) return `หมายเหตุ: ${value}`;
    if (value && value !== name) return `${name}: ${value}`;
    return name;
  };

  const fetchHistory = async () => {
    const currentUserId = lineProfile?.userId || localStorage.getItem('xylem_line_user_id');
    
    if (!currentUserId && !phone) {
      setFetchLoading(false);
      return;
    }
    
    try {
      setFetchLoading(true);
      // Step 1: Fetch Orders
      let query = supabase.from('pos_orders').select('*');
      if (currentUserId && phone) {
        query = query.or(`line_user_id.eq.${currentUserId},reference_name.eq.${phone}`);
      } else if (currentUserId) {
        query = query.eq('line_user_id', currentUserId);
      } else if (phone) {
        query = query.eq('reference_name', phone);
      }
      
      const { data: orders, error: ordersError } = await query.order('created_at', { ascending: false }).limit(20);
      if (ordersError) throw ordersError;
      if (!orders || orders.length === 0) {
        setPastOrders([]);
        return;
      }

      // Step 2: Fetch Items
      const orderIds = orders.map(o => o.id);
      const { data: items, error: itemsError } = await supabase
        .from('pos_order_items')
        .select(`*, pos_menu_items!item_id(*)`)
        .in('order_id', orderIds);
      
      const mappedOrders = orders.map(order => ({
        ...order,
        order_items: items?.filter(item => item.order_id === order.id) || []
      }));

      setPastOrders(mappedOrders);
    } catch (err) {
      console.error('History fetch failed:', err);
    } finally {
      setFetchLoading(false);
    }
  };

  useEffect(() => {
    // Fetch immediately on mount — userId will be in localStorage even if liff is still hydrating
    fetchHistory();
  }, [lineProfile, phone]);

  const handleReorder = async (items: any[]) => {
    if (!items || items.length === 0) return;
    
    // 🛡️ CHECK SHOP STATUS FIRST
    const { data: settings } = await supabase.from('pos_shop_settings').select('*').maybeSingle();
    const { data: activeShifts } = await supabase.from('pos_shifts').select('id').eq('status', 'open').limit(1);
    
    let isOpen = true;
    if (settings && !settings.is_open) isOpen = false;
    if (!activeShifts || activeShifts.length === 0) isOpen = false;
    if (settings) {
        const now = new Date();
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const daySettings = settings.opening_hours[days[now.getDay()]];
        if (daySettings.closed) isOpen = false;
        else {
            const currentTime = now.getHours() * 60 + now.getMinutes();
            const [openH, openM] = daySettings.open.split(':').map(Number);
            const [closeH, closeM] = daySettings.close.split(':').map(Number);
            const openTime = openH * 60 + openM;
            const closeTime = closeH * 60 + closeM;
            if (currentTime < openTime || currentTime > closeTime) isOpen = false;
        }
    }

    if (!isOpen) {
        alert(settings?.status_message || 'ร้านปิดรับออเดอร์ชั่วคราว ไม่สามารถสั่งซื้อได้ครับ');
        return;
    }

    const cartItems = items.map(item => ({
      id: item.pos_menu_items.id,
      name: item.pos_menu_items.name,
      sale_price: item.pos_menu_items.sale_price,
      quantity: item.quantity,
      selected_modifiers: item.selected_modifiers || [],
      sweetness: '100%', // Default sweetness for reorder
    }));
    localStorage.setItem('xylem_cart', JSON.stringify(cartItems));
    router.push('/liff/menu?openCart=1&t=' + Date.now()); // Add timestamp to force update/effect
  };

  // Removed blocking loader for instant transition
  if (liffLoading && !hasSeenLoader) return <XYLLoader tagline={locale === 'en' ? 'กำลังบันทึกประวัติการสั่งซื้อ...' : locale === 'zh' ? 'กำลังบันทึกประวัติการสั่งซื้อ...' : 'กำลังบันทึกประวัติการสั่งซื้อ...'} />;

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      {/* 🏛️ Boutique Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center px-4 py-4">
        <button onClick={() => router.back()} className="p-2 -ml-2 text-gray-400">
          <ChevronLeft size={24} />
        </button>
        <div className="ml-2">
          <h1 className="text-sm font-black uppercase tracking-[0.2em] text-[#1A1A18]">{locale === 'en' ? 'ประวัติการสั่งซื้อ' : locale === 'zh' ? 'ประวัติการสั่งซื้อ' : 'ประวัติการสั่งซื้อ'}</h1>
        </div>
      </header>

      <main className="px-6 py-8">
        <AnimatePresence mode="wait">
          {fetchLoading ? (
            <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <HistoryListSkeleton />
            </motion.div>
          ) : pastOrders.length === 0 ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-32 text-center"
            >
              <div className="w-20 h-20 bg-white rounded-none flex items-center justify-center shadow-sm mb-6">
                <ShoppingBag size={32} className="text-gray-100" />
              </div>
              <h2 className="text-sm font-black uppercase text-gray-400 tracking-widest mb-2">{locale === 'en' ? 'ไม่พบประวัติการสั่งซื้อ' : locale === 'zh' ? 'ไม่พบประวัติการสั่งซื้อ' : 'ไม่พบประวัติการสั่งซื้อ'}</h2>
              <p className="text-[10px] text-gray-300 leading-relaxed px-12">{locale === 'en' ? 'เมื่อคุณสั่งออเดอร์เรียบร้อยแล้ว รายการอาหารและเครื่องดื่มของคุณจะปรากฏที่นี่' : locale === 'zh' ? 'เมื่อคุณสั่งออเดอร์เรียบร้อยแล้ว รายการอาหารและเครื่องดื่มของคุณจะปรากฏที่นี่' : 'เมื่อคุณสั่งออเดอร์เรียบร้อยแล้ว รายการอาหารและเครื่องดื่มของคุณจะปรากฏที่นี่'}</p>
            </motion.div>
          ) : (
            <motion.div 
              key="list"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="space-y-6"
            >
              {pastOrders.map((order, idx) => (
                <motion.div 
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-white rounded-none p-6 shadow-sm border border-gray-100 overflow-hidden relative"
                >
                  <div className="flex justify-between items-start mb-6">
                     <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-[10px] font-black uppercase tracking-tighter text-gray-900">
                             {order.order_number?.startsWith('#') ? order.order_number : `#${order.order_number || order.id.slice(0,8).toUpperCase()}`}
                          </p>
                          <span className={`px-2 py-0.5 rounded-none text-[7px] font-black uppercase tracking-widest ${
                            order.status === 'completed' || order.status === 'delivered' ? 'bg-emerald-50 text-emerald-600' : 
                            order.status === 'cancelled' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-600'
                          }`}>
                            {order.status === 'completed' || order.status === 'delivered' ? 'สำเร็จ' : 
                             order.status === 'cancelled' ? 'ยกเลิก' : 'กำลังเตรียม'}
                          </span>
                        </div>
                        <p className="text-[8px] font-bold text-gray-400">
                          {new Date(order.created_at).toLocaleDateString('th-TH', { 
                            day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                          })}
                        </p>
                     </div>
                     <button 
                       onClick={() => router.push(`/liff/track/${order.id}`)}
                       className="p-3 bg-gray-50 rounded-none text-gray-400 active:scale-95 transition-all"
                     >
                       <ChevronRight size={16} />
                     </button>
                  </div>

                  <div className="space-y-3 mb-6">
                    {order.order_items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between items-center bg-gray-50/50 p-3 rounded-none">
                        <div className="flex min-w-0 items-start gap-3">
                           <span className="text-[10px] font-black text-gray-300">{item.quantity}x</span>
                           <div className="min-w-0">
                             <h4 className="text-[10px] font-bold text-gray-700 uppercase tracking-tight">{item.pos_menu_items?.name}</h4>
                             {item.selected_modifiers && item.selected_modifiers.length > 0 && (
                               <p className="mt-1 text-[8px] font-bold text-emerald-600">
                                 {item.selected_modifiers.map((modifier: any) => formatModifierLabel(modifier)).join(', ')}
                               </p>
                             )}
                           </div>
                        </div>
                        <span className="text-[10px] font-black text-gray-900">{locale === 'en' ? '฿' : locale === 'zh' ? '฿' : '฿'}{item.subtotal?.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t border-gray-50">
                     <div className="flex flex-col">
                        <span className="text-[8px] font-black uppercase text-gray-400 tracking-widest leading-none mb-1">{locale === 'en' ? 'ยอดชำระสุทธิ' : locale === 'zh' ? 'ยอดชำระสุทธิ' : 'ยอดชำระสุทธิ'}</span>
                        <span className="text-lg font-black tracking-tighter">{locale === 'en' ? '฿' : locale === 'zh' ? '฿' : '฿'}{order.total_amount?.toLocaleString()}</span>
                     </div>
                     <button
                       onClick={() => handleReorder(order.order_items)}
                       className="h-12 px-6 bg-[#1A1A18] text-white rounded-none text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center gap-2"
                     >
                       {locale === 'en' ? '                        สั่งเมนูเดิมอีกครั้ง ' : locale === 'zh' ? '                        สั่งเมนูเดิมอีกครั้ง ' : '                        สั่งเมนูเดิมอีกครั้ง '}<ArrowRight size={12} />
                     </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2">
         <button 
            onClick={() => router.push('/liff/menu')}
            className="px-8 py-4 bg-white rounded-none shadow-2xl border border-gray-100 flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] active:scale-95 transition-all"
         >
           <ShoppingBag size={14} className="text-emerald-500" /> {locale === 'en' ? 'Return to home page' : locale === 'zh' ? '返回首页' : ' กลับสู่หน้าหลัก          '}</button>
      </div>

      <div className="py-12 pb-24 text-center opacity-20 pointer-events-none">
         <p className="text-[7px] font-black uppercase tracking-[0.4em] text-[#1A1A18]">
           Designed by XYL STUDIO • v1.0.32
         </p>
      </div>
    </div>
  );
}
